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

// FIX_04 ruling 2 (point 460): a gesture is decided by its first wheel event that moves. A trackpad's gesture can open
// with an event of no movement (or the browser's own zero-delta wheel); deciding on it found nothing to scroll and
// latched the whole gesture to a pan, so a flick over a scrolling box moved the board.
test('an event that does not move decides nothing: the gesture\'s first moving event finds its target', () => {
  const bubble = box('bubble', 0);
  const latch = createWheelLatch((e) => (e.deltaY !== 0 ? bubble : null));
  assert.equal(latch.target({ timeStamp: 0, deltaX: 0, deltaY: 0 }), null, 'no movement: nothing to pan or scroll yet');
  assert.equal(latch.target({ timeStamp: 16, deltaX: 0, deltaY: 12 }), bubble, 'the first moving event decides');
  assert.equal(latch.target({ timeStamp: 32, deltaX: 0, deltaY: 0 }), bubble, 'and keeps it for the gesture');
});

test('the gesture gap is about 200 ms: a trackpad\'s momentum that follows the fingers stays in the same gesture', () => {
  assert.ok(WHEEL_GAP >= 150 && WHEEL_GAP <= 250, `WHEEL_GAP ${WHEEL_GAP}`);
});

// FIX_05 ruling 2 (point 485): on macOS a flick's momentum keeps sending wheel events for one to two seconds, a decaying
// run. Once the scroller reached its end, that tail is swallowed (it stays the scroller's, so nothing pans); the next
// gesture, after a quiet gap, pans.
// Streams in the shape a trackpad and a mouse send: one event a frame (16 ms), deltas in px.
const FRAME = 16;
/** Fingers speeding up, then a momentum tail decaying by `decay` a frame for `frames` frames; `jitter` (0 to 1) adds
 *  the small wobble real momentum has, deterministically. */
function flick(frames = 90, decay = 0.93, jitter = 0): number[] {
  const fingers = [2, 6, 14, 24, 30, 30];
  const tail = Array.from({ length: frames }, (_, i) => 30 * decay ** (i + 1) * (1 + (i % 3 === 1 ? jitter : i % 3 === 2 ? -jitter : 0)));
  return [...fingers, ...tail.map((d) => Math.round(d * 10) / 10)];
}
/** Feed `deltas` (one a frame from `t0`) to `latch`; what each event's gesture is for. */
const feed = <T>(latch: { target(e: { timeStamp: number; deltaX: number; deltaY: number }): T | null }, deltas: number[], t0 = 0) =>
  deltas.map((d, i) => latch.target({ timeStamp: t0 + i * FRAME, deltaX: 0, deltaY: d }));

test('a flick that reaches the scroller\'s end: its momentum tail stays the scroller\'s, nothing pans', () => {
  const bubble = box('bubble', 0);
  let room = true;
  const latch = createWheelLatch(() => (room ? bubble : null));
  const stream = flick(90, 0.93, 0.08); // with the wobble real momentum has
  const out = stream.map((d, i) => { if (i === 12) room = false; return latch.target({ timeStamp: i * FRAME, deltaX: 0, deltaY: d }); });
  assert.ok(out.every((t) => t === bubble), 'the whole flick, tail and all, is the bubble\'s');
});

// The earlier rule (FIX_05) ended a gesture when an event "rose" out of a decaying run, to let a fresh push pan at once.
// A trackpad's stream rises inside one gesture all the time, so at the end that handed the rest to the board's pan
// (the maintainer's "it scrolls to the bottom and then continues scrolling the rest of the page"). A gesture now ends
// only at a quiet gap (bookmark-list-and-scroll-end task): everything it sends after the end is swallowed.
/** A latch over a box that reaches its end at event `endAt` of `stream` (one a frame); what each event was for. */
function reachEnd(stream: number[], endAt: number) {
  const bubble = box('bubble', 0);
  let room = true;
  const latch = createWheelLatch(() => (room ? bubble : null));
  const out = stream.map((d, i) => { if (i === endAt) room = false; return latch.target({ timeStamp: i * FRAME, deltaX: 0, deltaY: d }); });
  return { bubble, latch, out };
}

test('fingers that slow down and speed up again while reading: after the end, nothing pans', () => {
  const { bubble, out } = reachEnd([4, 8, 12, 10, 8, 6, 5, 4, 7, 12, 18, 22, 20, 16, 12, 9, 7, 5, 4, 3], 6);
  assert.deepEqual(out.map((t) => (t === bubble ? 'bubble' : 'pan')), out.map(() => 'bubble'));
});

test('the momentum\'s start after the fingers lift, and two frames coalesced into one, are the same gesture', () => {
  const tail = flick(60);
  tail.splice(20, 2, tail[20]! + tail[21]!); // a busy frame: two events arrive as one
  const lift = [6, 5, 4, 3, 22, 20, 18]; // fingers slowing, then the momentum starts faster
  const { bubble, out } = reachEnd([...lift, ...tail], 3);
  assert.ok(out.every((t) => t === bubble), JSON.stringify(out.map((t) => (t === bubble ? 1 : 0))));
});

test('a zero in the momentum tail, then the tail goes on: still the scroller\'s', () => {
  const tail = flick(60).slice(30);
  tail.splice(5, 0, 0, 0);
  tail.splice(9, 0, 4);
  const { bubble, out } = reachEnd(tail, 1);
  assert.ok(out.every((t) => t === bubble));
});

test('a push with no pause after the tail is swallowed with it; after a pause it is a new gesture and pans', () => {
  const tail = flick(40).slice(0, 46);
  const { bubble, latch } = reachEnd(tail, 12);
  const push = [1, 3, 8, 16, 25, 30];
  assert.ok(feed(latch, push, tail.length * FRAME).every((t) => t === bubble), 'no pause: the same gesture');
  const after = (tail.length + push.length - 1) * FRAME + WHEEL_GAP + 1;
  assert.ok(feed(latch, push, after).every((t) => t === null), 'after a pause: the board pans');
});

test('a scroller that redraws during its gesture: the gesture never turns into a pan', () => {
  const bubble = box('bubble', 0);
  let found: Box | null = bubble;
  const latch = createWheelLatch(() => found);
  assert.equal(latch.target({ timeStamp: 0, deltaX: 0, deltaY: 10 }), bubble);
  bubble.isConnected = false; // its markup was drawn again, at its end
  found = null;
  assert.notEqual(latch.target({ timeStamp: 16, deltaX: 0, deltaY: 10 }), null, 'still swallowed');
  const fresh = box('fresh', 0);
  found = fresh;
  assert.equal(latch.target({ timeStamp: 32, deltaX: 0, deltaY: 10 }), fresh, 'a new box under the pointer with room takes it on');
});

test('a fresh push while the scroller still has room scrolls it', () => {
  const bubble = box('bubble', 0);
  const latch = createWheelLatch(() => bubble);
  feed(latch, flick(40).slice(0, 46));
  assert.ok(feed(latch, [1, 3, 8, 16, 25], 46 * FRAME).every((t) => t === bubble));
});

test('a push whose speed wobbles is one gesture: after the end it never turns into a pan', () => {
  const bubble = box('bubble', 0);
  let room = true;
  const latch = createWheelLatch(() => (room ? bubble : null));
  const out = [4, 9, 7, 12, 10, 14, 11, 16, 13, 18, 15, 12, 17].map((d, i) => { if (i === 4) room = false; return latch.target({ timeStamp: i * FRAME, deltaX: 0, deltaY: d }); });
  assert.ok(out.every((t) => t === bubble));
});

test('a mouse: notches while the wheel spins are one gesture; after a pause the next notch at the end pans', () => {
  const bubble = box('bubble', 0);
  let room = true;
  const latch = createWheelLatch(() => (room ? bubble : null));
  const spin = Array.from({ length: 10 }, (_, i) => { if (i === 3) room = false; return latch.target({ timeStamp: i * 60, deltaX: 0, deltaY: 100 }); });
  assert.ok(spin.every((t) => t === bubble), 'the spin that reached the end stays the bubble\'s');
  assert.equal(latch.target({ timeStamp: 9 * 60 + WHEEL_GAP + 50, deltaX: 0, deltaY: 100 }), null);
});
