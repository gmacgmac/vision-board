// An app's folder as the app host reads it (app-cards BE_02; D-047 rulings 2, 7, 9, 11): the manifest
// checked against its schema, file names that stay plain names inside the folder (links out
// refused), size limits, the hash of the code, the one state function's order, and the `.env`
// reader that gives a tool only the keys its manifest declares. Each on a temp project.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_LIMITS } from '../../../packages/format/src/index.ts';
import { appHash, appState, parseEnv, readApp, readEnv } from '../server/apps.ts';
import { foreignSchemas } from '../server/schema.ts';

const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-apps-')));
const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-outside-')));
after(() => { for (const d of [project, outside]) fs.rmSync(d, { recursive: true, force: true }); });

const APPS = path.join(project, '.visionboard', 'apps');
/** Write app `id` with this manifest (merged over a valid one) and these files. */
function app(id: string, manifest: Record<string, unknown> = {}, files: Record<string, string> = { 'panel.html': '<p>hi</p>' }): string {
  const dir = path.join(APPS, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ id, title: 'T', version: '1', ...manifest }));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}
const problems = (id: string) => readApp(project, id)!.problems.map((p) => `${p.file} ${p.pointer ?? ''} ${p.detail}`);

test('a good folder: the manifest, the panel and the tools as real paths inside it', () => {
  const dir = app('fine', {}, { 'panel.html': '<p>hi</p>', 'tools.mjs': 'export default { tools: [] };' });
  const f = readApp(project, 'fine')!;
  assert.deepEqual(f.problems, []);
  assert.equal(f.dir, dir);
  assert.equal(f.panel, path.join(dir, 'panel.html'));
  assert.equal(f.tools?.file, path.join(dir, 'tools.mjs'));
  assert.equal(f.manifest?.title, 'T');
});

test('no folder, or an id that is not an id: nothing is read', () => {
  assert.equal(readApp(project, 'none'), undefined);
  for (const id of ['..', '../apps', 'a/b', 'Upper', '%2e%2e', '']) assert.equal(readApp(project, id), undefined, id);
});

test('4h: manifest file names with a folder, `..`, a hidden name or an absolute path are refused', () => {
  for (const [field, name] of [['panel', '../panel.html'], ['panel', 'sub/panel.html'], ['panel', '/etc/panel.html'], ['panel', '.panel.html'],
    ['tools', '..tools.mjs'], ['tools', 'a\\b.mjs'], ['tools', '%2e%2e.mjs'], ['tools', 'tools.js']] as const) {
    app('names', { [field]: name });
    const listed = readApp(project, 'names')!;
    assert.equal(listed.problems.length, 1, `${field}: ${name}`);
    assert.match(problems('names')[0]!, new RegExp(`^app\\.json  ${field} is not a plain file name`), 'the field as a person writes it');
    assert.equal(listed.panel, undefined, 'no file is resolved from a manifest with problems');
    assert.equal(listed.tools, undefined);
  }
});

test('a file or the folder itself linking outside is refused', () => {
  fs.writeFileSync(path.join(outside, 'secret.html'), '<p>secret</p>');
  fs.writeFileSync(path.join(outside, 'tools.mjs'), 'export default { tools: [] };');
  const dir = app('linked', {}, {});
  fs.symlinkSync(path.join(outside, 'secret.html'), path.join(dir, 'panel.html'));
  fs.symlinkSync(path.join(outside, 'tools.mjs'), path.join(dir, 'tools.mjs'));
  assert.deepEqual(problems('linked').map((p) => p.split(' ')[0]).sort(), ['panel.html', 'tools.mjs']);
  assert.match(problems('linked')[0]!, /outside the app's folder/);
  const away = path.join(outside, 'away');
  fs.mkdirSync(away);
  fs.writeFileSync(path.join(away, 'app.json'), JSON.stringify({ id: 'away', title: 'T', version: '1' }));
  fs.symlinkSync(away, path.join(APPS, 'away'));
  assert.match(problems('away').join('\n'), /outside \.visionboard\/apps/);
});

test('what the agent must fix: no manifest, bad JSON, another id, a missing file, a file too large', () => {
  fs.mkdirSync(path.join(APPS, 'empty'), { recursive: true });
  assert.match(problems('empty').join(), /^app\.json  not in the app's folder/);
  const dir = app('json');
  fs.writeFileSync(path.join(dir, 'app.json'), '{ "id": "json", ');
  assert.match(problems('json').join(), /not valid JSON/);
  app('other-id', { id: 'calc' });
  assert.equal(problems('other-id').join(), 'app.json  id is "calc", but the folder is "other-id": make them the same.');
  app('no-panel', {}, {});
  assert.match(problems('no-panel').join(), /^panel\.html  not in the app's folder/);
  app('no-tools', { tools: 'engine.mjs' });
  assert.match(problems('no-tools').join(), /^engine\.mjs  not in the app's folder/);
  assert.equal(readApp(project, 'no-panel')!.tools, undefined, 'no tools named and no tools.mjs: a panel-only app');
  app('huge', {}, { 'panel.html': 'x'.repeat(APP_LIMITS.fileBytes + 1) });
  assert.match(problems('huge').join(), /^panel\.html  over the 1 MB limit/);
});

test('finding 4: a manifest\'s problems name each field as a person writes it, with no code marks and no pointer', () => {
  app('worded', { title: undefined, size: { w: 1200, h: 100 }, env: ['lower'], colour: 'red' });
  assert.deepEqual(problems('worded').sort(), [
    'app.json  env[0] is not a .env key: upper-case letters, digits and _', 'app.json  size.h must be at least 120',
    'app.json  size.w must be at most 960', 'app.json  title is required', 'app.json  unknown field colour',
  ]);
  fs.writeFileSync(path.join(app('whole'), 'app.json'), '[]');
  assert.deepEqual(problems('whole'), ['app.json  it must be an object']);
  app('unnamed', { panel: 'board.html', tools: 'engine.mjs' }, {});
  assert.deepEqual(problems('unnamed'), [
    "board.html  not in the app's folder. Write it there, or fix the panel field in app.json.",
    "engine.mjs  not in the app's folder. Write it there, or fix the tools field in app.json.",
  ]);
  for (const id of ['worded', 'whole', 'unnamed', 'names', 'other-id', 'huge']) {
    for (const p of readApp(project, id)!.problems) {
      assert.equal(p.pointer, undefined, `${id}: ${p.detail}`);
      assert.doesNotMatch(p.detail, /`/, id);
    }
  }
});

test('finding 28: an app.json that is not JSON says so once, near its line, without the parser\'s words', () => {
  const dir = app('half');
  const read = (text: string) => { fs.writeFileSync(path.join(dir, 'app.json'), text); return problems('half'); };
  assert.deepEqual(read('{ "id": "half", "size": { "w": 3'), ['app.json  not valid JSON near line 1']);
  assert.deepEqual(read('{\n  "id": "half"\n  "title": "T"\n}'), ['app.json  not valid JSON near line 3']);
  assert.deepEqual(read(''), ['app.json  not valid JSON'], 'no line: none is given');
  // Some of the parser's messages quote the file (a stray first character): nothing of it reaches
  // the problem, not even a line.
  assert.deepEqual(read('x{ "title": "(line 9 column 2)" }'), ['app.json  not valid JSON']);
});

test('finding 29: each file\'s problem names the file once, as the card puts it first', () => {
  const lines = (id: string) => readApp(project, id)!.problems.map((p) => `${p.file}: ${p.detail}`).sort();
  app('f29-huge', {}, { 'panel.html': 'x'.repeat(APP_LIMITS.fileBytes + 1) });
  fs.mkdirSync(path.join(APPS, 'f29-bare'));
  app('f29-no-panel', {}, {});
  app('f29-unnamed', { panel: 'board.html', tools: 'engine.mjs' }, {});
  const linked = app('f29-linked', {}, {});
  for (const name of ['panel.html', 'tools.mjs']) {
    fs.writeFileSync(path.join(outside, `f29-${name}`), '');
    fs.symlinkSync(path.join(outside, `f29-${name}`), path.join(linked, name));
  }
  fs.mkdirSync(path.join(outside, 'f29-away'));
  fs.writeFileSync(path.join(outside, 'f29-away', 'app.json'), JSON.stringify({ id: 'f29-away', title: 'T', version: '1' }));
  fs.symlinkSync(path.join(outside, 'f29-away'), path.join(APPS, 'f29-away'));
  fs.mkdirSync(path.join(app('f29-a-folder', {}, {}), 'panel.html'));
  assert.deepEqual(['huge', 'bare', 'no-panel', 'unnamed', 'linked', 'away', 'a-folder'].map((id) => lines(`f29-${id}`)), [
    ['panel.html: over the 1 MB limit. Make it smaller.'],
    ["app.json: not in the app's folder. Write it there."],
    ["panel.html: not in the app's folder. Write it there."],
    ["board.html: not in the app's folder. Write it there, or fix the panel field in app.json.",
      "engine.mjs: not in the app's folder. Write it there, or fix the tools field in app.json."],
    ["panel.html: links outside the app's folder. Make it a real file.", "tools.mjs: links outside the app's folder. Make it a real file."],
    ['f29-away/: links outside .visionboard/apps/. Make it a real folder.'],
    ['panel.html: not a file.'],
  ]);
});

test('finding 30: an app.json saved with a byte-order mark reads as it is; the hash is over its bytes, mark and all', () => {
  const dir = app('marked', {}, { 'panel.html': '<p>hi</p>', 'tools.mjs': 'export default { tools: [] };' });
  const file = path.join(dir, 'app.json');
  const mark = () => fs.writeFileSync(file, `﻿${fs.readFileSync(file, 'utf8')}`);
  mark();
  const f = readApp(project, 'marked')!;
  assert.deepEqual([f.problems, f.manifest?.title], [[], 'T']);
  const bytes = fs.readFileSync(file);
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'the board never writes in the folder');
  const want = createHash('sha256').update(bytes).update(fs.readFileSync(path.join(dir, 'tools.mjs'))).digest('hex');
  assert.deepEqual([appState(project, 'marked', want).info.hash, appState(project, 'marked', want).info.state], [want, 'ready']);
  mark();
  assert.deepEqual(problems('marked'), ['app.json  not valid JSON'], 'one leading mark, no more');
});

test('the hash: SHA-256 of app.json then the tools file, as the person allows it', () => {
  const dir = app('hashed', {}, { 'panel.html': '<p>hi</p>', 'tools.mjs': 'export default { tools: [] };' });
  const want = createHash('sha256').update(fs.readFileSync(path.join(dir, 'app.json'))).update(fs.readFileSync(path.join(dir, 'tools.mjs'))).digest('hex');
  const f = readApp(project, 'hashed')!;
  assert.equal(appHash(f.manifestBytes!, f.tools?.bytes), want);
  assert.equal(appState(project, 'hashed', undefined).info.hash, want);
  fs.writeFileSync(path.join(dir, 'panel.html'), '<p>changed</p>');
  assert.equal(appState(project, 'hashed', undefined).info.hash, want, 'the panel is not in the hash');
});

test('the one state function: problems, then approval, then what running it found', () => {
  app('stated', {}, { 'panel.html': '<p>hi</p>', 'tools.mjs': 'export default { tools: [] };' });
  const { hash } = appState(project, 'stated', undefined).info;
  const state = (allowed: string | undefined, run?: Parameters<typeof appState>[3]) => appState(project, 'stated', allowed, run).info;
  assert.deepEqual([state(undefined).state, state(undefined).changed], ['needs-approval', undefined]);
  assert.deepEqual([state('0'.repeat(64)).state, state('0'.repeat(64)).changed], ['needs-approval', true]);
  assert.deepEqual([state(hash).state, state(hash).allowed], ['ready', true]);
  const ran = (facts: object) => (id: string, h: string) => (id === 'stated' && h === hash ? facts : undefined);
  assert.deepEqual(state(hash, ran({ tools: ['a', 'b'] })).tools, ['a', 'b']);
  const loadProblem = { file: 'tools.mjs', detail: 'It did not load.' };
  assert.deepEqual([state(hash, ran({ problems: [loadProblem] })).state, state(hash, ran({ problems: [loadProblem] })).problems], ['invalid', [loadProblem]]);
  assert.equal(state(hash, ran({ broken: loadProblem })).state, 'broken');
  assert.equal(state(undefined, ran({ broken: loadProblem })).state, 'needs-approval', 'approval comes first');
  assert.equal(appState(project, 'gone-away', hash).info.state, 'missing');
  assert.equal(appState(project, 'json', undefined).info.state, 'invalid');
});

test('.env: KEY=value lines, export, quotes and comments; only the declared keys are given', () => {
  assert.deepEqual(parseEnv([
    '# a comment', '', 'PLAIN=one two ', 'export EXPORTED=yes', 'DOUBLE="a \\"b\\" #c\\nd"', "SINGLE='x #y'",
    'INLINE=val # note', 'EMPTY=', 'SPACED = s ', 'not a line', 'lower=ok', 'PLAIN=last wins',
  ].join('\n')), { PLAIN: 'last wins', EXPORTED: 'yes', DOUBLE: 'a "b" #c\nd', SINGLE: 'x #y', INLINE: 'val', EMPTY: '', SPACED: 's', lower: 'ok' });
  fs.writeFileSync(path.join(project, '.env'), 'WANTED=1\nOTHER=2\r\nCRLF=3\r\n');
  assert.deepEqual(readEnv(project, ['WANTED', 'CRLF', 'ABSENT']), { WANTED: '1', CRLF: '3' });
  assert.deepEqual(readEnv(outside, ['WANTED']), {}, 'no .env: nothing');
});

test('a tool\'s schemas are read leniently: unknown words ignored, $schema not read, $ref only inside', () => {
  const compile = foreignSchemas();
  const check = compile({
    $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', 'x-note': 'mine',
    properties: { n: { type: 'number', format: 'my-format' }, m: { $ref: '#/$defs/small' } }, $defs: { small: { maximum: 3 } },
  });
  assert.deepEqual(check({ n: 1, m: 2 }), []);
  assert.deepEqual(check({ n: 'one', m: 9 }).map((p) => p.pointer).sort(), ['/m', '/n']);
  assert.throws(() => compile({ type: 'object', properties: { n: { $ref: 'https://example.com/elsewhere.json' } } }), /resolve/);
  const twice = { $id: 'https://example.com/same.json', type: 'object' };
  assert.doesNotThrow(() => { compile(twice); compile({ ...twice }); }, 'one app\'s ids never clash with each other or the board\'s');
});
