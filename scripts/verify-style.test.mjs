// Proves the style and layer rules in verify-style.mjs fail when broken and pass when kept: colour
// literals live only in the tokens, network and file I/O only in their layers, and every rule in
// the board's stylesheets is scoped and sized by the board's own width (UI_01).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkColours, checkIO, checkScope } from './verify-style.mjs';

const levels = (r) => r.map((x) => x.level);

test('colours: a literal outside the tokens fails, in CSS and in code', () => {
  assert.deepEqual(levels(checkColours('packages/ui/src/a/a.css', '.vb-a { color: #fff; }')), ['fail']);
  assert.deepEqual(levels(checkColours('packages/ui/src/a/a.css', '.vb-a { background: rgb(0 0 0 / 0.2); }')), ['fail']);
  assert.deepEqual(levels(checkColours('apps/board/src/styles/a.css', '.vb-a { border-color: hsl(10 20% 30%); }')), ['fail']);
  assert.deepEqual(levels(checkColours('apps/board/src/styles/a.css', '.vb-a { color: white; }')), ['fail']);
  assert.deepEqual(levels(checkColours('packages/ui/src/a/a-template.ts', "const s = '<path fill=\"#c03838\"/>';")), ['fail']);
  assert.deepEqual(levels(checkColours('apps/board/src/shell/A.svelte', '<div style="color: oklch(0.5 0.1 200)"></div>')), ['fail']);
});

test('colours: tokens, relative colours, keywords, names and comments pass', () => {
  assert.deepEqual(checkColours('packages/tokens/src/tokens.css', ':root { --vb-ink: light-dark(#1c1c1e, #ececee); }'), []);
  assert.deepEqual(checkColours('packages/ui/src/a/a.css', '.vb-a { color: var(--vb-ink); background: transparent; fill: currentColor; white-space: nowrap; }'), []);
  assert.deepEqual(checkColours('packages/ui/src/a/a.css', '.vb-a { --s: oklch(from var(--k) l c h); }'), []);
  assert.deepEqual(checkColours('packages/ui/src/a/a.css', '/* was #fff, now a token */ .vb-a { color: var(--vb-ink); }'), []);
  assert.deepEqual(checkColours('packages/ui/src/a/a.ts', "import { x } from '#format'; // #fff\nconst id = '#stage';"), []);
  assert.deepEqual(checkColours('packages/ui/tests/a.test.ts', "const hostile = 'h2 { color: #f00 }';"), [], 'tests may');
});

test('colours: the chat palette is out of scope (PLAN), a warning not a failure', () => {
  assert.deepEqual(levels(checkColours('packages/chat/src/chat.css', '.chat { --_ink: var(--chat-ink, #3e3e44); }')), ['warn']);
});

test('I/O: network calls only in the I/O layer', () => {
  assert.deepEqual(checkIO('apps/board/src/board/io.ts', 'await fetch(url);'), []);
  assert.deepEqual(checkIO('apps/board/src/board/io/image.ts', 'await fetch(url);'), [], 'io.ts and its parts are one layer');
  assert.deepEqual(checkIO('packages/client/src/client.ts', 'return fetch(path, init);'), []);
  assert.deepEqual(checkIO('apps/board/src/shell/page-io.ts', 'const s = new EventSource(u);'), [], 'the standalone page\'s own calls');
  assert.deepEqual(levels(checkIO('apps/board/src/board/notes/notes.ts', 'await fetch(url);')), ['fail']);
  assert.deepEqual(levels(checkIO('packages/ui/src/node/vb-node.ts', 'const s = new EventSource(u);')), ['fail']);
  assert.deepEqual(levels(checkIO('apps/board/src/shell/A.svelte', 'const x = new XMLHttpRequest();')), ['fail']);
});

test('I/O: file, socket and process access only in the server, bins and Node-side packages', () => {
  const fs = "import fs from 'node:fs';";
  for (const ok of ['apps/board/server/ledger.ts', 'apps/board/server.ts', 'apps/board/bin/validate.ts', 'packages/agent/src/claude.ts',
    'packages/cli/src/node-io.ts', 'packages/mcp/src/tools.ts']) assert.deepEqual(checkIO(ok, fs), [], ok);
  for (const bad of ['packages/format/src/a.ts', 'packages/actions/src/a.ts', 'packages/ui/src/a.ts', 'packages/cli/src/run.ts', 'apps/board/src/board/a.ts']) {
    assert.deepEqual(levels(checkIO(bad, fs)), ['fail'], bad);
  }
  assert.deepEqual(levels(checkIO('packages/layout/src/a.ts', "const { spawn } = await import('node:child_process');")), ['fail']);
  assert.deepEqual(checkIO('packages/format/src/files.ts', "import { fileURLToPath } from 'node:url';"), [], 'paths are not I/O');
  assert.deepEqual(checkIO('packages/ui/src/a.ts', "import type { ChildProcess } from 'node:child_process';"), [], 'a type is not I/O');
  assert.deepEqual(checkIO('apps/board/tests/a.test.ts', fs), [], 'tests may');
});

test('scope: every selector in the board\'s stylesheets names a vb- class or element', () => {
  const ok = '.vb-a { color: var(--vb-ink); }\nvb-node .vb-b:hover, .vb .vb-c { margin: 0; }\n.vb-dialog::backdrop { background: var(--vb-scrim); }';
  assert.deepEqual(checkScope('packages/ui/src/a/a.css', ok), []);
  assert.deepEqual(checkScope('apps/board/src/styles/a.css', '@container vb-board (max-width: 600px) { .vb-a { gap: 0; } }'), []);
  assert.deepEqual(checkScope('packages/ui/src/a/a.css', '@keyframes vb-pulse { from { opacity: 0; } 50% { opacity: 1; } }'), []);
  assert.deepEqual(checkScope('packages/ui/src/a/a.css', "@property --vb-zoom { syntax: '<number>'; inherits: true; initial-value: 1; }"), []);
  for (const bad of ['body { margin: 0; }', '* { box-sizing: border-box; }', ':focus-visible { outline: 0; }', 'kbd { font: inherit; }',
    '.vb-a, h2 { margin: 0; }', ':root { --x: 1; }', '[hidden] { display: none; }', '@media (prefers-color-scheme: dark) { p { color: red; } }']) {
    assert.deepEqual(levels(checkScope('apps/board/src/styles/a.css', bad)), ['fail'], bad);
  }
});

test('scope: a selector outside the scope fails, by the host\'s rule (nclite checkStylesheet): the first compound names vb and holds no :is, :where, :not, :has', () => {
  const sheet = (css) => checkScope('packages/ui/src/a/a.css', css);
  for (const bad of ['[data-narrow] .vb-a { gap: 0; }', ':where(.vb-board) { position: relative; }', '.vb-toolbar:not([data-tier]) { gap: 0; }',
    'vb-node:has(.vb-b) { z-index: 1; }', ':is(vb-node, .vb-g) .vb-pin { top: 0; }', ':where([class*="vb-"]) kbd { margin: 0; }', ':root[data-theme=dark] .vb-board { gap: 0; }',
    '.gliding vb-region { gap: 0; }', '@layer base { .vb-a { gap: 0; } }']) {
    assert.deepEqual(levels(sheet(bad)), ['fail'], bad);
  }
  // the same reach, in the scope: the class first, the rest nested (a nested rule is under its parent and is not checked again)
  for (const ok of ['.vb-toolbar { &:not([data-tier]) { gap: 0; } }', 'vb-node { [data-zoom=far] & .vb-b { visibility: hidden; } }',
    'vb-node, .vb-g { & .vb-pin { top: 0; } }', '.vb-board { :where(&) { position: relative; } :where(&, & *):focus-visible { outline: none; } }',
    '.vb-a[data-x] .vb-b:hover { gap: 0; }', '@container vb-bar (width < 900px) { .vb-toolbar { &[data-tier=half]:has(.vb-c) .vb-d { gap: 0; } } }']) {
    assert.deepEqual(sheet(ok), [], ok);
  }
  assert.deepEqual(sheet(':root { --vb-x: 1; }'), []);
  // a sheet reads only its own --vb-* properties and a host's --host-* ones
  assert.deepEqual(levels(sheet('.vb-a { --gap: 1px; margin: var(--gap); }')), ['fail']);
  assert.deepEqual(sheet('.vb-a { --vb-gap: 1px; margin: var(--vb-gap); color: var(--host-ink, var(--vb-ink)); }'), []);
  // a nested selector starts with a symbol: WebKit before Safari 17.2 drops one that starts with an element name
  for (const bad of ['.vb-a { svg:where(& *) { fill: none; } }', 'vb-node { body & { gap: 0; } }', '.vb-a { @media (prefers-reduced-motion) { p & { gap: 0; } } }']) {
    assert.deepEqual(levels(sheet(bad)), ['fail'], bad);
  }
  for (const ok of ['.vb-a { :is(svg):where(& *) { fill: none; } }', '.vb-a { > p { gap: 0; } * { gap: 0; } [x] & { gap: 0; } }']) {
    assert.deepEqual(sheet(ok), [], ok);
  }
  assert.deepEqual(levels(sheet(':root { --x: 1; color-scheme: dark; }')), ['fail', 'fail']);
  // the standalone page's own sheets (styles/page.ts) are not in the plugin: they keep the looser rule
  assert.deepEqual(checkScope('apps/board/src/styles/ledgers.css', '[data-narrow] .vb-a:not(.vb-b) { gap: 0; }'), []);
  assert.deepEqual(levels(checkScope('apps/board/src/styles/header.css', '[data-narrow] .vb-a { gap: 0; }')), ['fail']);
});

test('scope: the board is sized by its own width, not the window\'s', () => {
  assert.deepEqual(levels(checkScope('apps/board/src/styles/a.css', '@media (max-width: 1000px) { .vb-a { gap: 0; } }')), ['fail']);
  assert.deepEqual(checkScope('apps/board/src/styles/a.css', '@media (prefers-reduced-motion: no-preference) { .vb-a { transition: none; } }'), []);
  assert.deepEqual(checkScope('apps/board/src/styles/a.css', '@media (hover: hover) { .vb-a:hover { color: var(--vb-ink); } }'), []);
});

test('scope: only the board\'s stylesheets; the standalone page\'s own sheet may style the page', () => {
  assert.deepEqual(checkScope('apps/board/src/styles/shell.css', 'html, body { margin: 0; }'), []);
  assert.deepEqual(checkScope('packages/chat/src/chat.css', '.chat-a { margin: 0; }'), []);
  assert.deepEqual(checkScope('apps/board/src/gallery/gallery.css', 'body { margin: 0; }'), []);
});
