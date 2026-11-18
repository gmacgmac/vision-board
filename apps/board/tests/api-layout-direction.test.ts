// `show_layout` in both directions (BE_01 step 6, api.md 133, 189): the server works the answer out from the same
// fold the page draws from (`directionOf`), so a flow the agent drew `down` answers down, the person's board-wide
// Across turns it across, and Auto gives the agent's back; the cells always agree with `structureOf` called as the
// page lays the container out, branches on their own rows.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Direction } from '#format';
import { boardView } from '#format';
import { structureOf } from '#layout';
import { boardState, placedView } from '#actions';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let on: Harness;
let A: Joined;
const card = (title: string) => ({ type: 'node', node: { region: 'line', kind: 'topic', title } });
const link = (from: number, to: number) => ({ type: 'link', from, to });
// The maintainer's example: seven cards, 1>2>3>4 and a branch 2>5>6>7 that rejoins 4.
const ITEMS = [
  { type: 'board', title: 'Line' },
  { type: 'region', region: { id: 'line', title: 'From idea to production line', mode: 'flow', direction: 'down' } },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => card(`Step ${n}`)),
  link(1, 2), link(2, 3), link(3, 4), link(2, 5), link(5, 6), link(6, 7), link(7, 4),
];

before(async () => {
  on = await startBoard();
  A = await on.join('Line chat');
  await on.ok('write_board', { board: 'line', body: { items: ITEMS } }, { as: A.client });
});
after(() => on.close());

const layout = (h: Harness, as: Joined) => h.ok('show_layout', { board: 'line', region: 'line' }, { as: as.client });
const act = (direction: string) => on.ok('act', { board: 'line', body: { type: 'act', action: 'direction', board: 'line', direction } });

/** The cells `structureOf` gives for the container drawn `direction`, with branches, by board number. */
function expected(h: Harness, direction: Direction) {
  const s = h.ledger.state();
  const view = placedView(boardView(s, 'line'), boardState(s, 'line'));
  const region = view.regions.find((r) => r.id === 'line')!;
  const out = structureOf(region, view.nodes.filter((n) => n.region === 'line'), view.links, 'flow', undefined, { direction });
  return out.cards.map(({ id, ...cell }) => ({ n: Number(id), ...cell }));
}

test('the agent\'s down answers down; the person\'s Across turns it; Auto gives it back; the answer is the picture\'s', async () => {
  const down = await layout(on, A);
  assert.deepEqual(down.cards, expected(on, 'down'));
  assert.equal(down.columns, 2, 'down: the main line and the branch are two columns');
  assert.equal(down.crossing, 0);
  await act('across');
  const across = await layout(on, A);
  assert.deepEqual(across.cards, expected(on, 'across'));
  assert.equal(across.columns, 6, 'across: six layers left to right');
  assert.deepEqual(across.cards.map((c: any) => ({ n: c.n, column: c.row, row: c.column })), down.cards, 'across is down turned');
  await act('auto');
  assert.deepEqual((await layout(on, A)).cards, down.cards);
});
