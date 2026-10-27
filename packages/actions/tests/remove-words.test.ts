// The confirm's words for the person's Remove card and Remove container (N24 rulings 1 and 3,
// remove-words.ts): what goes, by board number and title, the cards listed when there are several,
// and a warning for each card or container note still owed an answer. Board b's numbers differ from
// the ledger's identities (board a drew first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { cardsWords, containerWords, foldLedger } from '../src/index.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 16, seq: ++seq, at: `2026-10-12T11:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const region = (board: string, id: string, title: string) => agent({ type: 'region', board, region: { id, title, mode: 'grid' } });
const card = (board: string, n: number, r: string, title: string) => agent({ type: 'node', board, n, ver: 1, node: { region: r, kind: 'question', title } });

/** Board a holds identity 1; board b holds 2-5 as its cards 1-4: 1-3 in Notes, 4 in Plan. */
function state(extra: string[] = []) {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), region('a', 'p', 'P'), card('a', 1, 'p', 'Elsewhere'),
    agent({ type: 'board', board: 'b', title: 'B' }), region('b', 'notes', 'Notes'), region('b', 'plan', 'Plan'),
    card('b', 2, 'notes', 'Venue lead time'), card('b', 3, 'notes', 'Catering'), card('b', 4, 'notes', 'Budget'), card('b', 5, 'plan', 'Dates'),
    ...extra,
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('one card: its number and title; no warning when nothing is owed', () => {
  assert.deepEqual(cardsWords(state(), 'b', [1]), {
    heading: 'Remove card 1 \'Venue lead time\'?',
    body: 'It leaves the board and stays in the board\'s history; its number isn\'t given again.',
    confirm: 'Remove card', done: 'Removed card 1',
  });
});

test('several cards: counted, listed in number order, each owed one warned', () => {
  const s = state([person({ type: 'act', action: 'comment', n: 4, ver: 1, text: 'Too high?' })]);
  const w = cardsWords(s, 'b', [4, 3, 1]);
  assert.equal(w.heading, 'Remove 3 cards?');
  assert.equal(w.body, 'They leave the board and stay in the board\'s history; their numbers aren\'t given again. Card 3 still has an unanswered comment.');
  assert.deepEqual(w.list!.items, [{ ref: '1', text: 'Venue lead time' }, { ref: '3', text: 'Budget' }, { ref: '4', text: 'Dates' }]);
  assert.deepEqual([w.confirm, w.done], ['Remove cards', 'Removed 3 cards']);
});

test('a container: its title and how many cards go (moves count), its unanswered note warned', () => {
  const s = state([
    person({ type: 'act', action: 'move', n: 5, board: 'b', region: 'notes' }),
    person({ type: 'act', action: 'context', n: 2, ver: 1 }),
    person({ type: 'act', action: 'comment', board: 'b', region: 'notes', text: 'Still needed?' }),
  ]);
  const w = containerWords(s, 'b', 'notes', 'Notes');
  assert.equal(w.heading, 'Remove container \'Notes\' and its 4 cards?');
  assert.equal(w.body, 'It leaves the board with its cards and stays in the board\'s history. Card 1 still has an unanswered comment. Container \'Notes\' still has an unanswered comment.');
  assert.deepEqual(w.list!.items.map((x) => x.ref), ['1', '2', '3', '4']);
  assert.deepEqual([w.confirm, w.done], ['Remove container', 'Removed container \'Notes\'']);
  const one = containerWords(state(), 'b', 'plan', 'Plan');
  assert.deepEqual([one.heading, one.list!.items], ['Remove container \'Plan\' and its card?', [{ ref: '4', text: 'Dates' }]]);
  const empty = containerWords(state([person({ type: 'act', action: 'move', n: 5, board: 'b', region: 'notes' })]), 'b', 'plan', 'Plan');
  assert.deepEqual([empty.heading, empty.body, empty.list], ['Remove container \'Plan\'?', 'It leaves the board and stays in the board\'s history.', undefined]);
});
