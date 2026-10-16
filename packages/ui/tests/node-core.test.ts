import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState, ItemNote, ItemStatus } from '../../actions/src/index.ts';
import type { CardReply } from '../src/index.ts';
import { buttonLabel, conversation, isNoteEntry, nodeLabel, nodeState, notesView, offers, STATUS_LABEL, STATUS_NAME } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set(), ...f });

let seq = 10;
const note = (text: string, kind: ItemNote['kind'] = 'comment', sent = false): ItemNote =>
  ({ seq: ++seq, kind, text, at: '2026-10-04T00:00:00Z', ...(sent && { sent: true as const }) });

const withItem = (status: ItemStatus, notes: ItemNote[] = []): BoardState =>
  board({ items: new Map([['1', { status, notes }]]) });

// The kind decides (api.md 118): a card that needs no answer offers a note and Later, never ✓ or ✗.
// More context is gone (D-045): a note can ask.
test('a numbered finding offers comment and later', () =>
  assert.deepEqual(offers(node({ kind: 'finding', n: 5 })), ['comment', 'later']));

test('a numbered question offers ✓, ✗, a note and Later', () =>
  assert.deepEqual(offers(node({ kind: 'question', n: 2 })), ['ack', 'drop', 'comment', 'later']));

// D-045, answer-model ruling 1: ✓ and ✗ are tools named Check and Cross, never a meaning.
test('a decision\'s ✓ and ✗ are named Check and Cross, with their keys', () => {
  const d = node({ kind: 'decision', n: 12 });
  assert.deepEqual(offers(d).map((a) => buttonLabel(a, d)),
    ['Check item 12 (A)', 'Cross item 12 (X)', 'Comment item 12 (C)', 'Save for later item 12 (L)']);
});

test('an unnumbered topic offers nothing', () =>
  assert.deepEqual(offers(node({ kind: 'topic' })), []));

test('nodeLabel names the number, kind, title and, on a card that asks, its status', () => {
  assert.equal(nodeLabel(node({ kind: 'question', n: 5, title: 'Use it?' }), 'later'),
    'Item 5, Question: Use it?, Saved for later');
  assert.equal(nodeLabel(node({ kind: 'decision', n: 6, title: 'Ship' }), 'acknowledged'), 'Item 6, Decision: Ship, checked');
  assert.equal(nodeLabel(node({ kind: 'action', n: 7, title: 'Pay' }), 'dropped'), 'Item 7, Action: Pay, crossed');
  assert.equal(nodeLabel(node({ kind: 'topic', title: 'Stack' }), 'open'), 'Topic: Stack');
});

test('a card whose note the agent owes reads "With agent" in its footer and its name (D-046)', () => {
  const st = nodeState(node({ kind: 'decision', n: 8, title: 'Ship' }), withItem('commented'));
  assert.deepEqual([st.statusWord, st.label], ['With agent', 'Item 8, Decision: Ship, With agent']);
  assert.equal(STATUS_LABEL.context, 'With agent', 'an old More context reads as a note');
});

// ---- nodeState: the rules update() applies ---------------------------------------------------

const STATUSES = Object.keys(STATUS_LABEL) as ItemStatus[];
const PRESSED_BY: Partial<Record<ItemStatus, string[]>> = {
  acknowledged: ['ack'], dropped: ['drop'], later: ['later'],
};

test('nodeState: every status sets status, label, status word and pressed', () => {
  const q = node({ n: 7, title: 'Ship it?' });
  for (const status of STATUSES) {
    const st = nodeState(q, withItem(status));
    assert.equal(st.status, status);
    assert.equal(st.label, `Item 7, Question: Ship it?, ${STATUS_NAME[status]}`);
    assert.equal(st.statusWord, STATUS_LABEL[status]);
    const pressedNow = Object.entries(st.pressed).filter(([, v]) => v).map(([a]) => a);
    assert.deepEqual(pressedNow, PRESSED_BY[status] ?? [], status);
  }
});

test('nodeState: an item with no response is open, unpressed and has no note', () => {
  const st = nodeState(node({ n: 1 }), board());
  assert.equal(st.status, 'open');
  assert.equal(st.statusWord, 'Open');
  assert.equal(st.notes, undefined);
  assert.equal(st.pinned, false);
  assert.deepEqual(Object.keys(st.pressed), ['ack', 'drop', 'comment', 'later']);
  assert.ok(Object.values(st.pressed).every((v) => v === false));
});

test('nodeState: pressed covers only the actions the type offers', () =>
  assert.deepEqual(Object.keys(nodeState(node({ kind: 'finding', n: 2 }), board()).pressed),
    ['comment', 'later']));

// D-045, answer-model rulings 1 and 3: the lit mark is the state; no word follows it in the footer.
test('nodeState: ✓ and ✗ light their button and show no status word; the name says checked or crossed', () => {
  const d = node({ kind: 'decision', n: 9, title: 'Keep the free tier' });
  const ticked = nodeState(d, withItem('acknowledged'));
  assert.deepEqual([ticked.statusWord, ticked.label, ticked.pressed.ack, ticked.pressed.drop], ['', 'Item 9, Decision: Keep the free tier, checked', true, false]);
  const crossed = nodeState(d, withItem('dropped'));
  assert.deepEqual([crossed.statusWord, crossed.label, crossed.pressed.ack, crossed.pressed.drop], ['', 'Item 9, Decision: Keep the free tier, crossed', false, true]);
});

// D-045, answer-model ruling 4: a card that only informs shows no status and carries none in its name.
test('nodeState: a finding, risk, topic or note has no status word and no status in its name, in every status', () => {
  for (const kind of ['finding', 'risk', 'topic', 'note'] as const) {
    for (const status of ['open', 'commented', 'later'] as const) {
      const st = nodeState(node({ kind, n: 3, title: 'Cold caches' }), withItem(status));
      assert.equal(st.statusWord, '', `${kind} ${status}`);
      assert.match(st.label, /^Item 3, [A-Za-z]+: Cold caches$/, `${kind} ${status}`);
    }
  }
  assert.equal(nodeState(node({ kind: 'finding', n: 3 }), withItem('later')).pressed.later, true, 'Later still shows lit');
});

test('nodeState: a non-item has no status word, no pressed buttons and a plain label', () => {
  const st = nodeState(node({ kind: 'topic', title: 'Stack' }), board());
  assert.equal(st.statusWord, '');
  assert.deepEqual(st.pressed, {});
  assert.equal(st.label, 'Topic: Stack');
});

test('nodeState: pinned follows the pins map', () => {
  const pins = new Map([['1', { x: 4, y: 8 }]]);
  assert.equal(nodeState(node({ n: 1 }), board({ pins })).pinned, true);
  assert.equal(nodeState(node({ id: '2', n: 2 }), board({ pins })).pinned, false);
});

// 3_FE_01 rulings 2 and 9: selection is view state the page passes in, perceivable without colour
// through the accessible name (mockup 05: "Item 42, finding, acknowledged, selected").
test('nodeState: not selected unless the page says so; selected adds ", selected" to the name', () => {
  const q = node({ n: 7, title: 'Ship it?' });
  assert.equal(nodeState(q, board()).selected, false);
  const st = nodeState(q, board(), undefined, true);
  assert.equal(st.selected, true);
  assert.equal(st.label, 'Item 7, Question: Ship it?, Open, selected');
  assert.equal(nodeState(node({ kind: 'topic', title: 'Stack' }), board(), undefined, true).label, 'Topic: Stack, selected');
  // Nothing else a card shows depends on selection.
  const { selected: _a, label: _b, ...rest } = st;
  const { selected: _c, label: _d, ...plain } = nodeState(q, board());
  assert.deepEqual(rest, plain);
});

test('nodeLabel: selected comes last, after the status', () =>
  assert.equal(nodeLabel(node({ kind: 'question', n: 5, title: 'Use it?' }), 'later', true),
    'Item 5, Question: Use it?, Saved for later, selected'));

// 2e_FE_01 ruling 7: a numbered pin for the latest note, and the "Your note" block; review-polish
// ruling 8: oldest first, like a chat.
test('nodeState: one note not yet sent: "Your note 1", no count, a pin that edits it', () => {
  const one = note('Looks right');
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('commented', [one])).notes, {
    entries: [{ seq: one.seq, index: 1, who: 'Your note 1', text: 'Looks right', sent: false }],
    pin: { seq: one.seq, index: 1, sent: false, label: 'Note 1 on item 1. Edit it' },
  });
});

test('nodeState: three notes, two sent: the count, the oldest first, sent ones marked Sent, the pin on the latest', () => {
  const notes = [note('one', 'comment', true), note('two', 'context', true), note('three')];
  const v = nodeState(node({ n: 4 }), withItem('commented', notes)).notes!;
  assert.equal(v.count, '3 notes');
  assert.deepEqual(v.entries.map((x) => isNoteEntry(x) && [x.index, x.who, x.text, x.sent]), [
    [1, 'Your note 1 · Sent', 'one', true], [2, 'Your note 2 · Sent', 'two', true], [3, 'Your note 3', 'three', false]], 'an old More context reads as a note');
  assert.deepEqual(v.pin, { seq: notes[2]!.seq, index: 3, sent: false, label: 'Note 3 on item 4. Edit it' });
});

// review-polish ruling 8 and decision 8: one conversation, oldest first, top to bottom: note 1, its
// replies, note 2...; a reply naming no note of the card takes its place by time among the notes.
test('notesView: each note then its replies oldest first; orphan replies by seq among the notes; a new note last', () => {
  const [a, b] = [{ ...note('first', 'comment', true), seq: 20 }, { ...note('second'), seq: 30 }];
  const replies: CardReply[] = [
    { seq: 33, to: 20, text: 'later answer to first' }, { seq: 40, text: 'orphan, after both notes' },
    { seq: 31, to: 20, text: 'answer to first' }, { seq: 15, text: 'orphan, before first' },
    { seq: 25, to: 99, text: 'orphan, to a gone note, between the notes' }, { seq: 32, to: 30, text: 'answer to second' },
  ];
  const v = notesView(node({ n: 2 }), [a, b], replies)!;
  const flat = v.entries.flatMap((x) => isNoteEntry(x) ? [x.text, ...(x.replies ?? []).map((r) => r.text)] : [`(${x.text})`]);
  assert.deepEqual(flat, [
    '(orphan, before first)', 'first', 'answer to first', 'later answer to first',
    '(orphan, to a gone note, between the notes)', 'second', 'answer to second', '(orphan, after both notes)',
  ]);
  assert.deepEqual(v.entries.filter((x) => !isNoteEntry(x)), [
    { seq: 15, who: 'Agent reply', text: 'orphan, before first', orphan: true },
    { seq: 25, who: 'Agent reply', text: 'orphan, to a gone note, between the notes', orphan: true },
    { seq: 40, who: 'Agent reply', text: 'orphan, after both notes', orphan: true },
  ]);
  assert.deepEqual([v.pin!.seq, v.pin!.index, v.count], [30, 2, '2 notes'], 'the pin is the latest note; the count is unchanged');
  // A new note goes at the bottom, and the pin moves to it.
  const w = notesView(node({ n: 2 }), [a, b, { ...note('third'), seq: 50 }], replies)!;
  assert.equal(w.entries.at(-1)!.text, 'third');
  assert.deepEqual([w.pin!.seq, w.pin!.index, w.count], [50, 3, '3 notes']);
});

// Review polish ruling 6: the conversation window lists the same entries; a container's notes have no
// card, so the entries are their own function, which notesView reads.
test('conversation: the entries notesView lists, for notes with no card (a container)', () => {
  const [a, b] = [{ ...note('first', 'comment', true), seq: 20 }, { ...note('second'), seq: 30 }];
  const replies: CardReply[] = [{ seq: 31, to: 20, text: 'answer' }, { seq: 25, text: 'orphan' }];
  assert.deepEqual(conversation([a, b], replies), notesView(node({ n: 2 }), [a, b], replies)!.entries);
  assert.deepEqual(conversation([], []), []);
});

test('nodeState: when every note is sent, the pin shows the latest and only reads it', () => {
  const v = nodeState(node({ n: 7 }), withItem('commented', [note('plain terms', 'context', true)])).notes!;
  assert.deepEqual(v.pin, { seq: v.entries[0]!.seq, index: 1, sent: true, label: 'Note 1 on item 7, sent. Show it' });
  assert.equal(v.entries[0]!.who, 'Your note 1 · Sent');
});

test('nodeState: a note on a group of cards says how many, and its pin names them', () => {
  const group: ItemNote = { ...note('Decide these together'), nodes: [1, 4, 9] };
  const v = nodeState(node({ n: 4 }), withItem('commented', [group])).notes!;
  assert.deepEqual(v.entries.map((x) => x.who), ['Your note 1 · 3 cards']);
  assert.equal(v.pin!.label, 'Note 1 on items 1, 4, 9. Edit it');
});

// popovers-larger-thread ruling 5: a note the agent answered before any Send is history too.
test('nodeState: a note answered before a Send is grey, marked Answered, and its pin shows it rather than editing it', () => {
  const one = { ...note('Why per seat?'), locked: true as const };
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('commented', [one])).notes, {
    entries: [{ seq: one.seq, index: 1, who: 'Your note 1 · Answered', text: 'Why per seat?', sent: true }],
    pin: { seq: one.seq, index: 1, sent: true, label: 'Note 1 on item 1, answered. Show it' },
  });
});
