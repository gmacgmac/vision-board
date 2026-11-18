// Flow branching and direction (BE_01; PLAN decisions 19 and 25). The maintainer's example: "From idea to production
// line", seven cards in card order, links 1>2>3>4 and a branch 2>5>6>7 that rejoins 4. No link passes under a card it
// does not join, the main line keeps one row, the branch its own row below, and the rejoin is one link, in a `flow` and
// in a `row` or `column` whose links are more than a chain in card order. Down mirrors across.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Direction, Link, Mode, View } from '#format';
import { KINDS } from '#format';
import { EDGE_ROW_GAP, layoutBoard, layoutRegion, routeLines, structureOf } from '../src/index.ts';
import type { BoardLayout, Box, LayoutOptions, Size } from '../src/index.ts';
import { STRUCTURE_CARD } from '../src/structure.ts';
import { rightAngled, under } from './route-checks.ts';

const LINKS: Link[] = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 4]].map(([a, b]) => ({ from: String(a), to: String(b) }));

function example(mode: Mode, direction?: Direction, links = LINKS): { view: View; sizes: Map<string, Size> } {
  const view: View = {
    format: 1, session: 's', version: 1, title: 't',
    regions: [{ id: 'g', title: 'From idea to production line', mode, ...(direction && { direction }) }],
    nodes: Array.from({ length: 7 }, (_, i) => ({ id: String(i + 1), n: i + 1, region: 'g', kind: 'topic' as const, title: `Step ${i + 1}` })),
    links,
  };
  return { view, sizes: new Map(view.nodes.map((n) => [n.id, { w: 280, h: 120 }])) };
}

/** The links that pass under a card they do not join. */
function rounding(out: BoardLayout, links: Link[]): string[] {
  const bad: string[] = [];
  for (const { link, pts } of routeLines(links, out.nodes, out.groups, out.downward))
    for (const [id, b] of out.nodes) if (id !== link.from && id !== link.to && under(pts, b)) bad.push(`${link.from}>${link.to} under ${id}`);
  return bad;
}

const at = (out: BoardLayout, id: string): Box => out.nodes.get(id)!;
const pts = (out: BoardLayout, from: string, to: string) =>
  routeLines(LINKS, out.nodes, out.groups, out.downward).find((r) => r.link.from === from && r.link.to === to)!.pts;

test('the example draws with no link round a card, in row, column and flow, both directions', () => {
  const cases: [Mode, Direction | undefined][] = [['row', undefined], ['column', undefined], ['flow', 'across'], ['flow', 'down']];
  for (const [mode, direction] of cases) {
    const { view, sizes } = example(mode);
    const out = layoutBoard(view, sizes, direction ? { directions: new Map([['g', direction]]) } : {});
    assert.deepEqual(rounding(out, LINKS), [], `${mode} ${direction ?? ''}`);
    for (const r of routeLines(LINKS, out.nodes, out.groups, out.downward)) assert.ok(rightAngled(r.pts));
    const down = mode === 'column' || direction === 'down';
    assert.equal(out.downward.has('g'), down, `${mode} ${direction ?? ''} runs ${down ? 'down' : 'across'}`);
    // The main line on one row (across) or column (down), the branch on the next one, the rejoin one link.
    const cross = down ? (b: Box) => b.x : (b: Box) => b.y;
    assert.equal(new Set(['1', '2', '3', '4'].map((id) => cross(at(out, id)))).size, 1, 'the main line is straight');
    assert.equal(new Set(['5', '6', '7'].map((id) => cross(at(out, id)))).size, 1, 'the branch keeps its own row');
    assert.ok(cross(at(out, '5')) > cross(at(out, '2')), 'the branch is below (across) or right of (down) the main line');
    assert.ok(pts(out, '7', '4').length <= 4, 'the rejoin is one link with one bend');
    assert.ok(pts(out, '3', '4').length <= 4, 'the main line\'s long link runs along its own row');
  }
});

test('a row or column with no links, or only a chain in card order, stays one line of cards in card order', () => {
  const chain = LINKS.filter((l) => Number(l.to) === Number(l.from) + 1 || Number(l.from) === Number(l.to) + 1);
  for (const mode of ['row', 'column'] as const)
    for (const links of [[], chain, [{ from: '3', to: '2' }, { from: '5', to: '6' }]]) {
      const { view, sizes } = example(mode, undefined, links);
      const out = layoutBoard(view, sizes);
      const [cross, along] = mode === 'row' ? [(b: Box) => b.y, (b: Box) => b.x] : [(b: Box) => b.x, (b: Box) => b.y];
      assert.equal(new Set([...out.nodes.values()].map(cross)).size, 1, `${mode}, ${links.length} links: one line`);
      const by = view.nodes.map((n) => along(at(out, n.id)));
      assert.deepEqual(by, [...by].sort((a, b) => a - b), `${mode}, ${links.length} links: card order`);
      assert.equal(out.downward.size, 0);
    }
});

test('a direction across is the default, and a direction is read on a flow only', () => {
  for (const mode of ['flow', 'row', 'column', 'grid', 'lanes'] as const) {
    const { view, sizes } = example(mode);
    assert.deepEqual(layoutBoard(view, sizes, { directions: new Map([['g', 'across']]) }), layoutBoard(view, sizes), mode);
  }
  // A direction on a container that is not a flow is not read.
  const { view, sizes } = example('row');
  assert.deepEqual(layoutBoard(view, sizes, { directions: new Map([['g', 'down']]) }), layoutBoard(view, sizes));
});

test('a flow down is the flow across turned: layers top to bottom, cells read as drawn', () => {
  const { view, sizes } = example('flow');
  const across = layoutRegion(view.regions[0]!, view.nodes, LINKS, sizes);
  const down = layoutRegion(view.regions[0]!, view.nodes, LINKS, sizes, { direction: 'down' });
  assert.equal(down.out.down, true);
  for (const n of view.nodes) {
    const [a, d] = [across.out.cells!.get(n.id)!, down.out.cells!.get(n.id)!];
    assert.deepEqual({ column: d.row, row: d.column }, a, `card ${n.id}`);
  }
  // Each link goes to a later layer: lower on the board.
  for (const l of LINKS) assert.ok(down.out.pos.get(l.to)!.y > down.out.pos.get(l.from)!.y, `${l.from}>${l.to}`);
});

test('show_layout\'s structure agrees with the picture in both directions', () => {
  for (const mode of ['flow', 'row', 'column'] as const)
    for (const direction of ['across', 'down'] as const) {
      const { view } = example(mode);
      const sizes = new Map(view.nodes.map((n) => [n.id, STRUCTURE_CARD]));
      const piece = layoutRegion(view.regions[0]!, view.nodes, LINKS, sizes, { direction });
      const s = structureOf(view.regions[0]!, view.nodes, LINKS, mode, undefined, { direction });
      for (const c of s.cards) assert.deepEqual({ column: c.column, row: c.row }, piece.out.cells!.get(c.id), `${mode} ${direction} card ${c.id}`);
      if (mode === 'flow') assert.equal(s.crossing, 0, `${direction}: no link crosses another`);
    }
});

/** mulberry32: the same seeded boards every run. */
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

/** One container, 4-14 cards of mixed sizes, links at random (some backwards, some cycles). */
function seeded(seed: number, mode: Mode): { view: View; sizes: Map<string, Size> } {
  const r = rng(seed);
  const count = 4 + Math.floor(r() * 11);
  const view: View = { format: 1, session: `b${seed}`, version: 1, title: 'b', regions: [{ id: 'g', title: 'G', mode }], nodes: [], links: [] };
  const sizes = new Map<string, Size>();
  for (let i = 0; i < count; i++) {
    view.nodes.push({ id: `n${i}`, n: i + 1, region: 'g', kind: KINDS[i % KINDS.length]!, title: `n${i}` });
    sizes.set(`n${i}`, { w: [280, 360, 464][Math.floor(r() * 3)]!, h: 72 + Math.floor(r() * 200) });
  }
  for (let k = 0; k < count + 2; k++) {
    const [a, b] = [Math.floor(r() * count), Math.floor(r() * count)];
    if (a !== b && !view.links.some((l) => l.from === `n${a}` && l.to === `n${b}`)) view.links.push({ from: `n${a}`, to: `n${b}` });
  }
  return { view, sizes };
}

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('seeded boards, across and down: no two cards overlap, no line under a card off the fallback, the same picture every time', () => {
  let routed = 0;
  for (let seed = 1; seed <= 150; seed++)
    for (const [mode, direction] of [['flow', 'across'], ['flow', 'down'], ['row', undefined], ['column', undefined]] as const) {
      const { view, sizes } = seeded(seed, mode);
      const opts: LayoutOptions = direction ? { directions: new Map([['g', direction]]) } : {};
      const out = layoutBoard(view, sizes, opts);
      assert.deepEqual(layoutBoard(view, sizes, opts), out, `seed ${seed} ${mode} ${direction ?? ''}: deterministic`);
      const boxes = [...out.nodes.entries()];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i]![1], boxes[j]![1]), `seed ${seed} ${mode}: ${boxes[i]![0]} and ${boxes[j]![0]} overlap`);
      for (const { link, pts: line } of routeLines(view.links, out.nodes, out.groups, out.downward)) {
        assert.ok(rightAngled(line), `seed ${seed}: ${link.from}>${link.to} right angles`);
        const clear = boxes.every(([id, b]) => id === link.from || id === link.to || !under(line, b));
        if (clear) routed += 1;
        else assert.ok(line.length === 4, `seed ${seed} ${mode} ${direction ?? ''}: ${link.from}>${link.to} runs under a card off the fallback`);
      }
    }
  assert.ok(routed > 0);
});

test('a flow\'s branches never stack on one row: each card in its own cell', () => {
  for (let seed = 1; seed <= 150; seed++)
    for (const direction of ['across', 'down'] as const) {
      const { view, sizes } = seeded(seed, 'flow');
      const piece = layoutRegion(view.regions[0]!, view.nodes, view.links, sizes, { direction });
      const cells = [...piece.out.cells!.values()].map((c) => `${c.column} ${c.row}`);
      assert.equal(new Set(cells).size, cells.length, `seed ${seed} ${direction}`);
    }
});

test('the gap under a node with edge marks (EDGE_ROW_GAP) is the gap between rows in column, flow and branches; side by side stays as it was', () => {
  const { view, sizes } = example('column', undefined, []);
  const col = layoutBoard(view, sizes, { rowGap: EDGE_ROW_GAP });
  const ys = view.nodes.map((n) => col.nodes.get(n.id)!.y);
  for (let i = 1; i < ys.length; i++) assert.equal(ys[i]! - ys[i - 1]!, 120 + EDGE_ROW_GAP);
  const flow = layoutBoard(example('flow').view, example('flow').sizes, { rowGap: EDGE_ROW_GAP });
  assert.equal(at(flow, '5').y - (at(flow, '3').y + at(flow, '3').h), EDGE_ROW_GAP, 'the branch\'s row sits EDGE_ROW_GAP under the main line');
  const row = layoutBoard(example('row', undefined, []).view, sizes, { rowGap: EDGE_ROW_GAP });
  assert.equal(row.nodes.get('2')!.x - (row.nodes.get('1')!.x + 280), 24, 'side by side stays GAP');
});
