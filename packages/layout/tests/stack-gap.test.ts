// Cards stacked top to bottom are GAP apart (found-in-use FE_03 ruling 1), so the next card's
// tabs (about 16px with their halo) clear the card above. Grid, flow and radial are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Region, ViewNode } from '../../format/src/index.ts';
import { MODE_FNS } from '../src/index.ts';
import { GAP } from '../src/types.ts';
import type { Size } from '../src/index.ts';

const nodes: ViewNode[] = [1, 2, 3].map((k) => ({ id: `n${k}`, region: 'r', kind: 'question' as const, title: `T${k}` }));
const sizes = new Map<string, Size>(nodes.map((n, i) => [n.id, { w: 280, h: 100 + i * 20 }]));
const run = (mode: Region['mode'], lanes?: string[]) =>
  MODE_FNS[mode]({ region: { id: 'r', title: 'R', mode, lanes }, nodes, links: [], sizes });

test('list: each card starts GAP below the one above', () => {
  const { pos } = run('list');
  for (const [a, b] of [['n1', 'n2'], ['n2', 'n3']] as const) {
    assert.equal(pos.get(b)!.y - (pos.get(a)!.y + pos.get(a)!.h), GAP);
  }
});

test('lanes: cards stacked in one column of a lane are GAP apart', () => {
  const { pos } = run('lanes', ['L']);
  const ys = nodes.map((n) => pos.get(n.id)!).sort((a, b) => a.y - b.y);
  const stacked = ys.filter((b) => b.x === ys[0]!.x);
  assert.ok(stacked.length >= 2, 'the sample stacks cards');
  for (let i = 1; i < stacked.length; i++) assert.equal(stacked[i]!.y - (stacked[i - 1]!.y + stacked[i - 1]!.h), GAP);
});

test('lanes: a lane stays tall enough for its stack', () => {
  const { pos, lanes } = run('lanes', ['L']);
  const bottom = Math.max(...nodes.map((n) => pos.get(n.id)!.y + pos.get(n.id)!.h));
  assert.ok(lanes![0]!.h >= bottom - lanes![0]!.y);
});
