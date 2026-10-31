// The theme map (BUILD_01; plugin/theme.css): a host's three properties reach the board's tokens, each with the
// token's own value as its fallback, so a host that sets none sees what standalone sees. The fallback is a second copy of
// the token's value across a file the tokens own: this test holds the two equal. The list the file's head documents is
// the list it reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, rel), 'utf8');
const theme = read('../plugin/theme.css');
const tokens = read('../../../packages/tokens/src/tokens.css');
const scale = read('../src/styles/ui-scale.css');
const own = (css: string, prop: string) => new RegExp(`${prop}:\\s*([^;]+);`).exec(css)?.[1]!.trim();
const fallback = (prop: string, host: string) => new RegExp(`${prop}:\\s*var\\(${host},\\s*([^;]+)\\);`).exec(theme)?.[1]!.trim();

test('each host property falls back to the token\'s own value', () => {
  assert.equal(fallback('--vb-font', '--host-font'), own(tokens, '--vb-font'));
  assert.equal(fallback('--vb-font-mono', '--host-font-mono'), own(tokens, '--vb-font-mono'));
  assert.equal(fallback('--vb-ui-text-scale', '--host-text-scale'), own(scale, '--vb-ui-text-scale'));
});

test('the head of the file names every host property it reads, and no other', () => {
  const read = new Set([...theme.matchAll(/var\((--host-[a-z-]+)/g)].map((m) => m[1]));
  const listed = new Set([...theme.matchAll(/^\s{5}(--host-[a-z-]+)\s{2,}/gm)].map((m) => m[1]));
  assert.deepEqual([...read].sort(), [...listed].sort());
  assert.ok(read.size > 0);
});

test('only the board\'s own custom properties are set: the map reaches nothing of the page around it', () => {
  const rules = theme.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{[^}]*\}/g) ?? [];
  assert.deepEqual(rules.map((r) => r.split('{')[0]!.trim()), [':root']);
  for (const decl of rules.flatMap((r) => r.split('{')[1]!.replace('}', '').split(';').map((d) => d.trim()).filter(Boolean))) assert.match(decl, /^--vb-[a-z-]+:/, decl);
});
