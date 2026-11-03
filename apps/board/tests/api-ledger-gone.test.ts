// A ledger file that held lines and has gone (moved into `main/` by another server, or deleted), then comes back
// (FIX_01 F1; Run 2, VERIFY_01 N1 and N3): while it is gone nothing is written, the agents file included, so a join
// leaves no hash behind; once it is back an agent's secret is known again on its very first call, a write included,
// with no read needed first to look at the file again.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ledgerFiles, ledgerFolder } from '#format';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { OLD_LAYOUT } from './test-board.ts';

let h: Harness;
let A: Joined;
const files = () => ledgerFiles(ledgerFolder(h.project));
const aside = () => `${files().ledger}.aside`;
const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
before(async () => {
  h = await startBoard({ flags: OLD_LAYOUT });
  A = await h.join('Gone test');
});
after(async () => { await h.close(); });

test('a join while the ledger file is gone is refused, and the agents file is left as it was (N1)', async () => {
  const agents = read(files().agents);
  fs.renameSync(files().ledger, aside());
  try {
    await h.ok('list_boards'); // the server looks, and finds it gone
    await h.fails('join', { body: { label: 'Too late' } }, 409, 'conflict');
    assert.equal(read(files().agents), agents, 'no hash without its join line');
    assert.equal(fs.existsSync(files().ledger), false, 'no second ledger started');
  } finally { fs.renameSync(aside(), files().ledger); }
});

test('the file back: an agent\'s first call, a write, knows its secret at once (N3)', async () => {
  fs.renameSync(files().ledger, aside());
  await h.ok('list_boards'); // read as empty while gone
  fs.renameSync(aside(), files().ledger);
  const items = [{ type: 'board', title: 'Back again', key: 'back-board' }];
  const wrote = await h.ok('write_board', { board: 'back', body: { items } }, { as: A.client });
  assert.ok(wrote.results.every((r: { ok: boolean }) => r.ok));
});
