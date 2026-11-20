// The system's folder chooser and the trust rule (D-110, api.md 208-211): `choose_folder` opens the chooser (a stand-in
// runner here: no test opens the real one) and answers the pick as list_folders heads one; a pick may be home or in
// it, a drive or share, or /Users/Shared, never hidden, a folder holding home, another person's home or a system folder
// (D-111; `invalid`: `forbidden` is for a caller who may not call it). `open_project` opens a folder outside home only
// when the server vouches for that very path: its chooser returned it this run, or its own recent list holds it. The
// same path sent without the chooser is refused as before. One chooser at a time; the caller going away closes it. The
// places are temp folders standing in for them (`places`: `<root>/Users/example` is home, `<root>/Volumes` the drives,
// `<root>/Users/Shared`): no test reads or writes the real ones.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { ChooserRun } from '../server/chooser.ts';
import { macChooser } from '../server/chooser.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { OLD_LAYOUT } from './test-board.ts';
import { makeTempDir } from '#format/testing';
import { homeFiles, ledgerFolder } from '#format';

const root = fs.realpathSync(makeTempDir('vb-chooser-'));
const users = path.join(root, 'Users');
const home = path.join(users, 'example');
const shared = path.join(users, 'Shared');
const volumes = path.join(root, 'Volumes');
const drive = path.join(volumes, 'Example-Drive');
const places = { volumes, shared, users };
const picked = path.join(drive, 'projects', 'example');
const typed = path.join(drive, 'projects', 'never-picked');
const hidden = path.join(drive, '.hidden', 'project');
const fresh = path.join(drive, 'new-app');
const link = path.join(drive, 'link-to-example');
const deps = path.join(home, 'projects', 'node_modules', 'kept');
/** What the stand-in chooser answers next, and the start folder and signal it was given. */
let next: () => Promise<string | undefined> = async () => undefined;
const asked: { start: string; prompt: string; signal: AbortSignal }[] = [];
const run: ChooserRun = (o) => { asked.push(o); return next(); };
const pick = (p: string | undefined) => { next = async () => p; };
let h: Harness;

/** A folder with a ledger holding one board the person made. */
function withBoard(dir: string, board: string): void {
  fs.mkdirSync(dir, { recursive: true });
  openLedger(ledgerPath(dir), () => {}).append({ type: 'board', board, title: 'Plans' }, { by: 'person' });
}

before(async () => {
  fs.mkdirSync(home, { recursive: true });
  withBoard(picked, 'drive-plans');
  withBoard(typed, 'other-plans');
  withBoard(hidden, 'hidden-plans');
  fs.mkdirSync(fresh, { recursive: true });
  fs.mkdirSync(deps, { recursive: true });
  fs.symlinkSync(picked, link);
  h = await startBoard({ home, flags: OLD_LAYOUT, chooser: run, places });
});
after(async () => {
  await h.close();
  fs.rmSync(root, { recursive: true, force: true });
});

test('list_folders says the chooser is offered; a server without one says nothing and refuses choose_folder', async () => {
  assert.equal((await h.ok('list_folders')).chooser, true);
  const none = await startBoard({ home, flags: OLD_LAYOUT });
  try {
    assert.equal((await none.ok('list_folders')).chooser, undefined);
    await none.fails('choose_folder', {}, 404, 'not-found');
  } finally { await none.close(); }
  const off = await startBoard({ home, flags: { ...OLD_LAYOUT, systemFolderChooser: false }, chooser: run });
  try {
    assert.equal((await off.ok('list_folders')).chooser, undefined);
    await off.fails('choose_folder', {}, 404, 'not-found');
  } finally { await off.close(); }
});

test('only the person: an agent or no caller is refused before the chooser opens', async () => {
  const agent = await h.join('Chooser test agent');
  const before = asked.length;
  await h.fails('choose_folder', {}, 403, 'forbidden', agent.client);
  await h.fails('choose_folder', {}, 403, 'forbidden', h.client);
  assert.equal(asked.length, before);
});

test('the same path outside home, typed, is refused until the chooser returns it', async () => {
  await h.fails('open_project', { body: { path: picked } }, 403, 'forbidden');
  pick(`${picked}/`); // osascript ends a folder's POSIX path with a slash
  const answer = await h.ok('choose_folder');
  assert.deepEqual(answer, { path: picked, name: picked, found: true, boards: 1 });
  assert.equal(asked.at(-1)!.start, fs.realpathSync(h.project), 'it starts in the open folder');
  assert.match(asked.at(-1)!.prompt, /\S/);
  await h.fails('open_project', { body: { path: typed } }, 403, 'forbidden'); // never picked
  await h.fails('open_project', { body: { path: link } }, 403, 'forbidden'); // a link to it is not the path returned
  const opened = await h.ok('open_project', { body: { path: picked } });
  assert.deepEqual([opened.path, opened.name, opened.found], [picked, picked, true]);
});

test('an opened folder outside home joins Recent, by its absolute path, and stays trusted from there', async () => {
  assert.equal(JSON.parse(fs.readFileSync(homeFiles(home).recent, 'utf8')).folders[0], picked);
  const listed = await h.ok('list_folders');
  assert.deepEqual(listed.recent[0], { name: picked, path: picked, hasBoard: true });
  // A new run with the same home (this one moves on first, letting go of the lock): never picked there, but its own
  // recent list holds it.
  const mine = path.join(home, 'projects', 'mine');
  withBoard(mine, 'my-plans');
  await h.ok('open_project', { body: { path: mine } });
  const again = await startBoard({ home, flags: OLD_LAYOUT, places });
  try {
    await again.fails('open_project', { body: { path: typed } }, 403, 'forbidden');
    assert.equal((await again.ok('open_project', { body: { path: picked } })).path, picked);
  } finally { await again.close(); }
});

test('a hidden pick is refused with words, and stays refused for open_project', async () => {
  pick(hidden);
  const p = await h.fails('choose_folder', {}, 422, 'invalid');
  assert.match(p.detail, /hidden/);
  assert.match(p.detail, /starts with a dot/);
  await h.fails('open_project', { body: { path: hidden } }, 403, 'forbidden');
});

test('a pick with a line break in its path is refused with words: no answer or request could carry it', async () => {
  const odd = path.join(drive, 'line\nbreak');
  fs.mkdirSync(odd);
  pick(odd);
  const p = await h.fails('choose_folder', {}, 422, 'invalid');
  assert.match(p.detail, /control character/);
});

test('D-111: a folder holding home, another person\'s home, a system folder or the drives folder itself is refused, saying why', async () => {
  const other = path.join(users, 'someone', 'projects');
  const system = path.join(root, 'Library', 'Example');
  for (const d of [other, system]) withBoard(d, 'not-here');
  const refused: [string, RegExp][] = [
    [root, /holds your home folder/], [users, /holds your home folder/], [path.join(users, 'someone'), /another person's home/],
    [other, /another person's home/], [system, /system folder/], [volumes, /system folder/],
  ];
  for (const [dir, why] of refused) {
    pick(dir);
    const p = await h.fails('choose_folder', {}, 422, 'invalid');
    assert.match(p.detail, why, dir);
    assert.match(p.detail, /\/Volumes.*\/Users\/Shared/, 'and where a project may be');
    await h.fails('open_project', { body: { path: dir } }, 403, 'forbidden');
  }
  assert.equal(fs.existsSync(ledgerFolder(root)), false, 'nothing was made');
});

test('D-111: the home folder itself, and a folder in /Users/Shared, may be picked and opened', async () => {
  const team = path.join(shared, 'team-plans');
  withBoard(team, 'team');
  pick(home);
  assert.deepEqual(await h.ok('choose_folder'), { path: home, name: '~', found: false });
  assert.equal((await h.ok('open_project', { body: { path: home, create: true } })).name, '~');
  await h.fails('open_project', { body: { path: team } }, 403, 'forbidden'); // outside home: picked first
  pick(team);
  assert.equal((await h.ok('choose_folder')).found, true);
  assert.equal((await h.ok('open_project', { body: { path: team } })).path, team);
});

test('a pick without a board is created there; one under home in node_modules opens (only hidden is refused)', async () => {
  pick(fresh);
  assert.deepEqual(await h.ok('choose_folder'), { path: fresh, name: fresh, found: false });
  await h.fails('open_project', { body: { path: fresh } }, 404, 'not-found');
  assert.equal((await h.ok('open_project', { body: { path: fresh, create: true } })).found, true);
  await h.fails('open_project', { body: { path: deps, create: true } }, 403, 'forbidden'); // typed: under home's rule
  pick(deps);
  assert.equal((await h.ok('choose_folder')).name, '~/projects/node_modules/kept');
  assert.equal((await h.ok('open_project', { body: { path: deps, create: true } })).path, deps);
});

test('cancelled: nothing changes', async () => {
  const open = (await h.ok('get_project')).path;
  pick(undefined);
  assert.deepEqual(await h.ok('choose_folder'), { cancelled: true });
  assert.equal((await h.ok('get_project')).path, open);
});

test('one at a time: a second call while it is open is a conflict; the first still answers', async () => {
  let answer!: (p: string | undefined) => void;
  next = () => new Promise((resolve) => { answer = resolve; });
  const first = h.person.call('choose_folder');
  await waitFor(() => answer !== undefined);
  await h.fails('choose_folder', {}, 409, 'conflict');
  answer(picked);
  assert.equal(((await first) as { path: string }).path, picked);
});

test('the caller going away closes the chooser (its signal aborts); the next one opens', async () => {
  let signal: AbortSignal | undefined;
  next = () => new Promise((resolve) => {
    signal = asked.at(-1)!.signal;
    signal.addEventListener('abort', () => resolve(undefined), { once: true });
  });
  const gone = new AbortController();
  const call = h.person.call('choose_folder', {}, { signal: gone.signal }).catch(() => 'aborted');
  await waitFor(() => signal !== undefined);
  gone.abort();
  assert.equal(await call, 'aborted');
  await waitFor(() => signal!.aborted);
  pick(undefined);
  assert.deepEqual(await h.ok('choose_folder'), { cancelled: true });
});

test('a chooser that could not open is a conflict in words; nothing is trusted', async () => {
  next = async () => { throw new Error('execution error: example'); };
  const p = await h.fails('choose_folder', {}, 409, 'conflict');
  assert.match(p.detail, /could not open/);
});

async function waitFor(ok: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(ok(), 'timed out');
}

test('the real chooser: its script compiles (osacompile, never run), and an aborted call spawns nothing and is cancelled', { skip: process.platform !== 'darwin' && 'macOS only' }, async () => {
  const script = fileURLToPath(new URL('../server/choose-folder.applescript', import.meta.url));
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chooser-script-')), 'choose-folder.scpt');
  const r = spawnSync('/usr/bin/osacompile', ['-o', out, script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
  const gone = new AbortController();
  gone.abort();
  assert.equal(await macChooser({ prompt: 'Example', start: home, signal: gone.signal }), undefined);
});
