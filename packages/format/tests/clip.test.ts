// `clip`: one line, cut with an ellipsis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clip } from '../src/index.ts';

test('clip makes white space one space and leaves a short line alone', () => {
  assert.equal(clip('  Venue \n lead   time ', 40), 'Venue lead time');
});

test('clip cuts a long line to max characters, the last being an ellipsis', () => {
  const out = clip('abcdefghij', 5);
  assert.equal(out, 'abcd…');
  assert.equal(out.length, 5);
  assert.equal(clip('abcde', 5), 'abcde', 'exactly max is not cut');
});
