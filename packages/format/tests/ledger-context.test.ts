// Ledger v3 context rules (api.md 14-16, 23): joins, grant requests and their answers, revokes,
// sizes and sends, judged against what came before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containerKey, readLedger } from '../src/index.ts';

const A = 'a-abcd1234';
const B = 'a-wxyz9876';
let seq = 0;
const at = '2026-10-05T09:00:00Z';
const agent = (who: string, e: object) => ({ v: 3, seq: ++seq, at, by: 'agent', agent: who, ...e });
const person = (e: object) => ({ v: 3, seq: ++seq, at, by: 'person', type: 'act', ...e });

/** A joins, opens board b with region r and one node; B joins and asks for r. */
function base() {
  seq = 0;
  return [
    agent(A, { type: 'join', label: 'Pricing chat' }),
    agent(A, { type: 'board', board: 'b', title: 'B' }),
    agent(A, { type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    agent(A, { type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'r', kind: 'note', title: 'N' } }),
    agent(B, { type: 'join', label: 'Review chat' }),
    agent(B, { type: 'grant-request', board: 'b', region: 'r', reason: 'Adding findings.' }),
  ];
}
const read = (events: object[]) => readLedger(events.map((e) => JSON.stringify(e)));

test('a valid v3 sequence: the creator holds, a grant adds a holder, a revoke removes one', () => {
  const events = [...base(), person({ action: 'grant', request: 6 }), person({ action: 'size', n: 1, size: 'l' }),
    person({ action: 'revoke', holder: B, board: 'b', region: 'r' }), person({ action: 'send', board: 'b' })];
  const { problems, index } = read(events);
  assert.deepEqual(problems, []);
  assert.deepEqual([...index.agents], [A, B]);
  assert.equal(index.creators.get(containerKey('b', 'r')), A);
  assert.deepEqual([...index.holders.get(containerKey('b', 'r'))!], [A]);
  assert.deepEqual(index.requests.get(6), { agent: B, board: 'b', region: 'r', answer: { action: 'grant', seq: 7 } });
});

test('join: the agent id must be new', () => {
  const events = [...base(), agent(A, { type: 'join', label: 'Again' })];
  assert.deepEqual(read(events).problems, [`line 7: agent: "${A}" has already joined`]);
});

test('grant-request: the board and region must exist', () => {
  const events = [...base(), agent(B, { type: 'grant-request', board: 'b', region: 'nope', reason: 'x' }),
    agent(B, { type: 'grant-request', board: 'zz', region: 'r', reason: 'x' })];
  assert.deepEqual(read(events).problems, ['line 7: region: unknown "nope"', 'line 8: board: unknown "zz"']);
});

test('grant and deny answer an open grant request, once', () => {
  const events = [...base(), person({ action: 'deny', request: 6, text: 'Not now.' }), person({ action: 'grant', request: 6 }),
    person({ action: 'grant', request: 4 })];
  assert.deepEqual(read(events).problems, [
    'line 8: request: grant request 6 was already answered', 'line 9: request: no grant request 4',
  ]);
});

test('revoke: a container\'s creator cannot be removed', () => {
  const events = [...base(), person({ action: 'revoke', holder: A, board: 'b', region: 'r' })];
  assert.deepEqual(read(events).problems, [`line 7: holder: "${A}" created b/r, and a container's creator cannot be removed`]);
});

test('grant-request: a second open request from the same agent for the same container is refused', () => {
  const events = [...base(), agent(B, { type: 'grant-request', board: 'b', region: 'r', reason: 'Again.' }),
    agent(A, { type: 'region', board: 'b', region: { id: 'q', title: 'Q', mode: 'grid' } }),
    agent(B, { type: 'grant-request', board: 'b', region: 'q', reason: 'Another container.' }),
    person({ action: 'deny', request: 6 }),
    agent(B, { type: 'grant-request', board: 'b', region: 'r', reason: 'After the answer.' })];
  assert.deepEqual(read(events).problems, ['line 7: board: this agent already has open grant request 6 for b/r']);
});

test('revoke: only a current holder can be revoked', () => {
  const events = [...base(), person({ action: 'revoke', holder: B, board: 'b', region: 'r' })];
  assert.deepEqual(read(events).problems, [`line 7: holder: "${B}" does not hold b/r`]);
});

test('size needs a known node; send needs a known board', () => {
  const events = [...base(), person({ action: 'size', n: 9, size: 's' }), person({ action: 'send', board: 'zz' })];
  assert.deepEqual(read(events).problems, ['line 7: n: unknown node 9', 'line 8: board: unknown "zz"']);
});

test('a region written by a v2 line has no holder', () => {
  const events = base();
  (events[2] as { v: number; agent: string }).v = 2;
  (events[2] as { agent: string }).agent = 'kiro';
  const { problems, index } = read(events);
  assert.deepEqual(problems, []);
  assert.equal(index.holders.has(containerKey('b', 'r')), false);
});

test('board access (D-034): a request for the whole board, once while open; a grant holds the board; its creator stays', () => {
  const events = [...base(), agent(B, { type: 'grant-request', board: 'b', reason: 'The whole board.' }),
    agent(B, { type: 'grant-request', board: 'b', reason: 'Again.' }), person({ action: 'grant', request: 7 }),
    person({ action: 'revoke', holder: A, board: 'b' }), person({ action: 'revoke', holder: B, board: 'b' }),
    person({ action: 'revoke', holder: B, board: 'b' })];
  const { problems, index } = read(events);
  assert.deepEqual(problems, [
    'line 8: board: this agent already has open grant request 7 for board b',
    `line 10: holder: "${A}" created board b, and a board's creator cannot be removed`,
    `line 12: holder: "${B}" does not hold board b`,
  ]);
  assert.deepEqual(index.requests.get(7), { agent: B, board: 'b', answer: { action: 'grant', seq: 9 } });
  assert.equal(index.creators.get('b'), A);
  assert.deepEqual([...index.holders.get('b')!], [A]);
});

test('board seen (api.md 87): a known board, up to a line already written', () => {
  const seen = (board: string, head: number) => ({ v: 8, seq: ++seq, at, by: 'person', type: 'seen', board, head });
  const ok = read([...base(), seen('b', 6), seen('b', 2)]);
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(read([...base(), seen('nope', 6)]).problems, ['line 7: board: unknown "nope"']);
  assert.deepEqual(read([...base(), seen('b', 7)]).problems, ['line 7: head: the ledger is at line 6']);
});
