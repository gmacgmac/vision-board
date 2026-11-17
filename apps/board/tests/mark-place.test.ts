// Where a node's menu, picker or tip goes on the stage (nodeEdges flag, FE_02, mark-place.ts): the picker to the right
// of the disc, never on it; the number's menu under the number; the right-click list at the pointer; a tip above its
// mark; each flipped to the other side when the stage has no room, and always inside the stage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK_GAP, placeMark, STAGE_EDGE } from '../src/board/cards/mark-place.ts';

const stage = { w: 1000, h: 700 };
const size = { w: 100, h: 40 };
const disc = { x: 300, y: 200, w: 26, h: 26 };

test('the picker opens to the right of the disc, centred on it, and never covers it', () => {
  const at = placeMark(disc, size, stage, 'right');
  assert.deepEqual(at, { x: 300 + 26 + MARK_GAP, y: Math.round(213 - 20) });
  assert.ok(at.x >= disc.x + disc.w, 'never on the disc');
});

test('with no room on the right, the picker opens on the left of the disc', () => {
  const at = placeMark({ ...disc, x: 950 }, size, stage, 'right');
  assert.equal(at.x, 950 - MARK_GAP - 100);
});

test('the number\'s menu hangs under the number, above it when the stage ends', () => {
  assert.deepEqual(placeMark(disc, size, stage, 'below'), { x: 300, y: 200 + 26 + MARK_GAP });
  assert.deepEqual(placeMark({ ...disc, y: 660 }, size, stage, 'below'), { x: 300, y: 660 - MARK_GAP - 40 });
});

test('the right-click list starts at the pointer, flipping left and up at the stage\'s far edges', () => {
  const p = { x: 400, y: 300, w: 0, h: 0 };
  assert.deepEqual(placeMark(p, size, stage, 'point'), { x: 400, y: 300 });
  assert.deepEqual(placeMark({ ...p, x: 960, y: 690 }, size, stage, 'point'), { x: 860, y: 650 });
});

test('a tip sits above its mark, under it at the stage\'s top, and every box stays inside the stage', () => {
  assert.deepEqual(placeMark(disc, size, stage, 'above'), { x: Math.round(313 - 50), y: 200 - MARK_GAP - 40 });
  assert.equal(placeMark({ ...disc, y: 10 }, size, stage, 'above').y, 10 + 26 + MARK_GAP);
  const corner = placeMark({ x: -50, y: -50, w: 10, h: 10 }, size, stage, 'point');
  assert.deepEqual(corner, { x: STAGE_EDGE, y: STAGE_EDGE });
});
