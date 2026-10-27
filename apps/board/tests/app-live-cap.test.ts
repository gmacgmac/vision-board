// The cap of live app panels (app-state-kept FE_01, D-050; app-cards.ts `overCap`,
// `LIVE_PANELS`): past the cap, the least recently used frozen panels unload first; a panel on
// screen never goes for the cap. The page test is tests/pages/app-alive.spec.ts.
import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_PANELS, overCap } from '../src/board/apps/app-cards.ts';

const ids = (count: number) => Array.from({ length: count }, (_, i) => `p${i}`);

test('at or under the cap, nothing unloads', () => {
  assert.deepEqual(overCap(ids(LIVE_PANELS), new Set(), LIVE_PANELS), []);
  assert.deepEqual(overCap([], new Set(), LIVE_PANELS), []);
});

test('one past the cap unloads the least recently used frozen panel', () => {
  const used = ids(LIVE_PANELS + 1);
  assert.deepEqual(overCap(used, new Set([used.at(-1)!]), LIVE_PANELS), ['p0']);
  // The oldest is on screen again: the next oldest frozen one goes.
  assert.deepEqual(overCap(used, new Set(['p0', used.at(-1)!]), LIVE_PANELS), ['p1']);
});

test('several past the cap unload that many, oldest first', () => {
  assert.deepEqual(overCap(ids(LIVE_PANELS + 3), new Set(), LIVE_PANELS), ['p0', 'p1', 'p2']);
});

test('panels on screen never go for the cap, however many there are', () => {
  const used = ids(LIVE_PANELS + 2);
  assert.deepEqual(overCap(used, new Set(used), LIVE_PANELS), []);
  // All but one on screen: only that one can go, even though the count stays over the cap.
  assert.deepEqual(overCap(used, new Set(used.slice(1)), LIVE_PANELS), ['p0']);
});
