// The plugin folder (BUILD_01; bin/build-plugin.ts): `npm run build:plugin` writes exactly the files a host takes, the
// same bytes every time, with nothing in them a host must satisfy or that names the machine that made them. The
// engine runs from a copy of the folder with Node's permission model allowing it one file to read. Sizes are
// budgets: a bundle that grows past one fails here, so the growth is a decision.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseAst } from 'vite';
import { makeTempDir } from '#format/testing';
import { buildPlugin } from '../bin/build-plugin.ts';
import { pluginTypes } from '../bin/plugin-types.ts';
import { SEAM } from '../plugin/seam.ts';

const FILES = ['engine/engine.js', 'manifest.json', 'plugin.d.ts', 'skill.md', 'view/board.css', 'view/board.js', 'words.json'];
const TOOLS = ['list_boards', 'get_board', 'show_node', 'show_container', 'show_layout', 'list_open', 'check_responses', 'request_grant', 'write_board'];
/** Gzip budgets in bytes, a little over the size at the time (BUILD_01: view 164030, styles 18799, engine 210716). */
const BUDGET: Record<string, number> = { 'view/board.js': 190_000, 'view/board.css': 22_000, 'engine/engine.js': 240_000 };
const dirs: string[] = [];
const temp = () => { const d = makeTempDir('vb-plugin-'); dirs.push(d); return d; };
const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file));
const text = (dir: string, file: string) => read(dir, file).toString('utf8');
const filesOf = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/')).sort();
let first = '';
let second = '';

before(async () => {
  first = path.join(temp(), 'board');
  second = path.join(temp(), 'board');
  await buildPlugin({ out: first });
  await buildPlugin({ out: second });
});
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

test('a clean build writes exactly the folder: manifest, view and styles, engine, words, skill and types', () => {
  assert.deepEqual(filesOf(first), FILES);
});

test('the same input gives the same bytes', () => {
  assert.deepEqual(filesOf(second), FILES);
  for (const f of FILES) assert.ok(read(first, f).equals(read(second, f)), `${f} differs between two builds`);
});

test('the manifest fits its schema and every file and words key it names exists', () => {
  const manifest = JSON.parse(text(first, 'manifest.json'));
  const schema = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../plugin/manifest.schema.json'), 'utf8'));
  const check = new Ajv2020({ strict: true, allErrors: true });
  const fits = (value: object): boolean => check.validate(schema, value);
  assert.ok(fits(manifest), check.errorsText(check.errors));
  assert.equal(manifest.id, 'board');
  assert.equal(manifest.seam, SEAM);
  assert.equal(text(first, 'plugin.d.ts'), pluginTypes(), 'the types are the code\'s own');
  const words = JSON.parse(text(first, 'words.json')) as Record<string, string>;
  for (const f of [manifest.view.module, ...manifest.view.styles, manifest.engine.module, manifest.skill, manifest.words]) assert.ok(FILES.includes(f), `${f} is in the folder`);
  const keys = [manifest.name, ...manifest.chips.map((c: { words: string }) => c.words), ...manifest.tools.map((t: { words: string }) => t.words)];
  for (const k of keys) assert.equal(typeof words[k], 'string', `words.json has ${k}`);
  assert.ok(Object.keys(words).every((k) => /^board\.[a-z0-9-]+\.[A-Za-z0-9_.]+$/.test(k)), 'keys are board.<area>.<name>');
  assert.equal(fits({ ...manifest, engine: undefined }), false, 'a manifest without its engine is refused');
  assert.equal(fits({ ...manifest, seam: undefined }), false, 'a manifest without its seam version is refused');
  assert.equal(fits({ ...manifest, seam: 0 }), false, 'a seam version below 1 is refused');
  assert.equal(fits({ ...manifest, view: { ...manifest.view, module: '/etc/passwd' } }), false, 'a path that leaves the folder is refused');
});

/** The engine from a copy of the folder, away from the repository, with Node's permission model letting it read its one file and use its data folder. */
function runEngine(engine: string, dir: string): any {
  const code = `
    const { createEngine } = await import(${JSON.stringify(pathToFileURL(engine).href)});
    const e = createEngine({ dir: ${JSON.stringify(dir)}, warn: () => {} });
    const joined = await e.route({ method: 'POST', path: 'agents', body: { label: 'Build test' } });
    const caller = { by: 'agent', agent: joined.body.agent };
    const items = [{ type: 'board', title: 'Plans' }, { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } }, { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' } }];
    const wrote = await e.tools.call('write_board', { board: 'plans', items }, { caller });
    const boards = await e.route({ method: 'GET', path: 'boards' });
    const bad = await e.tools.call('write_board', { board: 'plans' }, { caller });
    console.log(JSON.stringify({ tools: e.tools.list(), wrote: wrote.isError, change: wrote._meta, boards: boards.body.boards.map((b) => b.board), bad: bad.isError, image: e.image({ method: 'GET', path: 'none.png' }).status, exports: Object.keys(await import(${JSON.stringify(pathToFileURL(engine).href)})) }));`;
  const out = execFileSync(process.execPath, ['--permission', `--allow-fs-read=${engine}`, `--allow-fs-read=${dir}`, `--allow-fs-write=${dir}`, '--input-type=module', '-e', code], { encoding: 'utf8', cwd: dir, timeout: 60_000 });
  return JSON.parse(out);
}

test('the engine runs from the folder alone: it reads only its own file and its data folder, and gives the manifest\'s tools in the words.json words', () => {
  const place = fs.realpathSync(temp());
  const copy = path.join(place, 'engine.js');
  fs.copyFileSync(path.join(first, 'engine/engine.js'), copy);
  const data = path.join(place, 'data');
  fs.mkdirSync(data);
  const ran = runEngine(copy, data);
  const manifest = JSON.parse(text(first, 'manifest.json'));
  const words = JSON.parse(text(first, 'words.json')) as Record<string, string>;
  assert.deepEqual(ran.exports, ['createEngine']);
  assert.deepEqual(ran.tools.map((t: { name: string }) => t.name), TOOLS);
  assert.deepEqual(ran.tools.map((t: { name: string }) => t.name), manifest.tools.map((t: { name: string }) => t.name), 'a host that checks the engine against the manifest finds no difference');
  for (const [i, t] of ran.tools.entries()) {
    assert.equal(words[manifest.tools[i].words], t.description, `${t.name}: words.json says what the engine says`);
    assert.deepEqual(manifest.tools[i].input, t.inputSchema, `${t.name}: the manifest's input is the engine's`);
  }
  assert.deepEqual([ran.wrote, ran.bad, ran.image, ran.boards], [false, true, 404, ['plans']]);
  assert.deepEqual(ran.change['vb/change'].board, 'plans');
});

/** What a bundle loads: the module of every static import or re-export, and of every dynamic `import()`. */
function loads(code: string): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; source?: { value?: unknown } };
    if (n.type && /^(?:ImportDeclaration|ExportAllDeclaration|ExportNamedDeclaration|ImportExpression)$/.test(n.type) && typeof n.source?.value === 'string') out.push(n.source.value);
    else if (n.type === 'ImportExpression' || n.type === 'ImportDeclaration') out.push('(computed)');
    Object.values(node).forEach(walk);
  };
  walk(parseAst(code));
  return out;
}

test('the engine bundle imports only Node\'s own modules and knows no path of its own', () => {
  const code = text(first, 'engine/engine.js');
  const specs = loads(code);
  assert.ok(specs.length > 0, 'the engine does import Node\'s modules');
  assert.deepEqual(specs.filter((s) => !s.startsWith('node:')), [], 'nothing a host would have to provide');
  assert.ok(!code.includes('import.meta'), 'it does not look beside itself');
  assert.ok(!/ClaudeStream|KiroTurn/.test(code), 'the agent adapters are not in it');
});

test('the view bundle is one file with no import, exporting only mount, and one stylesheet that loads nothing', () => {
  const code = text(first, 'view/board.js');
  assert.deepEqual(loads(code), [], 'it loads nothing by path');
  assert.equal((code.match(/\bexport\s*[{*]|\bexport\s+(?:default|const|function|class)\b/g) ?? []).length, 1);
  assert.match(code.trimEnd(), /export\s*\{\s*\w+\s+as\s+mount\s*\};?$/);
  const css = text(first, 'view/board.css');
  assert.ok(!/@import/.test(css) && !/url\((?!["']?data:)/.test(css), 'no other file, no address');
  assert.ok(!/sourceMappingURL/.test(code + css), 'no sourcemap for a host to serve');
});

test('nothing in the folder names the machine that built it, the person, or the host it is meant for', () => {
  const mine = [ROOT_DIR, os.homedir(), fs.realpathSync(os.tmpdir()), os.tmpdir(), path.dirname(first)].filter((p) => p.length > 5);
  for (const f of FILES) {
    const code = text(first, f);
    for (const p of mine) assert.ok(!code.includes(p), `${f} holds ${p}`);
    assert.ok(!/nclite/i.test(code), `${f} names a host`);
  }
  assert.ok(!FILES.some((f) => /nclite/i.test(f)));
});

test('the bundles stay inside their budgets (gzip)', (t) => {
  for (const [file, limit] of Object.entries(BUDGET)) {
    const size = gzipSync(read(first, file)).length;
    t.diagnostic(`${file}: ${read(first, file).length} bytes, ${size} gzip (budget ${limit})`);
    assert.ok(size <= limit, `${file} is ${size} gzip, over its budget of ${limit}: raise the budget only as a decision`);
  }
});

const ROOT_DIR = path.resolve(import.meta.dirname, '../../..');
