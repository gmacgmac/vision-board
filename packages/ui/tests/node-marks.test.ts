// The marks on the node's edges (FE_01, D-099): what the number, the answer, the change badge and the notes mark show,
// from the same inputs the footer used, and the tone the element applies. Pure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState, ItemNote, ItemStatus } from '#actions';
import { nodeMarks, nodeState, toneView } from '../src/index.ts';
import type { MarksInput } from '../src/index.ts';

const node = (f: Partial<ViewNode> = {}): ViewNode => ({ id: '4', region: 'r', kind: 'question', title: 'T', n: 4, ...f });
const input = (f: Partial<MarksInput> = {}): MarksInput => ({ status: 'open', notes: [], bookmarked: false, fresh: false, awaiting: false, ...f });
const note = (seq: number, nodes?: number[]): ItemNote => ({ seq, kind: 'comment', text: 'n', at: '2026-11-01T00:00:00Z', ...(nodes && { nodes }) });
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(), ...f });

test('the answer: waiting, ticked or crossed on a node that asks; none on one that tells', () => {
  const states: [ItemStatus, string][] = [['open', 'waiting'], ['commented', 'waiting'], ['later', 'waiting'], ['acknowledged', 'ticked'], ['dropped', 'crossed']];
  for (const [status, answer] of states) assert.equal(nodeMarks(node(), input({ status })).answer, answer, status);
  assert.equal(nodeMarks(node({ kind: 'finding' }), input({ status: 'acknowledged' })).answer, 'none');
  assert.equal(nodeMarks(node({ n: undefined }), input()).answer, 'none');
  assert.equal(nodeMarks(node(), input()).answerLabel, 'Answer item 4, waiting for your answer (A tick, X cross)');
  assert.equal(nodeMarks(node({ kind: 'finding' }), input()).answerLabel, '');
});

test('a proposal shows on the disc of a node that asks, and its name says so', () => {
  const m = nodeMarks(node(), input({ proposed: 'drop' }));
  assert.deepEqual([m.proposed, m.answerLabel.endsWith(', the agent proposes cross')], ['drop', true]);
  assert.equal(nodeMarks(node({ kind: 'topic' }), input({ proposed: 'ack' })).proposed, undefined);
});

test('the number: a toggle whose name stays put; bookmarked or not', () => {
  for (const bookmarked of [false, true]) {
    const m = nodeMarks(node(), input({ bookmarked }));
    assert.deepEqual([m.bookmarked, m.numberLabel], [bookmarked, 'Bookmark item 4 (B)']);
  }
});

test('the badge: New, then unseen updates, then a settled vN from v2; none on a node that never changed, unless a written time shows it', () => {
  const b = (f: Partial<MarksInput>) => { const m = nodeMarks(node(), input(f)); return [m.badge, m.badgeText]; };
  const updates = { tab: '2 updates', label: '', open: false, done: false };
  assert.deepEqual(b({}), ['none', '']);
  assert.deepEqual(b({ ver: 1 }), ['none', '']);
  assert.deepEqual(b({ ver: 3 }), ['settled', 'v3']);
  assert.deepEqual(b({ ver: 3, updates }), ['updates', '2 updates']);
  assert.deepEqual(b({ ver: 3, updates, fresh: true }), ['new', 'New']);
  assert.deepEqual(b({ ver: 3, updates: { ...updates, tab: '' } }), ['settled', 'v3'], 'past the last step');
  assert.equal(nodeMarks(node(), input({ ver: 3 })).badgeLabel, 'v3, history of item 4 (H)');
  assert.equal(nodeMarks(node(), input({ ver: 3 })).badgeTip, '', 'no written time: the badge keeps its own tip');
});

test('the badge with a written time: a quiet v1 on a card that never changed, its tip two lines (written, then the label)', () => {
  const written = { at: new Date(2026, 10, 26, 11, 42).toISOString(), agent: 'Claude' };
  const m = nodeMarks(node(), input({ ver: 1, written }));
  assert.deepEqual([m.badge, m.badgeText], ['settled', 'v1']);
  assert.equal(m.badgeTip, "Updated 26 Nov '26, 11:42 by Claude\nv1, history of item 4 (H)");
  assert.equal(nodeMarks(node(), input({ ver: 1, written: { at: written.at } })).badgeTip, "Updated 26 Nov '26, 11:42\nv1, history of item 4 (H)");
  assert.equal(nodeMarks(node(), input({ ver: 3, written, fresh: true })).badgeTip.split('\n')[1], 'New, history of item 4 (H)');
  assert.equal(nodeMarks(node(), input({ written })).badge, 'none', 'no version known: no badge');
});

test('the notes mark: quiet, a count of notes and replies, unread while a reply is unseen, two bubbles for a group note', () => {
  const m = (f: Partial<MarksInput>) => nodeMarks(node(), input(f));
  assert.deepEqual([m({}).notes, m({}).notesText, m({}).notesLabel], ['none', '', 'No notes on item 4 (C)']);
  const reply = { seq: 9, to: 1, text: 'r', at: '2026-11-01T00:00:00Z' };
  assert.deepEqual([m({ notes: [note(1)], replies: [reply] }).notes, m({ notes: [note(1)], replies: [reply] }).notesText], ['count', '2']);
  const unread = m({ notes: [note(1)], replies: [{ ...reply, unseen: true }] });
  assert.deepEqual([unread.notes, unread.notesLabel], ['unread', '2 notes on item 4, agent replied (C)']);
  assert.equal(m({ notes: [note(1, [4, 5])] }).group, true);
  assert.equal(m({ notes: Array.from({ length: 100 }, (_, i) => note(i)) }).notesText, '99+');
});

test('a tone: a name takes its hue token, a hue its number; anything else none', () => {
  assert.deepEqual(toneView('teal'), { attr: 'teal', hue: 'var(--vb-tone-hue-teal)' });
  assert.deepEqual(toneView(0), { attr: 'hue', hue: '0' });
  assert.deepEqual(toneView(359), { attr: 'hue', hue: '359' });
  for (const bad of [undefined, 360, -1, 12.5, '210', 'pink', 'teal;}', { h: 1 }]) assert.equal(toneView(bad), undefined, String(bad));
});

test('nodeState carries the marks from the board state and the conditions the page passes in', () => {
  const s = board({ items: new Map([['4', { status: 'acknowledged', notes: [note(1)] }]]), bookmarks: new Set(['4']) });
  const st = nodeState(node(), s, undefined, false, { ver: 2, awaiting: true, proposals: [
    { seq: 5, action: 'drop', reason: 'r', stale: true }, { seq: 3, action: 'ack', reason: 'r', stale: false },
  ] as never });
  assert.deepEqual([st.marks.answer, st.marks.bookmarked, st.marks.badge, st.marks.notes, st.marks.awaiting, st.marks.proposed],
    ['ticked', true, 'settled', 'count', true, 'ack'], 'an out-of-date proposal is no ring: the disc is back to its answer');
});
