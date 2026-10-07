// write_board end to end (api.md 24-25, 29-37, 81-86): per-item results, every row of point 24
// allowed and refused, board access before container access (D-034), moves needing both grants,
// the grant loop with resent keys, replays and key conflicts, `base`, key references,
// depends-on-failed, scoped `pending`, a board revoke, and whole-call problems.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '../../../packages/client/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
let B: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Planning chat');
  B = await h.join('Review chat');
});
after(() => h.close());

/** One write_board call; the answer is checked against the spec by `h.ok`. */
async function write(who: Joined | Client, board: string, items: unknown[]): Promise<any> {
  const r = await h.ok('write_board', { board, body: { items } }, { as: 'client' in who ? who.client : who });
  assert.equal(h.last().status, 200);
  return r;
}
const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));
const region = (id: string, extra = {}) => ({ type: 'region', region: { id, title: id.toUpperCase(), mode: 'grid', ...extra } });
const node = (where: string, title: string, extra = {}) => ({ type: 'node', node: { region: where, kind: 'question', title, item: true }, ...extra });

/** Ask for a container, or with no region the board, as `who` and have the person grant it. */
async function grant(who: Joined, board: string, regionId?: string): Promise<void> {
  const body = { board, ...(regionId !== undefined && { region: regionId }), reason: 'For the test.' };
  const r = await h.ok('request_grant', { body }, { as: who.client });
  await h.ok('act', { board, body: { type: 'act', action: 'grant', request: r.request } });
}

const n: Record<string, number> = {};

test('a new board needs no grant; its writer holds it and its new regions; keys name nodes within a batch', async () => {
  const r = await write(A, 'plan', [
    { type: 'board', title: 'Plan', key: 'plan' }, { ...region('a'), key: 'reg-a' },
    node('a', 'Q1', { key: 'q1' }), node('a', 'Q2', { key: 'q2' }),
    { type: 'link', from: { key: 'q1' }, to: { key: 'q2' }, key: 'l1' },
  ]);
  assert.deepEqual(codes(r), ['ok', 'ok', 'ok', 'ok', 'ok']);
  assert.deepEqual(r.results.map((x: any) => [x.index, x.key]), [[0, 'plan'], [1, 'reg-a'], [2, 'q1'], [3, 'q2'], [4, 'l1']]);
  n.q1 = r.results[2].n;
  n.q2 = r.results[3].n;
  assert.deepEqual([r.results[2].ver, r.results[3].n - r.results[2].n, 'n' in r.results[0]], [1, 1, false]);
  // api.md 34: a node's result echoes its title, so the agent can check it wrote the node it meant
  assert.deepEqual([r.results[2].title, r.results[3].title, 'title' in r.results[0]], ['Q1', 'Q2', false]);
  assert.equal(r.head, h.ledger.state().seq);
  assert.deepEqual(r.pending, []);
  const stored = h.ledger.events().at(-1)!;
  assert.deepEqual(stored.type === 'link' && [stored.from, stored.to, stored.agent, stored.key], [n.q1, n.q2, A.agent, 'l1']);
  assert.deepEqual((await h.ok('show_container', { board: 'plan', region: 'a' })).holders, [A.agent]);
});

test('another agent\'s board: needs-grant names the board; B asks for it, is granted, and makes its own container', async () => {
  const batch = [{ ...region('b'), key: 'reg-b' }, node('b', 'B1', { key: 'b1' })];
  const refused = await write(B, 'plan', batch);
  assert.deepEqual(codes(refused), ['needs-grant', 'needs-grant']);
  const p = refused.results[0].problem;
  assert.deepEqual([p.board, 'region' in p], ['plan', false]);
  assert.match(p.detail, /Call request_grant once with just the board/);
  const asked = await h.ok('request_grant', { body: { board: 'plan', reason: 'I review the plan.' } }, { as: B.client });
  assert.deepEqual([h.last().status, asked.board, 'region' in asked], [201, 'plan', false]);
  const board = await h.ok('get_board', { board: 'plan' });
  assert.deepEqual(board.requests.map((r: any) => [r.seq, 'region' in r]), [[asked.request, false]]);
  await h.ok('act', { board: 'plan', body: { type: 'act', action: 'grant', request: asked.request } });
  assert.deepEqual((await h.ok('request_grant', { body: { board: 'plan', reason: 'Again.' } }, { as: B.client })),
    { board: 'plan', held: true });
  const b = await write(B, 'plan', batch);
  assert.deepEqual(codes(b), ['ok', 'ok']);
  n.b1 = b.results[1].n;
  assert.deepEqual((await h.ok('get_board', { board: 'plan' })).boardHolders.map((x: any) => [x.agent, x.creator ?? false]),
    [[A.agent, true], [B.agent, false]]);
});

test('point 24 over HTTP: what each item needs, allowed for the holder and refused with needs-grant for another agent', async () => {
  const refused = await write(B, 'plan', [
    region('a', { title: 'Renamed' }), // an existing region: the region
    node('a', 'B in a'), // a new node: its region
    { ...node('a', 'Q1 by B'), n: n.q1 }, // a new version: the node's current region
    { type: 'link', from: n.q1, to: n.b1 }, // a link: the from node's region
    { type: 'unlink', from: n.q1, to: n.q2 },
    { type: 'reply', n: n.q1, text: 'Hi' }, // reply, propose, park: the node's region
    { type: 'propose', n: n.q1, ver: 1, action: 'ack', reason: 'Done.' },
    { type: 'park', n: n.q1, bundle: { situation: 's', background: 'b', assessment: 'a', recommendation: 'r' } },
  ]);
  assert.deepEqual(codes(refused), Array(8).fill('needs-grant'));
  const p = refused.results[0].problem;
  assert.deepEqual([p.board, p.region, 'status' in p], ['plan', 'a', false]);
  assert.match(p.detail, /Call request_grant once, wait for the person's answer in check_responses, then resend the same items with the same keys/);
  const allowed = await write(B, 'plan', [
    { type: 'link', from: n.b1, to: n.q1, label: 'asks' }, { type: 'reply', n: n.b1, text: 'Mine.' },
  ]);
  assert.deepEqual(codes(allowed), ['ok', 'ok']);
  const holder = await write(A, 'plan', [
    region('a', { title: 'Renamed' }), { ...node('a', 'Q1, sharper'), n: n.q1 }, { type: 'unlink', from: n.q1, to: n.q2 },
    { type: 'reply', n: n.q1, text: 'Noted.' }, { type: 'propose', n: n.q1, ver: 2, action: 'ack', reason: 'Settled.' },
  ]);
  assert.deepEqual(codes(holder), ['ok', 'ok', 'ok', 'ok', 'ok']);
  assert.equal(holder.results[1].ver, 2);
});

test('both nodes of a link, and every node an item names, must be on the board in the path', async () => {
  const r = await write(A, 'plan', [
    { type: 'link', from: n.q1, to: h.seeded.q }, { type: 'reply', n: h.seeded.q, text: 'Wrong board.' },
    { ...node('a', 'Moved boards'), n: h.seeded.q },
  ]);
  assert.deepEqual(codes(r), ['invalid', 'invalid', 'invalid']);
  assert.deepEqual(r.results.map((x: any) => x.problem.errors[0].pointer), ['/items/0/to', '/items/1/n', '/items/2/n']);
});

test('a region written by a v2 line has no holder, so any write to it needs a grant', async () => {
  const r = await write(A, 'roadmap', [node('review', 'New review item')]);
  assert.deepEqual([codes(r), r.results[0].problem.board, r.results[0].problem.region], [['needs-grant'], 'roadmap', 'review']);
});

test('a moved node needs both its current region and the target region', async () => {
  const toB = await write(A, 'plan', [{ ...node('b', 'Q2 to b'), n: n.q2 }]);
  assert.deepEqual([codes(toB), toB.results[0].problem.region], [['needs-grant'], 'b']);
  const toA = await write(B, 'plan', [{ ...node('a', 'B1 to a'), n: n.b1 }]);
  assert.deepEqual([codes(toA), toA.results[0].problem.region], [['needs-grant'], 'a']);
  await grant(A, 'plan', 'b');
  const moved = await write(A, 'plan', [{ ...node('b', 'Q2 to b'), n: n.q2 }]);
  assert.deepEqual(codes(moved), ['ok']);
  assert.equal((await h.ok('show_node', { board: 'plan', n: n.q2 })).region, 'b');
  // Once A loses b, it can still answer the node it wrote last, but not redraw it there.
  await h.ok('act', { board: 'plan', body: { type: 'act', action: 'revoke', holder: A.agent, board: 'plan', region: 'b' } });
  const after = await write(A, 'plan', [{ type: 'reply', n: n.q2, text: 'Still mine to answer.' }, { ...node('b', 'Q2 again'), n: n.q2 }]);
  assert.deepEqual(codes(after), ['ok', 'needs-grant']);
});

test('the grant loop: needs-grant, request (and a repeat), the person grants, the resent batch succeeds with the same keys', async () => {
  const batch = [
    { ...region('b-notes'), key: 'bn' }, node('review', 'From B', { key: 'bq' }),
    { type: 'reply', n: { key: 'bq' }, text: 'Context.', key: 'br' },
  ];
  const first = await write(B, 'roadmap', batch);
  // B holds nothing on the roadmap: the new region needs the board, the node its container.
  assert.deepEqual(codes(first), ['needs-grant', 'needs-grant', 'depends-on-failed']);
  assert.deepEqual(first.results.slice(0, 2).map((x: any) => x.problem.region), [undefined, 'review']);
  const req = await h.ok('request_grant', { body: { board: 'roadmap', region: 'review', reason: 'Adding findings.' } }, { as: B.client });
  const again = await h.ok('request_grant', { body: { board: 'roadmap', region: 'review', reason: 'Adding findings.' } }, { as: B.client });
  assert.deepEqual([again.request, again.replayed], [req.request, true]);
  await h.ok('act', { board: 'roadmap', body: { type: 'act', action: 'grant', request: req.request } });
  // A grant on a container brings its board, so the new region is allowed too.
  const resent = await write(B, 'roadmap', batch);
  assert.deepEqual(codes(resent), ['ok', 'ok', 'ok']);
  assert.equal('replayed' in resent.results[0] || 'replayed' in resent.results[1], false, 'a failed item reserved no key');
  const replay = await write(B, 'roadmap', batch.slice(0, 1));
  assert.deepEqual([replay.results[0].replayed, replay.results[0].seq], [true, resent.results[0].seq]);
  assert.equal(h.ledger.events().filter((e) => e.type === 'region' && e.region.id === 'b-notes').length, 1);
});

test('retry keys: the same content replays the first result and writes nothing; other content is a conflict', async () => {
  const before = h.ledger.state().seq;
  const same = await write(A, 'plan', [node('a', 'Q1', { key: 'q1' }), { type: 'link', from: { key: 'q1' }, to: { key: 'q2' }, key: 'l1' }]);
  assert.deepEqual(same.results.map((x: any) => [x.ok, x.replayed, x.n]), [[true, true, n.q1], [true, true, undefined]]);
  assert.equal(same.results[0].ver, 1);
  assert.equal(h.ledger.state().seq, before);
  const other = await write(A, 'plan', [node('a', 'Q1 but different', { key: 'q1' })]);
  assert.deepEqual(codes(other), ['conflict']);
  assert.deepEqual(other.results[0].problem.errors, [{ pointer: '/items/0/key', detail: 'key reused for different content' }]);
  // Keys belong to one agent: B may use A's key for its own item.
  assert.deepEqual(codes(await write(B, 'plan', [node('b', 'B2', { key: 'q1' })])), ['ok']);
  assert.equal(h.ledger.state().seq, before + 1);
});

test('base: an update based on an old version is a conflict carrying the current ver', async () => {
  const stale = await write(A, 'plan', [{ ...node('a', 'Q1 from v1'), n: n.q1, base: 1 }]);
  assert.deepEqual([codes(stale), stale.results[0].problem.ver], [['conflict'], 2]);
  assert.equal(stale.results[0].problem.errors[0].pointer, '/items/0/base');
  const fresh = await write(A, 'plan', [{ ...node('a', 'Q1 from v2'), n: n.q1, base: 2 }]);
  assert.deepEqual([codes(fresh), fresh.results[0].ver], [['ok'], 3]);
});

test('key references: across calls from the same agent; an unknown key, or one that names no node, is invalid', async () => {
  const r = await write(A, 'plan', [
    { type: 'reply', n: { key: 'q1' }, text: 'By key.' }, { type: 'reply', n: { key: 'nope' }, text: 'x' },
    { type: 'reply', n: { key: 'l1' }, text: 'x' }, { type: 'reply', n: { key: 'b1' }, text: 'B\'s key, not mine.' },
  ]);
  assert.deepEqual(codes(r), ['ok', 'invalid', 'invalid', 'invalid']);
  assert.equal(r.results[1].problem.errors[0].pointer, '/items/1/n');
  assert.equal(h.ledger.events().find((e) => e.seq === r.results[0].seq)!.type === 'reply', true);
});

test('depends-on-failed: items naming a failed item\'s key fail too, transitively; the rest run', async () => {
  const r = await write(B, 'plan', [
    node('a', 'Not mine to add', { key: 'x1' }),
    { type: 'reply', n: { key: 'x1' }, text: 'About x1.', key: 'x2' },
    { type: 'link', from: { key: 'x2' }, to: n.b1 },
    { type: 'reply', n: n.b1, text: 'Unrelated.' },
  ]);
  assert.deepEqual(codes(r), ['needs-grant', 'depends-on-failed', 'depends-on-failed', 'ok']);
  assert.deepEqual(r.results[2].problem.errors, [{ pointer: '/items/2/from', detail: 'the item with key "x2" failed' }]);
  assert.equal('status' in r.results[1].problem, false);
});

test('pending is scoped to the containers the caller may answer', async () => {
  const onA = await h.ok('act', { board: 'plan', body: { type: 'act', action: 'comment', n: n.q1, ver: 3, text: 'Why this?' } });
  await h.ok('act', { board: 'plan', body: { type: 'act', action: 'context', n: n.b1, ver: 1 } });
  const a = await write(A, 'plan', [node('a', 'Q3')]);
  assert.deepEqual(a.pending.map((x: any) => [x.n, x.pending]), [[n.q1, 'comment']]);
  const b = await write(B, 'plan', [{ type: 'reply', n: n.b1, text: 'More soon.' }]);
  assert.deepEqual(b.pending.map((x: any) => [x.n, x.pending]), [[n.b1, 'context']]);
  const answered = await write(A, 'plan', [{ type: 'reply', n: n.q1, text: 'Because.', to: onA.seq }]);
  assert.deepEqual(answered.pending, []);
});

test('item problems: a bad item fails on its own with pointers into the body; a board item for an existing board is invalid', async () => {
  const r = await write(A, 'plan', [{ type: 'node', node: { region: 'a', kind: 'question' } }, { type: 'board', title: 'Again' }, { type: 'nope' }, 7]);
  assert.deepEqual(codes(r), ['invalid', 'invalid', 'invalid', 'invalid']);
  assert.deepEqual(r.results[0].problem.errors.map((e: any) => e.pointer), ['/items/0/node/title']);
  assert.match(r.results[1].problem.errors[0].detail, /already exists/);
  assert.deepEqual(r.results[2].problem.errors.map((e: any) => e.pointer), ['/items/2/type']);
});

test('whole-call problems: an unknown board with no board item, too many items, a body that does not fit, bad JSON', async () => {
  const before = h.ledger.state().seq;
  await h.fails('write_board', { board: 'nowhere', body: { items: [node('a', 'x')] } }, 404, 'not-found', A.client);
  const many = await h.fails('write_board', { board: 'plan', body: { items: Array(201).fill(node('a', 'x')) } }, 413, 'too-large', A.client);
  assert.match(many.detail, /201 items and the limit is 200/);
  await h.fails('write_board', { board: 'plan', body: { items: [] } }, 422, 'invalid', A.client);
  const extra = await h.fails('write_board', { board: 'plan', body: { items: [node('a', 'x')], board: 'plan' } }, 422, 'invalid', A.client);
  assert.deepEqual(extra.errors.map((e) => e.pointer), ['/board']);
  await h.fails('write_board', { board: 'plan', body: { item: [] } }, 422, 'invalid', A.client);
  const bad = await fetch(`${h.base}/api/boards/plan/write`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${A.secret}` }, body: '{"items":' });
  assert.equal(bad.status, 400);
  assert.equal(h.ledger.state().seq, before, 'nothing was written');
});

test('a board item makes a new board in the path, and later items in the batch can use it', async () => {
  const r = await write(B, 'fresh', [node('main', 'Too early'), { type: 'board', title: 'Fresh' }, { ...region('main'), key: 'fm' }, node('main', 'First')]);
  assert.deepEqual(codes(r), ['invalid', 'ok', 'ok', 'ok']);
  assert.deepEqual((await h.ok('list_boards')).boards.find((b: any) => b.board === 'fresh').title, 'Fresh');
});

test('a board revoke stops every write there, its own container too; the board\'s creator stays; only it writes the board line', async () => {
  const C = await h.join('Third chat');
  await grant(C, 'plan');
  const mine = await write(C, 'plan', [{ ...region('c'), key: 'reg-c' }, node('c', 'C1', { key: 'c1' })]);
  assert.deepEqual(codes(mine), ['ok', 'ok']);
  const retitle = await write(C, 'plan', [{ type: 'board', title: 'Mine now' }]);
  assert.deepEqual(codes(retitle), ['forbidden']);
  assert.match(retitle.results[0].problem.detail, /Only the agent that created board "plan"/);
  const kept = await h.fails('act', { board: 'plan', body: { type: 'act', action: 'revoke', holder: A.agent, board: 'plan' } }, 422, 'invalid');
  assert.match(kept.errors[0]!.detail, /created board plan, and a board's creator cannot be removed/);
  await h.ok('act', { board: 'plan', body: { type: 'act', action: 'revoke', holder: C.agent, board: 'plan' } });
  const after = await write(C, 'plan', [node('c', 'C2'), { type: 'reply', n: mine.results[1].n, text: 'Mine.' }]);
  assert.deepEqual(codes(after), ['needs-grant', 'needs-grant']);
  assert.deepEqual(after.results.map((x: any) => [x.problem.board, x.problem.region]), [['plan', undefined], ['plan', undefined]]);
  assert.equal(h.last().status, 200);
  assert.equal((await h.ok('request_grant', { body: { board: 'plan', reason: 'Back again.' } }, { as: C.client })).held, undefined);
});
