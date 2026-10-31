// The id prefix each mounted board takes (board/mount-ids.ts): every live mount has its own, so no id is a bare word
// a host's page may use too; the first mount on the board's own page has none, so the standalone page keeps its ids;
// and a prefix given back is the next one's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefixOf, takeIdPrefix } from '../src/board/mount-ids.ts';

test('each live mount has its own prefix; on the board\'s own page the first has none', () => {
  const [a, b, c] = [takeIdPrefix(), takeIdPrefix(), takeIdPrefix()];
  assert.deepEqual([a.prefix, b.prefix, c.prefix], ['vb1-', 'vb2-', 'vb3-']);
  [a, b, c].forEach((m) => m.release());
  const own = takeIdPrefix(true);
  assert.equal(own.prefix, '');
  own.release();
});

test('a prefix given back is taken again, and giving it back twice frees nothing else', () => {
  const [a, b] = [takeIdPrefix(), takeIdPrefix()];
  a.release();
  const again = takeIdPrefix();
  assert.equal(again.prefix, 'vb1-', 'the first slot is free again');
  b.release();
  const next = takeIdPrefix();
  assert.equal(next.prefix, 'vb2-', 'the second slot is free, the first still held');
  b.release();
  const third = takeIdPrefix();
  assert.equal(third.prefix, 'vb3-', 'the old holder\'s second release took nothing from the new one');
  [again, next, third].forEach((m) => m.release());
  assert.equal(prefixOf(1), 'vb1-');
  assert.equal(prefixOf(1, true), '');
  assert.equal(prefixOf(2, true), 'vb2-');
});
