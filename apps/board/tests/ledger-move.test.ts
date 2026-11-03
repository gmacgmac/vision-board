// The one move between layouts (ledger-move.ts, D-084 6, PLAN decision 7), on a copy of a real-shaped
// folder in the OS temp folder: the old layout's per-ledger files move into `.visionboard/main/` by
// rename and come back with `undoMove`, every byte the same each way (the `.gitignore` lines split and
// join, the same lines); a live lock anywhere stops both; a second move is refused; a move stopped
// part-way says what is where and the next one finishes it; undo refuses while other ledgers exist.
// verify: data-folder-literal the `.gitignore` lines a ledger folder holds, read from outside
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITIGNORE_FILE, LOCK_FILE, MAIN_LEDGER, ledgerFiles, ledgerFolder, projectFiles } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { makeTempDir } from '#format/testing';
import { moveIntoMain, undoMove } from '../server/ledger-move.ts';
import { ProblemError } from '../server/problem.ts';

const CALCULATOR = fileURLToPath(new URL('../../../skills/vision-board/examples/apps/calculator', import.meta.url));
const PORT = 6301;
let project: string;
const root = () => ledgerFolder(project);
const main = () => ledgerFolder(project, MAIN_LEDGER);

/** Every file under `dir`, by `/`-joined path, with its bytes; `.gitignore` files and the lock left out. */
function snapshot(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (at: string) => {
    for (const e of fs.readdirSync(at, { withFileTypes: true })) {
      const p = path.join(at, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== GITIGNORE_FILE && e.name !== LOCK_FILE) out.set(path.relative(dir, p).split(path.sep).join('/'), fs.readFileSync(p));
    }
  };
  walk(dir);
  return out;
}

const ignoreLines = (dir: string): string[] => {
  const file = path.join(dir, GITIGNORE_FILE);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).sort() : [];
};

/** A live lock held by a server on another computer, in ledger folder `dir`. */
function liveLock(dir: string): void {
  const now = new Date().toISOString();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ledgerFiles(dir).lock, `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4466, started: now, beat: now })}\n`);
}

/** The conflict `run` throws, by its words. */
function refused(run: () => unknown, words: RegExp): void {
  assert.throws(run, (err: unknown) => err instanceof ProblemError && err.code === 'conflict' && words.test(err.message));
}

beforeEach(() => {
  project = fs.realpathSync(makeTempDir('vb-move-'));
  const r = ledgerFiles(root());
  fs.mkdirSync(path.join(r.images, 'shots'), { recursive: true });
  fs.copyFileSync(`${FIXTURES_DIR}roadmap.ledger.jsonl`, r.ledger);
  fs.writeFileSync(r.agents, '{"agents":[]}\n', { mode: 0o600 });
  fs.writeFileSync(path.join(r.images, 'shots', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 255]));
  fs.cpSync(CALCULATOR, path.join(r.apps, 'calculator'), { recursive: true });
  fs.mkdirSync(r.appState);
  fs.writeFileSync(path.join(r.appState, '7.json'), '{"v":1,"value":{"x":2}}\n');
  const repo = projectFiles(project);
  fs.writeFileSync(repo.chatSessions, '{"sessions":[]}\n');
  fs.writeFileSync(repo.permissions, '{"permissions":[]}\n');
  fs.mkdirSync(path.join(repo.attachments, '2026-10-30'), { recursive: true });
  fs.writeFileSync(path.join(repo.attachments, '2026-10-30', '1-a.txt'), 'attached\n');
  fs.writeFileSync(r.gitignore, 'agents.json\nlock\nchat-sessions.json\napp-state/\nattachments/\npermissions.json\n');
});
afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

const PER_LEDGER = (rel: string) => !/^(chat-sessions\.json|permissions\.json|attachments\/)/.test(rel);

test('the move: every per-ledger file into main/, byte for byte; repo-wide files stay; main\'s lock held, the old one let go', () => {
  const before = snapshot(root());
  const ignore = ignoreLines(root());
  const lock = moveIntoMain(project, { port: PORT });
  try {
    const after = snapshot(root());
    const want = new Map([...before].map(([rel, bytes]) => [PER_LEDGER(rel) ? `${MAIN_LEDGER}/${rel}` : rel, bytes]));
    assert.deepEqual([...after.keys()].sort(), [...want.keys()].sort());
    for (const [rel, bytes] of want) assert.ok(after.get(rel)!.equals(bytes), `${rel}: the same bytes`);
    assert.equal(fs.statSync(ledgerFiles(main()).agents).mode & 0o777, 0o600, 'a rename keeps the file as it was');
    assert.deepEqual(ignoreLines(main()), ['agents.json', 'app-state/', 'lock']);
    assert.deepEqual(ignoreLines(root()), ['attachments/', 'chat-sessions.json', 'permissions.json']);
    assert.deepEqual([...ignoreLines(main()), ...ignoreLines(root())].sort(), ignore, 'the same lines, split');
    assert.equal(JSON.parse(fs.readFileSync(ledgerFiles(main()).lock, 'utf8')).pid, process.pid, 'main\'s lock is held');
    assert.equal(fs.existsSync(ledgerFiles(root()).lock), false, 'the old folder\'s lock was let go');
  } finally { lock.release(); }
});

test('the undo: main/ back to .visionboard/, every byte as before the move; main/ goes', () => {
  const before = snapshot(root());
  const ignore = ignoreLines(root());
  moveIntoMain(project, { port: PORT }).release();
  assert.equal(undoMove(project, { port: PORT }), undefined);
  const after = snapshot(root());
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  for (const [rel, bytes] of before) assert.ok(after.get(rel)!.equals(bytes), `${rel}: the same bytes`);
  assert.deepEqual(ignoreLines(root()), ignore, 'the same .gitignore lines');
  assert.equal(fs.existsSync(main()), false, 'main/ is gone');
  assert.equal(fs.existsSync(ledgerFiles(root()).lock), false, 'no lock left behind');
});

test('a live lock stops the move and the undo, and nothing changes', () => {
  const before = snapshot(root());
  liveLock(root());
  refused(() => moveIntoMain(project, { port: PORT }), /another-computer/);
  assert.deepEqual(snapshot(root()), before);
  assert.equal(fs.existsSync(main()), false);
  fs.rmSync(ledgerFiles(root()).lock);
  moveIntoMain(project, { port: PORT }).release();
  const moved = snapshot(root());
  liveLock(main());
  refused(() => undoMove(project, { port: PORT }), /another-computer/);
  fs.rmSync(ledgerFiles(main()).lock);
  liveLock(root());
  refused(() => undoMove(project, { port: PORT }), /another-computer/);
  assert.deepEqual(snapshot(root()), moved, 'nothing moved back');
  assert.ok(fs.existsSync(ledgerFiles(main()).ledger));
  assert.equal(fs.existsSync(ledgerFiles(main()).lock), false, 'main\'s lock was let go when the old one could not be taken');
});

test('a second move is refused: nothing in the old layout, or both layouts at once', () => {
  moveIntoMain(project, { port: PORT }).release();
  const moved = snapshot(root());
  refused(() => moveIntoMain(project, { port: PORT }), /nothing to move/);
  fs.writeFileSync(ledgerFiles(root()).ledger, '');
  refused(() => moveIntoMain(project, { port: PORT }), /has both .visionboard\/ledger\.jsonl and \.visionboard\/main\/ledger\.jsonl/);
  refused(() => undoMove(project, { port: PORT }), /has both/);
  fs.rmSync(ledgerFiles(root()).ledger);
  assert.deepEqual(snapshot(root()), moved);
});

test('an entry in both places stops the move before anything changes', () => {
  fs.mkdirSync(path.join(ledgerFiles(main()).images), { recursive: true });
  const before = snapshot(root());
  refused(() => moveIntoMain(project, { port: PORT }), /has images both in \.visionboard\/ and in \.visionboard\/main\//);
  assert.deepEqual(snapshot(root()), before);
});

test('undo refuses while other ledgers are there', () => {
  moveIntoMain(project, { port: PORT }).release();
  fs.mkdirSync(ledgerFolder(project, 'ui'));
  fs.writeFileSync(ledgerFiles(ledgerFolder(project, 'ui')).ledger, '');
  refused(() => undoMove(project, { port: PORT }), /other ledgers beside main \(ui\)/);
  assert.ok(fs.existsSync(ledgerFiles(main()).ledger));
});

test('a move stopped part-way says what is where, loses nothing, and the next one finishes it', { skip: process.getuid?.() === 0 }, () => {
  const before = snapshot(root());
  const apps = ledgerFiles(root()).apps;
  fs.chmodSync(apps, 0o500); // a folder can't move to another parent while it can't be written (its `..`)
  try {
    refused(() => moveIntoMain(project, { port: PORT }), /stopped part-way .* In \.visionboard\/main\/: agents\.json, images\. Still in \.visionboard\/: apps, app-state, ledger\.jsonl/);
    // What it advises works in that state: opening again finishes; undo only once finished (FIX_01 F13).
    refused(() => moveIntoMain(project, { port: PORT }), /open the folder again \(or press Edit\) to finish the move\. Once it has finished, npm run ledgers:undo/);
    refused(() => undoMove(project, { port: PORT }), /has no \.visionboard\/main\/ledger\.jsonl to move back/);
  } finally { fs.chmodSync(apps, 0o700); }
  assert.ok(fs.existsSync(ledgerFiles(root()).ledger), 'the ledger file goes last: still the old layout');
  assert.equal(fs.existsSync(ledgerFiles(root()).lock), false, 'the lock was let go');
  moveIntoMain(project, { port: PORT }).release();
  const after = snapshot(root());
  for (const [rel, bytes] of before) assert.ok(after.get(PER_LEDGER(rel) ? `${MAIN_LEDGER}/${rel}` : rel)!.equals(bytes), rel);
});

test('a .gitignore shaped like this repo\'s (the ledger\'s lines first) reads the same after the move and the undo', () => {
  const shaped = 'agents.json\nlock\nchat-sessions.json\n';
  fs.writeFileSync(ledgerFiles(root()).gitignore, shaped);
  moveIntoMain(project, { port: PORT }).release();
  undoMove(project, { port: PORT });
  assert.equal(fs.readFileSync(ledgerFiles(root()).gitignore, 'utf8'), shaped);
});
