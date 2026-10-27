// Container places (3_FE_04 ruling 6): a pinned container stays exactly where the person dropped
// it; unpinned containers move right or down to make room (collide.ts, reused); pinned ones never
// move for one another, except that when two would overlap the one dropped last wins and the
// earlier one is pushed. Same input, same picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Region, View, ViewNode } from '#format';
import { layoutBoard, layoutRegion, overlaps, packRegions, REGION_HEAD, REGION_PAD } from '../src/index.ts';
import type { BoardLayout, Point, Size } from '../src/index.ts';

const regions: Region[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id.toUpperCase(), mode: 'grid' }));
const nodes: ViewNode[] = regions.flatMap((r, i) => [1, 2].map((k) => ({ id: `${r.id}${k}`, region: r.id, kind: 'question' as const, title: `${i}${k}` })));
const view: View = { format: 1, session: 's', title: 'B', version: 1, regions, nodes, links: [{ from: 'a1', to: 'c2' }] };
const sizes = new Map<string, Size>(nodes.map((n) => [n.id, { w: 280, h: 120 }]));
const box = (l: BoardLayout, id: string) => l.regions.find((r) => r.id === id)!.box;

function apart(l: BoardLayout) {
  for (const a of l.regions) {
    for (const b of l.regions) {
      if (a.id < b.id) assert.ok(!overlaps(a.box, b.box), `${a.id} and ${b.id} overlap`);
    }
  }
}

test('a pinned container sits exactly at its pin, and its cards move with it', () => {
  const free = layoutBoard(view, sizes, { maxRowWidth: 1400 });
  const pin = { x: 2000, y: 40 };
  const l = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map([['b', pin]]) });
  assert.deepEqual({ x: box(l, 'b').x, y: box(l, 'b').y }, pin);
  const dx = pin.x - box(free, 'b').x;
  const dy = pin.y - box(free, 'b').y;
  for (const id of ['b1', 'b2']) {
    assert.deepEqual([l.nodes.get(id)!.x, l.nodes.get(id)!.y], [free.nodes.get(id)!.x + dx, free.nodes.get(id)!.y + dy]);
  }
  // Cards stay below the frame's top line (REGION_HEAD), inside the frame.
  assert.ok(l.nodes.get('b1')!.y >= pin.y + REGION_HEAD);
  assert.ok(l.nodes.get('b1')!.x >= pin.x + REGION_PAD - 1e-6);
});

test('dropped on another container, the pinned one stays; the other moves right or down, never left or up', () => {
  const free = layoutBoard(view, sizes, { maxRowWidth: 1400 });
  const onA = { x: box(free, 'a').x + 30, y: box(free, 'a').y + 20 };
  const l = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map([['d', onA]]) });
  assert.deepEqual({ x: box(l, 'd').x, y: box(l, 'd').y }, onA);
  apart(l);
  for (const id of ['a', 'b', 'c']) {
    assert.ok(box(l, id).x >= box(free, id).x && box(l, id).y >= box(free, id).y, `${id} moved left or up`);
  }
  // Links are routed to where the cards are now.
  const route = l.routes.find((r) => r.from === 'a1' && r.to === 'c2')!;
  assert.notDeepEqual(route.d, layoutBoard(view, sizes, { maxRowWidth: 1400 }).routes[0]!.d);
});

test('two pinned containers that would overlap: the one dropped last wins, the earlier is pushed', () => {
  const at = { x: 100, y: 1000 };
  const near = { x: 140, y: 1020 };
  // Map order is drop order: `c` was dropped first, `a` last.
  const l = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map([['c', at], ['a', near]]) });
  assert.deepEqual({ x: box(l, 'a').x, y: box(l, 'a').y }, near);
  assert.notDeepEqual({ x: box(l, 'c').x, y: box(l, 'c').y }, at);
  assert.ok(box(l, 'c').x >= at.x && box(l, 'c').y >= at.y);
  apart(l);
  // The other order: `c` wins.
  const r = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map([['a', near], ['c', at]]) });
  assert.deepEqual({ x: box(r, 'c').x, y: box(r, 'c').y }, at);
  apart(r);
});

test('same input, same picture; layoutBoard is layoutRegion and packRegions composed, pins included', () => {
  const pins = new Map<string, Point>([['b', { x: 0, y: 0 }], ['d', { x: 300, y: 60 }]]);
  const a = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: pins });
  const b = layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map(pins) });
  assert.deepEqual(a, b);
  apart(a);
  const pieces = regions.map((r) => layoutRegion(r, nodes.filter((n) => n.region === r.id), [], sizes));
  assert.deepEqual(packRegions(pieces, view.links, { maxRowWidth: 1400, pins }), a);
});

test('a pin for a container not on the board is ignored', () => {
  const plain = layoutBoard(view, sizes, { maxRowWidth: 1400 });
  assert.deepEqual(layoutBoard(view, sizes, { maxRowWidth: 1400, regionPins: new Map([['gone', { x: 5, y: 5 }]]) }), plain);
});
