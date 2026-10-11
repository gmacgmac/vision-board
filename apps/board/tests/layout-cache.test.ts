// Same input, same picture (N12_FE_01 ruling 1, rule 9): the page's per-container layout cache
// gives exactly `layoutBoard`'s answer after every change of a seeded random sequence, and lays out
// again only the containers the change touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Mode, View, ViewNode } from '../../../packages/format/src/index.ts';
import { boardView, foldDrawn, readLedger } from '../../../packages/format/src/index.ts';
import type { Point, Size } from '../../../packages/layout/src/index.ts';
import { layoutBoard, layoutRegion } from '../../../packages/layout/src/index.ts';
import { createLayoutCache } from '../src/board/layout-cache.ts';
import type { LayoutInputs } from '../src/board/layout-cache.ts';
import type { Random } from './random.ts';
import { seeded } from './random.ts';

function load(name: string): View {
  const lines = fs.readFileSync(new URL(`../../../packages/format/fixtures/${name}.ledger.jsonl`, import.meta.url), 'utf8');
  return boardView(foldDrawn(readLedger(lines.trim().split('\n')).events), name);
}

const MODES: Mode[] = ['grid', 'column', 'row', 'flow', 'lanes', 'radial'];

interface World { view: View; sizes: Map<string, Size>; inputs: LayoutInputs }

/** One random change; returns the regions whose layout it may change. */
function step(w: World, r: Random, made: { n: number }): Set<string> {
  const node = r.pick(w.view.nodes);
  const regionOf = (id: string) => w.view.nodes.find((n) => n.id === id)?.region;
  switch (r.int(8)) {
    case 0: w.sizes.set(node.id, { w: 200 + r.int(5) * 40, h: 80 + r.int(6) * 20 }); return new Set([node.region]);
    case 1: w.inputs.pins.set(node.id, { x: r.int(400) - 50, y: r.int(300) - 50 }); return new Set([node.region]);
    case 2: w.inputs.pins.delete(node.id); return new Set([node.region]);
    case 3: {
      const region = r.pick(w.view.regions).id;
      w.inputs.modes.set(region, r.pick(MODES));
      return new Set([region]);
    }
    case 4:
      if (w.inputs.hidden.has(node.id)) w.inputs.hidden.delete(node.id); else w.inputs.hidden.add(node.id);
      return new Set([node.region]);
    case 5: {
      const id = `new-${made.n++}`;
      const region = r.pick(w.view.regions).id;
      w.view.nodes.push({ id, region, kind: r.pick(['question', 'finding', 'risk'] as const), title: id });
      w.sizes.set(id, { w: 240, h: 96 + r.int(3) * 30 });
      return new Set([region]);
    }
    case 6: {
      const to = r.pick(w.view.regions).id;
      const from = node.region;
      w.view.nodes = w.view.nodes.map((n) => (n.id === node.id ? { ...n, region: to } : n));
      return new Set([from, to]);
    }
    default: {
      const other = r.pick(w.view.nodes);
      const i = w.view.links.findIndex((l) => l.from === node.id && l.to === other.id);
      if (i >= 0) w.view.links.splice(i, 1);
      else w.view.links.push({ from: node.id, to: other.id });
      return new Set([regionOf(node.id)!, regionOf(other.id)!]);
    }
  }
}

for (const seed of [1, 7, 42, 2026]) {
  test(`seed ${seed}: the cache equals layoutBoard after each of 120 random changes, and lays out only what changed`, () => {
    const r = seeded(seed);
    const view = load('roadmap');
    const w: World = {
      view,
      sizes: new Map(view.nodes.map((n, i) => [n.id, { w: 240 + (i % 3) * 40, h: 96 + (i % 4) * 18 }])),
      inputs: { pins: new Map<string, Point>(), modes: new Map(), hidden: new Set() },
    };
    const cache = createLayoutCache();
    assert.equal(cache.run(w.view, w.sizes, w.inputs).laidOut.length, view.regions.length);
    const made = { n: 0 };
    for (let i = 0; i < 120; i++) {
      const touched = step(w, r, made);
      const run = cache.run(w.view, w.sizes, w.inputs);
      assert.deepEqual(run.layout, layoutBoard(w.view, w.sizes, w.inputs), `step ${i}`);
      for (const id of run.laidOut) assert.ok(touched.has(id), `step ${i}: laid out ${id}, touched ${[...touched]}`);
    }
  });
}

test('nothing changed: no container is laid out again', () => {
  const view = load('roadmap');
  const sizes = new Map(view.nodes.map((n) => [n.id, { w: 240, h: 96 }]));
  const inputs = { pins: new Map(), modes: new Map(), hidden: new Set<string>() };
  const cache = createLayoutCache();
  cache.run(view, sizes, inputs);
  assert.deepEqual(cache.run(structuredClone(view), new Map(sizes), inputs).laidOut, []);
});

test('a layout mode reads only the node fields the cache keys on (id, kind, lane)', () => {
  const view = load('roadmap');
  const sizes = new Map(view.nodes.map((n) => [n.id, { w: 240, h: 96 }]));
  const other = (n: ViewNode, i: number): ViewNode => ({
    ...n, title: `changed ${i}`, body: 'x'.repeat(i * 50), tags: ['t'], emphasis: i % 2 === 0, size: 'l', n: 900 + i,
  });
  for (const region of view.regions) {
    const nodes = view.nodes.filter((n) => n.region === region.id);
    const ids = new Set(nodes.map((n) => n.id));
    const links = view.links.filter((l) => ids.has(l.from) && ids.has(l.to));
    for (const mode of MODES) {
      const a = layoutRegion(region, nodes, links, sizes, { mode });
      const b = layoutRegion(region, nodes.map(other), links, sizes, { mode });
      assert.deepEqual(b, a, `${region.id} ${mode}`);
    }
  }
});

test('a container pin repacks only: no container is laid out again, and the answer equals layoutBoard', () => {
  const view = load('roadmap');
  const sizes = new Map(view.nodes.map((n) => [n.id, { w: 240, h: 96 }]));
  const inputs: LayoutInputs = { pins: new Map(), modes: new Map(), hidden: new Set<string>() };
  const cache = createLayoutCache();
  cache.run(view, sizes, inputs);
  const moved = { ...inputs, regionPins: new Map([[view.regions[0]!.id, { x: 900, y: 700 }]]) };
  const run = cache.run(view, sizes, moved);
  assert.deepEqual(run.laidOut, []);
  assert.deepEqual(run.layout, layoutBoard(view, sizes, moved));
  const box = run.layout.regions.find((r) => r.id === view.regions[0]!.id)!.box;
  assert.deepEqual([box.x, box.y], [900, 700]);
});

test('a shown container note lays out exactly that container; hiding it restores the identical layout', () => {
  const view = load('roadmap');
  const sizes = new Map(view.nodes.map((n) => [n.id, { w: 240, h: 96 }]));
  const inputs: LayoutInputs = { pins: new Map(), modes: new Map(), hidden: new Set<string>() };
  const cache = createLayoutCache();
  const before = cache.run(view, sizes, inputs).layout;
  const id = view.regions[0]!.id;
  const shown = { ...inputs, headInsets: new Map([[id, 72]]) };
  const run = cache.run(view, sizes, shown);
  assert.deepEqual(run.laidOut, [id]);
  assert.deepEqual(run.layout, layoutBoard(view, sizes, shown));
  const grown = run.layout.regions.find((r) => r.id === id)!.box;
  assert.equal(grown.h, before.regions.find((r) => r.id === id)!.box.h + 72);
  // The same inset again lays out nothing.
  assert.deepEqual(cache.run(view, sizes, { ...inputs, headInsets: new Map([[id, 72]]) }).laidOut, []);
  const hidden = cache.run(view, sizes, { ...inputs, headInsets: new Map() });
  assert.deepEqual(hidden.laidOut, [id]);
  assert.deepEqual(hidden.layout, before);
});
