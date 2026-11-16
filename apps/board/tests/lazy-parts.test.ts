// The parts a person opens stay out of the board page's start weight (PERF_01; docs/specification/performance.md
// § What the page leaves out of its start weight): no file the page imports statically from main.ts reaches one, so
// only its `import()` (board/lazy.ts `lazyPart`) loads it. And a part loads once, and again after a failed load.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { lazyPart } from '../src/board/lazy.ts';

const SRC = path.resolve(import.meta.dirname, '../src');
/** The moved parts and what only they use. */
const LAZY = ['shell/FolderDialog.svelte', 'shell/FolderPicker.svelte', 'shell/LedgerDialog.svelte', 'shell/LedgerForm.svelte',
  'board/chrome/BoardDialog.svelte', 'board/chrome/ArchivedDialog.svelte', 'board/chrome/ArchivedList.svelte'];

/** Every file of the page reached from `entry` by static imports (`import type` and `import()` are not). */
function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [path.join(SRC, entry)];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/^\s*import\s+(?!type\b)(?:[^'";]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+\.(?:ts|svelte))['"]/gm)) {
      queue.push(path.resolve(path.dirname(file), m[1]!));
    }
  }
  return seen;
}

test('no part a person opens is imported statically from the page\'s start', () => {
  const start = staticGraph('main.ts');
  assert.ok(start.has(path.join(SRC, 'board/chrome/BoardChrome.svelte')), 'the walk reaches the board\'s controls');
  assert.deepEqual(LAZY.filter((f) => start.has(path.join(SRC, f))), []);
});

test('a part loads once, says when it is ready, and loads again after a failure', async () => {
  let calls = 0;
  let fail = true;
  const part = lazyPart(() => { calls += 1; return fail ? Promise.reject(new Error('offline')) : Promise.resolve('the part'); });
  assert.equal(part.ready, null);
  await assert.rejects(part.load(), /offline/);
  fail = false;
  const [a, b] = await Promise.all([part.load(), part.load()]);
  assert.deepEqual([a, b, part.ready, calls], ['the part', 'the part', 'the part', 2]);
  await part.load();
  assert.equal(calls, 2);
});
