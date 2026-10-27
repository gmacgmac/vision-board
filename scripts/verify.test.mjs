// Proves every rule in verify.mjs fails when broken and passes when kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMap, checkLength, checkManifest, checkReferences, checkWeight, namesOf, pageAssets } from './verify.mjs';

const levels = (r) => r.map((x) => x.level);

test('length: under 300 is silent, over 300 warns, over 500 fails unless marked', () => {
  assert.deepEqual(checkLength('a.ts', 'x\n'.repeat(300)), []);
  assert.deepEqual(levels(checkLength('a.ts', 'x\n'.repeat(301))), ['warn']);
  assert.deepEqual(levels(checkLength('a.ts', 'x\n'.repeat(501))), ['fail']);
  assert.deepEqual(levels(checkLength('a.ts', '// verify: long-file generated table\n' + 'x\n'.repeat(600))), ['warn']);
});

const NAMES = namesOf({ imports: {
  '#actions': './packages/actions/src/index.ts', '#format': './packages/format/src/index.ts',
  '#format/files': './packages/format/src/files.ts', '#ui': './packages/ui/src/index.ts',
  '#ui/styles.css': './packages/ui/src/styles.css', '#client': './packages/client/src/index.ts', '#mcp': './packages/mcp/src/index.ts',
} });
const check = (rel, text) => checkReferences(rel, text, NAMES);
const fails = (rel, text, pattern) => {
  const r = check(rel, text);
  assert.deepEqual(levels(r), ['fail'], `${rel}: ${text}`);
  assert.match(r[0].message, pattern);
};

test('names: a module by its name, in a layer it may use, and relative paths inside a module pass', () => {
  assert.deepEqual(check('packages/actions/src/a.ts', "import { X } from '#format';"), []);
  assert.deepEqual(check('packages/layout/src/a.ts', "import { y } from './b.ts';"), []);
  assert.deepEqual(check('apps/board/src/a.ts', "import '#ui/styles.css';\nimport type { V } from '#format';"), []);
  assert.deepEqual(check('apps/board/server/a.ts', "import { SCHEMA_DIR } from '#format/files';"), []);
  assert.deepEqual(check('tests/pages/a.spec.ts', "import { APP } from '#ui';"), []);
  assert.deepEqual(check('packages/ui/tests/a.test.ts', "const f = new URL('../src/', import.meta.url);"), []);
  assert.deepEqual(check('apps/board/index.html', '<link rel="icon" href="/favicon.svg"><script type="module" src="./src/main.ts"></script>'), []);
});

test('back doors: any path into another module fails, from code, CSS, HTML, tests and skills', () => {
  const door = /back door into packages\/(format|ui|tokens|agent)/;
  fails('packages/actions/src/a.ts', "import { X } from '../../format/src/index.ts';", door);
  fails('packages/actions/src/a.ts', "export * from '../../format/src/view.ts';", door);
  fails('apps/board/src/a.ts', "const m = await import('../../../packages/format/src/index.ts');", door);
  fails('apps/board/src/main.ts', "import '../../../packages/ui/src/node/node.css';", door);
  fails('apps/board/server/a.ts', "const DIR = fileURLToPath(new URL('../../../packages/format/schema/', import.meta.url));", door);
  fails('apps/board/tests/a.test.ts', 'const f = (rel) => new URL(`../../../packages/agent/tests/${rel}`, import.meta.url);', door);
  fails('apps/board/src/g.ts', "const files = import.meta.glob<P>('../../../packages/ui/src/*/pattern.json', { eager: true });", door);
  fails('apps/board/index.html', '<link rel="stylesheet" href="../../packages/tokens/src/tokens.css">', door);
  fails('packages/chat/src/chat.css', "@import '../../ui/src/node/node.css';", door);
  fails('tests/pages/a.ts', "import { REGION_GAP } from '../../packages/layout/src/types.ts';", /back door into packages\/layout/);
  fails('skills/vision-board/a.test.mjs', "import { X } from '../../packages/format/src/index.ts';", door);
});

test('names: an unknown name, a module\'s own name and a wrong-way layer fail', () => {
  fails('apps/board/src/a.ts', "import { X } from '#nope';", /not a module name/);
  fails('packages/format/src/a.ts', "import { X } from '#format';", /its own module's name/);
  fails('packages/format/src/a.ts', "import { A } from '#actions';", /may not depend/);
});

test('apps and scripts: only test code imports an app; nothing imports scripts/', () => {
  fails('packages/ui/src/a.ts', "import x from '../../../apps/board/src/x.ts';", /imports an app/);
  fails('skills/vision-board/tools.mjs', "import x from '../../apps/board/server/schema.ts';", /imports an app/);
  fails('apps/board/src/a.ts', "import x from '../../../scripts/verify.mjs';", /scripts/);
  assert.deepEqual(check('tests/pages/a.ts', "import { createBoardServer } from '../../apps/board/server/app.ts';"), []);
  assert.deepEqual(check('skills/vision-board/examples/a.test.mjs', "import { c } from '../../../apps/board/server/schema.ts';"), []);
});

test('a package that imports a file outside every module by path is warned', () => {
  assert.deepEqual(levels(check('packages/actions/tests/a.timing.ts', "import { roadmap } from '../../../tests/pages/perf-ledger.ts';")), ['warn']);
});

test('names: the client and MCP layers of D-029', () => {
  const imp = (from, to) => checkReferences(`packages/${from}/src/a.ts`, `import { X } from '#${to}';`, namesOf({ imports: { [`#${to}`]: `./packages/${to}/src/index.ts` } }));
  assert.deepEqual(imp('client', 'format'), []);
  assert.deepEqual(imp('mcp', 'client'), []);
  assert.deepEqual(imp('mcp', 'format'), []);
  assert.deepEqual(imp('cli', 'client'), []);
  assert.match(imp('client', 'actions')[0].message, /may not depend/);
  assert.match(imp('mcp', 'actions')[0].message, /may not depend/);
  assert.match(imp('format', 'client')[0].message, /may not depend/);
  assert.match(imp('ui', 'mcp')[0].message, /may not depend/);
});

test('manifest: ranges fail, unregistered packages fail, registered exact pins pass', () => {
  const json = { devDependencies: { vite: '8.3.1', svelte: '^5.57.1' } };
  assert.equal(checkManifest('package.json', json, '| `vite` |').length, 2);
  assert.deepEqual(checkManifest('package.json', { devDependencies: { vite: '8.3.1' } }, '| `vite` | 8.3.1 |'), []);
  assert.match(checkManifest('package.json', { dependencies: { vite: '8.3.1' } }, null)[0].message, /no dependency register/);
});

test('map: lists real dependencies (by name), users and the public API; tests/ is left out', () => {
  const map = buildMap([
    { rel: 'packages/format/src/index.ts', text: "export * from './view.ts';" },
    { rel: 'packages/actions/src/a.ts', text: "import { V } from '#format';" },
    { rel: 'tests/pages/a.spec.ts', text: "import { V } from '#format';" },
  ], NAMES);
  assert.match(map, /\| `packages\/actions` \| `packages\/format` \| — \|/);
  assert.match(map, /\| `packages\/format` \| — \| `packages\/actions` \| \* from view\.ts \|/);
});

test('page weight: the board page is its HTML\'s assets and what they import at start, never the gallery\'s or a lazy chunk', () => {
  const html = '<script type="module" src="/assets/index-a.js"></script><link rel="stylesheet" href="/assets/shared-b.css">';
  const files = {
    'index-a.js': 'import{x}from"./shared-c.js";import"./side-f.js";export*from"./shared-g.js";const l=()=>import("./lazy-d.js")',
    'shared-c.js': '', 'side-f.js': '', 'shared-g.js': '', 'lazy-d.js': 'import{y}from"./lazy-h.js"', 'lazy-h.js': '', 'gallery-e.js': '',
  };
  assert.deepEqual(pageAssets(html, (name) => files[name] ?? null).sort(), ['index-a.js', 'shared-b.css', 'shared-c.js', 'shared-g.js', 'side-f.js']);
});

test('page weight: over the gzip budget fails and names the size, at or under it is silent', () => {
  assert.deepEqual(checkWeight('apps/board/dist/index.html', 150 * 1024, 150), []);
  const over = checkWeight('apps/board/dist/index.html', 150 * 1024 + 1, 150);
  assert.deepEqual(levels(over), ['fail']);
  assert.match(over[0].message, /150\.0 KB gzip.*budget 150 KB/);
});
