// `bin/reply.ts` follows the ledger (LEDGERS_02, LEDGERS_01-R5, D-084): the old layout's `.visionboard/`
// when the project is in it; else `--ledger`, else the one the board had open there last (recent.json),
// else main. It writes nothing. Run as a child, with a temp project and a temp home folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import { openLedger } from '../server/ledger.ts';
import { addRecent } from '../server/recent.ts';

const REPLY = fileURLToPath(new URL('../bin/reply.ts', import.meta.url));
const root = fs.realpathSync(makeTempDir('vb-reply-'));
const home = path.join(root, 'home');
const old = path.join(home, 'old');
const multi = path.join(home, 'multi');
after(() => fs.rmSync(root, { recursive: true, force: true }));

function withBoard(dir: string, ledger: string | undefined, board: string): void {
  fs.mkdirSync(ledgerFolder(dir, ledger), { recursive: true });
  openLedger(ledgerFiles(ledgerFolder(dir, ledger)).ledger, () => {}).append({ type: 'board', board, title: `Board ${board}` }, { by: 'person' });
}
withBoard(old, undefined, 'old-board');
withBoard(multi, 'main', 'main-board');
withBoard(multi, 'ui', 'ui-board');

/** The child's exit code and its output. */
function reply(project: string, ...args: string[]): { code: number; out: string } {
  const { VB_PROJECT: _p, ...inherited } = process.env;
  try {
    const out = execFileSync(process.execPath, ['--no-warnings', REPLY, ...args], { env: { ...inherited, VB_PROJECT: project, HOME: home }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status: number; stderr: string };
    return { code: e.status, out: e.stderr };
  }
}

/** Every path under `dir` with its size, to show nothing was written. */
const snapshot = (dir: string): string[] => (fs.readdirSync(dir, { recursive: true }) as string[]).sort()
  .map((p) => `${p}:${fs.statSync(path.join(dir, p)).size}`);

test('the old layout: .visionboard/ itself', () => {
  const r = reply(old, 'old-board', '--json');
  assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).board, 'old-board');
});

test('ledger folders: main by default, the last open one from recent.json, or --ledger', () => {
  assert.equal(reply(multi, 'main-board', '--json').code, 0);
  assert.equal(reply(multi, 'ui-board').code, 2, 'ui is not open by default');
  addRecent(home, multi, 'ui');
  assert.equal(JSON.parse(reply(multi, 'ui-board', '--json').out).board, 'ui-board');
  assert.equal(JSON.parse(reply(multi, '--ledger', 'main', 'main-board', '--json').out).board, 'main-board');
  const missing = reply(multi, '--ledger', 'main', 'ui-board');
  assert.equal(missing.code, 2);
  assert.match(missing.out, /No board "ui-board" in .*main.*ledger\.jsonl/);
});

test('a bad ledger name or no board is a usage error; nothing is written', () => {
  const before = snapshot(multi);
  assert.equal(reply(multi, '--ledger', 'images', 'main-board').code, 2);
  assert.equal(reply(multi, '--ledger').code, 2);
  assert.equal(reply(multi).code, 2);
  assert.deepEqual(snapshot(multi), before);
});
