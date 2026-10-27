// Cards stacked top to bottom are GAP apart (found-in-use FE_03 ruling 1), so the next card's
// tabs (about 16px with their halo) clear the card above. Grid, flow and radial are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Region, ViewNode } from '#format';
import { MODE_FNS } from '../src/index.ts';
import { GAP } from '../src/types.ts';
import type { Size } from '../src/index.ts';

const nodes: ViewNode[] = [1, 2, 3].map((k) => ({ id: `n${k}`, region: 'r', kind: 'question' as const, title: `T${k}` }));
const sizes = new Map<string, Size>(nodes.map((n, i) => [n.id, { w: 280, h: 100 + i * 20 }]));
const run = (mode: Region['mode'], lanes?: string[]) =>
  MODE_FNS[mode]({ region: { id: 'r', title: 'R', mode, lanes }, nodes, links: [], sizes });

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
const stackedLane = () => MODE_FNS.lanes({
  region: { id: 'r', title: 'R', mode: 'lanes', lanes: ['L'] }, nodes, sizes,
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
