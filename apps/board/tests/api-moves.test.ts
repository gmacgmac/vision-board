// Moving cards over the API (3_FE_03, api.md 66-70): the person's `move` puts cards in a container
// on their board or in the built-in Later; every read shows where a card is (`region`) and, when
// the person moved it, where the agent has it (`moved_from`); `get_board` carries the moves in
// `state.moves`, as it carries pins. Every response is checked against the spec (api.md 54).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT } from '#format';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const act = (body: object) => ({ board: 'roadmap', body: { type: 'act', ...body } });

test('a move: show_node, list_open, show_container and get_board show where the card is and where the agent has it', async () => {
  const stored = await h.ok('act', act({ action: 'move', n: 4, region: 'review' }));
  assert.deepEqual([stored.v, stored.action, stored.n, stored.region], [LEDGER_FORMAT, 'move', 4, 'review']);
  const node = await h.ok('show_node', { board: 'roadmap', n: 4 });
  assert.deepEqual([node.region, node.moved_from], ['review', 'prove']);
  const open = await h.ok('list_open', { board: 'roadmap' });
  const four = open.items.find((x: any) => x.n === 4);
  assert.deepEqual([four.region, four.moved_from], ['review', 'prove']);
  const review = await h.ok('show_container', { board: 'roadmap', region: 'review' });
  assert.ok(review.nodes.some((x: any) => x.n === 4), 'a container lists the cards the person put in it');
  const board = await h.ok('get_board', { board: 'roadmap' });
  assert.deepEqual(board.state.moves, { 4: 'review' });
  assert.equal(board.view.nodes.find((x: any) => x.id === '4').region, 'prove', 'the view is what the agent drew');
});

test('a group move into Later, then back: one act with nodes; moved_from goes once the card is home', async () => {
  const stored = await h.ok('act', act({ action: 'move', nodes: [4, 5], region: 'later' }));
  assert.deepEqual(stored.nodes, [4, 5]);
  for (const n of [4, 5]) assert.equal((await h.ok('show_node', { board: 'roadmap', n })).region, 'later');
  const r = await h.ok('check_responses', { board: 'roadmap', after: stored.seq - 1 });
  assert.deepEqual(r.responses.map((e: any) => [e.action, e.nodes, e.region]), [['move', [4, 5], 'later']]);
  await h.ok('act', act({ action: 'move', nodes: [4, 5], region: 'prove' }));
  const node = await h.ok('show_node', { board: 'roadmap', n: 4 });
  assert.deepEqual([node.region, node.moved_from], ['prove', undefined]);
  assert.equal((await h.ok('get_board', { board: 'roadmap' })).state.moves, undefined, 'left out when no card is moved');
});

// Every kind offers Later now (api.md 118), so no card is refused a place there.
test('refused: an unknown container, no container named', async () => {
  let p = await h.fails('act', act({ action: 'move', n: 4, region: 'nowhere' }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/region');
  p = await h.fails('act', act({ action: 'move', n: 4 }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/region');
});
