// Export, import and Save as PDF, the board's side (D-107, export-import-print FE_01; nclite ADR-0381; boards/board-files.ts,
// canvas/print-view.ts): the export file's name; what Import reads from a chosen file; Export hands the export route's file
// to the host's save; Import sends the chosen file as the person's `import`, into a new board named from its title or the
// open one, and says what the board dropped, and refuses a file over the host's limit before sending anything; Save as PDF
// sets the print view, asks the host's `savePdf` with the title, look and the page's size (no content, no orientation),
// then takes the view off, even when the save fails; the extent of a scope, padded, at its own size; and the standalone
// page's own side of the ask: its page rule, and its import limit, its server's.
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoardFiles, exportName, IMPORT_BYTES, readExport, type BoardFilesDeps } from '../src/board/boards/board-files.ts';
import * as pageFiles from '../src/shell/page-files.ts';
import { PRINT_PAD, printFit } from '../src/board/canvas/print-view.ts';
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
      savePdf: async (ask) => { log.push(['pdf', ask]); },
      ...host,
    },
    io: {
      exportBoard: async (board, o) => { log.push(['export', board, o]); return FILE as never; },
      importBoard: async (board, into, file) => { log.push(['import', board, into, file]); return { results: [], head: 1, dropped: [] } as never; },
    },
    importBytes: IMPORT_BYTES,
    id: () => 'roadmap',
    state: () => ({ boards: new Map([['roadmap', { title: 'Where we go' }], ['pricing', { title: 'Pricing' }]]) }) as never,
    regionTitle: (r) => (r === 'review' ? 'Review' : undefined),
    show: (ask) => log.push(['show', ask]),
    printView: (scope) => { log.push(['view', scope]); return { size: scope.region ? { width: 400, height: 600 } : { width: 1800, height: 900 }, undo: () => log.push(['undo']) }; },
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

test('Save as PDF sets the view, asks the host\'s savePdf for the title, look and the page\'s size (no content, no orientation), then takes the view off, even when the save fails', async () => {
  const { files, log } = flow();
  assert.equal(await files.print({ region: 'review', border: false, theme: 'light' }), null);
  assert.deepEqual(log, [['view', { region: 'review', border: false }], ['pdf', { title: 'Review', look: 'light', size: { width: 400, height: 600 } }], ['undo']]);
  const board = flow();
  assert.equal(await board.files.print({ border: true, theme: 'dark' }), null);
  assert.deepEqual(board.log[1], ['pdf', { title: 'Where we go', look: 'dark', size: { width: 1800, height: 900 } }]);
  const failed = flow({}, { savePdf: async () => { throw new Error('A save is already under way.'); } });
  assert.equal(await failed.files.print({ border: true, theme: 'dark' }), 'A save is already under way.');
  assert.deepEqual(failed.log.at(-1), ['undo']);
  assert.notEqual(await flow({ printView: () => null }).files.print({ border: true, theme: 'dark' }), null);
});

test('import refuses a file over the host\'s limit with words, before reading or sending it', async () => {
  const big = { name: 'big.vboard.json', bytes: new Uint8Array(1025) };
  const { files, log } = flow({ importBytes: 1024 }, { openFile: async () => big });
  const out = await files.importFile('new');
  assert.ok(out && 'problem' in out && /over 1 KB/.test(out.problem), JSON.stringify(out));
  assert.equal(log.some((l) => l[0] === 'import'), false, 'nothing is sent');
  const mb = flow({}, { openFile: async () => ({ name: 'big.vboard.json', bytes: new Uint8Array(IMPORT_BYTES + 1) }) });
  const said = await mb.files.importFile('new');
  assert.ok(said && 'problem' in said && /over 1 MB/.test(said.problem), JSON.stringify(said));
  const at = flow({ importBytes: bytes(JSON.stringify(FILE)).byteLength });
  assert.deepEqual(await at.files.importFile('new'), { dropped: [] }, 'a file at the limit goes');
});

test('the standalone page\'s Save as PDF: a size is one page of exactly that size, edge to edge; else the ask\'s side on paper, a margin for plain alone; its import limit is its server\'s write_board body limit', () => {
  assert.equal(pageFiles.printRules({ look: 'plain', size: { width: 1800, height: 912 } }), '@page{size:1800px 912px;margin:0}');
  assert.equal(pageFiles.printRules({ orientation: 'portrait', look: 'dark', size: { width: 400, height: 600 } }), '@page{size:400px 600px;margin:0}');
  assert.equal(pageFiles.printRules({ size: { width: 0, height: 600 } }), `@page{size:portrait;margin:${pageFiles.PLAIN_MARGIN}}`, 'a size that is no page is none');
  assert.equal(pageFiles.printRules({ orientation: 'landscape', look: 'dark' }), '@page{size:landscape;margin:0}');
  assert.equal(pageFiles.printRules({ look: 'light' }), '@page{size:portrait;margin:0}');
  assert.equal(pageFiles.printRules({}), `@page{size:portrait;margin:${pageFiles.PLAIN_MARGIN}}`);
  const writes = fs.readFileSync(path.join(import.meta.dirname, '../server/engine/writes.ts'), 'utf8');
  const [, kib] = /const WRITE_LIMIT = (\d+) \* KIB;/.exec(writes) ?? [];
  assert.equal(pageFiles.IMPORT_BYTES, Number(kib) * 1024, 'the page refuses what its server would');
  assert.ok(pageFiles.IMPORT_BYTES <= IMPORT_BYTES);
});

test('printFit: padded, at its own size, never scaled, rounded out to whole px', () => {
  assert.deepEqual(printFit({ x: 100, y: 50, w: 400, h: 200 }), { x: 100 - PRINT_PAD, y: 50 - PRINT_PAD, w: 400 + 2 * PRINT_PAD, h: 200 + 2 * PRINT_PAD });
  assert.deepEqual(printFit({ x: 0, y: 0, w: 3000.4, h: 1000 }, 0), { x: 0, y: 0, w: 3001, h: 1000 }, 'a wide board is one wide page, not shrunk');
  assert.deepEqual(printFit({ x: 0, y: 0, w: 1000, h: 4000 }, 0), { x: 0, y: 0, w: 1000, h: 4000 });
});
