// Where a node's menu, picker or tip goes on the stage (nodeEdges flag, FE_02, mark-place.ts): the picker to the right
// of the disc, never on it; the number's menu under the number; the right-click list at the pointer; a tip above its
// mark; each flipped to the other side when the stage has no room, and always inside the stage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOX_GAP, MARK_GAP, placeBeside, placeMark, STAGE_EDGE } from '../src/board/cards/mark-place.ts';

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

// One place for every box beside a node, the conversation, proposal and history boxes (FE_03 run 2, the maintainer's
// ruling): top aligned with the node, to its right when there is room, else below it, never over the node; the arrow
// aims at the node's centre (FIX_02, points 430 to 438): beside it, at its vertical centre; below, at the middle of the
// box's top edge, the box centred on the node's width.
const node = { x: 100, y: 150, w: 250, h: 120 };
const box = { w: 300, h: 260 };
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('placeBeside: to the right, its top level with the node\'s, the arrow on its left edge at the node\'s vertical centre', () => {
  const reach = { ...node, w: node.w + 11, h: node.h + 11 }; // the marks hanging off the right and bottom
  const p = placeBeside(reach, box, stage, node);
  assert.deepEqual([p.side, p.x, p.y], ['right', reach.x + reach.w + BOX_GAP, node.y]);
  assert.equal(p.arrow, node.h / 2);
  assert.equal(overlaps({ ...p, ...box }, reach), false);
});

test('placeBeside: below when the right has no room, centred on the node\'s width, never over it; the arrow at the top\'s middle', () => {
  const narrow = { w: 600, h: 900 };
  const p = placeBeside(node, box, narrow);
  assert.deepEqual([p.side, p.x, p.y], ['below', node.x + node.w / 2 - box.w / 2, node.y + node.h + BOX_GAP]);
  assert.equal(p.arrow, box.w / 2);
  assert.equal(overlaps({ ...p, ...box }, node), false);
  // Near the stage's left edge it stays inside it across, and its arrow still aims at the node's centre.
  const left = placeBeside({ ...node, x: 2, w: 300 }, box, narrow);
  assert.deepEqual([left.side, left.x], ['below', STAGE_EDGE]);
  assert.equal(left.arrow, 2 + 150 - STAGE_EDGE);
});

// FIX_01 (VERIFY_01 finding 7): a box near the window's bottom stays on screen.
test('placeBeside: on the right near the stage\'s bottom it moves up just enough, its arrow still at the node\'s centre', () => {
  const low = { ...node, y: 600 };
  const p = placeBeside(low, box, stage);
  assert.deepEqual([p.side, p.y], ['right', stage.h - STAGE_EDGE - box.h]);
  assert.equal(p.arrow, Math.min(low.y + low.h / 2 - p.y, box.h - 16), 'aimed at the node\'s centre, kept inside the edge');
  assert.equal(overlaps({ ...p, ...box }, low), false);
  // Where it fits it keeps the node's top, and above the stage's top it comes down to the edge.
  assert.equal(placeBeside({ ...node, y: 300 }, box, stage).y, 300);
  assert.equal(placeBeside({ ...node, y: -40 }, box, stage).y, STAGE_EDGE);
});

test('placeBeside: below near the stage\'s bottom it opens above the node; with room for neither, inside the stage', () => {
  const narrow = { w: 600, h: 900 };
  const low = { ...node, y: 700 };
  const p = placeBeside(low, box, narrow);
  assert.deepEqual([p.side, p.y], ['above', low.y - BOX_GAP - box.h]);
  assert.equal(overlaps({ ...p, ...box }, low), false);
  const tall = placeBeside({ ...node, y: 100, h: 700 }, box, narrow);
  assert.deepEqual([tall.side, tall.y], ['below', narrow.h - STAGE_EDGE - box.h]);
});
