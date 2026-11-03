// Chat sessions are kept per ledger (FIX_01 F3; D-084 3, agents are per ledger): the repo-wide sessions file holds every
// ledger's, each entry naming its ledger (`ledger`; left out, the old layout's one ledger, which is `main` once moved).
// Two ledgers with the same board id never see, resume or answer through each other's sessions, and a session of
// another ledger is not found by its id, so its agent is never keyed into this ledger's agents file.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles, ledgerFolder, projectFiles } from '#format';
import { makeTempDir } from '#format/testing';
import { openLedger } from '../server/ledger.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat } from './chat-support.ts';

const home = fs.realpathSync(makeTempDir('vb-chat-ledgers-home-'));
const config = makeTempDir('vb-chat-ledgers-cli-');
const fake = fakeChat(config);
const dir = path.join(home, 'projects', 'two');
let h: Harness;

/** Ledger `name` of the project, holding board `plan` made by the person. */
function withPlan(name: string): void {
  fs.mkdirSync(ledgerFolder(dir, name), { recursive: true });
  openLedger(ledgerFiles(ledgerFolder(dir, name)).ledger, () => {}).append({ type: 'board', board: 'plan', title: `Plan of ${name}` }, { by: 'person' });
}
const stored = () => JSON.parse(fs.readFileSync(projectFiles(dir).chatSessions, 'utf8')).sessions as Record<string, unknown>[];
const agentsOf = (name: string) => {
  const file = ledgerFiles(ledgerFolder(dir, name)).agents;
  return fs.existsSync(file) ? Object.keys(JSON.parse(fs.readFileSync(file, 'utf8')).agents ?? {}) : [];
};

before(async () => {
  withPlan('main');
  withPlan('ui');
  h = await startBoard({ home, flags: { ledgerFolders: true, readOnlyStart: false }, chat: { adapters: fake.adapters } });
});
after(async () => {
  await h.close();
  for (const d of [home, config]) fs.rmSync(d, { recursive: true, force: true });
});

test('a ledger\'s board lists only its own sessions; the same board id in another ledger starts its own', async () => {
  await h.ok('open_project', { body: { path: dir, ledger: 'main' } });
  const onMain = await h.ok('start_chat', { board: 'plan', body: { agent: 'claude' } });
  assert.equal(onMain.ledger, 'main');
  assert.deepEqual((await h.ok('list_chats', { board: 'plan' })).sessions, [onMain]);
  await h.ok('open_project', { body: { path: dir, ledger: 'ui' } });
  assert.deepEqual((await h.ok('list_chats', { board: 'plan' })).sessions, [], 'main\'s session is not ui\'s');
  await h.fails('send_chat', { session: onMain.session, body: { text: 'Still there?' } }, 404, 'not-found');
  assert.deepEqual(agentsOf('ui'), [], 'main\'s agent was never keyed into ui');
  const onUi = await h.ok('start_chat', { board: 'plan', body: { agent: 'claude' } });
  assert.equal(onUi.ledger, 'ui');
  assert.deepEqual((await h.ok('list_chats', { board: 'plan' })).sessions, [onUi]);
  assert.deepEqual(stored().map((e) => e.ledger), ['main', 'ui'], 'both kept in the one repo-wide file');
  await h.ok('open_project', { body: { path: dir, ledger: 'main' } });
  assert.deepEqual((await h.ok('list_chats', { board: 'plan' })).sessions, [onMain]);
});

test('an entry naming no ledger (kept before ledger folders) is main\'s', async () => {
  const file = projectFiles(dir).chatSessions;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { ledger: _l, ...old } = doc.sessions[0];
  fs.writeFileSync(file, `${JSON.stringify({ sessions: [{ ...old, session: '11111111-2222-4333-8444-555555555555' }, ...doc.sessions] }, null, 2)}\n`);
  await h.ok('open_project', { body: { path: dir, ledger: 'ui' } });
  await h.ok('open_project', { body: { path: dir, ledger: 'main' } }); // the index is read again with the folder
  const listed = (await h.ok('list_chats', { board: 'plan' })).sessions.map((s: { session: string }) => s.session);
  assert.ok(listed.includes('11111111-2222-4333-8444-555555555555'), 'listed on main');
  await h.ok('open_project', { body: { path: dir, ledger: 'ui' } });
  assert.ok(!(await h.ok('list_chats', { board: 'plan' })).sessions.some((s: { session: string }) => s.session.startsWith('11111111')), 'not on ui');
});
