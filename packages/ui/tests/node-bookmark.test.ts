// The person's bookmark on a card in the old footer (cardBookmark flag, D-099 2; the flag before ledger format 20):
// the button beside Later is drawn only when the page asks for it, keeps its name, its place and its glyph, and
// aria-pressed (and the card's name) say whether the card is bookmarked. A card with no number has no button and no
// bookmark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { BOOKMARK_ICON, BOOKMARK_KEY, bookmarkLabel, nodeState, nodeTemplate } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '3', region: 'r', kind: 'question', title: 'T', n: 3, ...f });
const board = (marks: string[] = []): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(marks) });

test('the bookmark button sits last in the card\'s toolbar, after Later, with the old glyph, only with the option on', () => {
  const html = nodeTemplate(node({}), { bookmark: true });
  const buttons = [...html.matchAll(/<button type="button" class="vb-act[^"]*" (data-act="(\w+)"|data-bookmark)/g)].map((m) => m[2] ?? 'bookmark');
  assert.deepEqual(buttons, ['ack', 'drop', 'comment', 'later', 'bookmark']);
  assert.ok(html.includes(`aria-label="Bookmark item 3 (${BOOKMARK_KEY})"`));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.ok(html.includes(`title="Bookmark · ${BOOKMARK_KEY}"`));
  assert.ok(html.includes('class="vb-act vb-bookmark"') && html.includes('vb-bookmark-cloth'), 'its glyph is the flag\'s pole and cloth');
  assert.ok(BOOKMARK_ICON.includes('M5.5 17.5v-14'));
  assert.ok(!nodeTemplate(node({})).includes('data-bookmark'), 'off by default: the page passes it with the cardBookmark flag');
  assert.ok(nodeTemplate(node({ kind: 'finding' }), { bookmark: true }).includes('data-bookmark'), 'every card with a number, any kind');
  assert.ok(!nodeTemplate(node({ n: undefined }), { bookmark: true }).includes('data-bookmark'), 'no number, no footer, no bookmark');
});

test('bookmarked: the state says so, the name ends ", bookmarked" and the button keeps its name; the key is B', () => {
  const on = nodeState(node({}), board(['3']));
  assert.equal(on.bookmarked, true);
  assert.match(on.label, /, bookmarked$/);
  const off = nodeState(node({}), board(['4']));
  assert.equal(off.bookmarked, undefined);
  assert.doesNotMatch(off.label, /bookmarked/);
  assert.equal(BOOKMARK_KEY, 'B');
  assert.equal(bookmarkLabel(node({})), 'Bookmark item 3 (B)');
  assert.equal(nodeState(node({ n: undefined }), board(['3'])).bookmarked, undefined, 'a card with no number has no bookmark');
});
