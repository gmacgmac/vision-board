// A watcher of a ledger another server moved (FIX_01 F1; PLAN decision 7, D-085 3): two servers on one folder stand
// for two computers (same host and process here, so each one's lock is live to the other). With both flags on, a server
// watching a folder still in the old layout follows it into `main/` when the other server's Edit moves it there: its
// reads answer main's boards, its Edit refuses while the mover holds main's lock, and nothing is ever written in the
// old place (no second ledger, lock or agents file beside `main/`). After `ledgers:undo` it follows the ledger back.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { openLedger } from '../server/ledger.ts';
import { undoMove } from '../server/ledger-move.ts';

const home = fs.realpathSync(makeTempDir('vb-moved-home-'));
after(() => fs.rmSync(home, { recursive: true, force: true }));

/** A folder under home in the old layout whose ledger holds one board, `<name>-board`. */
function oldLayout(name: string): string {
  const dir = path.join(home, 'projects', name);
  const file = ledgerFiles(ledgerFolder(dir)).ledger;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const l = openLedger(file, () => {});
  l.append({ type: 'join', label: 'Seed' }, { by: 'agent', agent: 'a-seed0000' });
  l.append({ type: 'board', board: `${name}-board`, title: name }, { by: 'agent', agent: 'a-seed0000' });
  return dir;
}
/** A server opening every ledger read-only, with ledger folders, on `dir`. */
async function watcher(dir: string): Promise<Harness> {
  const h = await startBoard({ home, edit: false, flags: { ledgerFolders: true, readOnlyStart: true } });
  await h.ok('open_project', { body: { path: dir } });
  return h;
}
const boardsOf = async (h: Harness) => (await h.ok('list_boards')).boards.map((b: { board: string }) => b.board);
/** What the old place holds that a ledger writes: its ledger file, lock and agents file. */
const oldPlace = (dir: string) => {
  const files = ledgerFiles(ledgerFolder(dir));
  return [files.ledger, files.lock, files.agents].filter((f) => fs.existsSync(f)).map((f) => path.basename(f));
};

test('a watcher follows the move into main/: it reads main, its Edit refuses while the mover edits, nothing lands in the old place', async () => {
  const dir = oldLayout('moved');
  const [a, c] = [await watcher(dir), await watcher(dir)];
  try {
    assert.equal((await a.ok('get_project')).ledger, undefined, 'the old layout, read-only, not moved');
    assert.deepEqual((await c.ok('edit_ledger')).ledger, 'main', 'the other server\'s Edit moved it');
    const seen = await a.ok('get_project');
    assert.deepEqual([seen.ledger, seen.readOnly, seen.boards], ['main', true, 1]);
    assert.deepEqual(await boardsOf(a), ['moved-board']);
    const refused = await a.fails('edit_ledger', {}, 409, 'conflict');
    assert.match(refused.detail, /has been editing this ledger since .*, so it stays read-only here/);
    assert.equal((await a.ok('get_project')).readOnly, true, 'still read-only');
    await a.fails('join', { body: { label: 'Through the watcher' } }, 409, 'read-only');
    assert.deepEqual(oldPlace(dir), [], 'no ledger, lock or agents file beside main/');
    await c.ok('stop_editing');
    assert.deepEqual((await a.ok('edit_ledger')).editing, { here: true }, 'once let go, the watcher edits main');
    await a.ok('join', { body: { label: 'Through the watcher' } });
    assert.deepEqual(oldPlace(dir), []);
    assert.equal(fs.existsSync(ledgerFiles(ledgerFolder(dir, 'main')).agents), true);
  } finally { await a.close(); await c.close(); }
});

test('a watcher follows `ledgers:undo` back to the old layout', async () => {
  const dir = oldLayout('undone');
  const [a, c] = [await watcher(dir), await watcher(dir)];
  try {
    await c.ok('edit_ledger');
    assert.equal((await a.ok('get_project')).ledger, 'main');
    await c.ok('stop_editing');
    undoMove(dir, { port: 0 });
    const seen = await a.ok('get_project');
    assert.deepEqual([seen.ledger, seen.readOnly, seen.boards], [undefined, true, 1]);
    assert.deepEqual(await boardsOf(a), ['undone-board']);
  } finally { await a.close(); await c.close(); }
});
