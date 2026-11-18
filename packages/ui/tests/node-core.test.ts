import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState, ItemNote, ItemStatus } from '#actions';
import type { CardReply } from '../src/index.ts';
import { conversation, isNoteEntry, litReplies, nodeLabel, nodeState, offers, STATUS_NAME } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(), ...f });

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

test('an unnumbered topic offers nothing', () =>
  assert.deepEqual(offers(node({ kind: 'topic' })), []));

test('nodeLabel names the number, kind, title and, on a card that asks, its status', () => {
  assert.equal(nodeLabel(node({ kind: 'question', n: 5, title: 'Use it?' }), 'later'),
    'Item 5, Question: Use it?, Saved for later');
  assert.equal(nodeLabel(node({ kind: 'decision', n: 6, title: 'Ship' }), 'acknowledged'), 'Item 6, Decision: Ship, checked');
  assert.equal(nodeLabel(node({ kind: 'action', n: 7, title: 'Pay' }), 'dropped'), 'Item 7, Action: Pay, crossed');
  assert.equal(nodeLabel(node({ kind: 'topic', title: 'Stack' }), 'open'), 'Topic: Stack');
});

test('a card whose note the agent owes reads "Replied" in its name (D-046, replied-word ruling 1)', () => {
  const st = nodeState(node({ kind: 'decision', n: 8, title: 'Ship' }), withItem('commented'));
  assert.equal(st.label, 'Item 8, Decision: Ship, Replied');
  assert.equal(STATUS_NAME.context, 'Replied', 'an old More context reads as a note');
});

// ---- nodeState: the rules update() applies ---------------------------------------------------

const STATUSES = Object.keys(STATUS_NAME) as ItemStatus[];
const ANSWER: Partial<Record<ItemStatus, string>> = { acknowledged: 'ticked', dropped: 'crossed' };

test('nodeState: every status sets status, label and the answer', () => {
  const q = node({ n: 7, title: 'Ship it?' });
  for (const status of STATUSES) {
    const st = nodeState(q, withItem(status));
    assert.equal(st.status, status);
    assert.equal(st.label, `Item 7, Question: Ship it?, ${STATUS_NAME[status]}`);
    assert.equal(st.marks.answer, ANSWER[status] ?? 'waiting', status);
  }
});

test('nodeState: an item with no response is open, waiting and not moved', () => {
  const st = nodeState(node({ n: 1 }), board());
  assert.equal(st.status, 'open');
  assert.equal(st.marks.answer, 'waiting');
  assert.equal(st.marks.notes, 'none');
  assert.equal(st.pinned, false);
});

// D-045, answer-model rulings 1 and 3: the lit answer is the state; the name says checked or crossed.
test('nodeState: ✓ and ✗ light the answer; the name says checked or crossed', () => {
  const d = node({ kind: 'decision', n: 9, title: 'Keep the free tier' });
  const ticked = nodeState(d, withItem('acknowledged'));
  assert.deepEqual([ticked.marks.answer, ticked.label], ['ticked', 'Item 9, Decision: Keep the free tier, checked']);
  const crossed = nodeState(d, withItem('dropped'));
  assert.deepEqual([crossed.marks.answer, crossed.label], ['crossed', 'Item 9, Decision: Keep the free tier, crossed']);
});

// D-045, answer-model ruling 4: a card that only informs shows no answer and carries no status in its name.
test('nodeState: a finding, risk, topic or note has no answer and no status in its name, in every status', () => {
  for (const kind of ['finding', 'risk', 'topic', 'note'] as const) {
    for (const status of ['open', 'commented', 'later'] as const) {
      const st = nodeState(node({ kind, n: 3, title: 'Cold caches' }), withItem(status));
      assert.equal(st.marks.answer, 'none', `${kind} ${status}`);
      assert.match(st.label, /^Item 3, [A-Za-z]+: Cold caches$/, `${kind} ${status}`);
    }
  }
});

test('nodeState: a non-item has no answer and a plain label', () => {
  const st = nodeState(node({ kind: 'topic', title: 'Stack' }), board());
  assert.equal(st.marks.answer, 'none');
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

// ---- conversation: a card's notes and replies as the conversation box lists them --------------------------------

test('conversation: notes oldest first, numbered in the order made, sent ones marked Sent, an old More context a note', () => {
  const notes = [note('one', 'comment', true), note('two', 'context', true), note('three')];
  assert.deepEqual(conversation(notes, []).map((x) => isNoteEntry(x) && [x.index, x.who, x.text, x.sent]), [
    [1, 'Your note 1 · Sent', 'one', true], [2, 'Your note 2 · Sent', 'two', true], [3, 'Your note 3', 'three', false]]);
});

// review-polish ruling 8 and decision 8: one conversation, oldest first, top to bottom: note 1, its
// replies, note 2...; a reply naming no note of the card takes its place by time among the notes.
test('conversation: each note then its replies oldest first; orphan replies by seq among the notes', () => {
  const [a, b] = [{ ...note('first', 'comment', true), seq: 20 }, { ...note('second'), seq: 30 }];
  const replies: CardReply[] = [
    { seq: 33, to: 20, text: 'later answer to first', at: '2026-10-08T00:00:00Z' }, { seq: 40, text: 'orphan, after both notes', at: '2026-10-08T00:00:00Z' },
    { seq: 31, to: 20, text: 'answer to first', at: '2026-10-08T00:00:00Z' }, { seq: 15, text: 'orphan, before first', at: '2026-10-08T00:00:00Z' },
    { seq: 25, to: 99, text: 'orphan, to a gone note, between the notes', at: '2026-10-08T00:00:00Z' }, { seq: 32, to: 30, text: 'answer to second', at: '2026-10-08T00:00:00Z' },
  ];
  const entries = conversation([a, b], replies);
  const flat = entries.flatMap((x) => isNoteEntry(x) ? [x.text, ...(x.replies ?? []).map((r) => r.text)] : [`(${x.text})`]);
  assert.deepEqual(flat, [
    '(orphan, before first)', 'first', 'answer to first', 'later answer to first',
    '(orphan, to a gone note, between the notes)', 'second', 'answer to second', '(orphan, after both notes)',
  ]);
  assert.deepEqual(conversation([], []), []);
});

test('conversation: a note on a group of cards says how many; one answered before a Send reads Answered; Ask now reads so', () => {
  const group: ItemNote = { ...note('Decide these together'), nodes: [1, 4, 9] };
  const answered = { ...note('Why per seat?'), locked: true as const };
  const asked = note('Now please');
  const entries = conversation([group, answered, asked], [], new Set([asked.seq]));
  assert.deepEqual(entries.map((x) => [x.who, isNoteEntry(x) && x.sent]), [
    ['Your note 1 · 3 cards', false], ['Your note 2 · Answered', true], ['Your note 3 · Asked now', false]]);
});

// updateSignals (D-088): a reply the person has not looked at keeps `unseen` only while its card is unseen itself
// (NEW, or unseen updates not yet stepped through); the notes mark fills while one is.
test('nodeState: a reply is unseen only while its card is', () => {
  const a = note('Why?', 'comment', true);
  const replies: CardReply[] = [{ seq: 90, to: a.seq, text: 'Because.', at: '2026-10-04T00:00:00Z', unseen: true }];
  const s = withItem('open', [a]);
  const mark = (c: Parameters<typeof nodeState>[4]) => nodeState(node({ n: 2 }), s, undefined, false, c).marks.notes;
  assert.equal(mark({ replies, updates: { count: 1 } }), 'unread');
  assert.equal(mark({ replies, new: true }), 'unread');
  assert.equal(mark({ replies }), 'count', 'the card seen: muted');
  assert.equal(mark({ replies, updates: { count: 1, steps: [], at: 0 } }), 'count', 'stepped past the last: up to date');
  assert.equal(litReplies(replies, false)![0]!.unseen, undefined);
});
