// The zoom rule's numbers (D-101, FE_05): the marks' minimum is tokens.css's, and the growth and the box's scale follow it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BOX_MIN_K, FAR_GROW, MARK_FAR_K, MARK_H, MARK_MIN, boxScale, markGrow, marksPressable } from '../src/board/canvas/viewport.ts';

const tokens = readFileSync(new URL(import.meta.resolve('#tokens/styles.css')), 'utf8');
const px = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(tokens)![1]);

test('MARK_MIN and MARK_H are the tokens', () => {
  assert.equal(MARK_MIN, px('--vb-mark-min'));
  assert.equal(MARK_H, px('--vb-mark-h'));
});

test('a mark grows only where it would draw under the minimum, down to the far breakpoint, so it never draws under it there', () => {
  assert.equal(markGrow(1), 1);
  assert.equal(markGrow(MARK_MIN / MARK_H), 1);
  for (const k of [MARK_FAR_K, 0.4, 0.5]) assert.ok(MARK_H * k * markGrow(k) >= MARK_MIN - 0.05);
  assert.ok(markGrow(0.4) > markGrow(0.5));
  for (const k of [0.4, 0.5]) assert.ok(MARK_H * k * markGrow(k) <= MARK_MIN * 1.2 + 0.05, 'a step, not more');
  assert.equal(markGrow(0.5), markGrow(0.49), 'between two steps nothing is written');
});

test('the conversation box scales with the board between its floor and its top (points 444, 445)', () => {
  assert.equal(boxScale(2.5), 1.2);
  assert.equal(boxScale(1), 1);
  assert.equal(boxScale(0.2), BOX_MIN_K);
});

test('the far breakpoint (FIX_02, points 430 to 438): about 37%; below it nothing grows, so marks scale down with the node, no jump', () => {
  assert.ok(MARK_FAR_K > 0.36 && MARK_FAR_K < 0.38, String(MARK_FAR_K));
  for (const k of [0.2, 0.3, MARK_FAR_K]) assert.equal(markGrow(k), FAR_GROW, `${k}: the growth stays`);
  assert.equal(markGrow(MARK_FAR_K + 1e-6), FAR_GROW, 'just above, the same: no jump at the breakpoint');
  assert.ok(MARK_H * 0.2 * markGrow(0.2) < MARK_MIN, 'at 20% a mark is under the minimum: it scaled with its node');
  assert.ok(Math.abs(MARK_H * 0.2 * markGrow(0.2) - MARK_MIN * 0.2 / MARK_FAR_K) < 0.01, 'in proportion to the zoom');
});

test('marks take a pointer press above the far breakpoint only (FIX_02)', () => {
  for (const k of [2.5, 1, 0.83, 0.45, MARK_FAR_K + 0.001]) assert.equal(marksPressable(k), true, String(k));
  for (const k of [MARK_FAR_K, 0.3, 0.2]) assert.equal(marksPressable(k), false, String(k));
});
