// What the agent owes and what the person has not seen (D-018, D-020, api.md 36, 41), and the
// person's responses after a cursor (check_responses).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openItems, pendingItems, responsesAfter, unseenItems } from '../src/index.ts';
import { A, B, C, scene } from './ledger-v3.ts';

test('pending: the latest comment, until a reply names it', () => {
  const l = scene();
  const ask = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, ask: { kind: 'comment', seq: ask } }]);
  l.agent(A, { type: 'reply', n: 1, text: 'Unrelated.' });
  assert.equal(pendingItems(l.state(), 'b').length, 1, 'a reply naming nothing does not answer it');
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: ask });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
});

test('pending: a reply to an earlier comment does not answer the latest one', () => {
  const l = scene();
  const first = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  const second = l.act({ action: 'context', n: 1, ver: 1 });
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: first });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, ask: { kind: 'context', seq: second } }]);
});

test('pending: a newer version answers the comment', () => {
  const l = scene();
  l.act({ action: 'context', n: 1, ver: 1, text: 'More?' });
  l.node(A, 1, 2, { region: 'r', body: 'More.' });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
});

test('pending: Later with no park after it; a park before the Later does not count', () => {
  const l = scene();
  const bundle = { situation: 's', background: 'b', assessment: 'a', recommendation: 'r' };
  l.agent(A, { type: 'park', n: 1, bundle });
  const later = l.act({ action: 'later', n: 1, ver: 1 });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, later }]);
  l.agent(A, { type: 'park', n: 1, bundle });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
});

test('pending: a decided item owes nothing; a reopened one owes its comment again', () => {
  const l = scene();
  const ask = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.act({ action: 'ack', n: 1, ver: 1 });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
  l.act({ action: 'reopen', n: 1, ver: 1 });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, ask: { kind: 'comment', seq: ask } }]);
});

test('pending, scoped to an agent: only items it may answer', () => {
  const l = scene();
  l.act({ action: 'comment', n: 1, ver: 1, text: 'For A' });
  l.act({ action: 'comment', n: 2, ver: 1, text: 'For B' });
  l.act({ action: 'comment', n: 3, ver: 1, text: 'v2 item' });
  const s = l.state();
  assert.deepEqual(pendingItems(s, 'b').map((x) => x.n), [1, 2, 3]);
  assert.deepEqual(pendingItems(s, 'b', A).map((x) => x.n), [1]);
  assert.deepEqual(pendingItems(s, 'b', B).map((x) => x.n), [2]);
  assert.deepEqual(pendingItems(s, 'b', C), []);
});

test('pending, scoped: an author still owes the park on a node it moved to Later', () => {
  const l = scene();
  l.act({ action: 'grant', request: l.request(A, 'later') });
  l.node(A, 1, 2, { region: 'later' });
  l.act({ action: 'revoke', holder: A, board: 'b', region: 'later' });
  const later = l.act({ action: 'later', n: 1, ver: 2 });
  const s = l.state();
  assert.deepEqual(pendingItems(s, 'b', A), [{ n: 1, later }]);
  assert.deepEqual(pendingItems(s, 'b', B), [{ n: 1, later }], 'B holds Later');
  assert.deepEqual(pendingItems(s, 'b', C), []);
});

test('unseen: items newer than the person last saw; seen is 0 when never seen', () => {
  const l = scene();
  assert.deepEqual(unseenItems(l.state(), 'b'), [{ n: 1, ver: 1, seen: 0 }, { n: 2, ver: 1, seen: 0 }, { n: 3, ver: 1, seen: 0 }]);
  l.seen(1, 1);
  l.seen(2, 1);
  l.seen(3, 1);
  assert.deepEqual(unseenItems(l.state(), 'b'), []);
  l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
  assert.deepEqual(unseenItems(l.state(), 'b'), [{ n: 1, ver: 2, seen: 1 }]);
  assert.deepEqual(unseenItems(l.state(), 'b2'), [{ n: 4, ver: 1, seen: 0 }]);
});

test('responsesAfter: the person\'s acts on this board after the cursor', () => {
  const l = scene();
  const one = l.act({ action: 'ack', n: 1, ver: 1 });
  l.act({ action: 'ack', n: 4, ver: 1 }); // board b2
  const send = l.act({ action: 'send', board: 'b' });
  const s = l.state();
  assert.deepEqual(responsesAfter(s, 'b', 0).map((e) => e.seq), [one, send]);
  assert.deepEqual(responsesAfter(s, 'b', one).map((e) => e.seq), [send]);
  assert.deepEqual(responsesAfter(s, 'b', send), []);
});

test('responsesAfter, scoped: its containers, Send, and the answers to its own grant requests', () => {
  const l = scene();
  const ack1 = l.act({ action: 'ack', n: 1, ver: 1 });
  const ack2 = l.act({ action: 'ack', n: 2, ver: 1 });
  const reqC = l.request(C, 'r');
  const reqB = l.request(B, 'r');
  const grantC = l.act({ action: 'grant', request: reqC });
  const denyB = l.act({ action: 'deny', request: reqB, text: 'Not now.' });
  const send = l.act({ action: 'send', board: 'b' });
  const s = l.state();
  assert.deepEqual(responsesAfter(s, 'b', 0, A).map((e) => e.seq), [ack1, send]);
  assert.deepEqual(responsesAfter(s, 'b', 0, B).map((e) => e.seq), [ack2, denyB, send]);
  // C now holds r, so it sees the ack on item 1 as well as its own grant.
  assert.deepEqual(responsesAfter(s, 'b', 0, C).map((e) => e.seq), [ack1, grantC, send]);
  assert.deepEqual(responsesAfter(s, 'b', 0).map((e) => e.seq), [ack1, ack2, grantC, denyB, send]);
});

test('responsesAfter, scoped: a revoke tells the agent it lost access', () => {
  const l = scene();
  l.act({ action: 'grant', request: l.request(C, 'r') });
  const revoke = l.act({ action: 'revoke', holder: C, board: 'b', region: 'r' });
  assert.ok(responsesAfter(l.state(), 'b', revoke - 1, C).some((e) => e.seq === revoke));
});

test('openItems with an agent: only the items it may answer, with their pending reason', () => {
  const l = scene();
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.act({ action: 'comment', n: 2, ver: 1, text: 'And this?' });
  const s = l.state();
  assert.deepEqual(openItems(s, 'b').map((x) => x.n), [1, 2, 3]);
  assert.deepEqual(openItems(s, 'b', A).map((x) => [x.n, x.pending]), [[1, 'comment']]);
  assert.deepEqual(openItems(s, 'b', B).map((x) => [x.n, x.pending]), [[2, 'comment']]);
  assert.deepEqual(openItems(s, 'b', C), [], 'C holds nothing, and the v2 item 3 has no holder');
});
