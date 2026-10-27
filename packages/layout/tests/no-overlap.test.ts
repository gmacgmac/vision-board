// No-overlap properties (2d_BE_01): a seeded generator draws boards in all five modes, with mixed
// D-030 card widths (s/m/l), mixed heights and 0-3 pins dropped on top of other cards, and every
// board must keep cards apart, inside their frame below its top line, frames apart, pins exact.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link, Region, View, ViewNode } from '#format';
import { KINDS, MODES } from '#format';
import { layoutBoard, overlaps, REGION_HEAD } from '../src/index.ts';
import type { BoardLayout, Point, Size } from '../src/index.ts';

/** mulberry32: a tiny seeded generator, so every run draws exactly the same boards. */
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

/** D-030 card widths: s, m, l. */
const WIDTHS = [280, 360, 464];
const SEEDS = 300;
const SLACK = 1e-6;

interface Case { view: View; sizes: Map<string, Size>; pins: Map<string, Point> }

function makeView(seed: number, r: () => number): { view: View; sizes: Map<string, Size> } {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  const regions: Region[] = [];
  const nodes: ViewNode[] = [];
  const links: Link[] = [];
  const sizes = new Map<string, Size>();
  const count = int(1, 4);
  for (let g = 0; g < count; g++) {
    // Every mode is drawn in turn, so each seed range covers all five.
    const region: Region = { id: `r${g}`, title: `Region ${g}`, mode: MODES[(seed + g) % MODES.length]! };
    if (region.mode === 'lanes' && r() < 0.5) region.lanes = ['now', 'next', 'later'];
    if (region.mode === 'grid' && r() < 0.5) region.columns = int(1, 4);
    regions.push(region);
    const ids: string[] = [];
    for (let i = 0, n = int(0, 9); i < n; i++) {
      const id = `r${g}-n${i}`;
      nodes.push({ id, region: region.id, kind: pick(KINDS), title: id, lane: pick(['now', 'next', 'later']) });
      sizes.set(id, { w: pick(WIDTHS), h: int(72, 320) });
      if (ids.length && r() < 0.7) links.push({ from: pick(ids), to: id });
      ids.push(id);
    }
  }
  return { view: { format: 1, session: `gen-${seed}`, version: 1, title: 'gen', regions, nodes, links }, sizes };
}

/** Region-local box of a node in a layout: what the page stores as a pin (rounded, as `pin` does). */
function localOf(out: BoardLayout, view: View, id: string): Point & Size {
  const node = view.nodes.find((n) => n.id === id)!;
  const origin = out.regions.find((g) => g.id === node.region)!.origin;
  const at = out.nodes.get(id)!;
  return { x: Math.round(at.x - origin.x), y: Math.round(at.y - origin.y), w: at.w, h: at.h };
}

/** 0-3 pins, each dropping a card somewhere on top of another card in its region (maybe a pinned one). */
function makePins(view: View, sizes: Map<string, Size>, r: () => number): Map<string, Point> {
  const pins = new Map<string, Point>();
  const base = layoutBoard(view, sizes);
  const crowded = view.regions.filter((g) => view.nodes.filter((n) => n.region === g.id).length >= 2);
  for (let k = 0, n = Math.floor(r() * 4); k < n && crowded.length; k++) {
    const region = crowded[Math.floor(r() * crowded.length)]!.id;
    const ids = view.nodes.filter((v) => v.region === region).map((v) => v.id);
    const mover = ids[Math.floor(r() * ids.length)]!;
    const others = ids.filter((id) => id !== mover);
    const onto = others[Math.floor(r() * others.length)]!;
    const at = pins.has(onto) ? { ...pins.get(onto)!, ...sizes.get(onto)! } : localOf(base, view, onto);
    const dx = Math.round((r() - 0.5) * at.w);
    const dy = Math.round((r() - 0.5) * at.h);
    pins.set(mover, { x: at.x + dx, y: at.y + dy });
  }
  return pins;
}

function makeCase(seed: number): Case {
  const r = rng(seed);
  const { view, sizes } = makeView(seed, r);
  return { view, sizes, pins: makePins(view, sizes, r) };
}

/** Every broken property of one layout, as readable lines (empty = all hold). */
function problemsOf(c: Case, out: BoardLayout): string[] {
  const bad: string[] = [];
  if (out.nodes.size !== c.view.nodes.length) bad.push(`placed ${out.nodes.size} of ${c.view.nodes.length}`);
  for (const g of out.regions) {
    const ids = c.view.nodes.filter((n) => n.region === g.id).map((n) => n.id);
    const top = g.box.y + REGION_HEAD;
    for (const id of ids) {
      const b = out.nodes.get(id)!;
      if (![b.x, b.y, b.w, b.h].every(Number.isFinite)) bad.push(`${id} not finite`);
      if (b.y < top - SLACK) bad.push(`${id} crosses ${g.id}'s top line`);
      if (b.x < g.box.x - SLACK || b.x + b.w > g.box.x + g.box.w + SLACK || b.y + b.h > g.box.y + g.box.h + SLACK)
        bad.push(`${id} outside ${g.id}`);
      const pin = c.pins.get(id);
      // Exact up to float rounding of `origin + pin - origin` (region x can be fractional).
      if (pin && Math.abs(b.x - g.origin.x - pin.x) + Math.abs(b.y - g.origin.y - pin.y) > SLACK)
        bad.push(`pinned ${id} moved`);
    }
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i]!, ids[j]!];
        if (c.pins.has(a) && c.pins.has(b)) continue; // the person stacked them: allowed
        if (overlaps(out.nodes.get(a)!, out.nodes.get(b)!)) bad.push(`${a} overlaps ${b}`);
      }
  }
  for (let i = 0; i < out.regions.length; i++)
    for (let j = i + 1; j < out.regions.length; j++)
      if (overlaps(out.regions[i]!.box, out.regions[j]!.box)) bad.push(`${out.regions[i]!.id} overlaps ${out.regions[j]!.id}`);
  return bad;
}

test('generated boards without pins: no overlaps in any mode or width mix (region packing)', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const c = { ...makeCase(seed), pins: new Map<string, Point>() };
    assert.deepEqual(problemsOf(c, layoutBoard(c.view, c.sizes)), [], `seed ${seed}`);
  }
});

test('generated boards with 0-3 pins on other cards: no overlaps, pins exact', () => {
  let pinned = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const c = makeCase(seed);
    pinned += c.pins.size;
    assert.deepEqual(problemsOf(c, layoutBoard(c.view, c.sizes, { pins: c.pins })), [], `seed ${seed}`);
  }
  assert.ok(pinned > SEEDS, `the generator dropped only ${pinned} pins`);
});

test('generated boards: same input gives the same output', () => {
  for (let seed = 1; seed <= SEEDS; seed += 7) {
    const [a, b] = [makeCase(seed), makeCase(seed)];
    assert.deepEqual(layoutBoard(a.view, a.sizes, { pins: a.pins }), layoutBoard(b.view, b.sizes, { pins: b.pins }));
  }
});

/** One grid region, two columns, four 280x100 cards: a b / c d at (0,0) (304,0) / (0,124) (304,124). */
function four(): { view: View; sizes: Map<string, Size> } {
  const ids = ['a', 'b', 'c', 'd'];
  const view: View = {
    format: 1, session: 'four', version: 1, title: 'four', links: [],
    regions: [{ id: 'g', title: 'G', mode: 'grid', columns: 2 }],
    nodes: ids.map((id) => ({ id, region: 'g', kind: 'finding', title: id })),
  };
  return { view, sizes: new Map(ids.map((id) => [id, { w: 280, h: 100 }])) };
}
const local = (out: BoardLayout, id: string): Point => {
  const o = out.regions[0]!.origin;
  const b = out.nodes.get(id)!;
  return { x: b.x - o.x, y: b.y - o.y };
};

test('a card under a pin moves to the nearest free spot; the rest and the frame stay', () => {
  const { view, sizes } = four();
  const before = layoutBoard(view, sizes);
  const out = layoutBoard(view, sizes, { pins: new Map([['d', { x: 0, y: 0 }]]) });
  assert.deepEqual(local(out, 'd'), { x: 0, y: 0 });
  // Straight down, clear of c by the card gap: 248 away beats d's empty spot (about 328 away).
  assert.deepEqual(local(out, 'a'), { x: 0, y: 248 });
  assert.deepEqual(out.regions[0]!.origin, before.regions[0]!.origin);
  for (const id of ['b', 'c']) assert.deepEqual(out.nodes.get(id), before.nodes.get(id), id);
});

test('stacked pins both stay; cards no pin covers do not move', () => {
  const { view, sizes } = four();
  const before = layoutBoard(view, sizes);
  const pins = new Map([['a', { x: 10, y: 10 }], ['b', { x: 0, y: 0 }]]);
  const out = layoutBoard(view, sizes, { pins });
  assert.deepEqual(local(out, 'a'), { x: 10, y: 10 });
  assert.deepEqual(local(out, 'b'), { x: 0, y: 0 });
  for (const id of ['c', 'd']) assert.deepEqual(out.nodes.get(id), before.nodes.get(id), id);
});
