// The selection grid (selectionGrid flag, selection-grid task, maintainer points 773 and 775): the pill opens into
// three rows of three with the anchor (Comment) under the pointer, upward when it fits, else downward with its rows
// reversed; arrow keys step between the cells that take focus; the template keeps the grid's shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_EDGE, barView, GRID_ANCHOR, gridStep, isGridKey, placeGrid, selectionBarTemplate } from '../src/index.ts';
import type { GridCell } from '../src/index.ts';

const STAGE = { w: 1000, h: 600 };
const GRID = { w: 330, h: 90 };
/** The anchor: the bottom row's middle, 14px from the grid's bottom edge. */
const ANCHOR = { x: 165, reach: 14 };

test('placeGrid: upward when it fits, the anchor\'s centre at the click', () => {
  const p = placeGrid({ x: 500, y: 300 }, GRID, ANCHOR, STAGE);
  assert.deepEqual(p, { side: 'above', x: 500 - 165, y: 300 + 14 - 90 });
});

test('placeGrid: no room above, downward with the anchor still at the click', () => {
  const p = placeGrid({ x: 500, y: 40 }, GRID, ANCHOR, STAGE);
  assert.deepEqual(p, { side: 'below', x: 335, y: 40 - 14 });
  // Exactly at the edge still fits upward.
  assert.equal(placeGrid({ x: 500, y: BAR_EDGE + 90 - 14 }, GRID, ANCHOR, STAGE).side, 'above');
  assert.equal(placeGrid({ x: 500, y: BAR_EDGE + 90 - 15 }, GRID, ANCHOR, STAGE).side, 'below');
});

test('placeGrid: kept inside the stage sideways, and up or down when it must', () => {
  assert.equal(placeGrid({ x: 20, y: 300 }, GRID, ANCHOR, STAGE).x, BAR_EDGE);
  assert.equal(placeGrid({ x: 990, y: 300 }, GRID, ANCHOR, STAGE).x, STAGE.w - BAR_EDGE - GRID.w);
  // A click near the bottom: upward, its bottom kept inside.
  assert.equal(placeGrid({ x: 500, y: 598 }, GRID, ANCHOR, STAGE).y, STAGE.h - BAR_EDGE - GRID.h);
  // A stage too short for it either way: downward, from the top edge.
  assert.deepEqual(placeGrid({ x: 500, y: 2 }, GRID, ANCHOR, { w: 1000, h: 60 }), { side: 'below', x: 335, y: BAR_EDGE });
});

test('gridStep: the arrows move a cell at a time and stop at the edges', () => {
  const all = Array<boolean>(9).fill(true);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowLeft', false, all), 6);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowRight', false, all), 8);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowUp', false, all), 4);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowDown', false, all), GRID_ANCHOR, 'the bottom row stops');
  assert.equal(gridStep(0, 'ArrowLeft', false, all), 0);
  assert.equal(gridStep(2, 'ArrowRight', false, all), 2, 'no wrap to the next row');
});

test('gridStep: opening downward Up and Down follow the screen; empty and disabled cells are passed over', () => {
  const all = Array<boolean>(9).fill(true);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowDown', true, all), 4, 'the anchor\'s row is on top');
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowUp', true, all), GRID_ANCHOR);
  const noRemove = all.map((_, i) => i !== 2);
  assert.equal(gridStep(5, 'ArrowUp', false, noRemove), 5, 'nothing usable above');
  const noMiddle = all.map((_, i) => i !== 4);
  assert.equal(gridStep(GRID_ANCHOR, 'ArrowUp', false, noMiddle), 1, 'past the empty middle to the row above it');
  assert.ok(isGridKey('ArrowUp') && !isGridKey('Tab'));
});

const cells: GridCell[] = [
  { id: 'reset-places', label: 'Reset places', icon: 'put-back', disabled: true }, { id: 'remove', label: 'Remove', danger: true, icon: 'trash' },
  { id: 'save-for-later', label: 'Save for later', icon: 'clock' }, { id: 'width', label: 'Width' }, { id: 'zoom-selection', label: 'Zoom' },
  { id: 'move', label: 'Move to' }, { id: 'comment', label: 'Comment', primary: true, icon: 'notes-group' }, null,
];

test('template with the grid: the pill first in row 1, a divider, the rows marked, the anchor, icons and the danger look', () => {
  const v = barView(2, [], { open: true, cells });
  assert.equal(v.cells, cells);
  const html = selectionBarTemplate(v);
  assert.match(html, /^<button type="button" class="vb-sb-pill" aria-expanded="false" data-row="1">2 selected/);
  const rows = [...html.matchAll(/data-row="(\d)"/g)].map((m) => m[1]).join('');
  assert.equal(rows, '111222333', 'nine cells, three to a row');
  assert.match(html, /data-command="remove" data-row="1"/);
  assert.match(html, /class="vb-sb-btn vb-sb-danger" data-command="remove"/);
  assert.match(html, /<span>Remove<\/span><\/button><span class="vb-sb-divider" aria-hidden="true"><\/span>/);
  assert.match(html, /class="vb-sb-btn vb-sb-primary" data-command="comment" data-row="3" data-anchor><svg[^>]*class="vb-icon vb-sb-icon"[\s\S]*?<\/svg><span>Comment<\/span>/);
  assert.match(html, /data-command="reset-places" data-row="1" disabled><svg/);
  assert.match(html, /data-command="width" data-row="2">Width<\/button>/, 'a cell given no icon: the label alone');
  assert.match(html, /data-command="remove" data-row="1"><svg/);
  assert.match(html, /<span class="vb-sb-gap" data-row="3" aria-hidden="true"><\/span>$/, 'an absent command keeps its cell');
});

test('template: the grid only over a selection; without it the one-row bar is as before (no icons, no danger)', () => {
  assert.doesNotMatch(selectionBarTemplate(barView(0, [{ id: 'zoom-area', label: 'Zoom to this area' }], { open: true })), /data-row/);
  const flat = selectionBarTemplate(barView(2, cells.filter((c): c is NonNullable<GridCell> => c !== null), { open: true }));
  assert.doesNotMatch(flat, /data-row|vb-sb-danger|<svg/);
});

test('barView: the grid\'s count says why its acting cells are off; the one-row bar and no reason say only the count', () => {
  const v = barView(1, [], { open: true, cells, why: 'locked' });
  assert.equal(v.count, '1 selected · locked');
  assert.equal(v.name, 'Selection: 1 selected · locked');
  assert.equal(barView(1, [], { open: true, cells, why: null }).count, '1 selected');
  assert.equal(barView(1, [], { open: true, why: 'locked' }).count, '1 selected', 'no grid, no reason');
});

