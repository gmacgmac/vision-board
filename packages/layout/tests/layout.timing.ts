// The layout budget (docs/specification/performance.md: the whole board under 100 ms, 1,000 cards,
// 3 pins per container), on the performance fixture the page tests use (`#format/testing` perfLedger).
// A timing test: it runs alone, in its own serial step (`npm run test:timing`, N12_FE_01 ruling 7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { View } from '#format';
import { boardView, foldDrawn, readLedger } from '#format';
import { layoutBoard } from '../src/index.ts';
import type { Size } from '../src/index.ts';
import { BIG, perfLedger } from '#format/testing';

const BUDGET_MS = 100;
const view = boardView(foldDrawn(readLedger(perfLedger()).events), BIG.board);
// Card sizes as the page measures them: the three widths, heights that vary.
const sizes = new Map<string, Size>(view.nodes.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: 110 + (i % 5) * 30 }]));

/** The best of a few runs, so one slow tick of the machine is not read as the layout's cost. */
function time(run: () => void): number {
  run();
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    run();
    best = Math.min(best, performance.now() - t);
  }
  return best;
}

test(`layout of ${view.nodes.length} cards stays under ${BUDGET_MS} ms`, () => {
  assert.equal(view.nodes.length, BIG.regions * BIG.perRegion);
  const ms = time(() => layoutBoard(view, sizes));
  console.log(`[N12] layout, ${view.nodes.length} cards: ${ms.toFixed(1)} ms`);
  assert.ok(ms < BUDGET_MS, `${ms.toFixed(1)} ms`);
});

test(`layout of ${view.nodes.length} cards with 3 pins per container, each on a card, stays under ${BUDGET_MS} ms`, () => {
  const before = layoutBoard(view, sizes);
  // Three cards per container dropped onto its first card, so every container makes room.
  const pins = new Map<string, { x: number; y: number }>();
  for (const r of before.regions) {
    const ids = view.nodes.filter((n) => n.region === r.id).map((n) => n.id);
    const first = before.nodes.get(ids[0]!)!;
    for (const id of ids.slice(-3)) pins.set(id, { x: first.x - r.origin.x + 8, y: first.y - r.origin.y + 8 });
  }
  const ms = time(() => layoutBoard(view, sizes, { pins }));
  console.log(`[N12] layout, ${view.nodes.length} cards, ${pins.size} pins: ${ms.toFixed(1)} ms`);
  assert.ok(ms < BUDGET_MS, `${ms.toFixed(1)} ms`);
});

/** mulberry32, so the dense board is the same every run. */
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

// Routing around cards (field-report batch 3 ruling 2) costs most where links are many: 1,000 cards
// in 20 flow and lanes containers with 60 links each, at random, inside the same budget.
test(`layout of 1000 cards with 1200 links in flow and lanes stays under ${BUDGET_MS} ms`, () => {
  const r = rng(9);
  const dense: View = { format: 1, session: 'dense', version: 1, title: 'Dense', regions: [], nodes: [], links: [] };
  for (let g = 0; g < 20; g++) {
    dense.regions.push({ id: `g${g}`, title: `G${g}`, mode: g % 2 ? 'lanes' : 'flow', lanes: ['a', 'b', 'c', 'd', 'e'] });
    for (let i = 0; i < 50; i++) dense.nodes.push({ id: `g${g}n${i}`, region: `g${g}`, kind: 'finding', title: 't', lane: 'abcde'[Math.floor(r() * 5)]! });
    for (let k = 0; k < 60; k++) {
      const [a, b] = [Math.floor(r() * 50), Math.floor(r() * 50)];
      if (a !== b) dense.links.push({ from: `g${g}n${Math.min(a, b)}`, to: `g${g}n${Math.max(a, b)}` });
    }
  }
  const sz = new Map<string, Size>(dense.nodes.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: 110 + (i % 5) * 30 }]));
  const ms = time(() => layoutBoard(dense, sz));
  console.log(`[M2] layout, ${dense.nodes.length} cards, ${dense.links.length} links: ${ms.toFixed(1)} ms`);
  assert.ok(ms < BUDGET_MS, `${ms.toFixed(1)} ms`);
});
