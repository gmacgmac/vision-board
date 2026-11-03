// Ledgers on the server (LEDGERS_01, D-084), with the `ledgerFolders` flag on: a project holds one folder
// per ledger in `.visionboard/`; get_project names the open ledger and lists them with their boards;
// open_project opens, switches and creates ledgers (kept out of git on request), refuses a bad name at its
// pointer, and moves an old-layout folder into `main/` first; the lock is the ledger folder's; list_boards
// and join answer `ledger`; the repo-wide chat files stay at `.visionboard/`. The home folder is a temp
// folder: no test reads or writes the real one. The move itself, byte for byte: ledger-move.test.ts.
// verify: data-folder-literal the `.gitignore` lines a ledger folder holds, read from outside
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { homeFiles, ledgerFiles, ledgerFolder, projectFiles } from '#format';
import { makeTempDir } from '#format/testing';
import { openPermissions } from '../server/chat-permissions.ts';
import { openLedger } from '../server/ledger.ts';
import { startTestBoard } from './test-board.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat } from './chat-support.ts';

const FLAGS = { ledgerFolders: true };
const home = fs.realpathSync(makeTempDir('vb-home-'));
const config = makeTempDir('vb-ledgers-cli-');
const fake = fakeChat(config);
const projects = path.join(home, 'projects');
const multi = path.join(projects, 'multi');
const legacy = path.join(projects, 'legacy');
const other = path.join(projects, 'other');
const lockOf = (dir: string, ledger?: string) => ledgerFiles(ledgerFolder(dir, ledger)).lock;
const fileOf = (dir: string, ledger?: string) => ledgerFiles(ledgerFolder(dir, ledger)).ledger;
let h: Harness;

/** Ledger `ledger` of `dir` (none: the old layout's), holding one board per id the person made. */
function withLedger(dir: string, ledger: string | undefined, boards: string[]): void {
  fs.mkdirSync(ledgerFolder(dir, ledger), { recursive: true });
  const l = openLedger(fileOf(dir, ledger), () => {});
  fs.writeFileSync(l.file, '', { flag: 'a' });
  for (const board of boards) l.append({ type: 'board', board, title: `Board ${board}` }, { by: 'person' });
}

/** Read a server-sent event stream until the server ends it; true when it did within 5 s. */
async function ended(url: string): Promise<() => Promise<boolean>> {
  const stop = new AbortController();
  const res = await fetch(url, { signal: stop.signal });
  assert.equal(res.status, 200);
  const done = res.arrayBuffer().then(() => true, () => false);
  return () => Promise.race([done, new Promise<boolean>((r) => setTimeout(() => { stop.abort(); r(false); }, 5000))]);
}

before(async () => {
  withLedger(multi, 'main', ['plans', 'later']);
  withLedger(multi, 'ui', ['screens']);
  withLedger(multi, 'scratch', []);
  fs.writeFileSync(ledgerFiles(ledgerFolder(multi, 'scratch')).gitignore, '*\n');
  fs.mkdirSync(path.join(projectFiles(multi).root, 'not-a-ledger'), { recursive: true });
  withLedger(legacy, undefined, ['old-plans']);
  withLedger(other, 'main', ['elsewhere']);
  h = await startBoard({ home, flags: FLAGS, chat: { adapters: fake.adapters } });
});
after(async () => {
  await h.close();
  for (const d of [home, config]) fs.rmSync(d, { recursive: true, force: true });
});

test('open a new-layout folder: main by default; get_project lists every ledger with its boards, the open one by name', async () => {
  const opened = await h.ok('open_project', { body: { path: multi } });
  const want = {
    path: multi, name: '~/projects/multi', found: true, boards: 2, ledger: 'main',
    ledgers: [
      { name: 'main', boards: 2, keptOutOfGit: false },
      { name: 'scratch', boards: 0, keptOutOfGit: true },
      { name: 'ui', boards: 1, keptOutOfGit: false },
    ],
  };
  assert.deepEqual(opened, want, 'a folder that is not a ledger (no ledger file) is not listed');
  assert.deepEqual(await h.ok('get_project'), want);
  assert.equal(JSON.parse(fs.readFileSync(lockOf(multi, 'main'), 'utf8')).pid, process.pid, 'the ledger folder\'s lock');
  assert.equal(fs.existsSync(lockOf(multi)), false, 'no lock at .visionboard/ itself');
  const listed = await h.ok('list_folders', { path: projects });
  assert.deepEqual(listed.folders.map((f: { name: string; hasBoard: boolean }) => [f.name, f.hasBoard]), [['legacy', true], ['multi', true], ['other', true]]);
  assert.equal((await h.ok('list_folders', { path: multi })).boards, 2, 'a folder\'s boards are its open ledger\'s');
});

test('list_boards and join answer the ledger beside the project', async () => {
  const boards = await h.ok('list_boards');
  assert.deepEqual([boards.project, boards.ledger, boards.boards.map((b: { board: string }) => b.board)], ['~/projects/multi', 'main', ['plans', 'later']]);
  const joined = await h.join('Ledger test agent');
  const answer = h.last().body as { project: string; ledger: string };
  assert.deepEqual([answer.project, answer.ledger], ['~/projects/multi', 'main']);
  assert.ok(fs.readFileSync(ledgerFiles(ledgerFolder(multi, 'main')).agents, 'utf8').includes('sha256'), 'the agent is the ledger\'s');
  assert.equal(fs.existsSync(ledgerFiles(ledgerFolder(multi)).agents), false);
  assert.match(fs.readFileSync(ledgerFiles(ledgerFolder(multi, 'main')).gitignore, 'utf8'), /^agents\.json$/m);
  assert.ok(joined.secret);
});

test('switch to another ledger of the folder: the old ledger\'s streams end, its lock goes, the boards are the new one\'s', async () => {
  const project = await ended(`${h.base}/api/events`);
  const board = await ended(`${h.base}/api/boards/plans/events`);
  const opened = await h.ok('open_project', { body: { path: multi, ledger: 'ui' } });
  assert.deepEqual([opened.ledger, opened.boards], ['ui', 1]);
  assert.deepEqual(await Promise.all([project(), board()]), [true, true], 'every stream of the old ledger ended');
  const boards = await h.ok('list_boards');
  assert.deepEqual([boards.ledger, boards.boards.map((b: { board: string }) => b.board)], ['ui', ['screens']]);
  assert.equal(fs.existsSync(lockOf(multi, 'main')), false, 'main\'s lock was let go');
  assert.equal(JSON.parse(fs.readFileSync(lockOf(multi, 'ui'), 'utf8')).pid, process.pid);
  assert.deepEqual(await h.ok('open_project', { body: { path: multi, ledger: 'ui' } }), opened, 'the ledger already open: unchanged');
  assert.deepEqual(JSON.parse(fs.readFileSync(homeFiles(home).recent, 'utf8')).ledgers, { [multi]: 'ui' }, 'the folder\'s last ledger is kept');
});

test('the last ledger: a folder opened without naming one opens the ledger open there last', async () => {
  assert.equal((await h.ok('open_project', { body: { path: other } })).ledger, 'main');
  assert.equal((await h.ok('open_project', { body: { path: multi } })).ledger, 'ui');
  const recent = JSON.parse(fs.readFileSync(homeFiles(home).recent, 'utf8'));
  assert.deepEqual(recent, { folders: [multi, other], ledgers: { [multi]: 'ui', [other]: 'main' } });
});

test('create a ledger: its folder, an empty ledger and its own .gitignore; kept out of git, a .gitignore of *', async () => {
  const made = await h.ok('open_project', { body: { path: multi, ledger: 'plan-x', create: true, keepOutOfGit: true } });
  assert.deepEqual([made.ledger, made.boards], ['plan-x', 0]);
  assert.deepEqual(made.ledgers.find((l: { name: string }) => l.name === 'plan-x'), { name: 'plan-x', boards: 0, keptOutOfGit: true });
  assert.equal(fs.readFileSync(fileOf(multi, 'plan-x'), 'utf8'), '');
  assert.equal(fs.readFileSync(ledgerFiles(ledgerFolder(multi, 'plan-x')).gitignore, 'utf8'), '*\n', 'the lock adds nothing after *');
  const kept = await h.ok('open_project', { body: { path: multi, ledger: 'design', create: true } });
  assert.equal(kept.ledgers.find((l: { name: string }) => l.name === 'design').keptOutOfGit, false);
  assert.equal(fs.readFileSync(ledgerFiles(ledgerFolder(multi, 'design')).gitignore, 'utf8'), 'agents.json\nlock\napp-state/\n');
  await h.ok('put_board', { board: 'design-board', body: { title: 'Design' } });
  assert.match(fs.readFileSync(fileOf(multi, 'design'), 'utf8'), /design-board/, 'a person act lands in the open ledger');
  assert.doesNotMatch(fs.readFileSync(fileOf(multi, 'main'), 'utf8'), /design-board/);
  const again = await h.ok('open_project', { body: { path: multi, ledger: 'plan-x', create: true } });
  assert.equal(again.ledgers.find((l: { name: string }) => l.name === 'plan-x').keptOutOfGit, true, 'create on a ledger that is there changes nothing');
});

test('a bad ledger name is invalid at /ledger, in plain words; a ledger that is not there is not-found; nothing is made', async () => {
  const before = fs.readdirSync(projectFiles(multi).root).sort();
  const odd = await h.fails('open_project', { body: { path: multi, ledger: 'Bad Name', create: true } }, 422, 'invalid');
  assert.deepEqual(odd.errors?.map((e) => e.pointer), ['/ledger']);
  assert.match(odd.errors![0]!.detail, /is not a ledger name: lowercase letters, digits and hyphens, up to 40/);
  await h.fails('open_project', { body: { path: multi, ledger: 'x'.repeat(41), create: true } }, 422, 'invalid');
  for (const taken of ['images', 'apps', 'app-state', 'attachments', 'lock']) {
    const p = await h.fails('open_project', { body: { path: multi, ledger: taken, create: true } }, 422, 'invalid');
    assert.deepEqual(p.errors, [{ pointer: '/ledger', detail: `"${taken}" is the name of a file or folder the board keeps; choose another name for the ledger.` }]);
  }
  const missing = await h.fails('open_project', { body: { path: multi, ledger: 'nope' } }, 404, 'not-found');
  assert.match(missing.detail, /has no ledger "nope"\. Send create: true/);
  assert.deepEqual(fs.readdirSync(projectFiles(multi).root).sort(), before, 'nothing was made');
  assert.equal((await h.ok('get_project')).ledger, 'plan-x', 'the open ledger is unchanged');
});

test('the lock is the ledger folder\'s: a second server holds another ledger of the folder, never the same one', async () => {
  await h.ok('open_project', { body: { path: multi, ledger: 'ui' } });
  const h2 = await startBoard({ home, flags: FLAGS });
  try {
    assert.equal((await h2.ok('open_project', { body: { path: multi, ledger: 'main' } })).ledger, 'main');
    const p = await h2.fails('open_project', { body: { path: multi, ledger: 'ui' } }, 409, 'conflict');
    assert.match(p.detail, /Another board server holds this ledger/);
    assert.equal((await h2.ok('get_project')).ledger, 'main', 'nothing changed on the refused server');
    await h.fails('open_project', { body: { path: multi, ledger: 'main' } }, 409, 'conflict');
    assert.equal((await h.ok('get_project')).ledger, 'ui');
  } finally { await h2.close(); }
  assert.equal(fs.existsSync(lockOf(multi, 'main')), false, 'the second server let go of main when it closed');
});

test('the repo-wide files stay at .visionboard/: a chat session, an attachment and a permission land there, not in the ledger folder', async () => {
  const inLedger = (name: string) => fs.existsSync(path.join(ledgerFolder(multi, 'ui'), name));
  const repo = projectFiles(multi);
  await h.ok('start_chat', { board: 'screens', body: { agent: 'claude' } });
  assert.ok(fs.existsSync(repo.chatSessions));
  const { file } = await h.ok('attach_chat_file', { body: { name: 'notes.txt', type: 'text/plain', data: Buffer.from('hello').toString('base64') } });
  assert.match(file.path, /^\.visionboard\/attachments\//, 'the path the agent is told');
  assert.ok(fs.existsSync(path.join(multi, file.path)));
  openPermissions(repo.root, multi).add({ kind: 'command', head: 'npm test' });
  const { permissions } = await h.ok('list_permissions', {});
  assert.deepEqual(permissions.map((p: { command: string }) => p.command), ['npm test'], 'read from .visionboard/permissions.json');
  await h.ok('forget_permission', { body: { id: permissions[0].id } });
  assert.deepEqual(JSON.parse(fs.readFileSync(repo.permissions, 'utf8')), { permissions: [] }, 'written there');
  for (const name of ['chat-sessions.json', 'attachments', 'permissions.json']) assert.equal(inLedger(name), false, name);
  assert.match(fs.readFileSync(repo.gitignore, 'utf8'), /^chat-sessions\.json$/m, 'the repo-wide .gitignore names them');
});

test('an old-layout folder moves into main/ when opened, then opens on main; repo-wide files stay', async () => {
  const root = ledgerFolder(legacy);
  fs.mkdirSync(path.join(ledgerFiles(root).images), { recursive: true });
  fs.writeFileSync(path.join(ledgerFiles(root).images, 'a.png'), 'png bytes');
  fs.writeFileSync(projectFiles(legacy).chatSessions, '{"sessions":[]}\n');
  fs.writeFileSync(ledgerFiles(root).gitignore, 'agents.json\nlock\nchat-sessions.json\n');
  const ledgerBytes = fs.readFileSync(fileOf(legacy));
  const opened = await h.ok('open_project', { body: { path: legacy } });
  assert.deepEqual([opened.ledger, opened.boards, opened.ledgers], ['main', 1, [{ name: 'main', boards: 1, keptOutOfGit: false }]]);
  assert.deepEqual(fs.readFileSync(fileOf(legacy, 'main')), ledgerBytes, 'the ledger moved, unchanged');
  assert.equal(fs.existsSync(fileOf(legacy)), false);
  assert.equal(fs.readFileSync(path.join(ledgerFiles(ledgerFolder(legacy, 'main')).images, 'a.png'), 'utf8'), 'png bytes');
  assert.ok(fs.existsSync(projectFiles(legacy).chatSessions), 'repo-wide: not moved');
  assert.equal(fs.readFileSync(projectFiles(legacy).gitignore, 'utf8'), 'chat-sessions.json\n');
  assert.equal(fs.readFileSync(ledgerFiles(ledgerFolder(legacy, 'main')).gitignore, 'utf8'), 'agents.json\nlock\n');
  assert.equal(fs.existsSync(lockOf(legacy)), false, 'the old folder\'s lock was let go');
  assert.equal(JSON.parse(fs.readFileSync(lockOf(legacy, 'main'), 'utf8')).pid, process.pid, 'main\'s is held');
  assert.deepEqual((await h.ok('list_boards')).boards.map((b: { board: string }) => b.board), ['old-plans']);
});

test('an old-layout folder another server holds is not moved: a conflict, and nothing changes', async () => {
  const held = path.join(projects, 'held');
  withLedger(held, undefined, ['kept']);
  const now = new Date().toISOString();
  fs.writeFileSync(lockOf(held), `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4466, started: now, beat: now })}\n`);
  const p = await h.fails('open_project', { body: { path: held } }, 409, 'conflict');
  assert.match(p.detail, /another-computer/);
  assert.ok(fs.existsSync(fileOf(held)), 'still in the old layout');
  assert.equal(fs.existsSync(ledgerFolder(held, 'main')), false);
  assert.equal((await h.ok('get_project')).path, legacy);
});

test('the folder open now, still in the old layout, moves when a ledger of it is opened; the board follows', async () => {
  const open = path.join(projects, 'open-old');
  withLedger(open, undefined, ['first']);
  const board = await startTestBoard({ project: open, home, flags: FLAGS, ledger: openLedger(fileOf(open), () => {}) });
  try {
    const cookie = (await fetch(`${board.base}/`)).headers.get('set-cookie')!.split(';')[0]!;
    const call = (method: string, body?: unknown) => fetch(`${board.base}/api/project`, {
      method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }),
    }).then((r) => r.json() as Promise<Record<string, unknown>>);
    assert.equal('ledger' in await call('GET'), false, 'the old layout names no ledger');
    const made = await call('POST', { path: open, ledger: 'ui', create: true });
    assert.deepEqual([made.ledger, (made.ledgers as { name: string }[]).map((l) => l.name)], ['ui', ['main', 'ui']]);
    assert.equal(fs.existsSync(fileOf(open)), false, 'moved into main/');
    assert.match(fs.readFileSync(fileOf(open, 'main'), 'utf8'), /"first"/);
    assert.equal(fs.existsSync(lockOf(open, 'main')), false, 'main\'s lock taken by the move, then let go for ui\'s');
    assert.equal(JSON.parse(fs.readFileSync(lockOf(open, 'ui'), 'utf8')).pid, process.pid);
  } finally { await board.close(); }
});

test('ledgerFolders off: no ledger in the answers, `ledger` is ignored, the old layout opens in place', async () => {
  const off = await startBoard({ home, flags: { ledgerFolders: false } });
  try {
    const plain = path.join(projects, 'plain');
    withLedger(plain, undefined, ['one']);
    const opened = await off.ok('open_project', { body: { path: plain, ledger: 'ui' } });
    assert.deepEqual(opened, { path: plain, name: '~/projects/plain', found: true, boards: 1 });
    assert.equal(fs.existsSync(ledgerFolder(plain, 'main')), false, 'nothing moved');
    const boards = await off.ok('list_boards');
    assert.equal('ledger' in boards, false);
    assert.equal('ledger' in (await off.ok('join', { body: { label: 'off' } })), false);
  } finally { await off.close(); }
});

test('ledgerFolders off: a folder already in ledger folders is refused, naming the flag, and nothing is written beside main/ (FIX_01 F5)', async () => {
  const off = await startBoard({ home, flags: { ledgerFolders: false } });
  try {
    for (const create of [false, true]) {
      const p = await off.fails('open_project', { body: { path: multi, create } }, 409, 'conflict');
      assert.match(p.detail, /ledgerFolders/);
    }
    assert.equal(fs.existsSync(fileOf(multi)), false, 'no second ledger in the old place');
    assert.equal(fs.existsSync(lockOf(multi)), false);
    assert.notEqual((await off.ok('get_project')).path, multi, 'the open folder is unchanged');
  } finally { await off.close(); }
});
