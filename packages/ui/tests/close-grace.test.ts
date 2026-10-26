// The close grace every hover tip shares (tip/close-grace.ts, hover-tip-reachable): the pointer leaving
// a tip that shows waits ~300 ms before the close; opening and every other close apply at once.
import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_GRACE_MS, closeGrace } from '../src/tip/close-grace.ts';

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());

const record = () => {
  const calls: boolean[] = [];
  return { calls, apply: (on: boolean) => calls.push(on) };
};

test('the grace is about 300 ms', () => {
  assert.equal(CLOSE_GRACE_MS, 300);
});

test('opening applies at once', () => {
  const g = closeGrace();
  const r = record();
  g.set('button-enter', false, true, r.apply);
  assert.deepEqual(r.calls, [true]);
});

test('a pointer leaving a tip that shows closes it only after the grace', () => {
  const g = closeGrace();
  const r = record();
  g.set('button-leave', true, false, r.apply);
  assert.deepEqual(r.calls, []);
  mock.timers.tick(CLOSE_GRACE_MS - 1);
  assert.deepEqual(r.calls, []);
  mock.timers.tick(1);
  assert.deepEqual(r.calls, [false]);
});

test('the pointer coming back within the grace cancels the close', () => {
  for (const back of ['button-enter', 'popover-enter'] as const) {
    const g = closeGrace();
    const r = record();
    g.set('popover-leave', true, false, r.apply);
    mock.timers.tick(CLOSE_GRACE_MS - 50);
    g.set(back, true, true, r.apply);
    mock.timers.tick(CLOSE_GRACE_MS * 2);
    assert.deepEqual(r.calls, [true], back);
  }
});

test('leaving the anchor, then the tip, is one wait and one close', () => {
  const g = closeGrace();
  const r = record();
  g.set('button-leave', true, false, r.apply);
  mock.timers.tick(100);
  g.set('popover-leave', true, false, r.apply);
  mock.timers.tick(CLOSE_GRACE_MS - 100);
  assert.deepEqual(r.calls, [false], 'the first leave started the wait; the second did not restart it');
});

test('Esc, a press outside, focus leaving and close() apply at once and end a wait', () => {
  for (const e of ['escape', 'outside', 'focus-out', 'close'] as const) {
    const g = closeGrace();
    const r = record();
    g.set('button-leave', true, false, r.apply);
    g.set(e, true, false, r.apply);
    assert.deepEqual(r.calls, [false], e);
    mock.timers.tick(CLOSE_GRACE_MS * 2);
    assert.deepEqual(r.calls, [false], `${e}: the waiting close is gone`);
  }
});

test('a leave from a tip that is not showing applies at once (nothing to hold)', () => {
  const g = closeGrace();
  const r = record();
  g.set('button-leave', false, false, r.apply);
  assert.deepEqual(r.calls, [false]);
});

test('cancel() forgets a waiting close', () => {
  const g = closeGrace();
  const r = record();
  g.set('button-leave', true, false, r.apply);
  g.cancel();
  mock.timers.tick(CLOSE_GRACE_MS * 2);
  assert.deepEqual(r.calls, []);
});
