// structureOf (show_layout, field-report batch 3 ruling 6, api.md 133): one container's structure as
// its mode arranges it: each card's lane, column and row, how many links join its cards, how many
// cross another, how many cells are empty. Same mode, same router, so it agrees with the picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link, Mode, Region, ViewNode } from '#format';
import { crossingLines, layoutBoard, routeLines, structureOf } from '../src/index.ts';

const cards = (n: number, lane?: (i: number) => string): ViewNode[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + 1), region: 'r', kind: 'finding', title: `c${i + 1}`, n: i + 1, ...(lane && { lane: lane(i) }) }));
const region = (mode: Mode, extra: Partial<Region> = {}): Region => ({ id: 'r', title: 'R', mode, ...extra });
const cell = (s: ReturnType<typeof structureOf>, id: string) => s.cards.find((c) => c.id === id)!;

test('grid: columns from the region, rows as filled, the cells left in the last row are empty', () => {
  const s = structureOf(region('grid', { columns: 3 }), cards(7), []);
  assert.equal(s.columns, 3);
  assert.deepEqual(['1', '3', '4', '7'].map((id) => [cell(s, id).column, cell(s, id).row]), [[1, 1], [3, 1], [1, 2], [1, 3]]);
  assert.deepEqual([s.links, s.crossing, s.empty, s.lanes], [0, 0, 2, undefined]);
});

test('column and row: one column (one row), no empty cells', () => {
  const col = structureOf(region('column'), cards(4), []);
  assert.deepEqual([col.columns, col.empty, cell(col, '4').row], [1, 0, 4]);
  const row = structureOf(region('row'), cards(4), []);
  assert.deepEqual([row.columns, row.empty, cell(row, '4').column, cell(row, '4').row], [4, 0, 4, 1]);
});

test('flow: columns by link depth, rows top to bottom; links outside the cards or to themselves are not counted', () => {
  const links: Link[] = [
    { from: '1', to: '2' }, { from: '1', to: '3' }, { from: '2', to: '4' }, { from: '3', to: '4' },
    { from: '4', to: '4' }, { from: '4', to: '99' },
  ];
  const s = structureOf(region('flow'), cards(4), links);
  assert.equal(s.columns, 3);
  assert.deepEqual(['1', '2', '3', '4'].map((id) => cell(s, id).column), [1, 2, 2, 3]);
  assert.deepEqual([cell(s, '2').row, cell(s, '3').row].sort(), [1, 2]);
  // 3 columns x 2 rows, 4 cards.
  assert.deepEqual([s.links, s.crossing, s.empty], [4, 0, 2]);
});

test('lanes: the lanes, each card\'s lane, column and place in its stack; empty lane-column cells', () => {
  const nodes = cards(4, (i) => ['A', 'B', 'B', 'A'][i]!);
  const s = structureOf(region('lanes', { lanes: ['A', 'B', 'C'] }), nodes, [{ from: '1', to: '2' }, { from: '1', to: '3' }, { from: '2', to: '4' }]);
  assert.deepEqual(s.lanes, ['A', 'B', 'C']);
  assert.deepEqual(cell(s, '1'), { id: '1', column: 1, row: 1, lane: 'A' });
  assert.deepEqual([cell(s, '2').column, cell(s, '3').column, cell(s, '4').column], [2, 2, 3]);
  assert.deepEqual([cell(s, '2').row, cell(s, '3').row].sort(), [1, 2]);
  // 3 lanes x 3 columns; A uses columns 1 and 3, B column 2 (a stack counts once), C none.
  assert.equal(s.empty, 9 - 3);
});

test('radial: the centre is column 1, each ring the next; nothing is empty', () => {
  const links: Link[] = ['2', '3', '4'].map((to) => ({ from: '1', to })).concat([{ from: '2', to: '5' }]);
  const s = structureOf(region('radial', { center: '1' }), cards(5), links);
  assert.deepEqual(['1', '2', '5'].map((id) => cell(s, id).column), [1, 2, 3]);
  assert.deepEqual(['2', '3', '4'].map((id) => cell(s, id).row), [1, 2, 3]);
  assert.deepEqual([s.columns, s.empty], [3, 0]);
});

test('cards come back in the order given, whatever the mode', () => {
  const given = cards(5).reverse();
  for (const mode of ['grid', 'column', 'row', 'flow', 'lanes', 'radial'] as Mode[]) {
    assert.deepEqual(structureOf(region(mode), given, []).cards.map((c) => c.id), ['5', '4', '3', '2', '1'], mode);
  }
});

test('an empty container: nothing arranged', () => {
  assert.deepEqual(structureOf(region('grid'), [], []), { columns: 0, cards: [], links: 0, crossing: 0, empty: 0 });
  assert.deepEqual(structureOf(region('lanes', { lanes: ['A'] }), [], []).lanes, ['A']);
});

test('the crossing count is the picture\'s, for cards of the structure\'s size', () => {
  // Two links that must cross in a lanes container: 1 > 4 and 2 > 3 with 1 above 2 and 4 above 3.
  const nodes = cards(4, (i) => ['A', 'B', 'B', 'A'][i]!);
  const links: Link[] = [{ from: '1', to: '3' }, { from: '2', to: '4' }];
  const r = region('lanes', { lanes: ['A', 'B'] });
  const s = structureOf(r, nodes, links);
  const out = layoutBoard({ format: 1, session: 's', version: 1, title: 's', regions: [r], nodes, links }, new Map(nodes.map((n) => [n.id, { w: 280, h: 120 }])));
  assert.equal(s.crossing, crossingLines(routeLines(links, out.nodes, out.groups).map((l) => l.pts)));
  assert.equal(s.crossing, 2);
});

test('the mode shown wins over the region\'s; same input, same answer', () => {
  const nodes = cards(4);
  assert.equal(structureOf(region('grid'), nodes, [], 'column').columns, 1);
  assert.deepEqual(structureOf(region('flow'), nodes, [{ from: '1', to: '2' }]), structureOf(region('flow'), nodes, [{ from: '1', to: '2' }]));
});
