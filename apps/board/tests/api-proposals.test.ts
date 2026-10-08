// Append and proposals over the API (proposals-seen-parking BE_01, api.md 93-95): an `append`
// item is stored as a new `node` version with the text joined to the body, checked like a node
// update (grant, `base`, retry key); the person rejects a proposal with `reject`, and an
// out-of-date or decided one is refused with plain words. Every answer is checked against the spec.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
let B: Joined;
let n = 0;
let bare = 0;
before(async () => {
  h = await startBoard();
  A = await h.join('Planning chat');
  B = await h.join('Review chat');
  const r = await write(A, [
    { type: 'board', title: 'Notes' }, { type: 'region', region: { id: 'a', title: 'A', mode: 'grid' } },
    { type: 'node', key: 'q', node: { region: 'a', kind: 'question', title: 'Q', body: 'First line.', item: true, tags: ['t'] } },
    { type: 'node', node: { region: 'a', kind: 'note', title: 'No body' } },
  ]);
  n = r.results[2].n;
  bare = r.results[3].n;
});
after(() => h.close());

async function write(who: Joined, items: unknown[]): Promise<any> {
  return h.ok('write_board', { board: 'notes', body: { items } }, { as: who.client });
}
const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));
const body = async (x: number) => (await h.ok('show_node', { board: 'notes', n: x })).versions.at(-1).node;

test('append: a new version with the text after a blank line, every other field kept; no body becomes the text', async () => {
  const r = await write(A, [{ type: 'append', n, text: 'Second line.', key: 'add-1' }, { type: 'append', n: bare, text: 'Now one.' }]);
  assert.deepEqual(codes(r), ['ok', 'ok']);
  assert.deepEqual([r.results[0].n, r.results[0].ver, r.results[0].title], [n, 2, 'Q']);
  assert.deepEqual(await body(n), { region: 'a', kind: 'question', title: 'Q', body: 'First line.\n\nSecond line.', item: true, tags: ['t'] });
  assert.equal((await body(bare)).body, 'Now one.');
  assert.equal(h.ledger.events().at(-1)!.type, 'node', 'stored as an ordinary node line');
});

test('append: a retry with the same key is replayed; new text under it is a conflict', async () => {
  const before = h.ledger.state().seq;
  const again = await write(A, [{ type: 'append', n, text: 'Second line.', key: 'add-1' }]);
  assert.deepEqual([again.results[0].replayed, again.results[0].ver, h.ledger.state().seq], [true, 2, before]);
  assert.deepEqual(codes(await write(A, [{ type: 'append', n, text: 'Other.', key: 'add-1' }])), ['conflict']);
});

test('append: a stale base, no grant, an unknown node and a body over the limit fail', async () => {
  const stale = await write(A, [{ type: 'append', n, text: 'Late.', base: 1 }]);
  assert.deepEqual([codes(stale), stale.results[0].problem.ver], [['conflict'], 2]);
  const r = await write(B, [{ type: 'append', n, text: 'Mine.' }]);
  assert.deepEqual(codes(r), ['needs-grant']);
  const unknown = await write(A, [{ type: 'append', n: 9999, text: 'Where?' }]);
  assert.deepEqual([codes(unknown), unknown.results[0].problem.errors[0].pointer], [['invalid'], '/items/0/n']);
  const long = await write(A, [{ type: 'append', n, text: 'x'.repeat(8000) }]);
  assert.deepEqual([codes(long), long.results[0].problem.errors[0].pointer], [['invalid'], '/items/0/text']);
  assert.deepEqual(codes(await write(A, [{ type: 'append', n, text: ' ' }])), ['invalid'], 'the schema: text not blank');
});

test('act: the person rejects a proposal; an out-of-date accept and a decided proposal are refused in plain words', async () => {
  const p = await write(A, [{ type: 'propose', n, ver: 2, action: 'drop', reason: 'The client declined.' },
    { type: 'propose', n, ver: 2, action: 'ack', reason: 'Or keep it.' }]);
  const [drop, ack] = p.results.map((x: any) => x.seq);
  const act = (b: object) => ({ board: 'notes', body: { type: 'act', ...b } });
  const rejected = await h.ok('act', act({ action: 'reject', n, proposal: drop }));
  assert.deepEqual([rejected.v, rejected.action, rejected.proposal], [10, 'reject', drop]);
  let problem = await h.fails('act', act({ action: 'drop', n, ver: 2, proposal: drop }), 422, 'invalid');
  assert.deepEqual(problem.errors, [{ pointer: '/proposal', detail: `proposal: proposal ${drop} was already decided` }]);
  await write(A, [{ type: 'append', n, text: 'Third line.' }]);
  problem = await h.fails('act', act({ action: 'ack', n, ver: 3, proposal: ack }), 422, 'invalid');
  assert.deepEqual(problem.errors, [{ pointer: '/proposal', detail: `proposal: ${n} changed after this was proposed; ask the agent to look again` }]);
  await h.ok('act', act({ action: 'reject', n, proposal: ack }));
  const shown = (await h.ok('show_node', { board: 'notes', n })).proposals.map((x: any) => [x.seq, x.outcome]);
  assert.deepEqual(shown, [[drop, 'rejected'], [ack, 'rejected']]);
});
