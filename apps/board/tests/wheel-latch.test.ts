// Wheel chaining (wheelChaining flag, cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md): what can
// still scroll by the wheel's delta, the first such box on the event's path below the stage, and the
// latch that keeps a gesture's first target until a quiet gap. The page behaviour: tests/pages/wheel-chaining.spec.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Overflow, ScrollBox } from '../src/board/input/index.ts';
import { WHEEL_GAP, canScroll, createWheelLatch, scrollerOn } from '../src/board/input/index.ts';

interface Box extends ScrollBox, Overflow { name: string; isConnected: boolean }
/** A box 100 tall showing 100 of `height`, scrolled to `top`. */
const box = (name: string, top: number, height = 300, overflowY = 'auto'): Box => ({
  name, isConnected: true, scrollTop: top, scrollLeft: 0, scrollHeight: height, scrollWidth: 100, clientHeight: 100, clientWidth: 100,
  overflowX: 'hidden', overflowY,
});
const auto = { overflowX: 'auto', overflowY: 'auto' };
const isBox = (t: unknown): t is Box => typeof t === 'object' && t !== null && 'scrollTop' in t;
const find = (path: unknown[], dy: number) => scrollerOn(path, 'stage', 0, dy, (b: Box) => b, isBox);

test('canScroll: room in the wheel\'s direction, on an axis whose overflow scrolls', () => {
  assert.equal(canScroll(box('a', 0), auto, 0, 10), true);
  assert.equal(canScroll(box('a', 0), auto, 0, -10), false, 'at the top, up');
  assert.equal(canScroll(box('a', 200), auto, 0, 10), false, 'at the end, down');
  assert.equal(canScroll(box('a', 199.5), auto, 0, 10), false, 'a fraction from the end is the end');
  assert.equal(canScroll(box('a', 200), auto, 0, -10), true);
  assert.equal(canScroll(box('a', 0, 100), auto, 0, 10), false, 'nothing to scroll');
  assert.equal(canScroll(box('a', 0), { overflowX: 'hidden', overflowY: 'hidden' }, 0, 10), false, 'overflow hidden never scrolls');
  assert.equal(canScroll(box('a', 0), { overflowX: 'visible', overflowY: 'scroll' }, 0, 10), true);
  const wide = { ...box('w', 0, 100), scrollWidth: 300 };
  assert.equal(canScroll(wide, auto, 10, 0), true, 'sideways');
  assert.equal(canScroll(wide, auto, -10, 0), false);
  assert.equal(canScroll(wide, auto, 10, 10), true, 'either axis with room');
});

test('scrollerOn: the first box on the path that can scroll, never the stage or past it', () => {
  const inner = box('inner', 200);
  const outer = box('outer', 0);
  assert.equal(find([inner, outer, 'stage'], 10), outer, 'the inner box is at its end: its ancestor scrolls');
  assert.equal(find([inner, outer, 'stage'], -10), inner);
  assert.equal(find([box('flat', 0, 100), 'stage', outer], 10), null, 'nothing below the stage can scroll: the board pans');
  assert.equal(find(['text', box('flat', 0, 100, 'visible')], 10), null);
});

test('the latch keeps a gesture\'s first target until a quiet gap, then finds again', () => {
  const bubble = box('bubble', 0);
  let found: Box | null = bubble;
  let asked = 0;
  const latch = createWheelLatch(() => { asked += 1; return found; });
  const at = (timeStamp: number) => latch.target({ timeStamp, deltaX: 0, deltaY: 10 });
  assert.equal(at(1000), bubble);
  found = null; // the bubble reached its end
  assert.equal(at(1000 + WHEEL_GAP - 1), bubble, 'the same gesture keeps the bubble');
  assert.equal(at(1000 + 2 * WHEEL_GAP - 2), bubble, 'the gap counts from the last event');
  assert.equal(asked, 1);
  assert.equal(at(1000 + 3 * WHEEL_GAP + 10), null, 'after a quiet gap: a new gesture, the board pans');
  found = bubble;
  assert.equal(at(1000 + 3 * WHEEL_GAP + 20), null, 'a panning gesture stays a pan');
  assert.equal(asked, 2);
});

test('the latch finds again when its target left the page', () => {
  const bubble = box('bubble', 0);
  const other = box('other', 0);
  let found: Box = bubble;
  const latch = createWheelLatch(() => found);
  assert.equal(latch.target({ timeStamp: 0, deltaX: 0, deltaY: 10 }), bubble);
  bubble.isConnected = false;
  found = other;
  assert.equal(latch.target({ timeStamp: 10, deltaX: 0, deltaY: 10 }), other);
});
