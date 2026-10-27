// Every node is part of the conversation (every-node BE_02, PLAN rulings 2-6, api.md 120): the kind
// decides which cards can be answered (✓ or ✗ on a question, decision or action; a note never
// answers, D-045); a note on any card is owed an answer, a Later on any card a handover; NEW,
// updates and awaiting are on every card; counts and `list_open` are over the cards that need an
// answer plus anything owed; `show_node` gives every card's status.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView } from '#format';
import type { ConditionKind } from '../src/index.ts';
import { boardState, conditionsOf, counts, DECIDED, isDecided, nodeDetail, openItems, pendingItems } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The shared scene at v8 plus a finding (5) and a note (6) in A's container `r`. */
function cards() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'finding' });
  l.node(A, 6, 1, { region: 'r', kind: 'note' });
  return l;
}

const bundle = { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' };
const rows = (l: ReturnType<typeof cards>, kind: ConditionKind) =>
  conditionsOf(l.state(), { board: 'b' }).filter((c) => c.kind === kind).map((c) => c.id);

test('answered: ✓ or ✗ answers a card that needs an answer; nothing answers any other card (D-045)', () => {
  assert.deepEqual([...DECIDED].sort(), ['acknowledged', 'dropped']);
  assert.equal(isDecided('question', 'commented'), false, 'a note never answers a card');
  assert.equal(isDecided('decision', 'acknowledged'), true);
  assert.equal(isDecided('action', 'context'), false);
  assert.equal(isDecided('finding', 'commented'), false);
  assert.equal(isDecided('risk', 'acknowledged'), false, 'an old board\'s ✓ on a risk decides nothing (ruling 8)');
});

test('counts: a comment on a question puts it with the agent, not answered; one on a finding counts nowhere (D-045, D-046)', () => {
  const l = cards();
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Yes, go.' });
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Noted.' });
  l.act({ action: 'later', n: 6, ver: 1 });
  const s = l.state();
  assert.deepEqual(counts(boardView(s, 'b'), boardState(s, 'b')), { total: 3, answered: 0, later: 0, open: 2, withAgent: 1 });
});

test('owed: a comment on a question is owed a reply (ruling 5); a ✓ after it ends it', () => {
  const l = cards();
  const ask = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why this one?' });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, ask: { kind: 'comment', seq: ask } }]);
  l.act({ action: 'ack', n: 1, ver: 1 });
  assert.deepEqual(pendingItems(l.state(), 'b'), [], 'acknowledged: closed, nothing owed');
});

test('owed: a comment or more context on any card, until a reply or a newer version', () => {
  const l = cards();
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'Is this still true?' });
  const more = l.act({ action: 'context', n: 6, ver: 1 });
  // Cards 5 and 6 (identities) are board b's 4th and 5th: card 4 is on board b2 (api.md 125).
  assert.deepEqual(pendingItems(l.state(), 'b'), [
    { n: 4, ask: { kind: 'comment', seq: note } }, { n: 5, ask: { kind: 'context', seq: more } },
  ]);
  assert.deepEqual(pendingItems(l.state(), 'b', A).map((x) => x.n), [4, 5], 'A drew them');
  l.agent(A, { type: 'reply', n: 5, text: 'Yes.', to: note });
  l.node(A, 6, 2, { region: 'r', kind: 'note', body: 'More.' });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
});

test('owed: Later on any card owes a handover until its park (D-020)', () => {
  const l = cards();
  const later = l.act({ action: 'later', n: 5, ver: 1 });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 4, later }], 'identity 5 is board b\'s card 4');
  assert.deepEqual(rows(l, 'item.awaiting'), [5]);
  l.agent(A, { type: 'park', n: 5, bundle });
  assert.deepEqual([pendingItems(l.state(), 'b'), rows(l, 'item.awaiting')], [[], []]);
});

test('NEW and updates are on every card (PLAN assumption A)', () => {
  const l = cards();
  assert.deepEqual(rows(l, 'item.unseen'), [1, 2, 3, 5, 6]);
  l.seenBoard('b', l.seq);
  l.node(A, 7, 1, { region: 'r', kind: 'risk' });
  assert.deepEqual(rows(l, 'item.new'), [7]);
  l.act({ action: 'comment', n: 7, ver: 1, text: 'Seen it.' });
  assert.deepEqual(rows(l, 'item.new'), [], 'any act on it ends NEW');
});

test('list_open: open cards that need an answer, plus any card owing an answer or a handover', () => {
  const l = cards();
  const asked = l.act({ action: 'comment', n: 1, ver: 1, text: 'Yes, but why?' });
  const noted = l.act({ action: 'comment', n: 5, ver: 1, text: 'Source?' });
  l.act({ action: 'later', n: 6, ver: 1 });
  const open = () => openItems(l.state(), 'b').map((x) => [x.n, x.status, x.pending ?? null]);
  assert.deepEqual(open(), [
    [1, 'with-agent', 'comment'], [2, 'open', null], [3, 'open', null], [4, 'with-agent', 'comment'], [5, 'later', 'later'],
  ]);
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: asked });
  l.agent(A, { type: 'reply', n: 5, text: 'The audit.', to: noted });
  l.agent(A, { type: 'park', n: 6, bundle });
  assert.deepEqual(open(), [[1, 'open', null], [2, 'open', null], [3, 'open', null]],
    'answered notes: the question is open again (a note never answers it, D-045), plain cards leave the list');
});

test('show_node: every card has a status', () => {
  const l = cards();
  l.act({ action: 'context', n: 5, ver: 1 });
  const s = l.state();
  assert.equal(nodeDetail(s, 5)?.status, 'with-agent', 'an old More context reads as a note (D-045), with the agent (D-046)');
  assert.equal(nodeDetail(s, 6)?.status, 'open');
  assert.equal(nodeDetail(s, 1)?.status, 'open');
});

test('proposals: a comment leaves one standing (only ✓ or ✗ ends it); an old board\'s on a finding never shows', () => {
  const l = cards();
  l.v = 10;
  const on1 = l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'ack', reason: 'Agreed in chat.' });
  const on5 = l.agent(A, { type: 'propose', n: 5, ver: 1, action: 'drop', reason: 'Out of date.' });
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Yes, and also this.' });
  assert.deepEqual(conditionsOf(l.state(), { board: 'b' }).filter((c) => c.kind === 'proposal.open').map((c) => c.seq), [on1]);
  assert.ok(on5 > on1);
  l.act({ action: 'ack', n: 1, ver: 1, proposal: on1 });
  assert.deepEqual(rows(l, 'proposal.open'), []);
});
