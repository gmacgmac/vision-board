// The folder the board's MCP server works in (folder-mismatch task, ruling 2; api.md 116): VB_PROJECT
// when set, else the nearest folder at or above its working folder with a Vision Board
// (`.visionboard/ledger.jsonl`), else none. It sends that folder as `VB-Project` on every call, and
// sends nothing when there is none. The instructions tell an agent refused with `wrong-folder` to
// stop and tell the person.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectOf as projectIn } from '#client';
import { INSTRUCTIONS, INSTRUCTIONS_JOINED, createMcpServer } from '../src/index.ts';

const projectOf = (env: { VB_PROJECT?: string }, cwd: string) => projectIn(env, cwd, { fs, path });
import { MODERN_META } from './support.ts';

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-mcp-project-')));
const project = path.join(root, 'projects', 'a');
const deep = path.join(project, 'src', 'deep');
const homeLike = path.join(root, 'home');
after(() => fs.rmSync(root, { recursive: true, force: true }));
fs.mkdirSync(path.join(project, '.visionboard'), { recursive: true });
fs.writeFileSync(path.join(project, '.visionboard', 'ledger.jsonl'), '');
fs.mkdirSync(deep, { recursive: true });
// A home folder keeps `.visionboard/recent.json` but has no board: it is not a project.
fs.mkdirSync(path.join(homeLike, '.visionboard', 'x'), { recursive: true });
fs.writeFileSync(path.join(homeLike, '.visionboard', 'recent.json'), '{"folders":[]}\n');

test('VB_PROJECT wins, resolved against the working folder', () => {
  assert.equal(projectOf({ VB_PROJECT: '/elsewhere/b' }, deep), '/elsewhere/b');
  assert.equal(projectOf({ VB_PROJECT: '../..' }, deep), project);
});

test('else the nearest folder at or above the working folder that has a Vision Board', () => {
  assert.equal(projectOf({}, project), project);
  assert.equal(projectOf({}, deep), project);
});

test('else none: a home folder with only recent.json, or no project at all', () => {
  assert.equal(projectOf({}, homeLike), undefined);
  assert.equal(projectOf({}, path.join(homeLike, '.visionboard', 'x')), undefined);
  assert.equal(projectOf({ VB_PROJECT: '' }, root), undefined);
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

test('the folder rides on every call as VB-Project; with none, no header', async () => {
  assert.equal((await headersSent({ project: '/home/example/my b' })).get('VB-Project'), '/home/example/my%20b');
  assert.equal((await headersSent({})).get('VB-Project'), null);
});

test('the instructions: on wrong-folder, stop and tell the person; never join', () => {
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) assert.match(text, /`wrong-folder`.*stop.*tell the person/s);
  assert.match(INSTRUCTIONS, /`wrong-folder`[^.]*do not call `join`/);
});
