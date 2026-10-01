// Proves every rule in verify.mjs fails when broken and passes when kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMap, checkImports, checkLength, checkManifest } from './verify.mjs';

const levels = (r) => r.map((x) => x.level);

test('length: under 300 is silent, over 300 warns, over 500 fails unless marked', () => {
  assert.deepEqual(checkLength('a.ts', 'x\n'.repeat(300)), []);
  assert.deepEqual(levels(checkLength('a.ts', 'x\n'.repeat(301))), ['warn']);
  assert.deepEqual(levels(checkLength('a.ts', 'x\n'.repeat(501))), ['fail']);
  assert.deepEqual(levels(checkLength('a.ts', '// verify: long-file generated table\n' + 'x\n'.repeat(600))), ['warn']);
});

test('imports: allowed layer through the front door passes', () => {
  assert.deepEqual(checkImports('packages/actions/src/a.ts', "import { X } from '../../format/src/index.ts';"), []);
  assert.deepEqual(checkImports('packages/layout/src/a.ts', "import { y } from './b.ts';"), []);
  assert.deepEqual(checkImports('apps/board/src/a.ts', "import type { V } from '/pkg/format/src/index.ts';"), []);
});

test('imports: back door, wrong-way layer, app and scripts imports fail', () => {
  assert.match(checkImports('packages/actions/src/a.ts', "import { X } from '../../format/src/view.ts';")[0].message, /back-door/);
  assert.match(checkImports('packages/format/src/a.ts', "import { A } from '../../actions/src/index.ts';")[0].message, /may not depend/);
  assert.match(checkImports('packages/ui/src/a.ts', "import x from '../../../apps/board/src/x.ts';")[0].message, /imports an app/);
  assert.match(checkImports('apps/board/src/a.ts', "import x from '../../../scripts/verify.mjs';")[0].message, /scripts/);
  assert.match(checkImports('apps/board/src/a.ts', "export * from '/pkg/ui/src/item/item-core.ts';")[0].message, /back-door/);
});

test('manifest: ranges fail, unregistered packages fail, registered exact pins pass', () => {
  const json = { devDependencies: { vite: '8.3.1', svelte: '^5.57.1' } };
  assert.equal(checkManifest('package.json', json, '| `vite` |').length, 2);
  assert.deepEqual(checkManifest('package.json', { devDependencies: { vite: '8.3.1' } }, '| `vite` | 8.3.1 |'), []);
  assert.match(checkManifest('package.json', { dependencies: { vite: '8.3.1' } }, null)[0].message, /no dependency register/);
});

test('map: lists real dependencies, users and the public API', () => {
  const map = buildMap([
    { rel: 'packages/format/src/index.ts', text: "export * from './view.ts';" },
    { rel: 'packages/actions/src/a.ts', text: "import { V } from '../../format/src/index.ts';" },
  ]);
  assert.match(map, /\| `packages\/actions` \| `packages\/format` \| — \|/);
  assert.match(map, /\| `packages\/format` \| — \| `packages\/actions` \| \* from view\.ts \|/);
});
