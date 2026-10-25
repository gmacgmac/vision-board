// A fresh container's pill (new-and-updated Design 4, region-fresh.ts `regionFresh`): its short words
// on the line, its full words for the tooltip and screen readers, a part left out at zero, none at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regionFresh } from '../src/index.ts';

test('regionFresh: "3 new · 1 updated", in full words for its name; a part at zero is left out', () => {
  assert.deepEqual(regionFresh(3, 1), { text: '3 new · 1 updated', label: '3 new cards and 1 updated card in this container' });
  assert.deepEqual(regionFresh(1, 0), { text: '1 new', label: '1 new card in this container' });
  assert.deepEqual(regionFresh(0, 2), { text: '2 updated', label: '2 updated cards in this container' });
});

test('regionFresh: none when nothing is new or updated', () => {
  assert.equal(regionFresh(0, 0), undefined);
});
