// The theme map (BUILD_01, host styling FE_01; plugin/theme.css): a host's properties reach the board's tokens, each with
// the token's own value as its fallback, so a host that sets none sees what standalone sees. The type's fallbacks are a
// second copy of the token's value across a file the tokens own: this test holds the two equal. The list the file's head
// documents is the list it reads, and the spec's table (docs/specification/plugin.md § Theme and host styling) names
// each property, the tokens it feeds and their defaults as the sheets have them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, rel), 'utf8');
const theme = read('../plugin/theme.css');
const scheme = read('../plugin/color-scheme.css');
const view = read('../plugin/view.ts');
const tokens = read('../../../packages/tokens/src/tokens.css');
const scale = read('../src/styles/ui-scale.css');
const spec = read('../../../docs/specification/plugin.md');
const own = (css: string, prop: string) => new RegExp(`${prop}:\\s*([^;]+);`).exec(css)?.[1]!.trim();
const fallback = (prop: string, host: string) => new RegExp(`${prop}:\\s*var\\(${host},\\s*([^;]+)\\);`).exec(theme)?.[1]!.trim();
const uncomment = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

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
  const rules = uncomment(theme).match(/[^{}]+\{[^}]*\}/g) ?? [];
  const marked = /const HOST_STYLING = '([a-z-]+)'/.exec(view)?.[1];
  assert.equal(marked, 'data-vb-host-styling', 'view.ts marks the root with the attribute theme.css selects');
  assert.deepEqual(rules.map((r) => r.split('{')[0]!.trim()), [':root, .vb-board', `.vb-board[${marked}]`]);
  for (const decl of rules.flatMap((r) => r.split('{')[1]!.replace('}', '').split(';').map((d) => d.trim()).filter(Boolean))) assert.match(decl, /^--vb-[a-z-]+:/, decl);
});

/** The spec's rows: type (three cells) and colour (four), by property. */
const rows = [...spec.matchAll(/^\| `(--host-[a-z-]+)` \|([^\n]*)\|$/gm)].map((m) => ({ prop: m[1]!, cells: m[2]!.split('|').map((c) => c.trim()) }));
const colourRows = rows.filter((r) => r.cells.length === 3);
/** theme.css: each `--vb-host-*` and the host property it passes on (the plain ones, not the mixes); a fill's own
 *  property first, then the accent it stands in for. */
const passes = new Map([...theme.matchAll(/(--vb-host-[a-z-]+): var\((--host-[a-z-]+)(?:, var\(--host-[a-z-]+\))?\);/g)].map((m) => [m[1]!, m[2]!]));
/** tokens.css: the board's own accents, which the decision kind and commented state keep (point 455), by name. */
const boardOwn = new Map([...uncomment(tokens).matchAll(/(--vb-board-[a-z-]+): ([^;]+);/g)].map((m) => [`var(${m[1]})`, m[2]!.trim()]));
/** tokens.css: each token that fronts a `--vb-host-*`, and its own value after it (a board accent read through). */
const fronts = [...uncomment(tokens).matchAll(/(--vb-[a-z-]+): var\((--vb-host-[a-z-]+), ([^;]+)\);/g)]
  .map((m) => ({ token: m[1]!, via: m[2]!, own: boardOwn.get(m[3]!.trim()) ?? m[3]!.trim() }));
const pairs = (cell: string) => [...cell.matchAll(/`(#[0-9a-f]{6})` \/ `(#[0-9a-f]{6})`/g)].map((m) => `light-dark(${m[1]}, ${m[2]})`);

test('the spec\'s host table names each property the sheet reads, the tokens it feeds and their defaults', () => {
  assert.equal(colourRows.length, 14);
  // A fill the host leaves out is its accent (and the hover its strong form), as before the fill had a property.
  assert.match(theme, /--vb-host-accent-fill: var\(--host-accent-fill, var\(--host-accent\)\);/);
  assert.match(theme, /--vb-host-accent-fill-hover: var\(--host-accent-fill-hover, var\(--host-accent-strong\)\);/);
  const named = new Set(rows.map((r) => r.prop));
  for (const css of [tokens, theme, scheme]) for (const m of uncomment(css).matchAll(/var\((--host-[a-z-]+)/g)) assert.ok(named.has(m[1]!), `${m[1]} has a row`);
  for (const { prop, cells: [, feedsCell, defaultsCell] } of colourRows) {
    const feeds = [...feedsCell!.matchAll(/`(--vb-[a-z-]+)`/g)].map((m) => m[1]!);
    const reading = fronts.filter((f) => passes.get(f.via) === prop);
    assert.deepEqual(reading.map((f) => f.token), feeds, `${prop}: the tokens that read it are its Feeds`);
    const want = pairs(defaultsCell!);
    if (!feeds.length) continue;
    if (!want.length) assert.deepEqual(reading.map((f) => f.own), ['var(--vb-accent)'], `${prop}: the accent by default`);
    else reading.forEach((f, i) => assert.equal(f.own, want[want.length === 1 ? 0 : i], `${prop}: ${f.token}'s default`));
  }
  // The mode: the board's root reads the host's, through its --vb-host-* and only that.
  assert.equal(passes.get('--vb-host-color-scheme'), '--host-color-scheme');
  assert.equal([...scheme.matchAll(/color-scheme: var\(--vb-host-color-scheme, /g)].length, 3);
});
