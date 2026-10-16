// "With agent" (D-046, with-agent-state task): a card that asks is open (needs the person), with the
// agent (the person's latest note on it is owed an answer: `owedNote`, the note half of `item.owed`),
// answered (✓ or ✗) or later. A note moves it to the agent; the agent's answer moves it back to open;
// only ✓ or ✗ answers it (D-045). The page reads `commented`, every agent read `with-agent`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView } from '../../format/src/index.ts';
import type { LedgerState } from '../src/index.ts';
import { boardState, counts, itemsOut, nodeDetail, openItems, replyLines, replyText, statusOut, STATUS_OUT } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** Board `b` at v8: questions 1, 2 and 3, a decision (identity 5, board number 4) and a finding
 * (identity 6, board number 5) in A's `r`. */
function board() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'decision' });
  l.node(A, 6, 1, { region: 'r', kind: 'finding' });
  return l;
}

const status = (s: LedgerState, n: number) => boardState(s, 'b').items.get(String(n))?.status ?? 'open';
const count = (s: LedgerState) => counts(boardView(s, 'b'), boardState(s, 'b'));

test('a note on an open decision puts it with the agent: neither open nor answered', () => {
  const l = board();
  l.act({ action: 'comment', n: 5, ver: 1, text: 'What does this cost?' });
  const s = l.state();
  assert.equal(status(s, 4), 'commented');
  assert.deepEqual(count(s), { total: 4, open: 3, withAgent: 1, answered: 0, later: 0 });
});

test('the agent\'s reply to the note, or a newer version, brings the card back to open', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'What does this cost?' });
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Which page?' });
  l.agent(A, { type: 'reply', n: 5, text: 'About a day.', to: note });
  l.node(A, 1, 2, { region: 'r', body: 'The settings page.' });
  const s = l.state();
  assert.deepEqual([status(s, 4), status(s, 1)], ['open', 'open']);
  assert.deepEqual(count(s), { total: 4, open: 4, withAgent: 0, answered: 0, later: 0 });
});

test('✓ or ✗ after a note answers the card; Later after a note puts it in later', () => {
  const l = board();
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Hm.' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Hm.' });
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'comment', n: 2, ver: 1, text: 'Not now.' });
  l.act({ action: 'later', n: 2, ver: 1 });
  const s = l.state();
  assert.deepEqual([status(s, 4), status(s, 1), status(s, 2)], ['acknowledged', 'dropped', 'later']);
  assert.deepEqual(count(s), { total: 4, open: 1, withAgent: 0, answered: 2, later: 1 });
});

test('a lit ✓ cleared after the note leaves the note owed: the card is with the agent again', () => {
  const l = board();
  l.act({ action: 'comment', n: 5, ver: 1, text: 'Hm.' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'reopen', n: 5, ver: 1 });
  const s = l.state();
  assert.equal(status(s, 4), 'commented', 'the one rule: what is owed (`item.owed`)');
  assert.deepEqual(count(s), { total: 4, open: 3, withAgent: 1, answered: 0, later: 0 });
});

test('a note removed before it is sent leaves the card open', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 5, ver: 1, text: 'Hm.' });
  l.act({ action: 'note-remove', n: 5, ver: 1, note });
  assert.equal(status(l.state(), 4), 'open');
});

test('a note on a card that informs changes no count', () => {
  const l = board();
  const before = count(l.state());
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Source?' });
  const s = l.state();
  assert.deepEqual(count(s), before);
  assert.deepEqual(count(s), { total: 4, open: 4, withAgent: 0, answered: 0, later: 0 });
});

test('every agent read says `with-agent` (STATUS_OUT, the API edge)', () => {
  const l = board();
  l.act({ action: 'comment', n: 5, ver: 1, text: 'What does this cost?' });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'reopen', n: 5, ver: 1 });
  const s = l.state();
  assert.equal(STATUS_OUT.commented, 'with-agent');
  assert.equal(statusOut('commented'), 'with-agent');
  assert.equal(nodeDetail(s, 5)?.status, 'with-agent', 'show_node');
  assert.equal(openItems(s, 'b').find((x) => x.n === 4)?.status, 'with-agent', 'list_open');
  assert.equal(itemsOut(boardState(s, 'b').items)['4']?.status, 'with-agent', 'get_board');
  assert.ok(!JSON.stringify([nodeDetail(s, 5), openItems(s, 'b')]).includes('commented'));
});

// Review polish round 2 ruling 3: in the numbered reply (and the Send message), "Still open" lists only
// the cards that need the person; the cards with the agent get their own line after it; "Nothing left
// open." only when both are empty.
test('the numbered reply: "Still open" is the person\'s, "Waiting for your reply" the agent\'s, after it', () => {
  const l = board();
  const tail = () => { const s = l.state(); return replyLines(boardView(s, 'b'), boardState(s, 'b')).tail; };
  l.act({ action: 'comment', n: 5, ver: 1, text: 'What does this cost?' });
  l.act({ action: 'comment', n: 2, ver: 1, text: 'Which page?' });
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Source?' });
  l.act({ action: 'ack', n: 1, ver: 1 });
  assert.equal(tail(), 'Still open: 3\nWaiting for your reply: 2, 4', 'a note on a card that informs is in neither');
  const s = l.state();
  assert.deepEqual(replyText(boardView(s, 'b'), boardState(s, 'b')).split('\n').slice(-2), ['Still open: 3', 'Waiting for your reply: 2, 4']);
  l.act({ action: 'drop', n: 3, ver: 1 });
  assert.equal(tail(), 'Waiting for your reply: 2, 4');
  l.act({ action: 'ack', n: 2, ver: 1 });
  l.act({ action: 'later', n: 5, ver: 1 });
  assert.equal(tail(), 'Nothing left open.');
});
