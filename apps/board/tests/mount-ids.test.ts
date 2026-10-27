// The id prefix each mounted board takes (board/mount-ids.ts): the first live mount has none, so the
// standalone page keeps its ids; the next ones differ, and a prefix given back is the next one's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefixOf, takeIdPrefix } from '../src/board/mount-ids.ts';

test('the first mount has no prefix; each live mount after it has its own', () => {
  const [a, b, c] = [takeIdPrefix(), takeIdPrefix(), takeIdPrefix()];
  assert.deepEqual([a.prefix, b.prefix, c.prefix], ['', 'vb2-', 'vb3-']);
  [a, b, c].forEach((m) => m.release());
});

test('a prefix given back is taken again, and giving it back twice frees nothing else', () => {
  const [a, b] = [takeIdPrefix(), takeIdPrefix()];
  a.release();
  const again = takeIdPrefix();
  assert.equal(again.prefix, '', 'the first slot is free again');
  b.release();
  const next = takeIdPrefix();
  assert.equal(next.prefix, 'vb2-', 'the second slot is free, the first still held');
  b.release();
  const third = takeIdPrefix();
  assert.equal(third.prefix, 'vb3-', 'the old holder\'s second release took nothing from the new one');
  [again, next, third].forEach((m) => m.release());
  assert.equal(prefixOf(1), '');
});
