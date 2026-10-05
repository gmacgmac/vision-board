// What the agent owes on a whole container (3_FE_04, api.md 36, 41, 73): the latest standing note
// on each container, until a `reply` whose `to` is its `seq` answers it, owed to the container's
// holders (the agent that drew it among them) and to no one else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openItems, pendingItems } from '../src/index.ts';
import { A, B, Ledger } from './ledger-v3.ts';

const on = { board: 'b', region: 'r' };

/** Board `b`: A drew and holds `r` (item 1), B holds `q` (item 2). */
function board(): Ledger {
  const l = new Ledger();
  l.v = 7;
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(B, { type: 'join', label: 'Review chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.region(B, 'q');
  l.node(B, 2, 1, { region: 'q' });
  return l;
}

const owed = (l: Ledger, agent?: string) => pendingItems(l.state(), 'b', agent).filter((p) => p.region !== undefined);

test('a container note is owed to its holder, by the note\'s seq, until a reply names it', () => {
  const l = board();
  const note = l.act({ action: 'context', ...on, text: 'Say more about the split.' });
  assert.deepEqual(owed(l, A), [{ n: 0, region: 'r', ask: { kind: 'context', seq: note } }]);
  assert.deepEqual(owed(l), owed(l, A), 'with no agent, every container counts');
  l.agent(A, { type: 'reply', n: 1, text: 'Noted.' });
  assert.equal(owed(l, A).length, 1, 'a reply naming nothing does not answer it');
  l.agent(A, { type: 'reply', n: 1, text: 'Split by plan.', to: note });
  assert.deepEqual(owed(l, A), []);
});

test('an edit keeps the same seq; a Send does not answer it; the latest standing note is the one owed', () => {
  const l = board();
  const first = l.act({ action: 'comment', ...on, text: 'Split?' });
  l.act({ action: 'note-edit', ...on, note: first, text: 'Split by plan?', kind: 'context' });
  l.act({ action: 'send', board: 'b' });
  assert.deepEqual(owed(l, A), [{ n: 0, region: 'r', ask: { kind: 'context', seq: first } }]);
  const second = l.act({ action: 'comment', ...on, text: 'And the names?' });
  assert.deepEqual(owed(l, A).map((p) => p.ask?.seq), [second]);
  l.agent(A, { type: 'reply', n: 1, text: 'Names fixed.', to: second });
  assert.deepEqual(owed(l, A), []);
});

test('a removed note is not owed', () => {
  const l = board();
  const note = l.act({ action: 'comment', ...on, text: 'Split?' });
  l.act({ action: 'note-remove', ...on, note });
  assert.deepEqual(owed(l, A), []);
  assert.deepEqual(owed(l), []);
});

test('an agent without access to the container is not owed it; each holder is owed its own', () => {
  const l = board();
  const r = l.act({ action: 'comment', ...on, text: 'Split?' });
  const q = l.act({ action: 'comment', board: 'b', region: 'q', text: 'More on review?' });
  assert.deepEqual(owed(l, A).map((p) => [p.region, p.ask?.seq]), [['r', r]]);
  assert.deepEqual(owed(l, B).map((p) => [p.region, p.ask?.seq]), [['q', q]]);
  assert.deepEqual(owed(l, 'a-nobody0000'), []);
  assert.deepEqual(owed(l).map((p) => p.region), ['r', 'q']);
});

test('a container note changes no card: cards are owed as before, and list_open stays cards only', () => {
  const l = board();
  const card = l.act({ action: 'comment', n: 1, ver: 1, text: 'Card note.' });
  l.act({ action: 'comment', ...on, text: 'Container note.' });
  const all = pendingItems(l.state(), 'b', A);
  assert.deepEqual(all.filter((p) => p.region === undefined), [{ n: 1, ask: { kind: 'comment', seq: card } }]);
  // openItem (list_open `items`, the write answer's `pending`) has no room for a container.
  assert.deepEqual(openItems(l.state(), 'b', A).map((x) => x.n), [1]);
});
