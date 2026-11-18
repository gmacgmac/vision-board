// The header's tiers (adaptiveHeader flag, board/chrome/header-tier.ts): which tier a width is, what sits
// where, and that nothing a person can act on is ever out of reach.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLOWS_W, FULL_MIN, HALF_MIN, HEADER_CONTROLS, headerTier, inBar, inMenu } from '../src/board/chrome/header-tier.ts';
import type { HeaderControl, HeaderTier } from '../src/board/chrome/header-tier.ts';

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

test('with Flows (a board is open) the full form starts FLOWS_W later; half and a third start where they did', () => {
  assert.equal(headerTier(FULL_MIN + FLOWS_W, true), 'full');
  assert.equal(headerTier(FULL_MIN + FLOWS_W - 1, true), 'half');
  assert.equal(headerTier(1470, true), 'full', 'the design\'s full width keeps its form');
  assert.equal(headerTier(HALF_MIN, true), 'half');
  assert.equal(headerTier(HALF_MIN - 1, true), 'third');
});

test('FLOWS_W is the room header.css keeps for Flows: its width and the gap before it', () => {
  const css = readFileSync(new URL('../src/styles/header.css', import.meta.url), 'utf8');
  const tokens = readFileSync(new URL(import.meta.resolve('#tokens/styles.css')), 'utf8');
  const px = (src: string, name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(src)![1]);
  assert.equal(FLOWS_W, px(css, '--vb-flows-w') + px(tokens, '--vb-space-2'));
});

test('Flows is a button at full and rows of "⋯" at half and a third (FIX_01)', () => {
  assert.ok(inBar('full', 'flows'));
  for (const tier of ['half', 'third'] as const) assert.ok(inMenu(tier, 'flows'), tier);
});

test('half: Edit, version, containers and Flows move into "⋯", the app icon goes', () => {
  assert.deepEqual(moved('half'), ['version', 'edit', 'containers', 'flows']);
  assert.equal(inBar('half', 'app-icon'), false);
  for (const c of ['folder', 'ledger', 'board', 'open', 'new', 'zoom', 'agents', 'send', 'chat', 'more', 'locked', 'editing', 'boards-updated', 'replied', 'bookmarked'] as const) {
    assert.ok(inBar('half', c), c);
  }
});

test('a third: the bar is the board, the ledger\'s state, Locked, Send, Chat and "⋯"', () => {
  assert.deepEqual(bar('third'), ['board', 'editing', 'locked', 'send', 'chat', 'more']);
  assert.equal(inBar('third', 'replied'), false, 'Replied can go');
});

test('the page\'s folder and ledger (ledgerFolders flag) are in the path at full and half, rows of "⋯" at a third, folder first', () => {
  for (const tier of ['full', 'half'] as const) for (const c of ['folder', 'ledger'] as const) assert.ok(inBar(tier, c), `${tier}: ${c}`);
  assert.deepEqual(moved('third').slice(0, 2), ['folder', 'ledger']);
  assert.deepEqual(HEADER_CONTROLS.slice(1, 4), ['folder', 'ledger', 'board'], 'the path\'s order: folder / ledger / board');
});

test('the ledger\'s state (readOnlyStart flag, decision 16) is in the bar at every tier; Edit is a button at full and a row of "⋯" from half', () => {
  for (const tier of TIERS) assert.ok(inBar(tier, 'editing'), tier);
  assert.ok(inBar('full', 'edit'));
  for (const tier of ['half', 'third'] as const) assert.ok(inMenu(tier, 'edit'), tier);
  assert.deepEqual(HEADER_CONTROLS.slice(4, 8), ['version', 'editing', 'edit', 'locked'], 'after the path: the state, Edit, then Locked');
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
