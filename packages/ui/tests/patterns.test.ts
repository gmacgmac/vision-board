// PATTERNS lists every pattern folder's pattern.json, so the gallery and its page test see them all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PATTERNS } from '../src/index.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

test('PATTERNS holds every folder with a pattern.json, by its name', () => {
  const folders = readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${SRC}${d.name}/pattern.json`)).map((d) => d.name).sort();
  assert.deepEqual(PATTERNS.map((p) => p.name).sort(), folders);
});
