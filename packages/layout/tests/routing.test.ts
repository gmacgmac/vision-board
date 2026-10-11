// Routing (field-report batch 3 ruling 2, tracker M2): inside a container, links run through the
// gutters between columns and lanes, never under a card; links that would share a line get their
// own tracks; right angles; deterministic. Links between containers and in radial keep the elbow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link, Mode, View } from '../../format/src/index.ts';
import { KINDS } from '../../format/src/index.ts';
import { layoutBoard, routeLines, routeLinks } from '../src/index.ts';
import type { Box, Size } from '../src/index.ts';
import { rightAngled, shareStretch, under } from './route-checks.ts';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROUTED: Mode[] = ['flow', 'lanes', 'grid', 'column', 'row'];

/** One container per board, 4-14 cards of mixed sizes, links at random (some backwards). */
function board(seed: number): { view: View; sizes: Map<string, Size> } {
  const r = rng(seed);
  const mode = ROUTED[seed % ROUTED.length]!;
  const count = 4 + Math.floor(r() * 11);
  const view: View = {
    format: 1, session: `r${seed}`, version: 1, title: 'r',
    regions: [{ id: 'g', title: 'G', mode, lanes: ['now', 'next', 'later'] }], nodes: [], links: [],
  };
  const sizes = new Map<string, Size>();
  for (let i = 0; i < count; i++) {
    view.nodes.push({ id: `n${i}`, region: 'g', kind: KINDS[i % KINDS.length]!, title: `n${i}`, lane: ['now', 'next', 'later'][Math.floor(r() * 3)]! });
    sizes.set(`n${i}`, { w: [280, 360, 464][Math.floor(r() * 3)]!, h: 72 + Math.floor(r() * 200) });
  }
  for (let k = 0; k < count + 2; k++) {
    const [a, b] = [Math.floor(r() * count), Math.floor(r() * count)];
    if (a !== b && !view.links.some((l) => l.from === `n${a}` && l.to === `n${b}`)) view.links.push({ from: `n${a}`, to: `n${b}` });
  }
  return { view, sizes };
}

test('inside a container no line runs under a card it does not join (seeded boards, five modes)', () => {
  let routed = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { view, sizes } = board(seed);
    const out = layoutBoard(view, sizes);
    for (const { link, pts } of routeLines(view.links, out.nodes, out.groups)) {
      // A link with no route through free space keeps the elbow; count the others.
      let clear = true;
      for (const [id, b] of out.nodes) if (id !== link.from && id !== link.to && under(pts, b)) clear = false;
      if (clear) routed += 1;
      else assert.ok(pts.length === 4, `seed ${seed}: ${link.from}>${link.to} runs under a card off the fallback`);
    }
  }
  assert.ok(routed > 0);
});

test('almost every link finds a route through free space (the elbow fallback is rare)', () => {
  let links = 0, fallback = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { view, sizes } = board(seed);
    const out = layoutBoard(view, sizes);
    for (const { link, pts } of routeLines(view.links, out.nodes, out.groups)) {
      links += 1;
      if ([...out.nodes].some(([id, b]) => id !== link.from && id !== link.to && under(pts, b))) fallback += 1;
    }
  }
  assert.ok(fallback / links < 0.02, `${fallback} of ${links} links fell back`);
});

test('right angles, and no two links share a stretch of line (seeded boards)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { view, sizes } = board(seed);
    const out = layoutBoard(view, sizes);
    const lines = routeLines(view.links, out.nodes, out.groups);
    for (const { link, pts } of lines) assert.ok(rightAngled(pts), `seed ${seed}: ${link.from}>${link.to}`);
    for (let i = 0; i < lines.length; i++)
      for (let j = i + 1; j < lines.length; j++) {
        const [p, q] = [lines[i]!, lines[j]!];
        // Two links between the same two cards (both ways) may meet at the cards' ports.
        if (p.link.from === q.link.to && p.link.to === q.link.from) continue;
        assert.ok(!shareStretch(p.pts, q.pts), `seed ${seed}: ${p.link.from}>${p.link.to} / ${q.link.from}>${q.link.to}`);
      }
  }
});

test('three links into one card from one column get three tracks, not one trunk', () => {
  // a, b and c stacked on the left; t further right and below them all, so the three runs down
  // the gutter overlap.
  const boxes = new Map<string, Box>([
    ['a', { x: 0, y: 0, w: 280, h: 100 }], ['b', { x: 0, y: 124, w: 280, h: 100 }], ['c', { x: 0, y: 248, w: 280, h: 100 }],
    ['t', { x: 400, y: 500, w: 280, h: 100 }],
  ]);
  const links: Link[] = ['a', 'b', 'c'].map((from) => ({ from, to: 't' }));
  const lines = routeLines(links, boxes, new Map([...boxes.keys()].map((id) => [id, 'g'])));
  const downs = lines.map(({ pts }) => pts.find((p, i) => i > 0 && p.x === pts[i - 1]!.x && p.y !== pts[i - 1]!.y)!.x);
  assert.equal(new Set(downs).size, 3);
  // Ten px apart, and in the order that does not cross: the run from the top card furthest right.
  const [xa, xb, xc] = downs as [number, number, number];
  assert.deepEqual([xa - xb, xb - xc], [10, 10]);
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) assert.ok(!shareStretch(lines[i]!.pts, lines[j]!.pts));
});

test('same input, same routes (seeded boards)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const [a, b] = [board(seed), board(seed)];
    assert.deepEqual(layoutBoard(a.view, a.sizes).routes, layoutBoard(b.view, b.sizes).routes, `seed ${seed}`);
  }
});

test('links between containers, links in radial, and routes without groups keep the plain elbow', () => {
  const boxes = new Map<string, Box>([['a', { x: 0, y: 0, w: 100, h: 50 }], ['b', { x: 300, y: 200, w: 100, h: 50 }], ['m', { x: 140, y: 0, w: 100, h: 400 }]]);
  const links: Link[] = [{ from: 'a', to: 'b' }];
  // No groups, or a and b in different containers: one bend halfway (x 200), under m.
  const elbow = routeLines(links, boxes)[0]!.pts;
  assert.equal(elbow.length, 4);
  assert.deepEqual([elbow[1]!.x, elbow[2]!.x], [200, 200]);
  assert.ok(under(elbow, boxes.get('m')!));
  assert.deepEqual(routeLines(links, boxes, new Map([['a', 'g1'], ['b', 'g2'], ['m', 'g1']]))[0]!.pts, elbow);
  // In one container: round m.
  const { pts } = routeLines(links, boxes, new Map([['a', 'g'], ['b', 'g'], ['m', 'g']]))[0]!;
  assert.ok(!under(pts, boxes.get('m')!));
  // Radial containers are not in the layout's groups.
  const view: View = {
    format: 1, session: 'rad', version: 1, title: 'rad', regions: [{ id: 'g', title: 'G', mode: 'radial' }],
    nodes: ['x', 'y'].map((id) => ({ id, region: 'g', kind: 'finding', title: id })), links: [{ from: 'x', to: 'y' }],
  };
  assert.equal(layoutBoard(view, new Map([['x', { w: 280, h: 100 }], ['y', { w: 280, h: 100 }]])).groups.size, 0);
});
