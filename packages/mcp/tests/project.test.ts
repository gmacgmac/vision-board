// The folder the board's MCP server works in (folder-mismatch task, ruling 2; api.md 116; D-111): VB_PROJECT
// when set, else its working folder, exactly. Nothing searches upward for a board: an agent started in a folder inside
// the project names that folder (the board accepts its open folder or one inside it), and one started outside names
// where it is (the board answers `wrong-folder`). It sends that folder as `VB-Project` on every call. The instructions
// tell an agent refused with `wrong-folder` to stop and tell the person.
// verify: data-folder-literal the folder on disk as an agent's working folder finds it, built from outside
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgersIn, projectOf as projectIn } from '#client';
import { INSTRUCTIONS, INSTRUCTIONS_JOINED, createMcpServer } from '../src/index.ts';

const projectOf = (env: { VB_PROJECT?: string }, cwd: string) => projectIn(env, cwd, { fs, path });
import { MODERN_META } from './support.ts';
import { makeTempDir } from '#format/testing';

const root = fs.realpathSync(makeTempDir('vb-mcp-project-'));
const project = path.join(root, 'projects', 'a');
const deep = path.join(project, 'src', 'deep');
const ledgers = path.join(root, 'projects', 'n');
const inLedgers = path.join(ledgers, 'src');
const homeLike = path.join(root, 'home');
const notLedgers = path.join(root, 'projects', 'not');
after(() => fs.rmSync(root, { recursive: true, force: true }));
fs.mkdirSync(path.join(project, '.visionboard'), { recursive: true });
fs.writeFileSync(path.join(project, '.visionboard', 'ledger.jsonl'), '');
fs.mkdirSync(deep, { recursive: true });
// Ledger folders (D-084): a project whose only ledger is `.visionboard/ui/ledger.jsonl`.
fs.mkdirSync(path.join(ledgers, '.visionboard', 'ui'), { recursive: true });
fs.writeFileSync(path.join(ledgers, '.visionboard', 'ui', 'ledger.jsonl'), '');
fs.mkdirSync(inLedgers, { recursive: true });
// A home folder keeps `.visionboard/recent.json` but has no board.
fs.mkdirSync(path.join(homeLike, '.visionboard', 'x'), { recursive: true });
fs.writeFileSync(path.join(homeLike, '.visionboard', 'recent.json'), '{"folders":[]}\n');
// Not a ledger: a data-folder name, a name that is not a ledger name, a ledger "file" that is a folder.
for (const name of ['images', 'Bad Name']) {
  fs.mkdirSync(path.join(notLedgers, '.visionboard', name), { recursive: true });
  fs.writeFileSync(path.join(notLedgers, '.visionboard', name, 'ledger.jsonl'), '');
}
fs.mkdirSync(path.join(notLedgers, '.visionboard', 'main', 'ledger.jsonl'), { recursive: true });

test('VB_PROJECT wins, resolved against the working folder', () => {
  assert.equal(projectOf({ VB_PROJECT: '/elsewhere/b' }, deep), '/elsewhere/b');
  assert.equal(projectOf({ VB_PROJECT: '../..' }, deep), project);
});

test('else the working folder itself: no walk up to a folder with a Vision Board (D-111)', () => {
  assert.equal(projectOf({}, project), project);
  assert.equal(projectOf({}, deep), deep, 'inside the project: that folder, which the board accepts as inside its open one');
  assert.equal(projectOf({}, inLedgers), inLedgers);
  assert.equal(projectOf({}, path.join(ledgers, '.visionboard', 'ui')), path.join(ledgers, '.visionboard', 'ui'));
  assert.equal(projectOf({}, root), root, 'no project here: still where it was started, so the board answers wrong-folder');
  assert.equal(projectOf({ VB_PROJECT: '' }, root), root, 'an empty VB_PROJECT is not set');
});

test('started in a filesystem root (Claude Desktop does) with no VB_PROJECT: no folder, so no header; VB_PROJECT still wins', () => {
  assert.equal(projectOf({}, '/'), undefined);
  assert.equal(projectOf({ VB_PROJECT: '' }, '/'), undefined, 'an empty VB_PROJECT is not set');
  assert.equal(projectOf({ VB_PROJECT: project }, '/'), project);
  assert.equal(projectOf({ VB_PROJECT: 'projects/a' }, '/'), '/projects/a', 'resolved against the root');
  assert.equal(projectOf({}, '/home'), '/home', 'one level down is a folder like any other');
  const win = (env: { VB_PROJECT?: string }, cwd: string) => projectIn(env, cwd, { fs, path: path.win32 });
  assert.equal(win({}, 'C:\\'), undefined, 'a drive root');
  assert.equal(win({ VB_PROJECT: 'D:\\work\\a' }, 'C:\\'), 'D:\\work\\a');
  assert.equal(win({}, 'C:\\work'), 'C:\\work');
});

test('ledgersIn, the one rule for a folder\'s ledgers: either layout; none in a home with only recent.json, or in a folder that is no ledger', () => {
  const found = (dir: string) => ledgersIn(dir, { fs });
  assert.deepEqual(found(project), { old: true, ledgers: [] });
  assert.deepEqual(found(ledgers), { old: false, ledgers: ['ui'] });
  assert.deepEqual(found(homeLike), { old: false, ledgers: [] });
  assert.deepEqual(found(notLedgers), { old: false, ledgers: [] }, 'a data-folder name, a bad name, no ledger file');
});

/** The headers of the one request a `list_boards` call makes through a server with these options. */
async function headersSent(opts: { project?: string }): Promise<Headers> {
  let sent: Headers | undefined;
  const fetch = (async (_url: string, init?: RequestInit) => {
    sent = new Headers(init?.headers);
    return new Response(JSON.stringify({ project: '~', boards: [], head: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof globalThis.fetch;
  const server = createMcpServer({ base: 'http://127.0.0.1:1', fetch, ...opts });
  const r = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_boards', arguments: {}, _meta: MODERN_META } });
  assert.equal((r as any).result.isError, false);
  return sent ?? assert.fail('no request was made');
}

test('the folder rides on every call as VB-Project; a server given none (a host\'s own) sends no header', async () => {
  assert.equal((await headersSent({ project: '/home/example/my b' })).get('VB-Project'), '/home/example/my%20b');
  assert.equal((await headersSent({})).get('VB-Project'), null);
});

test('the instructions: on wrong-folder, stop and tell the person; never join', () => {
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) assert.match(text, /`wrong-folder`.*stop.*tell the person/s);
  assert.match(INSTRUCTIONS, /`wrong-folder`[^.]*do not call `join`/);
});
