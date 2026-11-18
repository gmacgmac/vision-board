// The person's bookmark on a node (D-099 2): the number is the toggle, keeps its name, and aria-pressed (and the
// node's name) say whether it is bookmarked. A node with no number has no number and no bookmark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { MARK_KEYS, nodeState, nodeTemplate } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '3', region: 'r', kind: 'question', title: 'T', n: 3, ...f });
const board = (marks: string[] = []): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(marks) });

test('the number is the bookmark: a toggle on every node with a number, any kind, its key B', () => {
  assert.equal(MARK_KEYS.bookmark, 'B');
  for (const kind of ['question', 'finding'] as const) {
    assert.match(nodeTemplate(node({ kind })), /data-mark="number" data-tip="[^"]*" aria-pressed="false" aria-keyshortcuts="B">3<\/button>/);
  }
  assert.doesNotMatch(nodeTemplate(node({ n: undefined })), /data-mark="number"/, 'no number, no bookmark');
});

test('bookmarked: the state says so, the name ends ", bookmarked" and the number keeps its name', () => {
  const on = nodeState(node({}), board(['3']));
  assert.equal(on.bookmarked, true);
  assert.equal(on.marks.bookmarked, true);
  assert.match(on.label, /, bookmarked$/);
  assert.equal(on.marks.numberLabel, 'Bookmark item 3 (B)');
  const off = nodeState(node({}), board(['4']));
  assert.equal(off.bookmarked, undefined);
  assert.equal(off.marks.numberLabel, 'Bookmark item 3 (B)');
  assert.doesNotMatch(off.label, /bookmarked/);
  assert.equal(nodeState(node({ n: undefined }), board(['3'])).bookmarked, undefined, 'a card with no number has no bookmark');
});
