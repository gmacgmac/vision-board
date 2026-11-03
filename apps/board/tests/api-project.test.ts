// Opening a folder from the board (open-folder task, U12, api.md 109-112): get_project shows the
// open folder; list_folders lists folders under the home folder only (realpath, no `..` or link
// out, no hidden folder or node_modules, folder names only) with `hasBoard` and the recent list;
// open_project switches in order (lock first, so a conflict or a ledger that can't be read changes
// nothing; then the chats stop, the live streams and held reads end, the old lock goes, the ledger
// and agents swap and recent is kept) or creates a Vision Board. The home folder is a temp folder
// here: no test reads or writes the real one.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { boardList } from '#actions';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { alive, fakeChat, gone } from './chat-support.ts';
import { makeTempDir } from '#format/testing';
import { homeFiles, ledgerFiles, ledgerFolder } from '#format';

const home = fs.realpathSync(makeTempDir('vb-home-'));
const outside = fs.realpathSync(makeTempDir('vb-outside-'));
const config = makeTempDir('vb-project-cli-');
const fake = fakeChat(config);
const projects = path.join(home, 'projects');
const example = path.join(projects, 'example');
const fresh = path.join(projects, 'new-app');
const unreadable = path.join(projects, 'unreadable');
const recentFile = homeFiles(home).recent;
const lockOf = (dir: string) => ledgerFiles(ledgerFolder(dir)).lock;
let h: Harness;
let agent: Joined;

/** A folder with a ledger holding one board the person made. */
function withBoard(dir: string, board: string): void {
  fs.mkdirSync(dir, { recursive: true });
  openLedger(ledgerPath(dir), () => {}).append({ type: 'board', board, title: 'Plans' }, { by: 'person' });
}

before(async () => {
  withBoard(example, 'plans');
  withBoard(unreadable, 'secret-plans');
  fs.chmodSync(ledgerPath(unreadable), 0o000);
  fs.mkdirSync(fresh, { recursive: true });
  for (const d of ['.hidden', 'node_modules', '.config/inner']) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.writeFileSync(path.join(home, 'notes.txt'), 'not a folder\n');
  fs.symlinkSync(outside, path.join(home, 'out'));
  fs.symlinkSync(example, path.join(home, 'shortcut'));
  h = await startBoard({ home, chat: { adapters: fake.adapters } });
  agent = await h.join('Folder test agent');
});
after(async () => {
  await h.close();
  fs.chmodSync(ledgerPath(unreadable), 0o600);
  for (const d of [home, outside, config]) fs.rmSync(d, { recursive: true, force: true });
});

test('get_project: the open folder, its name, found and its boards', async () => {
  const project = fs.realpathSync(h.project);
  assert.deepEqual(await h.ok('get_project'), { path: project, name: project, found: true, boards: boardList(h.ledger.state()).length });
});

test('list_folders: home by default, its folders only; no hidden folder, node_modules, link or file', async () => {
  assert.deepEqual(await h.ok('list_folders'), {
    path: home, name: '~', found: false,
    folders: [{ name: 'projects', path: projects, hasBoard: false }],
    recent: [],
  });
  assert.deepEqual(await h.ok('list_folders', { path: projects }), {
    path: projects, name: '~/projects', found: false, parent: home,
    folders: [
      { name: 'example', path: example, hasBoard: true },
      { name: 'new-app', path: fresh, hasBoard: false },
      { name: 'unreadable', path: unreadable, hasBoard: true },
    ],
    recent: [],
  });
  const found = await h.ok('list_folders', { path: example });
  assert.deepEqual([found.found, found.boards, found.name, found.parent, found.folders], [true, 1, '~/projects/example', projects, []]);
});

test('list_folders and open_project refuse a folder outside home, through a link or `..`, or hidden', async () => {
  for (const p of [outside, '/', path.join(home, 'out'), `${projects}/../..`, path.join(home, '.hidden'), path.join(home, 'node_modules'), path.join(home, '.config/inner')]) {
    const listed = await h.fails('list_folders', { path: p }, 403, 'forbidden');
    assert.match(listed.detail, /home folder/, p);
    await h.fails('open_project', { body: { path: p, create: true } }, 403, 'forbidden');
  }
  assert.equal(fs.existsSync(ledgerFolder(outside)), false, 'nothing was made outside home');
  const homeItself = await h.fails('open_project', { body: { path: home, create: true } }, 403, 'forbidden');
  assert.match(homeItself.detail, /not the home folder itself/);
  assert.equal(fs.existsSync(ledgerPath(home)), false, 'no ledger in the home folder itself');
  await h.fails('list_folders', { path: path.join(home, 'no-such-folder') }, 404, 'not-found');
  await h.fails('list_folders', { path: path.join(home, 'notes.txt') }, 404, 'not-found');
  await h.fails('list_folders', { path: 'projects' }, 400, 'bad-request');
  await h.fails('open_project', { body: { path: 'projects' } }, 422, 'invalid');
  // A link that stays under home leads to its real folder.
  assert.equal((await h.ok('list_folders', { path: path.join(home, 'shortcut') })).path, example);
});

test('the folder routes are the person\'s: an agent is refused', async () => {
  await h.fails('get_project', {}, 403, 'forbidden', agent.client);
  await h.fails('list_folders', {}, 403, 'forbidden', agent.client);
  await h.fails('open_project', { body: { path: example } }, 403, 'forbidden', agent.client);
  await h.fails('get_project', {}, 403, 'forbidden', h.client);
});

let pid = 0;
let session = '';

test('a folder with no Vision Board is not-found without create, and nothing is made', async () => {
  // A chat with its CLI running, so the refusals below can show it was left alone.
  fake.mode('hang');
  session = (await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } })).session;
  await h.ok('send_chat', { session, body: { text: 'Keep going.' } });
  pid = (await fake.run(1)).pid;
  const p = await h.fails('open_project', { body: { path: fresh } }, 404, 'not-found');
  assert.match(p.detail, /create/);
  assert.equal(fs.existsSync(ledgerFolder(fresh)), false);
  await h.fails('open_project', { body: { path: path.join(home, 'no-such-folder'), create: true } }, 404, 'not-found');
  assert.equal((await h.ok('get_project')).path, fs.realpathSync(h.project));
  assert.ok(alive(pid), 'the chat still runs');
});

test('a folder another server holds is a conflict, and nothing changes', async () => {
  const now = new Date().toISOString();
  fs.writeFileSync(lockOf(example), `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4466, started: now, beat: now })}\n`);
  const p = await h.fails('open_project', { body: { path: example } }, 409, 'conflict');
  assert.match(p.detail, /another-computer/);
  assert.equal((await h.ok('get_project')).path, fs.realpathSync(h.project));
  assert.ok(alive(pid), 'the chat still runs');
  assert.ok((await h.ok('list_boards')).boards.some((b: { board: string }) => b.board === 'pricing'));
  fs.rmSync(lockOf(example));
});

test('a ledger that can\'t be read is a conflict: its new lock is let go and nothing changes', async () => {
  await h.fails('open_project', { body: { path: unreadable } }, 409, 'conflict');
  assert.equal(fs.existsSync(lockOf(unreadable)), false, 'the new lock was let go');
  assert.equal((await h.ok('get_project')).path, fs.realpathSync(h.project));
  assert.ok(alive(pid), 'the chat still runs');
});

/** Read a server-sent event stream until the server ends it; true when it did within 5 s. */
async function ended(url: string, headers: Record<string, string> = {}): Promise<() => Promise<boolean>> {
  const stop = new AbortController();
  const res = await fetch(url, { headers, signal: stop.signal });
  assert.equal(res.status, 200);
  const done = res.arrayBuffer().then(() => true, () => false);
  return () => Promise.race([done, new Promise<boolean>((r) => setTimeout(() => { stop.abort(); r(false); }, 5000))]);
}

test('open: the chats stop, the streams and held reads end, the agents and boards are the new folder\'s', async () => {
  const project = await ended(`${h.base}/api/events`);
  const board = await ended(`${h.base}/api/boards/pricing/events`);
  const chat = await ended(`${h.base}/api/chats/${session}/events`, { Cookie: h.cookie });
  const held = h.client.call('check_responses', { board: 'pricing', after: h.ledger.state().seq, wait: 60 });
  await new Promise((r) => setTimeout(r, 50));
  const opened = await h.ok('open_project', { body: { path: example } });
  assert.deepEqual(opened, { path: example, name: '~/projects/example', found: true, boards: 1 });
  await gone(pid);
  assert.deepEqual(await Promise.all([project(), board(), chat()]), [true, true, true], 'every stream ended');
  assert.deepEqual((await held as { responses: unknown[] }).responses, [], 'the held read was answered');
  assert.deepEqual(await h.ok('get_project'), opened);
  assert.deepEqual((await h.ok('list_boards')).boards.map((b: { board: string }) => b.board), ['plans']);
  // Each folder keeps its own agents: the old secret is unknown here, so the agent joins again.
  const refused = await h.fails('write_board', { board: 'plans', body: { items: [{ type: 'region', region: { id: 'r', title: 'R', mode: 'grid' } }] } }, 401, 'not-authenticated', agent.client);
  assert.match(refused.detail, /join again/);
  await h.fails('list_chats', { board: 'pricing' }, 404, 'not-found');
  const lock = JSON.parse(fs.readFileSync(lockOf(example), 'utf8')) as { pid: number };
  assert.equal(lock.pid, process.pid, 'the server holds the new folder\'s lock');
  // The folder left is outside home, so only the new one is recent.
  assert.deepEqual(JSON.parse(fs.readFileSync(recentFile, 'utf8')), { folders: [example] });
  assert.equal(fs.statSync(recentFile).mode & 0o777, 0o600);
  fake.mode('replay');
});

test('create: a folder with no Vision Board gets .visionboard and an empty ledger; the old lock goes', async () => {
  const made = await h.ok('open_project', { body: { path: fresh, create: true } });
  assert.deepEqual(made, { path: fresh, name: '~/projects/new-app', found: true, boards: 0 });
  assert.equal(fs.readFileSync(ledgerPath(fresh), 'utf8'), '');
  assert.match(fs.readFileSync(ledgerFiles(ledgerFolder(fresh)).gitignore, 'utf8'), /^lock$/m);
  assert.equal(fs.existsSync(lockOf(example)), false, 'the old folder\'s lock was let go');
  assert.ok(fs.existsSync(lockOf(fresh)));
  assert.deepEqual((await h.ok('list_boards')).boards, []);
  // Opening the folder already open changes nothing.
  assert.deepEqual(await h.ok('open_project', { body: { path: fresh } }), made);
  const listed = await h.ok('list_folders', { path: projects });
  assert.deepEqual(listed.recent, [
    { name: '~/projects/new-app', path: fresh, hasBoard: true },
    { name: '~/projects/example', path: example, hasBoard: true },
  ]);
  assert.equal(listed.folders.find((f: { name: string }) => f.name === 'new-app').hasBoard, true);
});

test('back again: recent keeps the newest first, and a person act lands in the open folder\'s ledger', async () => {
  await h.ok('open_project', { body: { path: example } });
  assert.deepEqual(JSON.parse(fs.readFileSync(recentFile, 'utf8')), { folders: [example, fresh] });
  assert.equal(fs.existsSync(lockOf(fresh)), false);
  await h.ok('put_board', { board: 'more-plans', body: { title: 'More plans' } });
  assert.match(fs.readFileSync(ledgerPath(example), 'utf8'), /more-plans/);
  assert.doesNotMatch(fs.readFileSync(h.ledger.file, 'utf8'), /more-plans/);
});

test('a chat started now works in the open folder', async () => {
  const { session: started } = await h.ok('start_chat', { board: 'plans', body: { agent: 'claude' } });
  await h.ok('send_chat', { session: started, body: { text: 'Hello.' } });
  assert.equal(fs.realpathSync((await fake.run(2)).cwd), example);
});
