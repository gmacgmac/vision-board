// The Markdown budget (docs/specification/performance.md: one card under 50 ms on a very large
// hostile input). A timing test: it runs alone, in its own serial step (`npm run test:timing`,
// N12_FE_01 ruling 7), so parallel unit tests cannot slow it into a false failure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.ts';
import { ADVERSARIAL, assertSafe } from './markdown-adversarial.ts';

test('adversarial input renders in under 50 ms', () => {
  renderMarkdown('warm *up* [a](https://e.com) `x`');
  for (const [name, src] of Object.entries(ADVERSARIAL)) {
    const start = performance.now();
    const html = renderMarkdown(src);
    const ms = performance.now() - start;
    assertSafe(html);
    assert.ok(ms < 50, `${name}: ${ms.toFixed(1)} ms`);
  }
});
