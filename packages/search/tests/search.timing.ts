// The search budget (SEARCH_01): a query answers within a keystroke, so the box never lags. 1,000
// documents of about 500 characters answer a 3-word query in under 5 ms; the index they are asked
// from is built once per change, in under 100 ms. A timing test: it runs alone, in its own serial
// step (`npm run test:timing`, N12_FE_01 ruling 7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SearchDoc } from '../src/index.ts';
import { search, searchIndex } from '../src/index.ts';

const QUERY_MS = 5;
const BUILD_MS = 100;
const WORDS = ['pricing', 'annual', 'plan', 'roadmap', 'release', 'résumé', 'café', 'review', 'design', 'budget',
  'customer', 'support', 'launch', 'risk', 'question', 'decision', 'team', 'quarter', 'metric', 'growth',
  'onboarding', 'contract', 'renewal', 'seat', 'usage', 'billing', 'invoice', 'discount', 'trial', 'feedback'];

/** mulberry32, so the documents are the same every run. */
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

/** About `chars` characters of words drawn from WORDS. */
function text(next: () => number, chars: number): string {
  const out: string[] = [];
  let n = 0;
  while (n < chars) {
    const w = WORDS[Math.floor(next() * WORDS.length)]!;
    out.push(n === 0 ? w[0]!.toUpperCase() + w.slice(1) : w);
    n += w.length + 1;
  }
  return out.join(' ');
}

const next = rng(7);
const docs: SearchDoc[] = Array.from({ length: 1000 }, (_, i) => ({
  id: String(i + 1),
  fields: [
    { name: 'title', text: text(next, 40), weight: 3 },
    { name: 'body', text: text(next, 360), weight: 2 },
    { name: 'container', text: text(next, 20), weight: 1 },
    { name: 'note', text: text(next, 80), weight: 1 },
  ],
}));

/** The best of a few runs, so one slow tick of the machine is not read as the search's cost. */
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

test(`1,000 documents index in under ${BUILD_MS} ms`, () => {
  const ms = time(() => searchIndex(docs));
  console.log(`[SEARCH_01] index, ${docs.length} documents: ${ms.toFixed(1)} ms`);
  assert.ok(ms < BUILD_MS, `${ms.toFixed(1)} ms`);
});

for (const q of ['pric ann plan', 'resume cafe budget', 'r d a']) {
  test(`a 3-word query ("${q}") over 1,000 documents answers in under ${QUERY_MS} ms`, () => {
    const index = searchIndex(docs);
    let hits = 0;
    const ms = time(() => { hits = search(index, q).length; });
    console.log(`[SEARCH_01] "${q}", ${docs.length} documents, ${hits} hits: ${ms.toFixed(2)} ms`);
    assert.ok(hits > 0, 'the query finds something, so the timing covers ranking and ranges');
    assert.ok(ms < QUERY_MS, `${ms.toFixed(2)} ms`);
  });
}
