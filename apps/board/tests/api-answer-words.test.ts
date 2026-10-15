// Check and cross in every agent read and write (answer-model BE_02, D-045, api.md 147): `get_board`,
// `show_node`, `show_container`, `list_open` and `write_board`'s `pending` name a card's ✓ `checked`
// and its ✗ `crossed`, and a proposal's action `check` or `cross`; the agent's `propose` sends
// `check` or `cross`, stored as `ack` or `drop`; the old words are refused by name. The ledger and
// the page keep the stored names. Every answer is checked against the spec.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
const n = { q: 0, d: 0, a: 0 };
before(async () => {
  h = await startBoard();
  A = await h.join('Words chat');
  const r = await write([
    { type: 'board', title: 'Words' }, { type: 'region', region: { id: 'r', title: 'R', mode: 'grid' } },
    { type: 'node', node: { region: 'r', kind: 'question', title: 'Q' } },
    { type: 'node', node: { region: 'r', kind: 'decision', title: 'D' } },
    { type: 'node', node: { region: 'r', kind: 'action', title: 'A' } },
  ]);
  [n.q, n.d, n.a] = [r.results[2].n, r.results[3].n, r.results[4].n];
});
after(() => h.close());

const write = (items: unknown[]): Promise<any> => h.ok('write_board', { board: 'words', body: { items } }, { as: A.client });
const act = (body: object) => h.ok('act', { board: 'words', body: { type: 'act', ...body } });
const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));
/** No old word anywhere in an answer: neither as a status nor as an action. */
const noOldWords = (answer: unknown, what: string) =>
  assert.doesNotMatch(JSON.stringify(answer), /"(acknowledged|dropped|ack|drop)"/, `${what} names no old word`);

test('propose: `check` and `cross` are taken and stored as `ack` and `drop`; a retry with the same key replays', async () => {
  const r = await write([
    { type: 'propose', n: n.q, ver: 1, action: 'check', reason: 'Settled in chat.', key: 'p-q' },
    { type: 'propose', n: n.d, ver: 1, action: 'cross', reason: 'The client declined.' },
  ]);
  assert.deepEqual(codes(r), ['ok', 'ok']);
  const stored = r.results.map((x: any) => h.ledger.events().find((e) => e.seq === x.seq) as { action?: string });
  assert.deepEqual(stored.map((e: { action?: string }) => e.action), ['ack', 'drop']);
  const before = h.ledger.state().seq;
  const again = await write([{ type: 'propose', n: n.q, ver: 1, action: 'check', reason: 'Settled in chat.', key: 'p-q' }]);
  assert.deepEqual([again.results[0].replayed, again.results[0].seq, h.ledger.state().seq], [true, r.results[0].seq, before]);
});

test('propose: `ack` and `drop` are refused in plain words naming `check` and `cross`; nothing is written', async () => {
  const before = h.ledger.state().seq;
  const r = await write([
    { type: 'propose', n: n.q, ver: 1, action: 'ack', reason: 'Old word.' },
    { type: 'propose', n: n.d, ver: 1, action: 'drop', reason: 'Old word.' },
  ]);
  assert.deepEqual(codes(r), ['invalid', 'invalid']);
  assert.deepEqual(r.results.map((x: any) => x.problem.errors), [
    [{ pointer: '/items/0/action', detail: '"ack" is now "check"' }],
    [{ pointer: '/items/1/action', detail: '"drop" is now "cross"' }],
  ]);
  assert.match(r.results[0].problem.detail, /`check`/);
  assert.match(r.results[1].problem.detail, /`cross`/);
  assert.equal(h.ledger.state().seq, before, 'nothing written');
});

test('get_board, show_node and show_container say `checked` and `crossed`, and a proposal `check` or `cross`', async () => {
  await act({ action: 'ack', n: n.q, ver: 1 });
  await act({ action: 'drop', n: n.d, ver: 1 });
  const board = await h.ok('get_board', { board: 'words' });
  assert.deepEqual([board.state.items[String(n.q)].status, board.state.items[String(n.d)].status], ['checked', 'crossed']);
  noOldWords(board.state, 'get_board');
  const q = await h.ok('show_node', { board: 'words', n: n.q });
  const d = await h.ok('show_node', { board: 'words', n: n.d });
  assert.deepEqual([q.status, d.status], ['checked', 'crossed']);
  assert.deepEqual([q.proposals.map((p: any) => p.action), d.proposals.map((p: any) => p.action)], [['check'], ['cross']]);
  noOldWords([q, d], 'show_node');
  const linked = await h.ok('show_node', { board: 'words', n: n.a, linked: true });
  noOldWords(linked, 'show_node linked');
  const box = await h.ok('show_container', { board: 'words', region: 'r' });
  assert.deepEqual(box.nodes.map((x: any) => x.status), ['checked', 'crossed', 'open']);
  noOldWords(box, 'show_container');
});

test('list_open and write_board `pending` say `checked` on a card still owed a note', async () => {
  await act({ action: 'ack', n: n.a, ver: 1 });
  await act({ action: 'comment', n: n.a, ver: 1, text: 'Which file?' });
  const open = await h.ok('list_open', { board: 'words' });
  const owed = open.items.find((x: any) => x.n === n.a);
  assert.deepEqual([owed.status, owed.pending], ['checked', 'comment']);
  noOldWords(open, 'list_open');
  const r = await write([{ type: 'node', node: { region: 'r', kind: 'note', title: 'Aside' } }]);
  assert.deepEqual(r.pending.find((x: any) => x.n === n.a).status, 'checked');
  noOldWords(r.pending, 'write_board pending');
});

test('the ledger keeps the stored names: the person\'s acts are `ack` and `drop`', () => {
  const acts = h.ledger.events().filter((e) => e.type === 'act').map((e) => (e as { action: string }).action);
  assert.deepEqual(acts.filter((a) => a === 'ack' || a === 'drop'), ['ack', 'drop', 'ack']);
});
