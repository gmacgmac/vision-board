// The favicon can't read CSS tokens, so it carries the token's two values (navigation FE_05
// ruling 3); this fails when they drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('the favicon colours are the --vb-brand-mark token\'s light and dark values', () => {
  const token = /--vb-brand-mark:\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/i.exec(read('../../../packages/tokens/src/tokens.css'));
  assert.ok(token, '--vb-brand-mark is a light-dark() of two hex colours');
  const [, light, dark] = token;
  const svg = read('../public/favicon.svg');
  const colours = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
  assert.deepEqual([...new Set(colours)].sort(), [light!.toLowerCase(), dark!.toLowerCase()].sort());
  assert.ok(svg.includes(`stroke="${light}"`) && svg.includes(`stroke: ${dark}`), 'light is the base, dark is the dark-scheme override');
});

test('both pages link the favicon', () => {
  for (const page of ['../index.html', '../gallery.html']) {
    assert.match(read(page), /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
  }
});
