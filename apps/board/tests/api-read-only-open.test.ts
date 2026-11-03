// Opening read-only (D-085 1, 2; READONLY_01 step 5): with `readOnlyStart` on and no `edit`, the server opens with no
// lock and a switch opens the next folder read-only, taking no lock and writing nothing there, the lock it held let go.
// Edit takes the lock of the open ledger; in a folder still in the old layout (ledger folders on) it is moved into
// `main/` first, so nothing moves while read-only. In edit mode (`--edit`, the tests' default) a switch takes the lock
// as before.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { openLedger } from '../server/ledger.ts';

const home = fs.realpathSync(makeTempDir('vb-ro-home-'));
after(() => fs.rmSync(home, { recursive: true, force: true }));

/** A folder under home whose ledger (the old layout's, or ledger `name`'s) holds one board. */
function project(name: string, ledger?: string): string {
  const dir = path.join(home, 'projects', name);
  const file = ledgerFiles(ledgerFolder(dir, ledger)).ledger;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const l = openLedger(file, () => {});
  l.append({ type: 'join', label: 'Seed' }, { by: 'agent', agent: 'a-seed0000' });
  l.append({ type: 'board', board: `${name}-board`, title: name }, { by: 'agent', agent: 'a-seed0000' });
  return dir;
}
/** Every file under `dir`, with its bytes: what read-only must leave as it was. */
const snapshot = (dir: string) => fs.readdirSync(dir, { recursive: true }).map(String).sort()
  .map((f) => [f, fs.statSync(path.join(dir, f)).isFile() ? fs.readFileSync(path.join(dir, f), 'utf8') : '']);
const lockIn = (dir: string, ledger?: string) => fs.existsSync(ledgerFiles(ledgerFolder(dir, ledger)).lock);

async function readOnlyBoard(flags: Record<string, boolean> = {}): Promise<Harness> {
  return startBoard({ home, edit: false, flags: { ledgerFolders: false, readOnlyStart: true, ...flags } });
}

test('at start: read-only, no lock; a write is refused; Edit takes the lock', async () => {
  const h = await readOnlyBoard();
  try {
    assert.equal(lockIn(h.project), false);
    assert.equal((await h.ok('get_project')).readOnly, true);
    await h.fails('put_board', { board: 'new-one', body: { title: 'New' } }, 409, 'read-only');
    assert.deepEqual((await h.ok('edit_ledger')).editing, { here: true });
    assert.equal(lockIn(h.project), true);
    await h.ok('put_board', { board: 'new-one', body: { title: 'New' } });
  } finally { await h.close(); }
});

test('a switch opens read-only: no lock taken there, nothing written there, the lock held before let go', async () => {
  const h = await readOnlyBoard();
  const other = project('other');
  try {
    await h.ok('edit_ledger');
    const before = snapshot(other);
    const opened = await h.ok('open_project', { body: { path: other } });
    assert.deepEqual([opened.path, opened.readOnly, opened.editing], [other, true, undefined]);
    assert.equal(lockIn(h.project), false, 'the old lock let go');
    assert.deepEqual(snapshot(other), before, 'nothing written in the folder opened');
    assert.equal((await h.ok('list_boards')).boards[0].board, 'other-board');
    await h.ok('edit_ledger');
    assert.equal(lockIn(other), true);
  } finally { await h.close(); }
});

test('create in read-only: the board is made under a lock let go at once, and opens read-only', async () => {
  const h = await readOnlyBoard();
  const fresh = path.join(home, 'projects', 'fresh');
  fs.mkdirSync(fresh, { recursive: true });
  try {
    const opened = await h.ok('open_project', { body: { path: fresh, create: true } });
    assert.deepEqual([opened.found, opened.readOnly], [true, true]);
    assert.equal(fs.existsSync(ledgerFiles(ledgerFolder(fresh)).ledger), true);
    assert.equal(lockIn(fresh), false);
  } finally { await h.close(); }
});

test('ledger folders: an old layout opens read-only where it is; Edit moves it into main/ and takes main\'s lock', async () => {
  const h = await readOnlyBoard({ ledgerFolders: true });
  const old = project('old-layout');
  try {
    const before = snapshot(old);
    const opened = await h.ok('open_project', { body: { path: old } });
    assert.deepEqual([opened.readOnly, opened.ledger], [true, undefined]);
    assert.deepEqual(snapshot(old), before, 'not moved while read-only');
    assert.deepEqual((await h.ok('open_project', { body: { path: old } })).path, old, 'opened again: the same');
    const edited = await h.ok('edit_ledger');
    assert.deepEqual([edited.readOnly, edited.ledger, edited.editing], [undefined, 'main', { here: true }]);
    assert.equal(fs.existsSync(ledgerFiles(ledgerFolder(old, 'main')).ledger), true);
    assert.equal(lockIn(old, 'main'), true);
    assert.equal((await h.ok('list_boards')).boards[0].board, 'old-layout-board');
  } finally { await h.close(); }
});

test('ledger folders: a switch to another ledger opens it read-only and lets the lock go', async () => {
  const h = await readOnlyBoard({ ledgerFolders: true });
  const dir = project('two', 'main');
  project('two', 'ui');
  try {
    await h.ok('open_project', { body: { path: dir } });
    await h.ok('edit_ledger');
    assert.equal(lockIn(dir, 'main'), true);
    const ui = await h.ok('open_project', { body: { path: dir, ledger: 'ui' } });
    assert.deepEqual([ui.ledger, ui.readOnly], ['ui', true]);
    assert.deepEqual([lockIn(dir, 'main'), lockIn(dir, 'ui')], [false, false]);
  } finally { await h.close(); }
});

test('edit mode (`--edit`): with readOnlyStart on, a switch takes the lock as before and writes go', async () => {
  const h = await startBoard({ home, flags: { ledgerFolders: false, readOnlyStart: true } });
  const other = project('edited');
  try {
    const opened = await h.ok('open_project', { body: { path: other } });
    assert.deepEqual([opened.readOnly, opened.editing], [undefined, undefined], 'its answers as before');
    assert.equal(lockIn(other), true);
    await h.ok('put_board', { board: 'more', body: { title: 'More' } });
  } finally { await h.close(); }
});

test('Edit over another computer\'s lock gone stale (no beat for 2 minutes, by the lock\'s clock) takes it, as at start', async () => {
  const later = { now: () => Date.now() + 3 * 60_000, host: os.hostname(), pid: process.pid, alive: () => true };
  const h = await startBoard({ home, edit: false, flags: { ledgerFolders: false, readOnlyStart: true }, lockEnv: later });
  try {
    const now = new Date().toISOString();
    fs.writeFileSync(ledgerFiles(ledgerFolder(h.project)).lock, `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4466, started: now, beat: now })}\n`);
    assert.equal((await h.ok('get_project')).editing, undefined, 'stale: nobody is editing');
    assert.deepEqual((await h.ok('edit_ledger')).editing, { here: true });
    assert.equal(JSON.parse(fs.readFileSync(ledgerFiles(ledgerFolder(h.project)).lock, 'utf8')).host, os.hostname());
  } finally { await h.close(); }
});

test('Edit on a folder this computer can\'t write: a refusal in words, still read-only, nothing written (FIX_01 F8)', async () => {
  for (const ledgers of [false, true]) {
    const h = await readOnlyBoard({ ledgerFolders: ledgers });
    const dir = project(`unwritable-${ledgers}`, ledgers ? 'main' : undefined);
    const before = snapshot(dir);
    try {
      await h.ok('open_project', { body: { path: dir } });
      fs.chmodSync(ledgerFolder(dir, ledgers ? 'main' : undefined), 0o555);
      fs.chmodSync(ledgerFolder(dir), 0o555);
      const p = await h.fails('edit_ledger', {}, 409, 'conflict');
      assert.match(p.detail, /can't be written/);
      assert.equal((await h.ok('get_project')).readOnly, true);
      assert.deepEqual(snapshot(dir), before, 'nothing written');
    } finally {
      fs.chmodSync(ledgerFolder(dir), 0o755);
      fs.chmodSync(ledgerFolder(dir, ledgers ? 'main' : undefined), 0o755);
      await h.close();
    }
  }
});
