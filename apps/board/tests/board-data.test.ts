// The page folds the ledger itself (N12_FE_01 ruling 2): it reads `read_ledger` once, folds it with
// the shared action layer, and applies every later line to the state it holds. What it then draws
// must be what `get_board` would have answered, for every board, and stay so as lines arrive.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import { applyEvent, foldLedger } from '../../../packages/actions/src/index.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { boardData, canApply, drewOn } from '../src/board/board-data.ts';
import type { BoardData } from '../src/board/io.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

async function allLines(): Promise<LedgerEvent[]> {
  const out: LedgerEvent[] = [];
  for (;;) {
    const r = await h.ok<{ events: LedgerEvent[]; more?: true }>('read_ledger', { after: out.at(-1)?.seq ?? 0, limit: 500 });
    out.push(...r.events);
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

test('drewOn: a batch redrew a board only with an agent drawing line on that board', async () => {
  const s = foldLedger(await allLines());
  const lines = await allLines();
  const node = lines.find((e) => e.type === 'node' && e.board === 'pricing')!;
  const act = lines.find((e) => e.type === 'act' && e.action === 'comment')!;
  assert.equal(drewOn(s, [node], 'pricing'), true);
  assert.equal(drewOn(s, [node], 'roadmap'), false);
  assert.equal(drewOn(s, [act], 'roadmap'), false);
});

test('canApply: a line from a newer ledger format is not applied in place', () => {
  const e = { v: 4, seq: 1, type: 'seen' } as unknown as LedgerEvent;
  assert.equal(canApply(e), true);
  assert.equal(canApply({ ...e, v: 99 } as unknown as LedgerEvent), false);
});
