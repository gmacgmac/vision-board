// The conditions budget (BE_04 ruling 4): `conditionsOf` reads folded indexes per board, never the
// events, so on the performance fixture the page tests use (tests/pages/perf-ledger.ts, 1,000
// cards) it stays under 5 ms, for the open board and for the whole project. A timing test: it runs
// alone, in its own serial step (`npm run test:timing`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { conditionsOf, foldLedger } from '../src/index.ts';
import { BIG, perfLedger } from '../../../tests/pages/perf-ledger.ts';

const BUDGET_MS = 5;
const s = foldLedger(readLedger(perfLedger()).events);

/** The best of a few runs, so one slow tick of the machine is not read as the table's cost. */
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

for (const [name, ctx] of [['the open board', { board: BIG.board }], ['the whole project', {}]] as const) {
  test(`conditionsOf for ${name}, ${s.nodes.size} cards, stays under ${BUDGET_MS} ms`, () => {
    const ms = time(() => conditionsOf(s, ctx));
    console.log(`[BE_04] conditionsOf, ${name}: ${ms.toFixed(2)} ms`);
    assert.ok(ms < BUDGET_MS, `${ms.toFixed(2)} ms`);
  });
}
