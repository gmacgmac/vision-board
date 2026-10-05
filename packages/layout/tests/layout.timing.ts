// The layout budget (docs/specification/performance.md: the whole board under 100 ms, 1,000 cards,
// 3 pins per container), on the performance fixture the page tests use (tests/pages/perf-ledger.ts).
// A timing test: it runs alone, in its own serial step (`npm run test:timing`, N12_FE_01 ruling 7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView, foldDrawn, readLedger } from '../../format/src/index.ts';
import { layoutBoard } from '../src/index.ts';
import type { Size } from '../src/index.ts';
import { BIG, perfLedger } from '../../../tests/pages/perf-ledger.ts';

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
