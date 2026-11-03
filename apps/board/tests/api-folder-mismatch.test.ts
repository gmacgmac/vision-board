// An agent from another folder is told so (folder-mismatch task, U12, api.md 114-117): a secret
// from a folder opened before gets `wrong-folder` naming both folders, never "join again"; a call
// whose `VB-Project` header names another folder is refused before anything is read or written; a
// subfolder of the open folder matches; no header is not checked; `join` and `list_boards` name
// the open folder; the chat panel's agent still draws after a switch. The home folder is a temp
// folder here: no test reads or writes the real one.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat } from './chat-support.ts';
import { callMcp } from './mcp-call.ts';
import { makeTempDir } from '#format/testing';
import { ledgerFiles, ledgerFolder } from '#format';

const home = fs.realpathSync(makeTempDir('vb-home-'));
const config = makeTempDir('vb-mismatch-cli-');
const fake = fakeChat(config);
const a = path.join(home, 'projects', 'a');
const b = path.join(home, 'projects', 'my b');
const inB = path.join(b, 'docs', 'notes');
const link = path.join(home, 'b-link');
const WRONG = "The board has switched to ~/projects/my b. Your work is in ~/projects/a. Ask the person to open it again; don't join here.";
const JOIN_AGAIN = 'This board now has your folder open (~/projects/my b). Your secret is from ~/projects/a — call join again.';
const REGION = { items: [{ type: 'region', key: 'r-1', region: { id: 'r', title: 'R', mode: 'grid' } }] };
let h: Harness;
let agentA: Joined;

/** A folder with a ledger holding one board the person made. */
function withBoard(dir: string, board: string): void {
  fs.mkdirSync(dir, { recursive: true });
  openLedger(ledgerPath(dir), () => {}).append({ type: 'board', board, title: 'Plans' }, { by: 'person' });
}

before(async () => {
  withBoard(a, 'plans-a');
  withBoard(b, 'plans-b');
  fs.mkdirSync(inB, { recursive: true });
  fs.symlinkSync(b, link);
  h = await startBoard({ home, chat: { adapters: fake.adapters } });
  await h.ok('open_project', { body: { path: a } });
});
after(async () => {
  await h.close();
  for (const d of [home, config]) fs.rmSync(d, { recursive: true, force: true });
});

test('join and list_boards name the open folder', async () => {
  const joined = await h.ok('join', { body: { label: 'Folder A agent' } }, { as: h.agent(undefined, a) });
  assert.equal(joined.project, '~/projects/a');
  agentA = { agent: joined.agent, secret: joined.secret, client: h.agent(joined.secret) };
  const list = await h.ok('list_boards');
  assert.equal(list.project, '~/projects/a');
  assert.deepEqual(list.boards.map((x: { board: string }) => x.board), ['plans-a']);
  await h.ok('write_board', { board: 'plans-a', body: REGION }, { as: h.agent(agentA.secret, a) });
});

test('after a switch, a secret from the folder left gets wrong-folder naming both folders, not "join again"', async () => {
  await h.ok('open_project', { body: { path: b } });
  const before = fs.readFileSync(ledgerPath(b), 'utf8');
  for (const [id, input] of [
    ['write_board', { board: 'plans-b', body: REGION }],
    ['request_grant', { body: { board: 'plans-b', reason: 'x' } }],
    ['list_open', { board: 'plans-b' }],
    ['check_responses', { board: 'plans-b' }],
  ] as const) {
    const refused = await h.fails(id, input, 409, 'wrong-folder', agentA.client);
    assert.equal(refused.detail, WRONG, id);
    assert.doesNotMatch(refused.detail, /join again/i);
    assert.equal(h.last().headers.get('www-authenticate'), null);
  }
  assert.equal(fs.readFileSync(ledgerPath(b), 'utf8'), before, 'nothing was written in the open folder');
});

test('working in the open folder with a secret from a folder joined earlier: told to join again here (field report batch 1, ruling 2)', async () => {
  const before = fs.readFileSync(ledgerPath(b), 'utf8');
  for (const dir of [b, inB]) {
    const refused = await h.fails('write_board', { board: 'plans-b', body: REGION }, 401, 'not-authenticated', h.agent(agentA.secret, dir));
    assert.equal(refused.detail, JOIN_AGAIN, dir);
    assert.match(h.last().headers.get('www-authenticate') ?? '', /^Bearer/);
  }
  assert.equal((await h.fails('list_open', { board: 'plans-b' }, 401, 'not-authenticated', h.agent(agentA.secret, b))).detail, JOIN_AGAIN);
  assert.equal(fs.readFileSync(ledgerPath(b), 'utf8'), before, 'nothing was written');
  const joined = await h.ok('join', { body: { label: 'Folder A agent, here now' } }, { as: h.agent(undefined, b) });
  await h.ok('list_open', { board: 'plans-b' }, { as: h.agent(joined.secret, b) });
});

test('a header naming another folder is refused on reads, join and writes; nothing is read or written', async () => {
  const fromA = h.agent(undefined, a);
  const before = fs.readFileSync(ledgerPath(b), 'utf8');
  const agentsFile = ledgerFiles(ledgerFolder(b)).agents;
  const agentsBefore = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, 'utf8') : '';
  for (const [id, input] of [
    ['list_boards', {}],
    ['get_board', { board: 'plans-b' }],
    ['join', { body: { label: 'Stray agent' } }],
  ] as const) {
    const refused = await h.fails(id, input, 409, 'wrong-folder', fromA);
    assert.equal(refused.detail, WRONG, id);
  }
  // `read_ledger` is the page's (api.md 130): an agent is refused before its folder is looked at.
  await h.fails('read_ledger', {}, 403, 'forbidden', fromA);
  const joinedB = await h.ok('join', { body: { label: 'Folder B agent' } }, { as: h.agent(undefined, b) });
  const refused = await h.fails('write_board', { board: 'plans-b', body: REGION }, 409, 'wrong-folder', h.agent(joinedB.secret, a));
  assert.equal(refused.detail, WRONG, 'the header is checked before the secret');
  assert.equal(fs.readFileSync(ledgerPath(b), 'utf8').split('\n').length, before.split('\n').length + 1, 'only the B agent\'s join was written');
  assert.notEqual(fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, 'utf8') : '', agentsBefore);
});

test('the open folder, a subfolder of it and a link to it match; no header is not checked', async () => {
  for (const dir of [b, inB, link]) {
    const list = await h.ok('list_boards', {}, { as: h.agent(undefined, dir) });
    assert.deepEqual([list.project, list.boards.map((x: { board: string }) => x.board)], ['~/projects/my b', ['plans-b']], dir);
  }
  const joined = await h.ok('join', { body: { label: 'In a subfolder' } }, { as: h.agent(undefined, inB) });
  assert.equal(joined.project, '~/projects/my b');
  await h.ok('write_board', { board: 'plans-b', body: { items: [{ type: 'region', key: 'sub-1', region: { id: 'sub', title: 'Sub', mode: 'grid' } }] } }, { as: h.agent(joined.secret, inB) });
  // Without a header nothing is checked (an agent started outside any project).
  assert.equal((await h.ok('list_boards')).project, '~/projects/my b');
  await h.ok('get_board', { board: 'plans-b' });
});

test('a header that is not an absolute, encoded path is a bad request', async () => {
  for (const value of ['projects/a', '/Users/example/my b']) {
    const res = await fetch(`${h.base}/api/boards`, { headers: { 'VB-Project': value } });
    assert.equal(res.status, 400, value);
    const body = await res.json() as { type: string; detail: string };
    assert.match(body.type, /bad-request$/);
    assert.match(body.detail, /VB-Project/);
  }
});

test('person routes and the page are unaffected by the header', async () => {
  const res = await fetch(`${h.base}/api/project`, { headers: { Cookie: h.cookie, 'VB-Project': encodeURI(a) } });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { name: string }).name, '~/projects/my b');
  const page = await fetch(`${h.base}/api/boards`, { headers: { Cookie: h.cookie } });
  assert.equal(page.status, 200);
});

test('the chat panel\'s agent still draws after a switch: its board MCP names the open folder', async () => {
  const { session } = await h.ok('start_chat', { board: 'plans-b', body: { agent: 'claude' } });
  await h.ok('send_chat', { session, body: { text: 'Draw it.' } });
  const run = await fake.run(1);
  assert.equal(fs.realpathSync(run.cwd), b);
  const vb = run.mcpConfig.mcpServers['vision-board']!;
  assert.equal(vb.env.VB_PROJECT, b, 'the MCP is told the open folder');
  const r = await callMcp(vb, run.cwd, 'write_board', { board: 'plans-b', items: [{ type: 'region', key: 'chat-1', region: { id: 'chat', title: 'Chat', mode: 'grid' } }] });
  assert.equal(r.isError, false, JSON.stringify(r));
  assert.match(fs.readFileSync(ledgerPath(b), 'utf8'), /"chat-1"/);
  // The same MCP started in another folder is refused, with the clear message.
  const stray = await callMcp({ ...vb, env: { ...vb.env, VB_PROJECT: a } }, a, 'list_boards', {});
  assert.equal(stray.isError, true);
  assert.equal(stray.content[0].text, WRONG);
});
