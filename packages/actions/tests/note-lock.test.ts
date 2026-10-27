// A note locks once it is answered (popovers-larger-thread ruling 5): it can be edited or removed
// only before whichever comes first, a Send after it or the agent answering it (a `reply` naming it
// in `to`, or a newer version of its card, such as an `append`: api.md 36). After that it is
// history: the server refuses `note-edit` and `note-remove`, and every read marks it `locked`, the
// one state the page reads too. Card, group and container notes alike.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { boardState, validateAct } from '../src/index.ts';
import { A, B, Ledger } from './ledger-v3.ts';

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

const next = (l: Ledger, f: Partial<ActEvent>): ActEvent =>
  ({ v: 7, seq: l.seq + 1, at: '2026-10-05T10:00:00Z', by: 'person', type: 'act', action: 'ack', ...f } as ActEvent);
const notesOn = (l: Ledger, n: number) => boardState(l.state(), 'b').items.get(String(n))?.notes ?? [];
const regionNotes = (l: Ledger) => boardState(l.state(), 'b').regionNotes.get('r') ?? [];

/** The problems `note-edit` and `note-remove` of `note` get, on card `id` or on container `r`. */
function changes(l: Ledger, note: number, on: { id: number } | { board: string; region: string }): string[][] {
  return [{ action: 'note-edit', text: 'Later words' }, { action: 'note-remove' }]
    .map((f) => validateAct(next(l, { ...f, ...on, note } as Partial<ActEvent>), l.state(), 'b'));
}

test('an agent reply naming a note not yet sent locks it: edit and remove refused, it reads locked, a new note may start', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why per seat?' });
  assert.deepEqual(changes(l, note, { id: 1 }), [[], []], 'unanswered: the writer may still change it');
  assert.equal(notesOn(l, 1)[0]!.locked, undefined);
  l.agent(A, { type: 'reply', n: 1, text: 'Because of support load.', to: note });
  for (const p of changes(l, note, { id: 1 })) {
    assert.deepEqual(p, [`note: note ${note} was answered by the agent, and an answered note is history; write a new note instead`]);
  }
  assert.deepEqual(notesOn(l, 1).map((x) => [x.seq, x.locked, x.sent]), [[note, true, undefined]], 'locked, not sent');
  assert.deepEqual(validateAct(next(l, { action: 'comment', id: 1, ver: 1, text: 'And per use?' }), l.state(), 'b'), [],
    'the locked note is not the card\'s note not yet sent');
});

test('a Send locks it too, and says so', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why per seat?' });
  l.act({ action: 'send', board: 'b' });
  for (const p of changes(l, note, { id: 1 })) assert.ok(p.some((x) => x.includes('was sent to the agent')), p.join('; '));
  assert.deepEqual(notesOn(l, 1).map((x) => [x.locked, x.sent]), [[true, true]]);
});

test('a newer version of its card (an append) answers it and locks it; a reply to another note or naming none does not', () => {
  const l = board();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why per seat?' });
  l.agent(A, { type: 'reply', n: 1, text: 'A general remark.' });
  l.agent(B, { type: 'reply', n: 2, text: 'On another card.', to: note + 999 });
  assert.equal(notesOn(l, 1)[0]!.locked, undefined, 'still the writer\'s to change');
  l.node(A, 1, 2, { region: 'r', body: 'Per seat, because support load grows with seats.' });
  assert.equal(notesOn(l, 1)[0]!.locked, true);
  for (const p of changes(l, note, { id: 1 })) assert.ok(p.some((x) => x.includes('answered by the agent')), p.join('; '));
});

test('a group note locks when a reply on any of its cards names it', () => {
  const l = board();
  const note = l.act({ action: 'comment', nodes: [1, 2], text: 'Same question on both' });
  l.agent(B, { type: 'reply', n: 2, text: 'Answered here.', to: note });
  assert.deepEqual([notesOn(l, 1)[0]!.locked, notesOn(l, 2)[0]!.locked], [true, true]);
  for (const p of changes(l, note, { id: 1 })) assert.ok(p.some((x) => x.includes('answered by the agent')), p.join('; '));
});

test('a container note locks when a reply names it, and its writer may change it until then', () => {
  const l = board();
  const on = { board: 'b', region: 'r' };
  const note = l.act({ action: 'comment', ...on, text: 'Is the order right?' });
  assert.deepEqual(changes(l, note, on), [[], []]);
  l.agent(A, { type: 'reply', n: 1, text: 'Yes, by price.', to: note });
  assert.deepEqual(regionNotes(l).map((x) => [x.locked, x.sent]), [[true, undefined]]);
  for (const p of changes(l, note, on)) assert.ok(p.some((x) => x.includes('answered by the agent')), p.join('; '));
});
