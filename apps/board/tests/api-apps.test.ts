// The app host through the real server, on a temp project (app-cards BE_02; D-047 rulings 6-9, 11,
// 12; PLAN.md § Goal state 4c-4i): list_apps gives every state, and a broken app.json's good size
// (FIX_03); a tool runs only once the person allowed this version of the code, and asks again after a
// change; a tool that loops is stopped and the next call works; a crash restarts, and three in the
// window break the app until its code changes; the process can't write, start processes or workers,
// or read outside its folder, and may import nothing but Node's built-ins; its env holds only the
// declared keys; answers over the cap, and arguments or answers that don't fit the tool's schemas,
// are refused. Test apps: tests/fixtures/apps/. Limits are shortened for time; their real values are
// APP_LIMITS.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { APP_SIZE } from '../../../packages/format/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { AGENT, startBoard } from './api-harness.ts';
import { addApp, allow, apps, gone, raw, refused, run, touch } from './app-support.ts';

let h: Harness;
let A: Joined;
const dirs: Record<string, string> = {};
/** The runner's words for an import of anything but a built-in (finding 29: they name no file). */
const IMPORT_ONLY = (what: string) => `Import only Node's built-in modules, such as node:fs, not "${what}". Put that code in this file, so the version the person allows covers all of it.`;
/** The words for a panel field that is not a file name in the app's folder (finding 35). */
const PANEL_NAME = 'panel must be a file name ending in .html, directly in the app\'s folder';
const IDS = ['good', 'panel-only', 'invalid-manifest', 'loop', 'crash', 'fs-write', 'big-output', 'bad-input', 'slow-load', 'imports', 'bad-tool'];

before(async () => {
  process.env.VB_TEST_BOARD_ONLY = 'the board\'s own environment';
  h = await startBoard({ appLimits: { callMs: 1500, restartMs: 10 } });
  A = await h.join('Apps chat');
  fs.writeFileSync(path.join(h.project, '.env'), '# keys for the apps\nexport GOOD_KEY="from .env"\nOTHER_KEY=not for apps\n');
  for (const id of IDS) dirs[id] = addApp(h.project, id);
  fs.mkdirSync(path.join(h.project, '.visionboard', 'apps', 'Not_An_Id'));
  // An app card whose app has no folder: `missing`.
  h.ledger.append({ type: 'node', board: 'pricing', node: { region: 'options', kind: 'app', title: 'Ghost', app: { id: 'ghost' } } }, AGENT);
});
after(async () => {
  await h.close();
  delete process.env.VB_TEST_BOARD_ONLY;
});

test('list_apps: every folder and every app a card names, each in its state; agent and person read it', async () => {
  const all = await apps(h);
  assert.deepEqual([...all.keys()], [...IDS, 'ghost'].sort(), 'by id; a folder whose name is not an id is not an app');
  assert.deepEqual(all.get('ghost'), { id: 'ghost', state: 'missing', tools: [], allowed: false });
  const good = all.get('good')!;
  assert.equal(good.state, 'needs-approval');
  assert.match(good.hash!, /^[0-9a-f]{64}$/);
  assert.deepEqual([good.title, good.version, good.size, good.allowed, good.changed], ['Good', '1.0.0', { w: 400, h: 300 }, false, undefined]);
  assert.deepEqual(good.tools, [], 'tool names are known once the person allowed the code and it ran');
  const panel = all.get('panel-only')!;
  assert.deepEqual([panel.state, panel.tools, panel.size], ['ready', [], { w: 360, h: 320 }], 'a panel-only app needs no approval');
  const bad = all.get('invalid-manifest')!;
  assert.equal(bad.state, 'invalid');
  assert.deepEqual(bad.problems!.map((p) => [p.file, p.pointer, p.detail]).sort(), [
    ['app.json', undefined, PANEL_NAME], ['app.json', undefined, 'unknown field colour'],
  ], 'finding 4: the field as a person writes it, no code marks, no pointer');
  assert.deepEqual(await h.ok('list_apps', {}, { as: A.client }), await h.ok('list_apps', {}, { as: h.person }));
});

test('list_apps: an agent working in another folder is refused, like every agent read', async () => {
  const other = fs.mkdtempSync(path.join(path.dirname(h.project), 'vb-other-'));
  try {
    await h.fails('list_apps', {}, 409, 'wrong-folder', h.agent(A.secret, other));
  } finally { fs.rmSync(other, { recursive: true, force: true }); }
});

test('finding 25: list_apps gives the size of an app.json with other problems while its size is good, so a card with no size keeps it', async () => {
  const write = (id: string, json: unknown): string => {
    const dir = path.join(h.project, '.visionboard', 'apps', id);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'app.json'), typeof json === 'string' ? json : JSON.stringify({ id, title: 'T', version: '1', ...json as object }));
    fs.writeFileSync(path.join(dir, 'panel.html'), '<p>hi</p>');
    return dir;
  };
  const size = { w: 300, h: 200 };
  const made = {
    typo: write('sized-typo', { size, colour: 'red' }),
    'other-id': write('sized-other-id', { size, id: 'not-this-folder' }),
    'no-size': write('unsized-typo', { colour: 'red' }),
    'size-too-big': write('size-too-big', { size: { w: 2000, h: 200 } }),
    'size-extra': write('size-extra', { size: { ...size, d: 1 } }),
    'not-json': write('not-json', '{ "id": "not-json", "size": { "w": 300'),
    'not-an-object': write('not-an-object', '[]'),
  };
  try {
    const all = await apps(h);
    const seen = Object.entries(made).map(([what, dir]) => [what, all.get(path.basename(dir))?.state, all.get(path.basename(dir))?.size]);
    assert.deepEqual(seen, [
      ['typo', 'invalid', size], ['other-id', 'invalid', size], ['no-size', 'invalid', { w: APP_SIZE.w.default, h: APP_SIZE.h.default }],
      ['size-too-big', 'invalid', undefined], ['size-extra', 'invalid', undefined], ['not-json', 'invalid', undefined], ['not-an-object', 'invalid', undefined],
    ], 'the manifest\'s size, else the default, unless the size itself is wrong or app.json can\'t be read');
  } finally {
    for (const dir of Object.values(made)) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('4c: no tool runs before Allow; after a change to tools.mjs or app.json it asks again', async () => {
  const first = await refused(h, 'good', 'add', 403, 'needs-approval', { a: 1, b: 2 });
  assert.match(first.detail, /Allow/);
  const hash = await allow(h, 'good');
  const ran = await run<{ sum: number; pid: number }>(h, 'good', 'add', { a: 2, b: 3 });
  assert.equal(ran.structuredContent!.sum, 5);
  assert.deepEqual(JSON.parse(ran.content[0]!.text), ran.structuredContent);
  const now = (await apps(h)).get('good')!;
  assert.deepEqual([now.state, now.allowed, now.hash, now.tools], ['ready', true, hash, ['add', 'env', 'hello', 'refuse']]);
  touch(path.join(dirs.good!, 'tools.mjs'));
  const changed = (await apps(h)).get('good')!;
  assert.deepEqual([changed.state, changed.allowed, changed.changed], ['needs-approval', false, true]);
  assert.notEqual(changed.hash, hash);
  await gone(ran.structuredContent!.pid);
  const again = await refused(h, 'good', 'add', 403, 'needs-approval', { a: 1, b: 1 });
  assert.match(again.detail, /changed/);
  await allow(h, 'good');
  assert.equal((await run<{ sum: number }>(h, 'good', 'add', { a: 1, b: 1 })).structuredContent!.sum, 2);
  const manifest = path.join(dirs.good!, 'app.json');
  fs.writeFileSync(manifest, fs.readFileSync(manifest, 'utf8').replace('"1.0.0"', '"1.0.1"'));
  await refused(h, 'good', 'add', 403, 'needs-approval', { a: 1, b: 1 });
  await allow(h, 'good');
});

test('a tool\'s answer: an object, text, or its own error for the panel to show', async () => {
  const hello = await run(h, 'good', 'hello');
  assert.deepEqual(hello, { content: [{ type: 'text', text: 'Hello.' }], isError: false });
  const no = await run(h, 'good', 'refuse');
  assert.deepEqual(no, { content: [{ type: 'text', text: 'That sum has no answer.' }], isError: true });
});

test('4g: the tool\'s env holds only the declared keys from the project\'s .env; its folder is its cwd', async () => {
  const seen = (await run<{ env: Record<string, string>; keys: string[]; cwd: string }>(h, 'good', 'env')).structuredContent!;
  assert.deepEqual(seen.env, { GOOD_KEY: 'from .env' }, 'declared and set; GOOD_UNSET is declared but not in .env');
  // macOS adds its text-encoding key to every process it starts; nothing else may be there.
  assert.deepEqual(seen.keys.filter((k) => k !== '__CF_USER_TEXT_ENCODING'), ['GOOD_KEY']);
  assert.equal(seen.cwd, fs.realpathSync(dirs.good!));
});

test('4i: arguments that don\'t fit inputSchema, an unknown tool, an answer over the cap or off its outputSchema are refused', async () => {
  await allow(h, 'bad-input');
  assert.equal((await run<{ value: number }>(h, 'bad-input', 'square', { n: 4 })).structuredContent!.value, 16);
  const type = await refused(h, 'bad-input', 'square', 422, 'invalid', { n: 'four' });
  assert.deepEqual(type.errors?.map((e) => e.pointer), ['/arguments/n']);
  const extra = await refused(h, 'bad-input', 'square', 422, 'invalid', { n: 2, m: 3 });
  assert.deepEqual(extra.errors?.map((e) => e.pointer), ['/arguments/m']);
  await refused(h, 'bad-input', 'square', 422, 'invalid', { n: 5000 });
  const unknown = await refused(h, 'bad-input', 'cube', 422, 'invalid', { n: 2 });
  assert.match(unknown.detail, /square, wrong, number/);
  const off = await refused(h, 'bad-input', 'wrong', 502, 'app-failed');
  assert.match(off.detail, /outputSchema/);
  await refused(h, 'bad-input', 'number', 502, 'app-failed');
  await refused(h, 'panel-only', 'anything', 422, 'invalid');
  await allow(h, 'big-output');
  const big = await refused(h, 'big-output', 'big', 413, 'too-large');
  assert.equal(big.detail, 'The tool "big" of the app "big-output" answered more than 256 KB. Answer less.', 'finding 7: KB, not KiB');
  assert.deepEqual((await run(h, 'big-output', 'small')).structuredContent, { text: 'x' }, 'the app still answers');
});

test('4d: a tool that never returns is stopped at the time limit; the next call works; the board answers meanwhile', async () => {
  await allow(h, 'loop');
  const { pid } = (await run<{ pid: number }>(h, 'loop', 'quick')).structuredContent!;
  const spinning = refused(h, 'loop', 'spin', 504, 'app-timeout');
  const started = Date.now();
  await h.ok('list_boards');
  assert.ok(Date.now() - started < 500, 'other routes answer while the app loops');
  const stopped = await spinning;
  assert.match(stopped.detail, /took too long/);
  await gone(pid);
  const next = (await run<{ pid: number }>(h, 'loop', 'quick')).structuredContent!;
  assert.notEqual(next.pid, pid, 'a new process');
});

test('4e: a crash restarts on the next call; three in the window mark the app broken until its code changes', async () => {
  await allow(h, 'crash');
  const one = (await run<{ pid: number }>(h, 'crash', 'ok')).structuredContent!.pid;
  const crashed = await refused(h, 'crash', 'boom', 502, 'app-failed');
  assert.match(crashed.detail, /stopped while it ran "boom"/);
  const two = (await run<{ pid: number }>(h, 'crash', 'ok')).structuredContent!.pid;
  assert.notEqual(two, one);
  await refused(h, 'crash', 'boom', 502, 'app-failed');
  assert.equal((await apps(h)).get('crash')!.state, 'ready', 'two crashes: not yet broken');
  await refused(h, 'crash', 'boom', 502, 'app-failed');
  const broken = (await apps(h)).get('crash')!;
  assert.equal(broken.state, 'broken');
  assert.match(broken.problems![0]!.detail, /3 times/);
  assert.match(broken.problems![0]!.detail, /stopping on purpose/, 'what it said last, for the agent to fix');
  const still = await refused(h, 'crash', 'ok', 502, 'app-failed');
  assert.match(still.detail, /crashed too often/);
  touch(path.join(dirs.crash!, 'tools.mjs'));
  assert.equal((await apps(h)).get('crash')!.state, 'needs-approval', 'new code: no longer broken, and asks again');
  await allow(h, 'crash');
  assert.ok((await run<{ pid: number }>(h, 'crash', 'ok')).structuredContent!.pid);
});

test('4f: the tool can read its own folder, and nothing else; writing a file, a process or a worker is refused', async () => {
  await allow(h, 'fs-write');
  const code = async (tool: string, args = {}) => (await run<{ code: string }>(h, 'fs-write', tool, args)).structuredContent!.code;
  assert.equal(await code('write'), 'ERR_ACCESS_DENIED');
  assert.equal(fs.existsSync(path.join(dirs['fs-write']!, 'written.txt')), false, 'nothing was written');
  assert.equal(await code('spawn'), 'ERR_ACCESS_DENIED');
  assert.equal(await code('worker'), 'ERR_ACCESS_DENIED');
  assert.equal(await code('outside', { path: h.ledger.file }), 'ERR_ACCESS_DENIED', 'not even the board\'s ledger beside it');
  assert.equal(await code('outside', { path: path.join(h.project, '.env') }), 'ERR_ACCESS_DENIED');
  assert.match((await run<{ text: string }>(h, 'fs-write', 'inside')).structuredContent!.text, /helper/);
});

test('one file: a tools module that imports another file is invalid; an import inside a tool is refused', async () => {
  await allow(h, 'imports');
  const refusedImport = await refused(h, 'imports', 'one', 422, 'app-invalid');
  assert.match(refusedImport.detail, /only Node's built-in modules/);
  const listed = (await apps(h)).get('imports')!;
  assert.equal(listed.state, 'invalid');
  assert.deepEqual(listed.problems, [{ file: 'tools.mjs', detail: IMPORT_ONLY('./helper.mjs') }], 'finding 29: the file named once');
  const late = await run(h, 'fs-write', 'sneak');
  assert.equal(late.isError, true);
  assert.equal(late.content[0]!.text, IMPORT_ONLY('./helper.mjs'), 'the same words, alone, as the tool\'s error');
});

test('finding 29: a tools module that doesn\'t load or doesn\'t fit says why without naming its file again', async () => {
  const go = 'run: () => 1';
  const made: Record<string, [code: string, detail: string]> = {
    'unfit-export': ['export default {};', 'must export default { tools: [...] }.'],
    'unfit-object': ['export default { tools: [1] };', 'Tool number 1 is not an object.'],
    'unfit-run': ['export default { tools: [{ name: "a" }] };', 'Tool "a" has no run function.'],
    'unfit-twice': [`export default { tools: [{ name: "a", ${go} }, { name: "a", ${go} }] };`, 'has two tools named "a".'],
    'unfit-syntax': ['export default {', 'could not load: Unexpected end of input'],
  };
  const dirOf = (id: string) => path.join(h.project, '.visionboard', 'apps', id);
  for (const [id, [code]] of Object.entries(made)) {
    fs.mkdirSync(dirOf(id));
    fs.writeFileSync(path.join(dirOf(id), 'app.json'), JSON.stringify({ id, title: 'T', version: '1' }));
    fs.writeFileSync(path.join(dirOf(id), 'panel.html'), '<p>hi</p>');
    fs.writeFileSync(path.join(dirOf(id), 'tools.mjs'), code);
  }
  try {
    const said: string[] = [];
    for (const id of Object.keys(made)) {
      await allow(h, id);
      said.push((await refused(h, id, 'a', 422, 'app-invalid')).detail);
    }
    assert.equal(said[0], 'The app "unfit-export" has problems in its files: tools.mjs: must export default { tools: [...] }. Fix them and try again.');
    const all = await apps(h);
    assert.deepEqual(Object.keys(made).map((id) => all.get(id)!.problems), Object.values(made).map(([, detail]) => [{ file: 'tools.mjs', detail }]));
  } finally {
    for (const id of Object.keys(made)) fs.rmSync(dirOf(id), { recursive: true, force: true });
  }
});

test('finding 4: a tools module whose tools don\'t fit is invalid, its problems in plain words', async () => {
  await allow(h, 'bad-tool');
  await refused(h, 'bad-tool', 'one', 422, 'app-invalid');
  const listed = (await apps(h)).get('bad-tool')!;
  assert.equal(listed.state, 'invalid');
  assert.deepEqual(listed.problems, [
    { file: 'tools.mjs', detail: 'Tool "one": description is required.' }, { file: 'tools.mjs', detail: 'Tool "two": inputSchema must be an object.' },
  ]);
});

test('a tools module that never finishes loading is invalid until its code changes', async () => {
  await allow(h, 'slow-load');
  const slow = await refused(h, 'slow-load', 'anything', 422, 'app-invalid');
  assert.match(slow.detail, /did not finish loading/);
  const listed = (await apps(h)).get('slow-load')!;
  assert.equal(listed.state, 'invalid');
  assert.deepEqual(listed.problems, [{ file: 'tools.mjs', detail: 'did not finish loading within 1.5 s. Make its top-level code quicker.' }], 'finding 29: the file named once');
});

test('4h: an app id with upper case, a slash or dots never reaches a path', async () => {
  await h.fails('call_app_tool', { app: 'Good', body: { tool: 'add' } }, 400, 'bad-request');
  for (const bad of ['..%2Fgood', 'good%2F..', '%2E%2Egood', 'go%00od']) {
    const r = await raw(h.base, `/api/apps/${bad}/calls`, { method: 'POST', headers: { Cookie: h.cookie, 'Content-Type': 'application/json' }, body: '{"tool":"add"}' });
    assert.equal(r.status, 400, bad);
  }
  const dots = await raw(h.base, '/api/apps/%2e%2e/calls', { method: 'POST', headers: { Cookie: h.cookie, 'Content-Type': 'application/json' }, body: '{"tool":"add"}' });
  assert.equal(dots.status, 404, '`%2e%2e` resolves away: no operation has the path');
  await h.fails('call_app_tool', { app: 'nope', body: { tool: 'add' } }, 404, 'app-not-found');
  await h.fails('call_app_tool', { app: 'ghost', body: { tool: 'add' } }, 404, 'app-not-found');
  await h.fails('call_app_tool', { app: 'invalid-manifest', body: { tool: 'add' } }, 422, 'app-invalid');
});

test('finding 33: a call to an app with problems gives each as its own sentence, so one with no full stop never runs into the next', async () => {
  const called = await refused(h, 'invalid-manifest', 'add', 422, 'app-invalid');
  assert.equal(called.detail, `The app "invalid-manifest" has problems in its files: app.json: ${PANEL_NAME}. app.json: unknown field colour. Fix them and try again.`);
});
