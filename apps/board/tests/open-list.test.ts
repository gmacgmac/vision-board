// The open list's rows (open-list FE_01, finder.ts `openRow`): "12 · title", a long one cut with "…"
// at OPEN_ROW_MAX and whole in the row's tooltip; the "N new" list's updated rows (freshCards flag),
// ending "· updated"; and the shared cut (`#format` `clip`), which the chat's chip labels use too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_ROW_MAX, openRow } from '../src/board/find/finder.ts';
import { clip } from '#format';

test('a row is the card number and title, chosen by number', () => {
  assert.deepEqual(openRow({ n: 12, title: 'Pick a plan' }), { value: '12', text: '12 · Pick a plan' });
});

test('a long title is cut with "…" at OPEN_ROW_MAX and the tooltip holds it whole', () => {
  const title = 'word '.repeat(40).trim();
  const row = openRow({ n: 3, title });
  assert.equal(row.text.length, OPEN_ROW_MAX);
  assert.ok(row.text.startsWith('3 · word word'));
  assert.ok(row.text.endsWith('…'));
  assert.equal(row.title, `3 · ${title}`);
});

test('an updated card\'s row ends "· updated", and a cut gives way in the title, never the ending', () => {
  assert.deepEqual(openRow({ n: 46, title: 'Pick a plan', updated: true }), { value: '46', text: '46 · Pick a plan · updated' });
  const title = 'word '.repeat(40).trim();
  const row = openRow({ n: 46, title, updated: true });
  assert.equal(row.text.length, OPEN_ROW_MAX);
  assert.ok(row.text.endsWith('… · updated'));
  assert.equal(row.title, `46 · ${title} · updated`);
  assert.deepEqual(openRow({ n: 5, title: 'New one', updated: false }), { value: '5', text: '5 · New one' }, 'a new card\'s row is the plain row');
});

test('clip makes white space runs one space and cuts only past the limit', () => {
  assert.equal(clip('  a \n b  ', 10), 'a b');
  assert.equal(clip('abcdef', 6), 'abcdef');
  assert.equal(clip('abcdefg', 6), 'abcde…');
});
