// The page folds the ledger itself (N12_FE_01 ruling 2): it reads `read_ledger` once, folds it with
// the shared action layer, and applies every later line to the state it holds. What it then draws
// must be what `get_board` would have answered, for every board, and stay so as lines arrive.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent, LedgerLine } from '../../../packages/format/src/index.ts';
import { fromLine } from '../../../packages/format/src/index.ts';
import { applyEvent, eventBoard, foldLedger } from '../../../packages/actions/src/index.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { boardData, canApply, pageConditions } from '../src/board/board-data.ts';
import type { BoardData } from '../src/board/io.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

/** Every line `read_ledger` serves, as the file holds them (cards by identity), read as code reads
 * them (`fromLine`, api.md 125, 130): what the page folds. */
async function allLines(): Promise<LedgerEvent[]> {
  const out: LedgerEvent[] = [];
  for (;;) {
    const r = await h.ok<{ events: LedgerLine[]; more?: true }>('read_ledger', { after: out.at(-1)?.seq ?? 0, limit: 500 });
    out.push(...r.events.map(fromLine));
    if (!r.more) return out;
  }
}

/** `BoardData` in the JSON shape `get_board` answers with. */
const asJson = (d: BoardData) => ({
  head: d.head,
  view: d.view,
  state: {
    items: Object.fromEntries(d.state.items), pins: Object.fromEntries(d.state.pins), modes: Object.fromEntries(d.state.modes),
    ...(d.state.sizes.size > 0 && { sizes: Object.fromEntries(d.state.sizes) }),
    ...(d.state.moves.size > 0 && { moves: Object.fromEntries(d.state.moves) }),
    ...(d.state.regionNotes.size > 0 && {
      containerNotes: Object.fromEntries([...d.state.regionNotes].map(([r, notes]) => [r, notes.map(({ region: _, ...x }) => x)])),
    }),
    ...(d.state.regionPins.size > 0 && { containerPins: Object.fromEntries(d.state.regionPins) }),
  },
  versions: d.versions,
  ...d.access,
});

test('boardData from the folded read_ledger lines equals get_board, for every board', async () => {
  const s = foldLedger(await allLines());
  const { boards } = await h.ok<{ boards: { board: string }[] }>('list_boards');
  assert.ok(boards.length >= 2);
  for (const { board } of boards) assert.deepEqual(asJson(boardData(s, board)), await h.ok('get_board', { board }), board);
});

test('lines applied one at a time to a held state give the same board as folding them all', async () => {
  const lines = await allLines();
  const held = foldLedger([]);
  for (const e of lines) applyEvent(held, e);
  assert.deepEqual(asJson(boardData(held, 'pricing')), asJson(boardData(foldLedger(lines), 'pricing')));
});

test('pageConditions: the page reads the conditions table; marks never the open board, and a person act is not news', async () => {
  const lines = await allLines();
  const s = foldLedger(lines);
  const open = pageConditions(s, 'pricing');
  assert.deepEqual(open.marks, { roadmap: 'new' }, 'every board but the open one, before any board seen');
  assert.equal(open.drawn, Math.max(...lines.filter((e) => e.type === 'node' && e.board === 'pricing').map((e) => e.seq)));
  const head = s.heads.get('roadmap')!;
  applyEvent(s, { v: 8, seq: s.seq + 1, at: '2026-10-07T00:00:00Z', by: 'person', type: 'seen', board: 'roadmap', head });
  assert.deepEqual(pageConditions(s, 'pricing').marks, {}, 'the board seen ends it');
  const comment = lines.find((e) => e.type === 'act' && e.action === 'comment' && eventBoard(s, e) === 'roadmap')!;
  applyEvent(s, { ...comment, seq: s.seq + 1 } as LedgerEvent);
  assert.deepEqual(pageConditions(s, 'pricing').marks, {}, 'the person acting never marks a board changed');
});

test('pageConditions: unsent (`board.unsent`) is what Send to agent waits for, on the open board only', async () => {
  const s = foldLedger(await allLines());
  const act = (f: object) => applyEvent(s, { v: 8, seq: s.seq + 1, at: '2026-10-11T00:00:00Z', by: 'person', type: 'act', ...f } as LedgerEvent);
  for (const board of ['pricing', 'roadmap']) act({ action: 'send', board });
  assert.equal(pageConditions(s, 'pricing').unsent, false, 'nothing new since the Send');
  act({ action: 'comment', board: 'pricing', region: s.boards.get('pricing')!.regions[0]!.id, text: 'Why?' });
  assert.equal(pageConditions(s, 'pricing').unsent, true, 'a note on a container is new');
  assert.equal(pageConditions(s, 'roadmap').unsent, false, 'another board is not');
});

test('a container note and a container place (3_FE_04): the folded board still equals get_board', async () => {
  const body = (f: object) => ({ board: 'roadmap', body: { type: 'act', board: 'roadmap', region: 'build', ...f } });
  const note = await h.ok<{ seq: number }>('act', body({ action: 'comment', text: 'Thin enough?' }));
  await h.ok('act', body({ action: 'pin', x: 2400, y: 0 }));
  const s = foldLedger(await allLines());
  assert.deepEqual(asJson(boardData(s, 'roadmap')), await h.ok('get_board', { board: 'roadmap' }));
  await h.ok('act', body({ action: 'note-remove', note: note.seq }));
  await h.ok('act', body({ action: 'unpin' }));
});

test('canApply: a line from a newer ledger format is not applied in place', () => {
  const e = { v: 4, seq: 1, type: 'seen' } as unknown as LedgerEvent;
  assert.equal(canApply(e), true);
  assert.equal(canApply({ ...e, v: 99 } as unknown as LedgerEvent), false);
});
