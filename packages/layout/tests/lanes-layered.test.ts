// Lanes, layered (field-report batch 3 ruling 1): columns by link depth, each lane packed left, the
// order in each stack chosen to cut crossings; cycles and lanes with no links handled. The field
// report's round 1 shape (5 lanes, 16 cards, 16 links, 8 of them handoffs between lanes; content
// made up) is drawn with no line under a card and no shared trunk, and one crossing. The engine
// before batch 3 (commit 7da73cc) pulled card 12 to column 3, next to card 9, and drew 7 of these
// links on shared trunks and none crossing; keeping card 12 in column 1 costs the one crossing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link, Region, View, ViewNode } from '../../format/src/index.ts';
import { crossingPoints, layoutBoard, MODE_FNS, routeLines } from '../src/index.ts';
import type { Size } from '../src/index.ts';
import { GAP, LANE_PAD } from '../src/types.ts';
import { rightAngled, shareStretch, under } from './route-checks.ts';

const LANES = ['Person', 'Gateway', 'Bots', 'Services', 'Storage'];
const AT = 'Person Person Gateway Gateway Gateway Bots Bots Bots Bots Services Services Services Storage Storage Storage Storage'.split(' ');
const LINKS: [number, number][] = [
  [1, 3], [3, 6], [3, 7], [3, 8], [7, 10], [12, 9], [9, 5], [5, 2], // handoffs between lanes
  [3, 4], [6, 9], [8, 9], [10, 11], [4, 5], [13, 14], [14, 15], [15, 16], // inside a lane
];

function field(): View {
  return {
    format: 1, session: 'field', version: 1, title: 'Round 1',
    regions: [{ id: 'r', title: 'Multi-bot', mode: 'lanes', lanes: LANES }],
    nodes: AT.map((lane, i) => ({ id: String(i + 1), region: 'r', kind: 'finding', title: `Card ${i + 1}`, lane })),
    links: LINKS.map(([a, b]) => ({ from: String(a), to: String(b) })),
  };
}
const sizesOf = (v: View, w = 280, h = 120) => new Map<string, Size>(v.nodes.map((n) => [n.id, { w, h }]));
const cellsOf = (region: Region, nodes: ViewNode[], links: Link[], sizes: Map<string, Size>) =>
  MODE_FNS.lanes({ region, nodes, links, sizes }).cells!;

test('field report round 1: the shape it describes (5 lanes, 16 cards, 16 links, 8 between lanes)', () => {
  const v = field();
  const lane = new Map(v.nodes.map((n) => [n.id, n.lane]));
  assert.deepEqual([v.regions[0]!.lanes!.length, v.nodes.length, v.links.length], [5, 16, 16]);
  assert.equal(v.links.filter((l) => lane.get(l.from) !== lane.get(l.to)).length, 8);
});

test('field report round 1: no line under a card, no shared trunk, right angles, one crossing', () => {
  const v = field();
  const out = layoutBoard(v, sizesOf(v));
  const lines = routeLines(v.links, out.nodes, out.groups);
  // 12 > 9 rises in the gutter where 7 > 10 comes down to card 10: either order crosses once.
  assert.equal(crossingPoints(lines.map((l) => l.pts)), 1);
  for (const { link, pts } of lines) {
    assert.ok(rightAngled(pts), `${link.from}>${link.to}`);
    for (const [id, b] of out.nodes) if (id !== link.from && id !== link.to) assert.ok(!under(pts, b), `${link.from}>${link.to} under ${id}`);
  }
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++)
      assert.ok(!shareStretch(lines[i]!.pts, lines[j]!.pts), `${lines[i]!.link.from}>${lines[i]!.link.to} / ${lines[j]!.link.from}>${lines[j]!.link.to}`);
});

test('field report round 1: no lane pushed right by another lane\'s chain', () => {
  const v = field();
  const cells = cellsOf(v.regions[0]!, v.nodes, v.links, sizesOf(v));
  const col = (n: number) => cells.get(String(n))!.column;
  // Card 12 starts Services' work on its own: it stays in column 1, not next to card 9 (column 4).
  assert.equal(col(12), 1);
  // Storage runs its own chain from column 1, whatever the other lanes' depth.
  assert.deepEqual([13, 14, 15, 16].map(col), [1, 2, 3, 4]);
  // The rest by link depth: 1 > 3 > 6, 7, 8 > 9 > 5 > 2, and 7 > 10 > 11.
  assert.deepEqual([1, 3, 4, 6, 7, 8, 9, 5, 2, 10, 11].map(col), [1, 2, 3, 3, 3, 3, 4, 5, 6, 4, 5]);
});

/** mulberry32, so every run draws the same boards. */
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

/** A lanes board of the field report's size, links at random (some backwards, so some cycles). */
function randomLanes(seed: number): View {
  const r = rng(seed);
  const v = field();
  v.nodes = v.nodes.map((n) => ({ ...n, lane: LANES[Math.floor(r() * LANES.length)]! }));
  v.links = [];
  while (v.links.length < 16) {
    const [a, b] = [1 + Math.floor(r() * 16), 1 + Math.floor(r() * 16)];
    if (a !== b && !v.links.some((l) => l.from === String(a) && l.to === String(b))) v.links.push({ from: String(a), to: String(b) });
  }
  return v;
}

test('every card sits in the leftmost column its links allow (seeded boards, cycles broken)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const v = randomLanes(seed);
    const cells = cellsOf(v.regions[0]!, v.nodes, v.links, sizesOf(v));
    const col = (id: string) => cells.get(id)!.column;
    const linked = new Set(v.links.flatMap((l) => [l.from, l.to]));
    for (const n of v.nodes) {
      if (!linked.has(n.id)) continue;
      // Some link into a card always sets its column: one column after a predecessor's, or the
      // first column when every link into it was dropped to break a cycle.
      const preds = v.links.filter((l) => l.to === n.id).map((l) => col(l.from));
      assert.ok(col(n.id) === 1 || preds.includes(col(n.id) - 1), `seed ${seed}: card ${n.id} in column ${col(n.id)} after ${preds}`);
    }
    // Links that do not close a cycle point right.
    const forward = v.links.filter((l) => col(l.to) > col(l.from)).length;
    assert.ok(forward >= v.links.length / 2, `seed ${seed}: only ${forward} links point right`);
  }
});

test('lanes: same input, same picture (seeded boards with cycles)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const [a, b] = [randomLanes(seed), randomLanes(seed)];
    assert.deepEqual(layoutBoard(a, sizesOf(a)), layoutBoard(b, sizesOf(b)), `seed ${seed}`);
  }
});

test('lanes: a cycle inside one lane is broken where it closes, every card placed', () => {
  const nodes: ViewNode[] = ['a', 'b', 'c'].map((id) => ({ id, region: 'r', kind: 'finding', title: id, lane: 'L' }));
  const links = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }];
  const cells = cellsOf({ id: 'r', title: 'R', mode: 'lanes', lanes: ['L'] }, nodes, links, sizesOf({ nodes } as View));
  assert.deepEqual(['a', 'b', 'c'].map((id) => cells.get(id)!.column), [1, 2, 3]);
});

test('lanes: a lane with no links lays its cards left to right in card order; an empty lane keeps its band', () => {
  const nodes: ViewNode[] = ['a', 'b', 'c'].map((id) => ({ id, region: 'r', kind: 'finding', title: id, lane: 'Two' }));
  const out = MODE_FNS.lanes({ region: { id: 'r', title: 'R', mode: 'lanes', lanes: ['One', 'Two'] }, nodes, links: [], sizes: sizesOf({ nodes } as View) });
  assert.deepEqual(['a', 'b', 'c'].map((id) => out.cells!.get(id)), [1, 2, 3].map((column) => ({ column, row: 1, lane: 'Two' })));
  assert.equal(out.lanes![0]!.h, 64);
  assert.equal(out.pos.get('a')!.y, out.lanes![1]!.y + LANE_PAD);
});

test('lanes: centre alignment centres each stack in its lane; start keeps it at the top', () => {
  const nodes: ViewNode[] = ['a', 'b', 'c'].map((id) => ({ id, region: 'r', kind: 'finding', title: id, lane: 'L' }));
  const links = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }];
  const sizes = new Map<string, Size>(nodes.map((n) => [n.id, { w: 280, h: 100 }]));
  const region: Region = { id: 'r', title: 'R', mode: 'lanes', lanes: ['L'] };
  for (const align of ['start', 'center'] as const) {
    const out = MODE_FNS.lanes({ region, nodes, links, sizes, align });
    const top = out.lanes![0]!.y + LANE_PAD;
    // a alone in column 1; b and c stacked in column 2, which sets the lane's height.
    assert.equal(out.pos.get('a')!.y, top + (align === 'center' ? (100 + GAP) / 2 : 0), align);
    assert.equal(Math.min(out.pos.get('b')!.y, out.pos.get('c')!.y), top, align);
  }
});

test('lanes: a card with no links fills a free cell in the columns used, else stacks; never widens', () => {
  const nodes: ViewNode[] = ['a', 'b', 'x', 'y', 'z'].map((id) => ({ id, region: 'r', kind: 'finding', title: id, lane: id < 'x' ? 'One' : 'Two' }));
  const out = MODE_FNS.lanes({
    region: { id: 'r', title: 'R', mode: 'lanes', lanes: ['One', 'Two'] }, nodes, links: [{ from: 'a', to: 'b' }],
    sizes: sizesOf({ nodes } as View),
  });
  // a > b uses columns 1 and 2; lane Two has both free, then stacks on the shorter (first) one.
  assert.deepEqual(['x', 'y', 'z'].map((id) => [out.cells!.get(id)!.column, out.cells!.get(id)!.row]), [[1, 1], [2, 1], [1, 2]]);
});

test('lanes: under match every card takes its column\'s widest width; own keeps each width', () => {
  const v = field();
  const sizes = new Map<string, Size>(v.nodes.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: 120 }]));
  for (const widths of ['match', 'own'] as const) {
    const out = MODE_FNS.lanes({ region: v.regions[0]!, nodes: v.nodes, links: v.links, sizes, widths });
    const byColumn = new Map<number, number[]>();
    for (const n of v.nodes) (byColumn.get(out.cells!.get(n.id)!.column) ?? byColumn.set(out.cells!.get(n.id)!.column, []).get(out.cells!.get(n.id)!.column)!).push(out.pos.get(n.id)!.w);
    for (const ws of byColumn.values()) if (widths === 'match') assert.equal(new Set(ws).size, 1);
    if (widths === 'own') for (const n of v.nodes) assert.equal(out.pos.get(n.id)!.w, sizes.get(n.id)!.w);
  }
});
