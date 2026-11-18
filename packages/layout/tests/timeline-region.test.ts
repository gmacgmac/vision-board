// A container with a timeline (BE_01, D-105, PLAN.md decisions 7, 13-15, kickoff 569C): `layoutRegion` puts its dated
// nodes on the line and the rest through the container's mode, below the line (REGION_GAP) or, run down, to its right
// (COL_GAP), with the links among the rest only; pins on dated nodes are ignored, pins on the rest win; `packRegions`
// carries the drawing to board coordinates; `structureOf` reports the order and sides the picture draws. A container
// with no dated node lays out exactly as it did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Direction, Link, Mode, Region, View, ViewNode } from '#format';
import { boardView, foldDrawn, MODES, readLedger } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { COL_GAP, layoutBoard, layoutRegion, overlaps, packRegions, REGION_GAP, structureOf } from '../src/index.ts';
import type { Box, RegionPiece, Size } from '../src/index.ts';

const region = (mode: Mode, extra: Partial<Region> = {}): Region => ({ id: 'r', title: 'R', mode, lanes: ['now', 'next'], ...extra });
const node = (id: string, n: number, timeline?: string, lane?: string): ViewNode =>
  ({ id, region: 'r', kind: 'topic', title: id, n, ...(timeline && { timeline }), ...(lane && { lane }) });
/** Four dated and five undated nodes, mixed sizes, a link inside the rest and links touching dated nodes. */
const DATED = [node('d1', 1, '2026-10'), node('d2', 3, '2026-09-15'), node('d3', 5, '2026-11-03'), node('d4', 7, '2027')];
const REST = [node('u1', 2, undefined, 'now'), node('u2', 4, undefined, 'next'), node('u3', 6, undefined, 'now'), node('u4', 8, undefined, 'next'), node('u5', 9, undefined, 'now')];
const NODES = [...DATED, ...REST].sort((a, b) => a.n! - b.n!);
const LINKS: Link[] = [{ from: 'u1', to: 'u2' }, { from: 'u2', to: 'u3' }, { from: 'd1', to: 'u4' }, { from: 'd2', to: 'd3' }];
const SIZES = new Map<string, Size>(NODES.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: 90 + (i % 4) * 40 }]));
const restLinks = LINKS.filter((l) => l.from.startsWith('u') && l.to.startsWith('u'));

function timelineBox(p: RegionPiece): Box {
  const boxes = DATED.map((n) => p.out.pos.get(n.id)!);
  const { from, to } = p.timeline!.line;
  return [...boxes, { x: from.x, y: from.y, w: to.x - from.x, h: to.y - from.y }].reduce((a, b) => {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  });
}

test('the rest: the mode\'s own answer, moved below the line by REGION_GAP, or run down to its right by COL_GAP, in every mode', () => {
  for (const mode of MODES) {
    for (const direction of ['across', 'down'] as const) {
      for (const mid of [false, true]) {
        const r = region(mode, mid ? { columns: 2 } : {});
        const p = layoutRegion(r, NODES, LINKS, SIZES, { direction });
        // The mode alone, on the rest and the links among them only.
        const alone = layoutRegion(r, REST, restLinks, SIZES, { direction });
        const box = timelineBox(p);
        const [dx, dy] = direction === 'down' ? [box.x + box.w + COL_GAP, 0] : [0, box.y + box.h + REGION_GAP];
        for (const n of REST) {
          const a = alone.out.pos.get(n.id)!;
          assert.deepEqual(p.out.pos.get(n.id), { ...a, x: a.x + dx, y: a.y + dy }, `${mode} ${direction} ${n.id}`);
        }
        assert.deepEqual(p.out.lanes, alone.out.lanes?.map((l) => ({ ...l, y: l.y + dy, ...(dx && { x: dx }) })), `${mode} lanes move with their cards`);
        assert.deepEqual(p.out.cells, alone.out.cells);
        assert.equal(p.out.down, alone.out.down);
        assert.deepEqual(p.timeline!.dots.map((d) => d.id), ['d2', 'd1', 'd3', 'd4']);
        for (const n of REST) assert.ok(!overlaps(p.out.pos.get(n.id)!, box), `${mode} ${direction}: ${n.id} clear of the timeline`);
      }
    }
  }
});

test('across, the line runs to the content\'s right edge when the nodes below are wider', () => {
  const wide = Array.from({ length: 6 }, (_, i) => node(`w${i}`, 10 + i));
  const sizes = new Map([...SIZES, ...wide.map((n) => [n.id, { w: 464, h: 100 }] as const)]);
  const p = layoutRegion(region('row'), [DATED[0]!, DATED[1]!, ...wide], [], sizes);
  const right = Math.max(...wide.map((n) => p.out.pos.get(n.id)!).map((b) => b.x + b.w));
  assert.equal(p.timeline!.line.to.x, right);
  assert.equal(p.b.x + p.b.w, right);
  // Run down, the line ends past its last dot, whatever is beside it.
  const d = layoutRegion(region('row'), [DATED[0]!, DATED[1]!, ...wide], [], sizes, { direction: 'down' });
  assert.equal(d.timeline!.line.to.y, d.timeline!.dots.at(-1)!.at.y + 30);
});

test('only dated nodes: no gap, no rest; the frame is the timeline\'s', () => {
  for (const direction of ['across', 'down'] as const) {
    const p = layoutRegion(region('grid'), DATED, LINKS, SIZES, { direction });
    assert.deepEqual([...p.out.pos.keys()], ['d2', 'd1', 'd3', 'd4']);
    assert.deepEqual(p.b, timelineBox(p));
  }
});

test('pins: a pin on a dated node changes nothing; a pin on an undated node wins, even over the line; the others keep clear', () => {
  for (const direction of ['across', 'down'] as const) {
    const free = layoutRegion(region('grid'), NODES, LINKS, SIZES, { direction });
    assert.deepEqual(layoutRegion(region('grid'), NODES, LINKS, SIZES, { direction, pins: new Map([['d1', { x: 900, y: 900 }]]) }), free);
    // u1 dropped onto the line, u2 dropped onto u3: both pins win; every unpinned card keeps out of the timeline.
    const u3 = free.out.pos.get('u3')!;
    const pins = new Map([['u1', { x: 40, y: 40 }], ['u2', { x: u3.x + 8, y: u3.y + 8 }]]);
    const p = layoutRegion(region('grid'), NODES, LINKS, SIZES, { direction, pins });
    assert.deepEqual([p.out.pos.get('u1')!.x, p.out.pos.get('u1')!.y], [40, 40]);
    assert.deepEqual([p.out.pos.get('u2')!.x, p.out.pos.get('u2')!.y], [u3.x + 8, u3.y + 8]);
    // The dots are where their dates put them (the line may run on to a card moved out to the right).
    assert.deepEqual({ ...p.timeline!, line: p.timeline!.line.from }, { ...free.timeline!, line: free.timeline!.line.from });
    for (const n of DATED) assert.deepEqual(p.out.pos.get(n.id), free.out.pos.get(n.id));
    // Clear of the timeline's band: across, its rows all the way right; run down, its column all the way down.
    const box = timelineBox(free);
    const band = direction === 'down' ? { ...box, h: 1e6 } : { ...box, w: 1e6 };
    for (const id of ['u3', 'u4', 'u5']) {
      const b = p.out.pos.get(id)!;
      assert.ok(!overlaps(b, band), `${direction}: ${id} clear of the timeline`);
      for (const pin of ['u1', 'u2']) assert.ok(!overlaps(b, p.out.pos.get(pin)!), `${direction}: ${id} clear of ${pin}`);
    }
  }
});

test('hidden nodes leave the line; links touching a dated node do not reach the mode', () => {
  const view: View = { format: 1, session: 's', version: 1, title: 'T', regions: [region('flow')], nodes: NODES, links: LINKS };
  const l = layoutBoard(view, SIZES, { hidden: new Set(['d3']) });
  assert.deepEqual(l.regions[0]!.timeline!.dots.map((d) => d.id), ['d2', 'd1', 'd4']);
  assert.ok(!l.nodes.has('d3'));
  // d1 -> u4 joins a dated node: the flow lays u4 out as if it had no link.
  const p = layoutRegion(region('flow'), NODES, LINKS, SIZES);
  const unlinked = layoutRegion(region('flow'), NODES, LINKS.filter((k) => k.from !== 'd1'), SIZES);
  assert.deepEqual(p.out.pos, unlinked.out.pos);
  // Links to, from and between dated nodes still route (decision 13).
  const routed = layoutBoard(view, SIZES).routes.map((r) => `${r.from}>${r.to}`);
  assert.deepEqual(routed.sort(), ['d1>u4', 'd2>d3', 'u1>u2', 'u2>u3']);
});

test('packRegions: the drawing in board coordinates; dated nodes route around as cards in every mode, radial\'s rest not', () => {
  for (const mode of MODES) {
    const view: View = { format: 1, session: 's', version: 1, title: 'T', regions: [region(mode)], nodes: NODES, links: LINKS };
    const piece = layoutRegion(region(mode), NODES, LINKS, SIZES);
    const l = packRegions([piece], LINKS);
    assert.deepEqual(layoutBoard(view, SIZES), l);
    const { origin, timeline } = l.regions[0]!;
    const m = (p: { x: number; y: number }) => ({ x: p.x + origin.x, y: p.y + origin.y });
    assert.deepEqual(timeline!.line, { from: m(piece.timeline!.line.from), to: m(piece.timeline!.line.to) });
    timeline!.dots.forEach((d, i) => {
      const b = l.nodes.get(d.id)!;
      assert.deepEqual(d.at, m(piece.timeline!.dots[i]!.at));
      assert.equal(d.side === 'above' ? b.y + b.h : b.y, d.stem.to.y, 'the stem still meets the node');
    });
    for (const n of DATED) assert.equal(l.groups.get(n.id), 'r');
    for (const n of REST) assert.equal(l.groups.get(n.id), mode === 'radial' ? undefined : 'r');
  }
});

test('widths: dated nodes follow timelineWidths, else match run down and own across; the rest keep the container\'s', () => {
  const view: View = { format: 1, session: 's', version: 1, title: 'T', regions: [region('row')], nodes: NODES, links: [] };
  const w = (l: ReturnType<typeof layoutBoard>, ns: ViewNode[]) => ns.map((n) => l.nodes.get(n.id)!.w);
  const own = DATED.map((n) => SIZES.get(n.id)!.w);
  const down = new Map<string, Direction>([['r', 'down']]);
  assert.deepEqual(w(layoutBoard(view, SIZES, { directions: down }), DATED), own.map(() => Math.max(...own)));
  assert.deepEqual(w(layoutBoard(view, SIZES), DATED), own);
  assert.deepEqual(w(layoutBoard(view, SIZES, { directions: down, timelineWidths: new Map([['r', 'own']]) }), DATED), own);
  assert.deepEqual(w(layoutBoard(view, SIZES, { directions: down }), REST), REST.map((n) => SIZES.get(n.id)!.w));
});

test('the same picture: structureOf reports the order and sides layoutRegion draws, and the rest as the mode arranges them', () => {
  for (const mode of MODES) {
    for (const direction of ['across', 'down'] as const) {
      const s = structureOf(region(mode), NODES, LINKS, mode, undefined, { direction });
      const p = layoutRegion(region(mode), NODES, LINKS, SIZES, { direction });
      assert.deepEqual(s.timeline, {
        direction, cards: p.timeline!.dots.map((d) => ({ id: d.id, at: NODES.find((n) => n.id === d.id)!.timeline!, side: d.side })),
      });
      assert.deepEqual(s.timeline!.cards.map((c) => c.side), direction === 'down' ? ['left', 'right', 'left', 'right'] : ['above', 'below', 'above', 'below']);
      const { timeline: _, ...rest } = s;
      assert.deepEqual(rest, structureOf(region(mode), REST, LINKS, mode, undefined, { direction }), `${mode} ${direction}`);
    }
  }
  assert.equal(structureOf(region('grid'), REST, LINKS).timeline, undefined);
  assert.deepEqual(structureOf(region('grid'), DATED, LINKS), {
    columns: 0, cards: [], links: 0, crossing: 0, empty: 0,
    timeline: { direction: 'across', cards: ['d2', 'd1', 'd3', 'd4'].map((id, i) => ({ id, at: DATED.find((n) => n.id === id)!.timeline!, side: i % 2 ? 'below' : 'above' })) },
  });
});

function load(name: string): View {
  const lines = fs.readFileSync(`${FIXTURES_DIR}${name}.ledger.jsonl`, 'utf8');
  return boardView(foldDrawn(readLedger(lines.trim().split('\n')).events), name);
}

test('a container with no dated node lays out exactly as before: no timeline anywhere, and a neighbour\'s dates change nothing', () => {
  for (const name of ['login-review', 'roadmap', 'gallery', 'login-layout']) {
    const view = load(name);
    const sizes = new Map<string, Size>(view.nodes.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: 100 + (i % 4) * 30 }]));
    const l = layoutBoard(view, sizes);
    for (const r of l.regions) assert.ok(!('timeline' in r), `${name} ${r.id}`);
    // Date every node of the first container: the others' pieces are exactly what they were.
    const first = view.regions[0]!.id;
    const dated = { ...view, nodes: view.nodes.map((n) => (n.region === first && n.kind !== 'app' ? { ...n, timeline: '2026-10' } : n)) };
    for (const r of view.regions.slice(1)) {
      const own = (v: View) => v.nodes.filter((n) => n.region === r.id);
      const inner = (v: View) => v.links.filter((k) => own(v).some((n) => n.id === k.from) && own(v).some((n) => n.id === k.to));
      const before = layoutRegion(r, own(view), inner(view), sizes);
      assert.ok(!('timeline' in before));
      assert.deepEqual(layoutRegion(r, own(dated), inner(dated), sizes), before, `${name} ${r.id}`);
    }
  }
});

test('the same input gives the same output twice, and the inputs are never changed', () => {
  for (const mode of MODES) {
    for (const direction of ['across', 'down'] as const) {
      const before = structuredClone({ NODES, LINKS, SIZES: [...SIZES] });
      const pins = new Map([['u1', { x: 10, y: 10 }]]);
      const a = layoutRegion(region(mode), NODES, LINKS, SIZES, { direction, pins });
      assert.deepEqual(layoutRegion(region(mode), NODES, LINKS, SIZES, { direction, pins }), a);
      assert.deepEqual({ NODES, LINKS, SIZES: [...SIZES] }, before);
    }
  }
});

test('run down: the first dated node and the other nodes start level at the top; same-side nodes keep the board\'s row gap', () => {
  for (const rowGap of [30, 40]) {
    const p = layoutRegion(region('grid'), NODES, LINKS, SIZES, { direction: 'down', rowGap });
    const first = p.out.pos.get(p.timeline!.dots[0]!.id)!;
    assert.equal(first.y, 0);
    assert.equal(Math.min(...REST.map((n) => p.out.pos.get(n.id)!.y)), 0, 'level with it');
    const left = p.timeline!.dots.filter((d) => d.side === 'left').map((d) => p.out.pos.get(d.id)!);
    for (let i = 1; i < left.length; i++) assert.ok(left[i]!.y - (left[i - 1]!.y + left[i - 1]!.h) >= rowGap - 1e-9);
  }
});
