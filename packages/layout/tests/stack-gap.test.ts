// Cards stacked top to bottom are GAP apart (found-in-use FE_03 ruling 1), so the next card's
// tabs (about 16px with their halo) clear the card above. Grid, flow and radial are unchanged. With
// `rowGap` (ROW_GAP under updateSignals, tab-lower task) a card and the card under it are that far apart
// in every mode that stacks (column, grid rows, flow, a lane's stacks), and side by side stays GAP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Region, ViewNode } from '#format';
import { MODE_FNS } from '../src/index.ts';
import { GAP, ROW_GAP } from '../src/types.ts';
import type { Size } from '../src/index.ts';

const nodes: ViewNode[] = [1, 2, 3].map((k) => ({ id: `n${k}`, region: 'r', kind: 'question' as const, title: `T${k}` }));
const sizes = new Map<string, Size>(nodes.map((n, i) => [n.id, { w: 280, h: 100 + i * 20 }]));
const run = (mode: Region['mode'], lanes?: string[], rowGap?: number) =>
  MODE_FNS[mode]({ region: { id: 'r', title: 'R', mode, lanes }, nodes, links: [], sizes, rowGap });

test('column: each card starts GAP below the one above', () => {
  const { pos } = run('column');
  for (const [a, b] of [['n1', 'n2'], ['n2', 'n3']] as const) {
    assert.equal(pos.get(b)!.y - (pos.get(a)!.y + pos.get(a)!.h), GAP);
  }
});

test('row: left to right in card order, GAP apart, tops aligned, no links needed (api.md 129)', () => {
  // Given out of order: the card numbers decide.
  const shuffled = [nodes[2]!, nodes[0]!, nodes[1]!].map((x) => ({ ...x, n: Number(x.id.slice(1)) }));
  const { pos } = MODE_FNS.row({ region: { id: 'r', title: 'R', mode: 'row' }, nodes: shuffled, links: [], sizes });
  for (const [a, b] of [['n1', 'n2'], ['n2', 'n3']] as const) {
    assert.equal(pos.get(b)!.x - (pos.get(a)!.x + pos.get(a)!.w), GAP);
    assert.equal(pos.get(b)!.y, pos.get(a)!.y);
  }
  assert.equal(pos.get('n1')!.x, 0);
});

test('column: top to bottom in card order, whatever order the cards come in', () => {
  const shuffled = [nodes[1]!, nodes[2]!, nodes[0]!].map((x) => ({ ...x, n: Number(x.id.slice(1)) }));
  const { pos } = MODE_FNS.column({ region: { id: 'r', title: 'R', mode: 'column' }, nodes: shuffled, links: [], sizes });
  assert.deepEqual(['n1', 'n2', 'n3'].map((id) => pos.get(id)!.y).every((y, i, ys) => i === 0 || y > ys[i - 1]!), true);
});

/** Lanes stack the cards one lane holds in one column: n1 leads to n2 and n3, which share column 2. */
const stackedLane = (rowGap?: number) => MODE_FNS.lanes({
  region: { id: 'r', title: 'R', mode: 'lanes', lanes: ['L'] }, nodes, sizes, rowGap,
  links: [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }],
});

test('lanes: cards stacked in one column of a lane are GAP apart', () => {
  const { pos } = stackedLane();
  const ys = nodes.map((n) => pos.get(n.id)!).sort((a, b) => a.y - b.y);
  const stacked = ys.filter((b) => b.x === pos.get('n2')!.x);
  assert.ok(stacked.length >= 2, 'the sample stacks cards');
  for (let i = 1; i < stacked.length; i++) assert.equal(stacked[i]!.y - (stacked[i - 1]!.y + stacked[i - 1]!.h), GAP);
});

test('lanes: a lane stays tall enough for its stack', () => {
  const { pos, lanes } = stackedLane();
  const bottom = Math.max(...nodes.map((n) => pos.get(n.id)!.y + pos.get(n.id)!.h));
  assert.ok(lanes![0]!.h >= bottom - lanes![0]!.y);
});

/** How far each card starts below the one above it in the same column (same x), and the gaps across. */
function gaps(pos: Map<string, { x: number; y: number; w: number; h: number }>) {
  const bs = [...pos.values()];
  const down = bs.flatMap((b) => bs.filter((o) => o.x === b.x && o.y > b.y).sort((p, q) => p.y - q.y).slice(0, 1).map((o) => o.y - (b.y + b.h)));
  const across = bs.flatMap((b) => bs.filter((o) => o.y === b.y && o.x > b.x).sort((p, q) => p.x - q.x).slice(0, 1).map((o) => o.x - (b.x + b.w)));
  return { down, across };
}

test('rowGap: column, grid rows, flow and a lane\'s stack put ROW_GAP under a card; side by side stays GAP', () => {
  const column = gaps(run('column', undefined, ROW_GAP).pos);
  assert.deepEqual(column.down, [ROW_GAP, ROW_GAP]);
  // Four cards in a grid: two columns, two rows.
  const four = [...nodes, { id: 'n4', region: 'r', kind: 'question' as const, title: 'T4' }];
  const sized = new Map([...sizes, ['n4', { w: 280, h: 100 }]]);
  const grid = gaps(MODE_FNS.grid({ region: { id: 'r', title: 'R', mode: 'grid' }, nodes: four, links: [], sizes: sized, rowGap: ROW_GAP }).pos);
  assert.ok(grid.down.length && grid.down.every((g) => g >= ROW_GAP), `grid rows: ${grid.down}`);
  assert.ok(grid.across.length && grid.across.every((g) => g === GAP), `grid columns: ${grid.across}`);
  // Flow: n1 leads to n2 and n3, which stack in the next column.
  const flow = MODE_FNS.flow({ region: { id: 'r', title: 'R', mode: 'flow' }, nodes, sizes, rowGap: ROW_GAP, links: [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }] });
  assert.deepEqual(gaps(flow.pos).down, [ROW_GAP]);
  const lane = stackedLane(ROW_GAP).pos;
  const stacked = [...lane.values()].filter((b) => b.x === lane.get('n2')!.x).sort((a, b) => a.y - b.y);
  assert.equal(stacked[1]!.y - (stacked[0]!.y + stacked[0]!.h), ROW_GAP);
  // Row: side by side, unchanged.
  assert.deepEqual(gaps(run('row', undefined, ROW_GAP).pos).across, [GAP, GAP]);
});
