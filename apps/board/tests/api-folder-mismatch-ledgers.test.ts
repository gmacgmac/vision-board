// An agent always knows which ledger it talks to (LEDGERS_02, D-084 3, api.md 115a), with `ledgerFolders`
// on: agents are per ledger, so an agent that joined one ledger, calling while the board has another
// open, gets `wrong-folder` naming the folder and both ledgers, never served by the wrong one; an agent
// no ledger knows still gets `not-authenticated`; a secret from any ledger of a recent folder is told
// where its work is; the board's MCP server finds a project with ledger folders from inside it; the
// chat panel's agent draws on the open ledger and is stopped after a switch. The home folder is a temp
// folder here: no test reads or writes the real one. Flag off: api-folder-mismatch.test.ts.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import { openLedger } from '../server/ledger.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat } from './chat-support.ts';
import { callMcp, ownMcp } from './mcp-call.ts';

const FLAGS = { ledgerFolders: true };
const home = fs.realpathSync(makeTempDir('vb-home-'));
const config = makeTempDir('vb-ledger-agents-cli-');
const fake = fakeChat(config);
const multi = path.join(home, 'projects', 'multi');
const inMulti = path.join(multi, 'src');
const other = path.join(home, 'projects', 'other');
const fileOf = (dir: string, ledger: string) => ledgerFiles(ledgerFolder(dir, ledger)).ledger;
const agentsOf = (dir: string, ledger: string) => ledgerFiles(ledgerFolder(dir, ledger)).agents;
const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const wrongLedger = (open: string, yours: string) =>
  `The board has ledger "${open}" of ~/projects/multi open. Your work is in ledger "${yours}". Stop and tell the person: they can switch the board back to "${yours}". Don't join here.`;
const WRONG_FOLDER = "The board has switched to ~/projects/multi. Your work is in ~/projects/other. Ask the person to open it again; don't join here.";
const JOIN_AGAIN = 'This board now has your folder open (~/projects/multi). Your secret is from ~/projects/other — call join again.';
const UNKNOWN = 'The server does not know this secret. Call join again, then request_grant for each container you need; the person must approve again.';
const region = (key: string) => ({ items: [{ type: 'region', key, region: { id: key, title: 'R', mode: 'grid' } }] });
/** A board of the agent's own (its creator needs no grant). */
const ownBoard = (key: string) => ({ items: [{ type: 'board', key, title: `Board ${key}` }] });
const allOk = (answer: { results: { ok: boolean }[] }) => answer.results.every((r) => r.ok);
let h: Harness;

/** Ledger `ledger` of `dir`, holding one board the person made. */
function withLedger(dir: string, ledger: string, board: string): void {
  fs.mkdirSync(ledgerFolder(dir, ledger), { recursive: true });
  openLedger(fileOf(dir, ledger), () => {}).append({ type: 'board', board, title: `Board ${board}` }, { by: 'person' });
}

const open = (dir: string, ledger: string) => h.ok('open_project', { body: { path: dir, ledger } });

before(async () => {
  withLedger(multi, 'main', 'plans');
  withLedger(multi, 'ui', 'screens');
  withLedger(other, 'main', 'elsewhere');
  withLedger(other, 'ui', 'other-ui');
  fs.mkdirSync(inMulti, { recursive: true });
  h = await startBoard({ home, flags: FLAGS, chat: { adapters: fake.adapters } });
});
after(async () => {
  await h.close();
  for (const d of [home, config]) fs.rmSync(d, { recursive: true, force: true });
});

test('an agent joined on ui, calling while main is open: wrong-folder naming the folder and both ledgers; nothing written', async () => {
  await open(multi, 'ui');
  const joined = await h.ok('join', { body: { label: 'UI agent' } }, { as: h.agent(undefined, multi) });
  assert.equal(joined.ledger, 'ui');
  assert.ok(allOk(await h.ok('write_board', { board: 'ui-own', body: ownBoard('ui-1') }, { as: h.agent(joined.secret, multi) })));
  await open(multi, 'main');
  const before = [read(fileOf(multi, 'main')), read(agentsOf(multi, 'main'))];
  for (const project of [multi, inMulti, undefined]) {
    for (const [id, input] of [
      ['write_board', { board: 'plans', body: region('ui-2') }],
      ['request_grant', { body: { board: 'plans', reason: 'x' } }],
      ['list_open', { board: 'plans' }],
      ['check_responses', { board: 'plans' }],
    ] as const) {
      const refused = await h.fails(id, input, 409, 'wrong-folder', h.agent(joined.secret, project));
      assert.equal(refused.detail, wrongLedger('main', 'ui'), `${id} ${project}`);
      assert.equal(h.last().headers.get('www-authenticate'), null);
    }
  }
  assert.deepEqual([read(fileOf(multi, 'main')), read(agentsOf(multi, 'main'))], before, 'nothing was written in the open ledger');
  await open(multi, 'ui');
  await h.ok('list_open', { board: 'ui-own' }, { as: h.agent(joined.secret, multi) });
});

test('an agent unknown to every ledger of the folder still gets not-authenticated', async () => {
  await open(multi, 'main');
  for (const project of [multi, undefined]) {
    const refused = await h.fails('list_open', { board: 'plans' }, 401, 'not-authenticated', h.agent('s-unknown-to-every-ledger-0000000', project));
    assert.equal(refused.detail, UNKNOWN);
  }
});

test('a secret from any ledger of a recent folder: wrong-folder naming both folders; working in the open folder, join again', async () => {
  await open(other, 'ui');
  const joined = await h.ok('join', { body: { label: 'Other agent' } }, { as: h.agent(undefined, other) });
  await open(multi, 'main');
  assert.equal((await h.fails('list_open', { board: 'plans' }, 409, 'wrong-folder', h.agent(joined.secret))).detail, WRONG_FOLDER);
  assert.equal((await h.fails('list_open', { board: 'plans' }, 409, 'wrong-folder', h.agent(joined.secret, other))).detail, WRONG_FOLDER, 'the header first');
  assert.equal((await h.fails('list_open', { board: 'plans' }, 401, 'not-authenticated', h.agent(joined.secret, multi))).detail, JOIN_AGAIN);
});

test('an MCP server started in the project finds it, joins main; after a switch to ui its next call is wrong-folder naming both', async () => {
  await open(multi, 'main');
  const mcp = ownMcp(h.base);
  const joinedR = await callMcp(mcp, inMulti, 'join', { label: 'MCP agent' });
  assert.equal(joinedR.isError, false, JSON.stringify(joinedR));
  const joined = JSON.parse(joinedR.content[0].text) as { secret: string; ledger: string; project: string };
  assert.deepEqual([joined.project, joined.ledger], ['~/projects/multi', 'main']);
  const wrote = await callMcp(mcp, inMulti, 'write_board', { board: 'mcp-own', secret: joined.secret, items: ownBoard('mcp-1').items });
  assert.equal(wrote.isError, false, JSON.stringify(wrote));
  await open(multi, 'ui');
  const before = read(fileOf(multi, 'ui'));
  const refused = await callMcp(mcp, inMulti, 'write_board', { board: 'screens', secret: joined.secret, items: region('mcp-2').items });
  assert.equal(refused.isError, true);
  assert.equal(refused.content[0].text, wrongLedger('ui', 'main'));
  assert.equal(read(fileOf(multi, 'ui')), before);
});

test('the chat panel\'s agent draws on the open ledger; after a ledger switch it is stopped, not served by the other', async () => {
  await open(multi, 'main');
  const { session } = await h.ok('start_chat', { board: 'plans', body: { agent: 'claude' } });
  await h.ok('send_chat', { session, body: { text: 'Draw it.' } });
  const run = await fake.run(1);
  const vb = run.mcpConfig.mcpServers['vision-board']!;
  assert.equal(vb.env.VB_PROJECT, multi, 'the MCP is told the project, not a ledger folder');
  const drawn = await callMcp(vb, run.cwd, 'write_board', { board: 'plans', items: region('chat-1').items });
  assert.equal(drawn.isError, false, JSON.stringify(drawn));
  assert.match(read(fileOf(multi, 'main')), /"chat-1"/);
  await open(multi, 'ui');
  const before = read(fileOf(multi, 'ui'));
  const refused = await callMcp(vb, run.cwd, 'list_open', { board: 'screens' });
  assert.equal(refused.isError, true);
  assert.equal(refused.content[0].text, wrongLedger('ui', 'main'));
  assert.equal(read(fileOf(multi, 'ui')), before);
});
