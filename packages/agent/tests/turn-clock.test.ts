// The turn clock (HOLD_01): a turn's time limit counts only the agent's own working time. It runs
// out after the limit, stops while a question waits (`hold(true)`), and goes on with the time left
// (`hold(false)`); a hold that is already on, or a clock that has ended, changes nothing.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { startTurnClock } from '../src/turn-clock.ts';

const HOUR = 3_600_000;

test.afterEach(() => mock.timers.reset());

test('runs out after the limit', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let expired = 0;
  startTurnClock(1_000, () => { expired++; });
  mock.timers.tick(999);
  assert.equal(expired, 0);
  mock.timers.tick(1);
  assert.equal(expired, 1);
});

test('a held clock does not run out, however long the wait; it goes on with the time left', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let expired = 0;
  const clock = startTurnClock(10 * 60_000, () => { expired++; });
  mock.timers.tick(4 * 60_000);
  clock.hold(true);
  mock.timers.tick(5 * HOUR);
  assert.equal(expired, 0, 'five hours of waiting is not the agent working');
  clock.hold(false);
  mock.timers.tick(5 * 60_000 + 59_000);
  assert.equal(expired, 0, 'six minutes of work were left');
  mock.timers.tick(1_000);
  assert.equal(expired, 1);
});

test('holds are idempotent: two holds on are one, and a release resumes once', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let expired = 0;
  const clock = startTurnClock(1_000, () => { expired++; });
  mock.timers.tick(400);
  clock.hold(true);
  clock.hold(true);
  mock.timers.tick(HOUR);
  clock.hold(false);
  clock.hold(false);
  mock.timers.tick(599);
  assert.equal(expired, 0);
  mock.timers.tick(1);
  assert.equal(expired, 1);
});

test('stop ends the clock for good: no expiry, and a later hold does nothing', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let expired = 0;
  const clock = startTurnClock(1_000, () => { expired++; });
  clock.stop();
  clock.hold(true);
  clock.hold(false);
  mock.timers.tick(HOUR);
  assert.equal(expired, 0);
});
