// The open cards (open-list FE_01): the toolbar's "N open" chip lists them, so `openCards` is the one
// definition of "open" that `counts.open` reads, and the two can never disagree. Board `b` numbers
// its cards 1-5 while the ledger's identities differ (the decision is identity 5, board number 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView } from '#format';
import type { LedgerState } from '../src/index.ts';
import { boardState, counts, openCards } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

function board() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'decision', title: 'Pick a plan' });
  l.node(A, 6, 1, { region: 'r', kind: 'finding' });
  return l;
}

const open = (s: LedgerState) => openCards(boardView(s, 'b'), boardState(s, 'b'));
const count = (s: LedgerState) => counts(boardView(s, 'b'), boardState(s, 'b')).open;

test('every card that needs an answer and has none is open, by board number, with its title', () => {
  const s = board().state();
  assert.deepEqual(open(s), [
    { n: 1, id: '1', title: 'Node 1' }, { n: 2, id: '2', title: 'Node 2' },
    { n: 3, id: '3', title: 'Old item' }, { n: 4, id: '4', title: 'Pick a plan' },
  ]);
  assert.equal(count(s), 4, 'a card that only informs is never open');
});

test('answered, later and with the agent leave the list, and the count follows it', () => {
  const l = board();
  l.act({ action: 'ack', n: 1, ver: 1 });
  l.act({ action: 'later', n: 2, ver: 1 });
  l.act({ action: 'comment', n: 5, ver: 1, text: 'What does it cost?' });
  const s = l.state();
  assert.deepEqual(open(s).map((c) => c.n), [3]);
  assert.equal(count(s), open(s).length);
});

test('the list is in board number order whatever order the view holds', () => {
  const s = board().state();
  const view = boardView(s, 'b');
  const reversed = { ...view, nodes: [...view.nodes].reverse() };
  assert.deepEqual(openCards(reversed, boardState(s, 'b')).map((c) => c.n), [1, 2, 3, 4]);
});

test('nothing open is an empty list and a zero count', () => {
  const l = board();
  for (const n of [1, 2, 3, 5]) l.act({ action: 'ack', n, ver: 1 });
  const s = l.state();
  assert.deepEqual(open(s), []);
  assert.equal(count(s), 0);
});
