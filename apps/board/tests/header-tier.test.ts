// The header's tiers (adaptiveHeader flag, shell/header-tier.ts): which tier a width is, what sits
// where, and that nothing a person can act on is ever out of reach.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FULL_MIN, HALF_MIN, HEADER_CONTROLS, headerTier, inBar, inMenu } from '../src/shell/header-tier.ts';
import type { HeaderControl, HeaderTier } from '../src/shell/header-tier.ts';

const TIERS: HeaderTier[] = ['full', 'half', 'third'];
const bar = (tier: HeaderTier) => HEADER_CONTROLS.filter((c) => inBar(tier, c));
const moved = (tier: HeaderTier) => HEADER_CONTROLS.filter((c) => inMenu(tier, c));

test('the three widths of the approved design are the three tiers', () => {
  assert.equal(headerTier(1470), 'full');
  assert.equal(headerTier(735), 'half');
  assert.equal(headerTier(490), 'third');
});

test('a tier starts exactly at its width, and any width has one', () => {
  assert.equal(headerTier(FULL_MIN), 'full');
  assert.equal(headerTier(FULL_MIN - 1), 'half');
  assert.equal(headerTier(HALF_MIN), 'half');
  assert.equal(headerTier(HALF_MIN - 1), 'third');
  for (const w of [0, 40, 400, 1000, 5000]) assert.ok(TIERS.includes(headerTier(w)));
});

test('full: nothing moves, everything is in the bar', () => {
  assert.deepEqual(moved('full'), []);
  assert.deepEqual(bar('full'), HEADER_CONTROLS);
});

test('half: version and containers move into "⋯", the app icon goes', () => {
  assert.deepEqual(moved('half'), ['version', 'containers']);
  assert.equal(inBar('half', 'app-icon'), false);
  for (const c of ['folder', 'board', 'open', 'new', 'zoom', 'agents', 'send', 'chat', 'more', 'locked', 'boards-updated', 'replied', 'flagged'] as const) {
    assert.ok(inBar('half', c), c);
  }
});

test('a third: the bar is the board, Locked, Send, Chat and "⋯"', () => {
  assert.deepEqual(bar('third'), ['board', 'locked', 'send', 'chat', 'more']);
  assert.equal(inBar('third', 'replied'), false, 'Replied can go');
});

test('every control a person can act on is in the bar or in "⋯" at every tier, and never in both', () => {
  // The app icon is a picture and Replied a passive count: nothing to reach.
  const passive: readonly HeaderControl[] = ['app-icon', 'replied'];
  for (const tier of TIERS) {
    for (const c of HEADER_CONTROLS) {
      assert.ok(!(inBar(tier, c) && inMenu(tier, c)), `${tier}: ${c} is in two places`);
      if (!passive.includes(c)) assert.ok(inBar(tier, c) || inMenu(tier, c), `${tier}: ${c} is out of reach`);
    }
  }
});
