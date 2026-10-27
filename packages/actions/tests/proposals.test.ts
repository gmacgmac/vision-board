// Proposals and seen (proposals-seen-parking BE_01, api.md 93-94): the act rules for accepting
// and rejecting a proposal, how the fold ends proposals, and seeing a card by acting on it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { validateAct } from '../src/index.ts';
import { A, B, scene } from './ledger-v3.ts';

const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 10, seq: 999, at: '2026-10-08T10:00:00Z', by: 'person', type: 'act', action: 'ack', id: 1, ver: 1, ...f });

/** The scene at v10 with a drop proposed on item 1 and an ack proposed on item 2. */
function proposed() {
  const l = scene();
  l.v = 10;
  const drop = l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'The client declined.' });
  const ack = l.agent(B, { type: 'propose', n: 2, ver: 1, action: 'ack', reason: 'Settled in chat.' });
  return { l, drop, ack };
}

test('accept and reject: a proposal on the same card, accepted with its own action', () => {
  const { l, drop } = proposed();
  const s = l.state();
  assert.deepEqual(validateAct(act({ action: 'drop', proposal: drop }), s, 'b'), []);
  assert.deepEqual(validateAct(act({ action: 'reject', proposal: drop, ver: undefined }), s, 'b'), []);
  assert.deepEqual(validateAct(act({ action: 'ack', proposal: drop }), s, 'b'),
    [`proposal: proposal ${drop} is to cross; accept it with drop, or reject it`]);
  assert.deepEqual(validateAct(act({ action: 'drop', id: 2, proposal: drop }), s, 'b'), [`proposal: ${drop} is not a proposal on item 2`]);
  assert.deepEqual(validateAct(act({ action: 'reject', proposal: 3, ver: undefined }), s, 'b'), ['proposal: 3 is not a proposal on item 1']);
});

test('a decided proposal is refused; an out-of-date one can be rejected but not accepted', () => {
  const { l, drop, ack } = proposed();
  l.act({ action: 'reject', n: 2, proposal: ack });
  l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
  const s = l.state();
  assert.deepEqual(validateAct(act({ action: 'ack', id: 2, proposal: ack }), s, 'b'), [`proposal: proposal ${ack} was already decided`]);
  assert.deepEqual(validateAct(act({ action: 'drop', ver: 2, proposal: drop }), s, 'b'),
    ['proposal: 1 changed after this was proposed; ask the agent to look again']);
  assert.deepEqual(validateAct(act({ action: 'reject', proposal: drop, ver: undefined }), s, 'b'), []);
});

test('fold: accept, reject, and a decision on the card closes the rest', () => {
  const { l, drop, ack } = proposed();
  const other = l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'ack', reason: 'Or keep it.' });
  const rejected = l.agent(B, { type: 'propose', n: 2, ver: 1, action: 'drop', reason: 'Not needed.' });
  const no = l.act({ action: 'reject', n: 2, proposal: rejected });
  const yes = l.act({ action: 'drop', n: 1, ver: 1, proposal: drop });
  const plain = l.act({ action: 'ack', n: 2, ver: 1 });
  const s = l.state();
  const ended = (seq: number) => { const p = s.proposals.get(seq)!; return [p.decidedBy, p.outcome]; };
  assert.deepEqual(ended(drop), [yes, 'accepted']);
  assert.deepEqual(ended(other), [yes, 'closed'], 'the other open proposal on the card');
  assert.deepEqual(ended(rejected), [no, 'rejected'], 'an ended proposal keeps how it ended');
  assert.deepEqual(ended(ack), [plain, 'closed'], 'an ack without a proposal closes the card\'s open ones');
  assert.deepEqual([s.items.get(1)!.status, s.items.get(2)!.status], ['dropped', 'acknowledged']);
});

test('fold: a reject is not a decision on the item', () => {
  const { l, drop } = proposed();
  l.act({ action: 'reject', n: 1, proposal: drop });
  assert.equal(l.state().items.get(1)?.status ?? 'open', 'open');
});

test('seen: any act naming a card sees its latest version, never lowered; Send and container acts do not', () => {
  const l = scene();
  l.v = 10;
  l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
  l.node(B, 2, 2, { region: 'q', body: 'Changed.' });
  l.act({ action: 'send', board: 'b' });
  l.act({ action: 'comment', board: 'b', region: 'r', text: 'On all of r.' });
  assert.deepEqual([l.state().seen.get(1), l.state().seen.get(2)], [undefined, undefined]);
  l.act({ action: 'size', n: 1, size: 's' });
  assert.equal(l.state().seen.get(1), 2, 'a size pick');
  l.act({ action: 'move', nodes: [2, 3], region: 'later' });
  assert.deepEqual([l.state().seen.get(2), l.state().seen.get(3)], [2, 1], 'every card a group act names');
  l.seen(1, 1);
  assert.equal(l.state().seen.get(1), 2, 'never lowered');
});
