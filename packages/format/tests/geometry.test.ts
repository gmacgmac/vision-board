// Box geometry, once (geometry.ts): the primitives layout and ui share.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundsOf, boxAround, boxBetween, clamp, overlaps, touches } from '../src/index.ts';

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

test('clamp keeps a value within the range, and takes the low end when the range is empty', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(30, 0, 10), 10);
  assert.equal(clamp(5, 8, 2), 8, 'a thing bigger than its stage sits at the low edge');
});

test('overlaps: shared area only; touching edges do not, and a gap asks for clear space', () => {
  assert.equal(overlaps(box(0, 0, 10, 10), box(5, 5, 10, 10)), true);
  assert.equal(overlaps(box(0, 0, 10, 10), box(10, 0, 10, 10)), false, 'edges that touch');
  assert.equal(overlaps(box(0, 0, 10, 10), box(40, 40, 5, 5)), false);
  assert.equal(overlaps(box(0, 0, 10, 10), box(14, 0, 10, 10)), false);
  assert.equal(overlaps(box(0, 0, 10, 10), box(14, 0, 10, 10), 5), true, 'closer than the gap');
  assert.equal(overlaps(box(0, 0, 10, 10), box(15, 0, 10, 10), 5), false, 'exactly the gap');
});

test('touches: overlapping or touching edges, but not apart', () => {
  assert.equal(touches(box(0, 0, 10, 10), box(10, 0, 10, 10)), true);
  assert.equal(touches(box(0, 0, 10, 10), box(5, 5, 2, 2)), true);
  assert.equal(touches(box(0, 0, 10, 10), box(11, 0, 10, 10)), false);
});

test('boundsOf: the box round them, the zero box for none; boxAround is undefined for none', () => {
  assert.deepEqual(boundsOf([box(10, 20, 5, 5), box(0, 30, 4, 4)]), box(0, 20, 15, 14));
  assert.deepEqual(boundsOf(new Map([['a', box(1, 2, 3, 4)]]).values()), box(1, 2, 3, 4), 'any iterable');
  assert.deepEqual(boundsOf([]), box(0, 0, 0, 0));
  assert.deepEqual(boxAround([box(10, 20, 5, 5), box(0, 30, 4, 4)]), box(0, 20, 15, 14));
  assert.equal(boxAround([]), undefined);
});

test('boxBetween: the box two corners span, in any order', () => {
  assert.deepEqual(boxBetween({ x: 50, y: 10 }, { x: 10, y: 40 }), box(10, 10, 40, 30));
  assert.deepEqual(boxBetween({ x: 1, y: 1 }, { x: 1, y: 1 }), box(1, 1, 0, 0));
});
