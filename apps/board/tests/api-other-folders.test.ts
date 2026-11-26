// Agents from other folders (api.md 215, D-120), with `ledgerFolders` on: off, a `VB-Project` naming another folder is
// `wrong-folder` as before; the person's `folders-allow` lets it in, its `folders-revoke` shuts it out again. Let in, an
// agent from another folder reads the open folder's boards (named so), joins, and writes with its new secret where it
// may: a board it makes, and the person's only with a grant. A secret from a recent folder is told to join again here,
// never sent back; a secret from another ledger of the open folder is still `wrong-folder`. The flag off, the act
// changes nothing. `checkFolder` itself too. The home folder is a temp folder: no test reads the real one.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import { checkFolder } from '../server/caller-folder.ts';
import { openLedger } from '../server/ledger.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

const home = fs.realpathSync(makeTempDir('vb-home-'));
const here = path.join(home, 'projects', 'here');
const away = path.join(home, 'projects', 'away');
const WRONG_FOLDER = "The board has switched to ~/projects/here. Your work is in ~/projects/away. Ask the person to open it again; don't join here.";
const JOIN_HERE = 'This board (~/projects/here) lets agents from other folders in. Your secret is from ~/projects/away — call join again here.';
const wrongLedger = 'The board has ledger "main" of ~/projects/here open. Your work is in ledger "ui". Stop and tell the person: they can switch the board back to "ui". Don\'t join here.';
const region = (key: string) => ({ items: [{ type: 'region', key, region: { id: key, title: 'R', mode: 'grid' } }] });
const ownBoard = (key: string) => ({ items: [{ type: 'board', key, title: `Board ${key}` }] });
const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
let h: Harness;
let awaySecret: string;
let uiSecret: string;

function withLedger(dir: string, ledger: string, board: string): void {
  fs.mkdirSync(ledgerFolder(dir, ledger), { recursive: true });
  openLedger(ledgerFiles(ledgerFolder(dir, ledger)).ledger, () => {}).append({ type: 'board', board, title: `Board ${board}` }, { by: 'person' });
}
const open = (dir: string, ledger: string) => h.ok('open_project', { body: { path: dir, ledger } });
const turn = (action: 'folders-allow' | 'folders-revoke') => h.ok('act', { board: 'plans', body: { type: 'act', action } });

before(async () => {
  withLedger(here, 'main', 'plans');
  withLedger(here, 'ui', 'screens');
  withLedger(away, 'main', 'elsewhere');
  h = await startBoard({ home, flags: { ledgerFolders: true } });
  await open(away, 'main');
  awaySecret = (await h.ok('join', { body: { label: 'Away agent' } }, { as: h.agent(undefined, away) })).secret;
  await open(here, 'ui');
  uiSecret = (await h.ok('join', { body: { label: 'UI agent' } }, { as: h.agent(undefined, here) })).secret;
  await open(here, 'main');
});
after(async () => {
  await h.close();
  fs.rmSync(home, { recursive: true, force: true });
});

test('off (the default): a header naming another folder is wrong-folder, before anything is read', async () => {
  assert.equal((await h.fails('list_boards', {}, 409, 'wrong-folder', h.agent(undefined, away))).detail, WRONG_FOLDER);
  assert.equal((await h.fails('join', { body: { label: 'x' } }, 409, 'wrong-folder', h.agent(undefined, away))).detail, WRONG_FOLDER);
});

test('on: an agent from another folder reads, joins and writes with its new secret; the grant still comes first', async () => {
  const line = await turn('folders-allow');
  assert.deepEqual([line.action, line.board, line.n], ['folders-allow', undefined, undefined]);
  const list = await h.ok('list_boards', {}, { as: h.agent(undefined, away) });
  assert.deepEqual([list.project, list.ledger], ['~/projects/here', 'main'], 'reads name the open folder');
  const joined = await h.ok('join', { body: { label: 'Away agent, here' } }, { as: h.agent(undefined, away) });
  assert.equal(joined.project, '~/projects/here');
  const as = { as: h.agent(joined.secret, away) };
  assert.ok((await h.ok('write_board', { board: 'away-own', body: ownBoard('own-1') }, as)).results.every((r: { ok: boolean }) => r.ok));
  const before = read(ledgerFiles(ledgerFolder(here, 'main')).ledger);
  const refused = await h.ok('write_board', { board: 'plans', body: region('r-1') }, as);
  assert.match(refused.results[0].problem.type, /needs-grant$/, 'the person\'s board needs the grant');
  assert.equal(read(ledgerFiles(ledgerFolder(here, 'main')).ledger), before, 'nothing written');
});

test('on: a secret from a recent folder is told to join again here, never sent back; a known one works', async () => {
  for (const project of [away, here]) {
    const refused = await h.fails('list_open', { board: 'plans' }, 401, 'not-authenticated', h.agent(awaySecret, project));
    assert.equal(refused.detail, JOIN_HERE, project);
  }
  const joined = await h.ok('join', { body: { label: 'Away again' } }, { as: h.agent(undefined, away) });
  await h.ok('list_open', { board: 'plans' }, { as: h.agent(joined.secret, away) });
});

test('on: a secret from another ledger of the open folder is still wrong-folder', async () => {
  for (const project of [away, here]) {
    const refused = await h.fails('list_open', { board: 'plans' }, 409, 'wrong-folder', h.agent(uiSecret, project));
    assert.equal(refused.detail, wrongLedger, project);
  }
});

test('revoked: another folder is wrong-folder again; the switch is per ledger', async () => {
  await open(here, 'ui');
  await h.fails('list_boards', {}, 409, 'wrong-folder', h.agent(undefined, away));
  await open(here, 'main');
  await turn('folders-revoke');
  assert.equal((await h.fails('list_boards', {}, 409, 'wrong-folder', h.agent(undefined, away))).detail, WRONG_FOLDER);
});

test('checkFolder: off refuses another folder, on lets it in; the open folder and no header as before', () => {
  const req = (dir?: string) => ({ headers: dir === undefined ? {} : { 'vb-project': encodeURI(dir) } }) as unknown as IncomingMessage;
  const env = { home, dir: fs.realpathSync(here), ledger: 'main' };
  assert.throws(() => checkFolder(req(away), env), /Your work is in ~\/projects\/away/);
  assert.equal(checkFolder(req(away), { ...env, others: true }), true);
  assert.deepEqual([checkFolder(req(here), env), checkFolder(req(), env), checkFolder(req(), { ...env, others: true })], [true, false, false]);
});

test('the flag off: the act is recorded but another folder is still refused', async () => {
  const home2 = fs.realpathSync(makeTempDir('vb-home-'));
  const [mine, theirs] = [path.join(home2, 'projects', 'here'), path.join(home2, 'projects', 'away')];
  withLedger(mine, 'main', 'plans');
  fs.mkdirSync(theirs, { recursive: true });
  const off = await startBoard({ home: home2, flags: { ledgerFolders: true, otherFolders: false } });
  try {
    await off.ok('open_project', { body: { path: mine, ledger: 'main' } });
    await off.ok('act', { board: 'plans', body: { type: 'act', action: 'folders-allow' } });
    assert.equal((await off.fails('list_boards', {}, 409, 'wrong-folder', off.agent(undefined, theirs))).detail, WRONG_FOLDER);
  } finally {
    await off.close();
    fs.rmSync(home2, { recursive: true, force: true });
  }
});
