// The zoom rule's numbers (D-101, FE_05): the marks' minimum is tokens.css's, and the growth and the box's scale follow it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BOX_MIN_K, MARK_H, MARK_MIN, boxScale, markGrow } from '../src/board/canvas/viewport.ts';

const tokens = readFileSync(new URL(import.meta.resolve('#tokens/styles.css')), 'utf8');
const px = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(tokens)![1]);

test('MARK_MIN and MARK_H are the tokens', () => {
  assert.equal(MARK_MIN, px('--vb-mark-min'));
  assert.equal(MARK_H, px('--vb-mark-h'));
});

test('a mark grows only where it would draw under the minimum, so it never draws under it', () => {
  assert.equal(markGrow(1), 1);
  assert.equal(markGrow(MARK_MIN / MARK_H), 1);
  for (const k of [0.2, 0.3, 0.5]) assert.ok(MARK_H * k * markGrow(k) >= MARK_MIN - 0.05);
  assert.ok(markGrow(0.2) > markGrow(0.4));
  for (const k of [0.2, 0.3, 0.5]) assert.ok(MARK_H * k * markGrow(k) <= MARK_MIN * 1.2 + 0.05, 'a step, not more');
  assert.equal(markGrow(0.5), markGrow(0.49), 'between two steps nothing is written');
});

test('the conversation box scales with the board down to its floor', () => {
  assert.equal(boxScale(2.5), 2.5);
  assert.equal(boxScale(1), 1);
  assert.equal(boxScale(0.2), BOX_MIN_K);
});
