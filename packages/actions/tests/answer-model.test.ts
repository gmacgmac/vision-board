// The answer model (D-045, answer-model PLAN rulings 1, 2, 4-7, 9): ✓ and ✗ are the only answers
// and carry no meaning (`check` / `cross` to the agent, ✓ / ✗ in the numbered reply); a note never
// answers a card and is owed; the agent's answer to a card's latest note clears the ✓, ✗ or Later
// made before it and marks the card until the person looks (`unseenAnswer`); the agent reads each
// card's current answer after its cursor, not every click.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView } from '../../format/src/index.ts';
import type { LedgerState } from '../src/index.ts';
import {
  boardState, conditionsOf, counts, DECIDED, CLOSED, isDecided, pendingItems, replyScope, replyText, responsesPage, unseenAnswer,
} from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** Board `b` at v8: questions 1, 2 and 3, a decision (identity 5, board number 4) and a finding
 * (identity 6, board number 5) in A's `r`. Card 4 is on board b2 (api.md 125). */
function board() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'decision' });
  l.node(A, 6, 1, { region: 'r', kind: 'finding' });
  return l;
}

const status = (s: LedgerState, n: number) => boardState(s, 'b').items.get(String(n))?.status ?? 'open';
const reported = (s: LedgerState, after: number) => responsesPage(s, 'b', after, 100).responses.map((e) => [e.n, e.action]);
const unsent = (s: LedgerState) => conditionsOf(s, { board: 'b' }).some((c) => c.kind === 'board.unsent');
const unseenRows = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'item.unseen').map((c) => c.id);

test('only ✓ and ✗ answer: DECIDED and CLOSED are one set', () => {
  assert.deepEqual([...DECIDED].sort(), ['acknowledged', 'dropped']);
  assert.deepEqual([...CLOSED].sort(), [...DECIDED].sort());
  assert.equal(isDecided('decision', 'commented'), false, 'a note never answers a card');
  assert.equal(isDecided('decision', 'acknowledged'), true);
  assert.equal(isDecided('finding', 'acknowledged'), false);
});

test('a note on a decision leaves it unanswered and owed, with the agent (D-046); ✓ or ✗ answers it', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'What does this cost?' });
  let s = l.state();
  assert.equal(status(s, 4), 'commented');
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 4, ask: { kind: 'comment', seq: note } }]);
  assert.deepEqual(counts(boardView(s, 'b'), boardState(s, 'b')), { total: 4, answered: 0, later: 0, open: 3, withAgent: 1 });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'drop', n: 1, ver: 1 });
  s = l.state();
  assert.deepEqual(pendingItems(s, 'b'), [], 'a ✓ after the note closes the card');
  assert.deepEqual(counts(boardView(s, 'b'), boardState(s, 'b')), { total: 4, answered: 2, later: 0, open: 2, withAgent: 0 });
});

test('counts: a finding never counts, whatever the person did on it (ruling 4)', () => {
  const l = board();
  l.act({ action: 'ack', n: 6, ver: 1 });
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Noted.' });
  l.act({ action: 'later', n: 2, ver: 1 });
  const s = l.state();
  assert.deepEqual(counts(boardView(s, 'b'), boardState(s, 'b')), { total: 4, answered: 0, later: 1, open: 3, withAgent: 0 });
});

test('check_responses: ✓ reads `check`, ✗ reads `cross`, with no `means`', () => {
  const l = board();
  const from = l.seq;
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Source?' });
  const page = responsesPage(l.state(), 'b', from, 100);
  assert.deepEqual(page.responses.map((e) => [e.n, e.action]), [[1, 'cross'], [4, 'check'], [5, 'comment']]);
  assert.ok(page.responses.every((e) => !('means' in e)));
});

test('the numbered reply writes ✓ and ✗; an old More context reads as a note', () => {
  const l = board();
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'later', n: 6, ver: 1 });
  l.act({ action: 'context', n: 2, ver: 1, text: 'Explain it.' });
  const s = l.state();
  assert.deepEqual(replyText(boardView(s, 'b'), boardState(s, 'b')).split('\n').slice(1), [
    '1 (question): ✗', '2 (question): comment: Explain it.', '4 (decision): ✓', '5 (finding): saved for later', 'Still open: 3',
    'Waiting for your reply: 2',
  ]);
});

test('an old `context` line still folds, reads as a note and is owed', () => {
  const l = board();
  const old = l.act({ action: 'context', n: 5, ver: 1, text: 'Say more.' });
  const s = l.state();
  assert.equal(status(s, 4), 'commented', 'a note, not a status of its own');
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 4, ask: { kind: 'context', seq: old } }]);
  assert.equal(isDecided('decision', status(s, 4)), false);
});

test('card 20: ✓, a note, the agent\'s reply to it: open, unmarked, and unseen until the person looks', () => {
  const l = board();
  l.act({ action: 'ack', n: 5, ver: 1 });
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'Wait, which page?' });
  let s = l.state();
  assert.equal(status(s, 4), 'acknowledged', 'the ✓ stands while the note waits');
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 4, ask: { kind: 'comment', seq: note } }], 'a note after a ✓ is owed');
  l.seen(5, 1);
  l.agent(A, { type: 'reply', n: 5, text: 'The settings page. Still ✓?', to: note });
  s = l.state();
  assert.equal(status(s, 4), 'open', 'the agent\'s answer cleared the ✓');
  assert.equal(boardState(s, 'b').items.get('4')?.unseenAnswer, true);
  assert.equal(unseenAnswer(s, 5), true);
  assert.ok(unseenRows(s).includes(5), 'the updated marker a new version gets');
  assert.deepEqual(pendingItems(s, 'b'), []);
  l.seen(5, 1);
  s = l.state();
  assert.equal(unseenAnswer(s, 5), false);
  assert.equal(boardState(s, 'b').items.get('4')?.unseenAnswer, undefined);
  assert.ok(!unseenRows(s).includes(5), 'looked at: the marker ends');
});

test('card 20 with an `append`: a newer version clears the ✓, ✗ or Later made before the note', () => {
  const l = board();
  l.act({ action: 'later', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Is this still needed?' });
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Unless it is cheap.' });
  l.node(A, 5, 2, { region: 'r', kind: 'decision', body: 'Yes: the export needs it.' });
  l.node(A, 1, 2, { region: 'r', body: 'It is cheap.' });
  const s = l.state();
  assert.deepEqual([status(s, 4), status(s, 1)], ['open', 'open']);
  assert.ok(!conditionsOf(s, { board: 'b' }).some((c) => c.kind === 'item.awaiting'), 'Later no longer counts');
  assert.deepEqual([unseenAnswer(s, 5), unseenAnswer(s, 1)], [true, true]);
});

test('a ✓ made after the note, or after the agent\'s answer, counts as usual', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'Why?' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.agent(A, { type: 'reply', n: 5, text: 'Because.', to: note });
  assert.equal(status(l.state(), 4), 'acknowledged', 'the ✓ came after the note');
  const other = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: other });
  l.act({ action: 'drop', n: 1, ver: 1 });
  assert.equal(status(l.state(), 1), 'dropped');
});

test('a reply to an earlier note, not the latest, clears nothing', () => {
  const l = board();
  const first = l.act({ action: 'comment', n: 5, ver: 1, text: 'One.' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Two.' });
  l.agent(A, { type: 'reply', n: 5, text: 'About one.', to: first });
  const s = l.state();
  assert.equal(status(s, 4), 'acknowledged');
  assert.equal(unseenAnswer(s, 5), false);
});

test('ruling 9: ✓ then cleared after the cursor reports nothing for the card', () => {
  const l = board();
  const cursor = l.seq;
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'reopen', n: 5, ver: 1 });
  l.act({ action: 'ack', n: 1, ver: 1 });
  const s = l.state();
  assert.deepEqual(reported(s, cursor), [[1, 'check']]);
  assert.deepEqual([...replyScope(s, 'b', cursor).cards], [1], 'nor does the Send message');
});

test('ruling 9: ✓ then ✗ reports only ✗; a clear of a ✓ the agent read reports the clear', () => {
  const l = board();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const cursor = l.seq;
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'drop', n: 5, ver: 1 });
  l.act({ action: 'reopen', n: 1, ver: 1 });
  assert.deepEqual(reported(l.state(), cursor), [[1, 'reopen'], [4, 'cross']]);
  assert.deepEqual(reported(l.state(), 0), [[4, 'cross']], 'from the start, card 1 is as it was');
});

test('ruling 9: notes are still reported one by one, beside the card\'s latest answer', () => {
  const l = board();
  const cursor = l.seq;
  l.act({ action: 'comment', n: 5, ver: 1, text: 'One.' });
  l.act({ action: 'later', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Two.' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  assert.deepEqual(reported(l.state(), cursor), [[4, 'comment'], [4, 'comment'], [4, 'check']]);
});

test('ruling 9: a ✓ the agent\'s own answer cleared, made again, is reported', () => {
  const l = board();
  l.act({ action: 'ack', n: 5, ver: 1 });
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'Hm.' });
  const cursor = l.seq;
  l.agent(A, { type: 'reply', n: 5, text: 'Answered.', to: note });
  l.act({ action: 'ack', n: 5, ver: 1 });
  assert.deepEqual(reported(l.state(), cursor), [[4, 'check']]);
});

test('ruling 9: ✓ then cleared before a Send leaves nothing to send', () => {
  const l = board();
  l.act({ action: 'ack', n: 5, ver: 1 });
  assert.equal(unsent(l.state()), true);
  l.act({ action: 'reopen', n: 5, ver: 1 });
  assert.equal(unsent(l.state()), false, 'as it was at the last Send');
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'send', board: 'b' });
  l.act({ action: 'ack', n: 1, ver: 1 });
  l.act({ action: 'drop', n: 1, ver: 1 });
  assert.equal(unsent(l.state()), false, 'back to the ✗ the last Send carried');
  l.act({ action: 'reopen', n: 1, ver: 1 });
  assert.equal(unsent(l.state()), true, 'cleared since the Send: something to send');
});
