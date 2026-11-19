// Export, import and print, the board's side (D-107, export-import-print FE_01; boards/board-files.ts, canvas/print-view.ts):
// the export file's name; what Import reads from a chosen file; Export hands the export route's file to the host's save;
// Import sends the chosen file as the person's `import`, into a new board named from its title or the open one, and says
// what the board dropped; Print sets the print view, waits for the host's print, then takes it off, even when the print
// fails; and the fit of a scope to one page, shrunk and never enlarged, turned to the page's longer side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoardFiles, exportName, readExport, type BoardFilesDeps } from '../src/board/boards/board-files.ts';
import { PRINT_PAD, PRINT_PAGE, printFit } from '../src/board/canvas/print-view.ts';
import { ApiError } from '../src/board/io.ts';

const bytes = (s: string) => new TextEncoder().encode(s);
const FILE = { v: 1, title: 'Pricing', items: [] };

/** A files flow over fakes; `log` records each call in order. */
function flow(over: Partial<BoardFilesDeps> = {}, host: Partial<BoardFilesDeps['host']> = {}) {
  const log: unknown[][] = [];
  const d: BoardFilesDeps = {
    host: {
      saveFile: async (name, type, b) => { log.push(['save', name, type, new TextDecoder().decode(b)]); },
      openFile: async (accept) => { log.push(['open', accept]); return { name: 'pricing.vboard.json', bytes: bytes(JSON.stringify(FILE)) }; },
      print: async () => { log.push(['print']); },
      ...host,
    },
    io: {
      exportBoard: async (board, o) => { log.push(['export', board, o]); return FILE as never; },
      importBoard: async (board, into, file) => { log.push(['import', board, into, file]); return { results: [], head: 1, dropped: [] } as never; },
    },
    id: () => 'roadmap',
    state: () => ({ boards: new Map([['roadmap', { title: 'Where we go' }], ['pricing', { title: 'Pricing' }]]) }) as never,
    regionTitle: (r) => (r === 'review' ? 'Review' : undefined),
    show: (ask) => log.push(['show', ask]),
    printView: (scope) => { log.push(['view', scope]); return () => log.push(['undo']); },
    jump: (id) => log.push(['jump', id]),
    toast: (t) => log.push(['toast', t]),
    ...over,
  };
  return { files: createBoardFiles(d), log };
}

test('exportName: the board\'s title as an id, then the container\'s, then .vboard.json', () => {
  assert.equal(exportName('Where we go'), 'where-we-go.vboard.json');
  assert.equal(exportName('Where we go', 'Review: round 2'), 'where-we-go-review-round-2.vboard.json');
});

test('readExport: any JSON object; not JSON, an array or null is no export file', () => {
  assert.deepEqual(readExport(bytes('{"v":9,"x":1}')), { v: 9, x: 1 });
  for (const s of ['not json', '[1]', 'null', '3']) assert.equal(readExport(bytes(s)), null, s);
});

test('ask opens the dialog for the board, or a container with its title', () => {
  const { files, log } = flow();
  files.ask('print');
  files.ask('export', 'review');
  assert.deepEqual(log, [['show', { kind: 'print' }], ['show', { kind: 'export', region: 'review', title: 'Review' }]]);
});

test('exportFile reads the export route for the scope and hands the file to the host\'s save', async () => {
  const { files, log } = flow();
  assert.equal(await files.exportFile({ region: 'review', notes: true }), null);
  assert.deepEqual(log[0], ['export', 'roadmap', { region: 'review', notes: true }]);
  assert.deepEqual(log[1], ['save', 'where-we-go-review.vboard.json', 'application/json', `${JSON.stringify(FILE, null, 2)}\n`]);
});

test('exportFile answers a refusal or the host\'s rejection in words, never throwing', async () => {
  const refused = flow({ io: { exportBoard: async () => { throw new ApiError('board: "x" isn\'t a board', 404, ['one']); }, importBoard: async () => ({}) as never } });
  assert.equal(await refused.files.exportFile({ notes: false }), 'board: "x" isn\'t a board · one');
  const failed = flow({}, { saveFile: async () => { throw new Error('Disk full'); } });
  assert.equal(await failed.files.exportFile({ notes: false }), 'Disk full');
});

test('importFile into a new board: the file to a board named from its title (unique), then that board opens', async () => {
  const { files, log } = flow();
  assert.deepEqual(await files.importFile('new'), { dropped: [] });
  assert.deepEqual(log[0], ['open', '.vboard.json,application/json']);
  assert.deepEqual(log[1], ['import', 'pricing-2', 'new', FILE]);
  assert.deepEqual(log.slice(2), [['jump', 'pricing-2'], ['toast', 'Imported “Pricing”.']]);
});

test('importFile into this board: the open board, no jump; what was dropped comes back and nothing is toasted', async () => {
  const { files, log } = flow({ io: { exportBoard: async () => ({}) as never, importBoard: async (b, into) => { log.push(['import', b, into]); return { results: [], head: 2, dropped: ['pins: 2'] } as never; } } });
  assert.deepEqual(await files.importFile('current'), { dropped: ['pins: 2'] });
  assert.deepEqual(log.slice(1), [['import', 'roadmap', 'current']]);
});

test('importFile: no file chosen is null; a file that is no export file, or a refusal, is a problem and nothing is written', async () => {
  assert.equal(await flow({}, { openFile: async () => undefined }).files.importFile('new'), null);
  const junk = flow({}, { openFile: async () => ({ name: 'x.json', bytes: bytes('[]') }) });
  assert.match(((await junk.files.importFile('new')) as { problem: string }).problem, /isn't an export file/);
  assert.equal(junk.log.some((l) => l[0] === 'import'), false);
  const refused = flow({ io: { exportBoard: async () => ({}) as never, importBoard: async () => { throw new ApiError('locked', 423); } } });
  assert.deepEqual(await refused.files.importFile('current'), { problem: 'locked' });
});

test('print sets the view, waits for the host\'s print, then takes the view off, even when the print fails', async () => {
  const { files, log } = flow();
  assert.equal(await files.print({ region: 'review', border: false }), null);
  assert.deepEqual(log, [['view', { region: 'review', border: false }], ['print'], ['undo']]);
  const failed = flow({}, { print: async () => { throw new Error('No printer'); } });
  assert.equal(await failed.files.print({ border: true }), 'No printer');
  assert.deepEqual(failed.log.at(-1), ['undo']);
  assert.notEqual(await flow({ printView: () => null }).files.print({ border: true }), null);
});

test('printFit: padded, turned to the longer side, shrunk to one page and never enlarged', () => {
  const small = printFit({ x: 100, y: 50, w: 400, h: 200 });
  assert.deepEqual(small, { x: 100 - PRINT_PAD, y: 50 - PRINT_PAD, w: 400 + 2 * PRINT_PAD, h: 200 + 2 * PRINT_PAD, scale: 1, landscape: true });
  const wide = printFit({ x: 0, y: 0, w: 3000, h: 1000 }, 0);
  assert.equal(wide.landscape, true);
  assert.equal(wide.scale, PRINT_PAGE.long / 3000);
  const tall = printFit({ x: 0, y: 0, w: 1000, h: 4000 }, 0);
  assert.equal(tall.landscape, false);
  assert.equal(tall.scale, PRINT_PAGE.long / 4000);
  assert.ok(tall.w * tall.scale <= PRINT_PAGE.short && tall.h * tall.scale <= PRINT_PAGE.long);
});
