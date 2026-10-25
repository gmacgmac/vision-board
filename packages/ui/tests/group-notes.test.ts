// A note on a group of cards drawn once (group-note-once task, groupNoteOnce flag): a card's pin and
// "Your note" block leave the group's notes and the replies to them out (`notesView` with `apart`),
// and the group's one pin comes from `groupMarkers` over the folded notes, placed by `groupPinAt`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { ItemNote } from '../../actions/src/index.ts';
import type { CardReply } from '../src/index.ts';
import { GROUP_PIN, groupAnchors, groupMarkers, groupPinAt, notesView } from '../src/index.ts';

const AT = '2026-10-25T09:00:00Z';
const node = (n: number): ViewNode => ({ id: String(n), n, region: 'r', kind: 'question', title: 'T' });
const own = (seq: number, text = 'mine'): ItemNote => ({ seq, kind: 'comment', text, at: AT });
const onGroup = (seq: number, nodes: number[], f: Partial<ItemNote> = {}): ItemNote => ({ seq, kind: 'comment', text: `group ${seq}`, at: AT, nodes, ...f });
const reply = (seq: number, to?: number): CardReply => ({ seq, text: `reply ${seq}`, at: AT, ...(to !== undefined && { to }) });

test('notesView with apart: a group note and the replies to it leave the card; its own notes and replies stay', () => {
  const notes = [own(10), onGroup(11, [1, 2]), own(12, 'second')];
  const replies = [reply(13, 11), reply(14, 10), reply(15)];
  const v = notesView(node(1), notes, replies, undefined, true)!;
  assert.equal(v.count, '2 notes');
  assert.deepEqual(v.entries.map((e) => e.seq), [10, 12, 15]);
  assert.deepEqual(v.pin, { seq: 12, index: 2, sent: false, label: 'Note 2 on item 1. Edit it' });
  // Without apart (the flag off): today's view, the group note on the card with its reply.
  const today = notesView(node(1), notes, replies)!;
  assert.equal(today.count, '3 notes');
  assert.deepEqual(today.entries.map((e) => e.seq), [10, 11, 12, 15]);
});

test('notesView with apart: a card whose only note is on a group has no pin and no block', () => {
  assert.equal(notesView(node(2), [onGroup(11, [1, 2])], [reply(13, 11)], undefined, true), undefined);
});

test('groupMarkers: one marker per group of cards, from every card\'s copy of the note, its latest note on the pin', () => {
  const a = onGroup(11, [4, 2], { sent: true, locked: true });
  const b = onGroup(20, [2, 4]);
  const c = onGroup(15, [1, 3, 5], { locked: true });
  const items = [
    { notes: [own(9), a, b] }, { notes: [a, b] }, // cards 2 and 4 both hold the group's notes
    { notes: [c] }, { notes: [c] }, { notes: [c, own(30)] },
  ];
  assert.deepEqual(groupMarkers(items), [
    { key: '1,3,5', cards: [1, 3, 5], seq: 15, index: 1, sent: true, label: 'Note 1 on items 1, 3, 5, answered. Show it' },
    { key: '2,4', cards: [2, 4], seq: 20, index: 2, sent: false, label: 'Note 2 on items 2, 4. Edit it' },
  ]);
  assert.deepEqual(groupMarkers([{ notes: [own(1)] }]), [], 'no group, no marker');
});

test('groupPinAt: under the card\'s own pin on its right edge, never meeting it; more pins stack down clear of the footer, then out', () => {
  const box = { x: 100, y: 50, w: 248, h: 160 };
  const first = groupPinAt(box, 0);
  // The card's own pin (node.css `.vb-note-pin`): 26px, top -12px, right -12px.
  const cardPin = { x: box.x + box.w + 12 - GROUP_PIN.size, y: box.y - 12 };
  assert.equal(first.x, cardPin.x, 'the same column as the card\'s pin');
  assert.ok(first.y >= cardPin.y + GROUP_PIN.size + 2, 'clear of the card\'s pin');
  const step = GROUP_PIN.size + GROUP_PIN.gap;
  assert.deepEqual(groupPinAt(box, 1), { x: first.x, y: first.y + step }, 'the next one under it');
  const foot = box.y + box.h - GROUP_PIN.foot;
  for (let k = 0; k < 6; k += 1) {
    const at = groupPinAt(box, k);
    assert.ok(k === 0 || at.y + GROUP_PIN.size <= foot, `pin ${k} clear of the footer`);
  }
  // A short card: one row, the second pin a column further out.
  const short = { ...box, h: 80 };
  assert.deepEqual(groupPinAt(short, 1), { x: first.x + step, y: first.y });
});

test('groupAnchors: the lowest card drawn; a group whose lowest card already has a pin moves to its next card; stacks only when all are taken', () => {
  const m = (cards: number[], seq: number) => ({ key: cards.join(','), cards, seq, index: 1, sent: false, label: '' });
  const drawn = (n: number) => n !== 4;
  assert.deepEqual(groupAnchors([m([1, 2], 10), m([1, 3], 11), m([1, 2], 12), m([4, 5], 13), m([4, 6], 14)], drawn), [
    { card: 1, slot: 0 }, { card: 3, slot: 0 }, { card: 2, slot: 0 }, { card: 5, slot: 0 }, { card: 6, slot: 0 },
  ]);
  assert.deepEqual(groupAnchors([m([1, 2], 10), m([1, 2, 3], 11), m([2, 3], 12), m([1, 3], 13)], () => true), [
    { card: 1, slot: 0 }, { card: 2, slot: 0 }, { card: 3, slot: 0 }, { card: 1, slot: 1 },
  ], 'every card of the last group has a pin: it stacks on its lowest');
  assert.deepEqual(groupAnchors([m([4], 1)], drawn), [undefined], 'no card drawn: no place');
});
