// Proves the words rule (scripts/words-scan.mjs, words-text.mjs) finds a planted sentence and
// leaves ids, keys, CSS and log lines alone: the test that fails when a sentence stands in code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanFile } from './words-scan.mjs';

const texts = (file, source) => scanFile(file, source).map((g) => g.text);

test('a sentence in a string, a template and a returned object is found', () => {
  assert.deepEqual(texts('a.ts', "export const x = 'Nothing to send yet';"), ['Nothing to send yet']);
  assert.deepEqual(texts('a.ts', 'export const x = (n: number) => `Move ${n} cards to`;'), ['Move ${n} cards to']);
  assert.deepEqual(texts('a.ts', "export const x = { label: 'Fit', tone: 'quiet' };"), ['Fit']);
  assert.deepEqual(texts('a.ts', "const toast = (s: string) => s; toast('Saved');"), ['Saved']);
});

test('markup text and the text attributes of a markup string are found; its ids and classes are not', () => {
  assert.deepEqual(texts('a.ts', 'export const x = `<button class="vb-btn" aria-label="Close note" data-act="close">Close</button>`;'), ['Close note', 'Close']);
  assert.deepEqual(texts('a.ts', "export const x = '<span class=\"vb-chip\">' + v + '</span>';"), []);
});

test('a Svelte file: its text, its text attributes, and the strings of its script and expressions', () => {
  const svelte = '<script lang="ts">\n  const heading = \'Archived boards\';\n</script>\n<button title="Close the list" onclick={go}>Close</button>\n<p>{n} cards left</p>\n{x ? \'Yes please\' : \'No\'}';
  assert.deepEqual(texts('A.svelte', svelte), ['Archived boards', 'Close the list', 'Close', '${n} cards left', 'Yes please']);
});

test('ids, keys, CSS, selectors, log lines, thrown errors and comparisons are not sentences', () => {
  const quiet = [
    "const a = 'vb-menu-item vb-move-item';", "const a = document.querySelector('.vb-node button[data-notes]');",
    "const a = `translate(${x}px, ${y}px)`;", "const a = `${prefix}region-${id}-hint`;", "const a = 'application/json';",
    "console.error('chat: listener failed');", "warn('ledger: a line was not JSON');", "throw new Error('an invariant broke here');",
    "if (key === 'Arrow Down') run();", "import x from './a-b.ts';", "type T = 'two words';", "const a = { 'Content-Type': 'text/plain' };",
  ];
  for (const source of quiet) assert.deepEqual(texts('a.ts', source), [], source);
});

test('a planted sentence fails the repo check', async () => {
  const { sentencesOutside } = await import('./words-homes.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const base = mkdtempSync(join(tmpdir(), 'words-'));
  mkdirSync(join(base, 'packages/cli/src'), { recursive: true });
  writeFileSync(join(base, 'packages/cli/src/run.ts'), "export const x = 'This sentence stands in code';\n");
  const found = sentencesOutside(base).filter((l) => !l.startsWith('exemption'));
  assert.equal(found.length, 1);
  assert.match(found[0], /run\.ts:1 "This sentence stands in code"/);
});
