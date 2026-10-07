// Containers and the write check (D-027, api.md 23-26): every row of point 24, allowed and
// refused, plus holders and grant requests as the fold keeps them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardAccess, canWrite, grantRequests, holders } from '../src/index.ts';
import { A, B, C, Ledger, scene } from './ledger-v3.ts';

const need = (board: string, region: string) => ({ board, region });

test('holders: the creator, plus grants, minus revocations; a v2 region has none', () => {
  const l = scene();
  const req = l.request(C, 'r');
  l.act({ action: 'grant', request: req });
  assert.deepEqual(holders(l.state(), 'b', 'r'), [A, C]);
  l.act({ action: 'revoke', holder: C, board: 'b', region: 'r' });
  const s = l.state();
  assert.deepEqual(holders(s, 'b', 'r'), [A]);
  assert.deepEqual(holders(s, 'b', 'old'), []);
});

test('a new board needs no grant; a new region id needs only the board (D-034)', () => {
  const s = scene().state();
  assert.equal(canWrite(s, C, { type: 'board', board: 'fresh' }), 'ok');
  assert.equal(canWrite(s, B, { type: 'region', board: 'b', region: { id: 'fresh' } }), 'ok');
  assert.deepEqual(canWrite(s, C, { type: 'region', board: 'b', region: { id: 'fresh' } }), { board: 'b' });
});

test('an existing region id needs that region', () => {
  const s = scene().state();
  assert.equal(canWrite(s, A, { type: 'region', board: 'b', region: { id: 'r' } }), 'ok');
  assert.deepEqual(canWrite(s, C, { type: 'region', board: 'b', region: { id: 'r' } }), need('b', 'r'));
});

test('a new node needs its region', () => {
  const s = scene().state();
  assert.equal(canWrite(s, A, { type: 'node', board: 'b', n: 50, node: { region: 'r' } }), 'ok');
  assert.deepEqual(canWrite(s, C, { type: 'node', board: 'b', n: 50, node: { region: 'r' } }), need('b', 'r'));
});

test('a region written by a v2 line needs a grant for any v3 write', () => {
  const s = scene().state();
  assert.deepEqual(canWrite(s, A, { type: 'node', board: 'b', n: 50, node: { region: 'old' } }), need('b', 'old'));
  assert.deepEqual(canWrite(s, A, { type: 'reply', n: 3 }), need('b', 'old'));
});

test('a new version needs the node\'s current region', () => {
  const s = scene().state();
  assert.equal(canWrite(s, A, { type: 'node', board: 'b', n: 1, node: { region: 'r' } }), 'ok');
  assert.deepEqual(canWrite(s, C, { type: 'node', board: 'b', n: 1, node: { region: 'r' } }), need('b', 'r'));
});

test('a move needs both containers, source first', () => {
  const l = scene();
  let s = l.state();
  // A holds r (the source) but not q (the target); B holds q but not r.
  assert.deepEqual(canWrite(s, A, { type: 'node', board: 'b', n: 1, node: { region: 'q' } }), need('b', 'q'));
  assert.deepEqual(canWrite(s, B, { type: 'node', board: 'b', n: 1, node: { region: 'q' } }), need('b', 'r'));
  assert.deepEqual(canWrite(s, C, { type: 'node', board: 'b', n: 1, node: { region: 'q' } }), need('b', 'r'));
  l.act({ action: 'grant', request: l.request(A, 'q') });
  s = l.state();
  assert.equal(canWrite(s, A, { type: 'node', board: 'b', n: 1, node: { region: 'q' } }), 'ok');
});

test('link and unlink need the from node\'s region only', () => {
  const s = scene().state();
  assert.equal(canWrite(s, A, { type: 'link', from: 1, to: 2 }), 'ok');
  assert.equal(canWrite(s, A, { type: 'unlink', from: 1, to: 2 }), 'ok');
  assert.deepEqual(canWrite(s, B, { type: 'link', from: 1, to: 2 }), need('b', 'r'));
  assert.equal(canWrite(s, B, { type: 'link', from: 2, to: 1 }), 'ok');
});

test('reply, propose and park: a holder of the node\'s region may; anyone else may not', () => {
  const s = scene().state();
  for (const type of ['reply', 'propose', 'park'] as const) {
    assert.equal(canWrite(s, A, { type, n: 1 }), 'ok', type);
    assert.deepEqual(canWrite(s, C, { type, n: 1 }), need('b', 'r'), type);
  }
});

test('an author parks a node it moved into Later after losing Later', () => {
  const l = scene();
  l.act({ action: 'grant', request: l.request(A, 'later') });
  l.node(A, 1, 2, { region: 'later' });
  l.act({ action: 'revoke', holder: A, board: 'b', region: 'later' });
  const s = l.state();
  assert.deepEqual(holders(s, 'b', 'later'), [B]);
  assert.equal(canWrite(s, A, { type: 'park', n: 1 }), 'ok');
  assert.equal(canWrite(s, A, { type: 'reply', n: 1 }), 'ok');
  assert.deepEqual(canWrite(s, C, { type: 'park', n: 1 }), need('b', 'later'));
  // A no longer holds Later, so a new version there still needs it.
  assert.deepEqual(canWrite(s, A, { type: 'node', board: 'b', n: 1, node: { region: 'later' } }), need('b', 'later'));
});

test('unknown regions and nodes are left to the context check', () => {
  const s = scene().state();
  assert.equal(canWrite(s, B, { type: 'node', board: 'b', n: 50, node: { region: 'nope' } }), 'ok');
  assert.equal(canWrite(s, C, { type: 'reply', n: 999 }), 'ok');
  assert.equal(canWrite(s, C, { type: 'link', from: 999, to: 1 }), 'ok');
});

test('grantRequests: seq, agent, container, reason and answer, with a refusal\'s note', () => {
  const l = scene();
  const one = l.request(C, 'r');
  const two = l.request(C, 'q');
  const yes = l.act({ action: 'grant', request: one });
  const no = l.act({ action: 'deny', request: two, text: 'Not this one.' });
  const other = l.request(C, 'x', 'b2');
  const s = l.state();
  assert.deepEqual(grantRequests(s, 'b'), [
    { seq: one, board: 'b', region: 'r', reason: 'Adding to r.', at: grantRequests(s)[0]!.at, agent: C, answer: { action: 'grant', seq: yes } },
    { seq: two, board: 'b', region: 'q', reason: 'Adding to q.', at: grantRequests(s)[1]!.at, agent: C, answer: { action: 'deny', seq: no, text: 'Not this one.' } },
  ]);
  assert.deepEqual(grantRequests(s).map((r) => r.seq), [one, two, other]);
});

test('another agent\'s request is its own; after an answer a new one is kept', () => {
  const l = scene();
  const first = l.request(C, 'r');
  l.request(B, 'r'); // another agent's request is its own (a repeat of C's is refused by the ledger)
  assert.deepEqual(grantRequests(l.state()).map((r) => [r.seq, r.agent]), [[first, C], [first + 1, B]]);
  l.act({ action: 'deny', request: first });
  const again = l.request(C, 'r');
  assert.deepEqual(grantRequests(l.state()).map((r) => r.seq), [first, first + 1, again]);
});

test('boardAccess: open requests with the agent\'s label, and holders per region with the creator marked', () => {
  const l = scene();
  const granted = l.request(C, 'r');
  l.act({ action: 'grant', request: granted });
  const refused = l.request(C, 'q');
  l.act({ action: 'deny', request: refused, text: 'No.' });
  const open = l.request(C, 'later');
  l.request(C, 'x', 'b2');
  const s = l.state();
  const at = grantRequests(s).find((r) => r.seq === open)!.at;
  assert.deepEqual(boardAccess(s, 'b'), {
    requests: [{ seq: open, region: 'later', reason: 'Adding to later.', at, agent: C, label: 'Spare chat' }],
    // D-034: the board's creator, and every agent that made or was granted a container on it.
    boardHolders: [{ agent: A, label: 'Pricing chat', creator: true }, { agent: B, label: 'Review chat' }, { agent: C, label: 'Spare chat' }],
    holders: {
      r: [{ agent: A, label: 'Pricing chat', creator: true }, { agent: C, label: 'Spare chat' }],
      q: [{ agent: B, label: 'Review chat', creator: true }],
      later: [{ agent: B, label: 'Review chat', creator: true }],
    },
  });
});

test('boardAccess: a board with no agents, or none waiting, leaves both out (api.md 32)', () => {
  const l = new Ledger();
  l.v2({ type: 'board', board: 'old', title: 'Old' });
  l.v2({ type: 'region', board: 'old', region: { id: 'r', title: 'R', mode: 'grid' } });
  assert.deepEqual(boardAccess(l.state(), 'old'), {});
  assert.equal('requests' in boardAccess(scene().state(), 'b'), false);
});
