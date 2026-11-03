// Holds docs/specification/plugin.md to the code, in `npm test` with no build (cortex-docs § Keep it true). Every test the spec
// names exists; every member of the seam is in the spec; the seam names no host; every part, tool and theme property it
// should state, it states. What it can't enumerate (whether a sentence is right) is what the named tests are for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SPEC = read('docs/specification/plugin.md');
const LAST = '## What nclite needs';

/** Each interface's members in a TypeScript file. */
function members(rel: string, names: readonly string[]): string[] {
  const file = ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest);
  const found: string[] = [];
  file.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || !names.includes(node.name.text)) return;
    for (const m of node.members) if (m.name && ts.isIdentifier(m.name)) found.push(m.name.text);
  });
  return found;
}

test('every test the spec names exists: "file" and the start of its title', () => {
  const cited = [...SPEC.matchAll(/`([\w./-]+\.(?:spec|test)\.ts)`((?:,? "[^"]+")+)/g)];
  assert.ok(cited.length > 25, `the spec names its tests (${cited.length})`);
  for (const [, file, titles] of cited) {
    const rel = file!.includes('/') ? file! : path.join('tests/plugin', file!);
    const text = read(rel).replace(/\\'/g, "'");
    for (const [, title] of titles!.matchAll(/"([^"]+)"/g)) assert.ok(text.includes(`'${title}`) || text.includes(`"${title}`) || text.includes(`\`${title}`), `${rel} has a test "${title}…"`);
  }
  // A claim's "Proven by the same" or a bare file is a file that exists.
  for (const [, file] of SPEC.matchAll(/`([\w-]+\.spec\.ts)`/g)) assert.ok(fs.existsSync(path.join(ROOT, 'tests/plugin', file!)) || fs.existsSync(path.join(ROOT, 'tests/pages', file!)), `${file} exists`);
});

test('every member of the view seam is in the spec', () => {
  const seam = members('apps/board/src/board/host.ts', ['BoardHost', 'BoardChat', 'ChatStatus', 'BoardView', 'BoardStore', 'BoardSettings', 'ConfirmAsk', 'ConfirmList']);
  assert.ok(seam.length > 20);
  for (const m of seam.filter((x) => x !== 'page')) assert.ok(SPEC.includes(m), `plugin.md names ${m}`);
  const view = read('apps/board/plugin/view.ts');
  for (const m of /Pick<MountedBoard, ([^>]+)>/.exec(view)![1]!.split('|').map((x) => x.trim().replaceAll("'", ''))) assert.ok(SPEC.includes(`\`${m}`), `plugin.md names ${m}`);
  for (const m of [...members('apps/board/plugin/view.ts', ['PluginViewStatus']), 'status']) assert.ok(SPEC.includes(`\`${m}`), `plugin.md names ${m}`);
  for (const m of /PluginStatus = Pick<BoardStatus, ([^>]+)>/.exec(view)![1]!.split('|').map((x) => x.trim().replaceAll("'", ''))) assert.ok(SPEC.includes(m), `plugin.md names status.${m}`);
});

test('every member of the engine seam is in the spec, and every option a host gives', () => {
  const engine = read('apps/board/plugin/engine.ts');
  for (const pattern of [/PluginEngineOptions = Pick<EngineOptions, ([^>]+)>/, /PluginEngine = Pick<Engine, ([^>]+)>/]) {
    for (const m of pattern.exec(engine)![1]!.split('|').map((x) => x.trim().replaceAll("'", ''))) assert.ok(SPEC.includes(m), `plugin.md names ${m}`);
  }
  // The options the seam declares itself, beside the ones it picks (`flags`, `readOnly`).
  const own = /PluginEngineOptions = [^{]*\{([\s\S]*?)\n\};/.exec(engine)![1]!;
  const declared = [...own.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]!);
  assert.deepEqual(declared, ['flags', 'readOnly']);
  for (const m of declared) assert.ok(SPEC.includes(`\`${m}\``), `plugin.md names ${m}`);
});

test('the seam names no host: nclite only in the last section, and that section is last', () => {
  const at = SPEC.indexOf(LAST);
  assert.ok(at > 0);
  assert.doesNotMatch(SPEC.slice(0, at), /nclite/i);
  assert.equal(SPEC.slice(at + LAST.length).includes('\n## '), false);
});

test('the spec states what is standalone-only, and the folder\'s entries do not pass it on', () => {
  const standalone = SPEC.slice(SPEC.indexOf('## Standalone\'s own'), SPEC.indexOf('## Open points'));
  for (const m of ['MountedBoard.board', 'BoardControls', 'BoardHost.page', 'BoardPage', 'BoardPageParts', 'EngineOptions.ledger', 'EngineOptions.onSend', 'Engine.ledger', 'Engine.agents']) assert.ok(standalone.includes(m), m);
  // What createEngine passes in and gives back: the entry reads the ledger's reset for `watch` (§ The engine), and passes on none of it.
  const engine = read('apps/board/plugin/engine.ts');
  const passed = [/createBoardEngine\(\{([^}]*)\}\)/, /\n {2}return \{([^}]*)\};\n\}/].map((r) => r.exec(engine)![1]!);
  assert.deepEqual(passed.map((p) => p.split(',').map((x) => x.trim())), [['dir', 'name', 'warn', 'flags', 'readOnly'], ['route', 'image', 'resolve', 'tools', 'watch']]);
  for (const p of passed) assert.doesNotMatch(p, /onSend|ledger|agents/);
  assert.doesNotMatch(read('apps/board/plugin/view.ts').replace(/^\/\/.*$/gm, ''), /\.board\b|board,/);
});

test('every part of the folder, every plugin tool and those it leaves out, and every theme property are in the spec', () => {
  const parts = /PARTS = (\{[^}]+\})/.exec(read('apps/board/plugin/manifest.ts'))![1]!;
  for (const [, file] of parts.matchAll(/'([^']+)'/g)) assert.ok(SPEC.includes(file!), `plugin.md names ${file}`);
  const api = JSON.parse(read('packages/format/schema/openapi.json')) as { paths: Record<string, Record<string, { operationId?: string; 'x-hosts'?: string[] }>> };
  const ops = Object.values(api.paths).flatMap((p) => Object.values(p)).filter((op) => op['x-hosts']);
  assert.ok(ops.length >= 12);
  for (const op of ops) assert.ok(SPEC.includes(`\`${op.operationId}\``), `plugin.md names ${op.operationId}`);
  for (const [, prop] of read('apps/board/plugin/theme.css').matchAll(/var\((--host-[a-z-]+)/g)) assert.ok(SPEC.includes(prop!), `plugin.md names ${prop}`);
});

test('the manifest\'s fields are in the spec, and it says the two it leaves out', () => {
  const schema = JSON.parse(read('apps/board/plugin/manifest.schema.json')) as { properties: Record<string, unknown> };
  for (const field of Object.keys(schema.properties)) assert.ok(SPEC.includes(`\`${field}\``), `plugin.md names ${field}`);
  assert.equal('settings' in schema.properties || 'icon' in schema.properties, false);
  assert.match(SPEC, /\*\*no `settings` and no `icon`\*\*/);
});

test('the fake host imports nothing of the board but the built folder: no `#` name, and no path out of its own folder', () => {
  const dir = 'tests/plugin/fake-host';
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const text = read(path.join(dir, name)).replace(/^\s*(\/\/|\/\*).*$/gm, '');
    for (const [, from] of text.matchAll(/(?:from|import\()\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.ok(/^(node:|\.\/|\/plugin\/|\/host\/|vite$|svelte(\/compiler)?$)/.test(from!), `${name} imports ${from}`);
    }
  }
});
