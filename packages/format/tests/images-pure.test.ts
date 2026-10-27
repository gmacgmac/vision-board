// images.ts runs on the page and the server alike (D-048), so it stays pure string logic. Moved here
// from apps/board/tests/images.test.ts (ARCH_01): a test that reads this module's source lives in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('images.ts is pure string logic: no import, no Node, no DOM (the page and the server both run it)', () => {
  const code = fs.readFileSync(new URL('../src/images.ts', import.meta.url), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /^\s*import\s/m, 'it imports nothing');
  assert.doesNotMatch(code, /\b(Buffer|process|require|document|window|globalThis|fetch)\b|node:/, 'it uses no Node or browser name');
});
