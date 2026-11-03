// Reading another ledger (CONSOLIDATE_01, D-084 8, api.md 113b), with `ledgerFolders` on: `list_boards`,
// `get_board` and `show_node` take `ledger`, another ledger of the open folder, read read-only, so an agent can
// draw a summary of a throwaway ledger's work on the open one. The answer names the ledger and says `readOnly:
// true`; it is an unmarked read (no `owed`, no `held`: those are about the caller, and agents are per ledger,
// D-083 rule 4); nothing in that ledger's folder changes, not a byte. A bad name is `bad-request`, an unknown one
// `not-found` naming the folder's ledgers; no write takes `ledger`; with the flag off, or under a host with one
// ledger, the input is refused. The home folder is a temp folder: no test reads or writes the real one.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { FlagOverrides, NodeEvent } from '#format';
import { ledgerFiles, ledgerFolder } from '#format';
import { makeTempDir } from '#format/testing';
import { createEngine } from '../server/engine/index.ts';
import type { Caller } from '../server/ledger.ts';
import { openLedger } from '../server/ledger.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { callMcp, ownMcp } from './mcp-call.ts';

const FLAGS = { ledgerFolders: true };
const PERSON: Caller = { by: 'person' };
const home = fs.realpathSync(makeTempDir('vb-home-'));
const multi = path.join(home, 'projects', 'multi');
const fileOf = (dir: string, ledger: string) => ledgerFiles(ledgerFolder(dir, ledger)).ledger;
const scratch = ledgerFolder(multi, 'scratch');
let h: Harness;
let main: Joined;

/** Every file under `dir` with its bytes, by path: what "nothing changed there" is checked against. */
function filesOf(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of fs.readdirSync(dir, { recursive: true }) as string[]) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isFile()) out[name] = fs.readFileSync(file, 'base64');
  }
  return out;
}

/** Ledger `ledger` of `dir`, holding one board the person made. */
function withLedger(dir: string, ledger: string, board: string): void {
  fs.mkdirSync(ledgerFolder(dir, ledger), { recursive: true });
  openLedger(fileOf(dir, ledger), () => {}).append({ type: 'board', board, title: `Board ${board}` }, PERSON);
}

/** The scratch ledger's planning, drawn by `agent` (main's agent id, so a marked read would mark it): its board
 * `sketch` (held by its creator), a question the person noted on, so it is owed an answer there. */
function drawScratch(agent: string): void {
  const l = openLedger(fileOf(multi, 'scratch'), () => {});
  const by: Caller = { by: 'agent', agent };
  l.append({ type: 'join', label: 'Planner' }, by);
  l.append({ type: 'board', board: 'sketch', title: 'Planning sketch' }, by);
  l.append({ type: 'region', board: 'sketch', region: { id: 'plan', title: 'Plan', mode: 'grid' } }, by);
  const q = (l.append({ type: 'node', board: 'sketch', node: { region: 'plan', kind: 'question', title: 'Ship in two steps?' } }, by) as NodeEvent).id;
  l.append({ type: 'act', action: 'comment', n: q, ver: 1, text: 'Yes, the server first.' }, PERSON);
}

before(async () => {
  withLedger(multi, 'main', 'plans');
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(ledgerFiles(scratch).gitignore, '*\n');
  fs.writeFileSync(fileOf(multi, 'scratch'), '');
  h = await startBoard({ home, flags: FLAGS });
  await h.ok('open_project', { body: { path: multi, ledger: 'main' } });
  main = await h.join('Main agent');
  drawScratch(main.agent);
});
after(async () => {
  await h.close();
  fs.rmSync(home, { recursive: true, force: true });
});

test('list_boards with `ledger`: the other ledger\'s boards, named, read-only, unmarked; scratch unchanged byte for byte', async () => {
  const before = filesOf(scratch);
  const listed = await h.ok('list_boards', { ledger: 'scratch' }, { as: main.client });
  assert.equal(listed.project, '~/projects/multi');
  assert.equal(listed.ledger, 'scratch');
  assert.equal(listed.readOnly, true);
  assert.deepEqual(listed.boards.map((b: { board: string }) => b.board), ['sketch']);
  assert.equal('held' in listed.boards[0], false, 'held is about the caller, who has no identity in scratch');
  const own = await h.ok('list_boards', {}, { as: main.client });
  assert.deepEqual([own.ledger, own.readOnly, own.boards.map((b: { board: string }) => b.board)], ['main', undefined, ['plans']], 'the open ledger, as before');
  assert.deepEqual(filesOf(scratch), before);
});

test('get_board and show_node with `ledger`: the other ledger\'s board and card, named, read-only, with no owed or held', async () => {
  const before = filesOf(scratch);
  const board = await h.ok('get_board', { board: 'sketch', ledger: 'scratch' }, { as: main.client });
  assert.deepEqual([board.ledger, board.readOnly, board.held], ['scratch', true, undefined]);
  assert.equal(board.view.nodes[0].title, 'Ship in two steps?');
  assert.deepEqual(board.state.items['1'].notes.map((n: { text: string; owed?: true }) => [n.text, n.owed]), [['Yes, the server first.', undefined]]);
  const node = await h.ok('show_node', { board: 'sketch', n: 1, ledger: 'scratch' }, { as: main.client });
  assert.deepEqual([node.ledger, node.readOnly, node.n, node.notes.length, node.notes[0].owed], ['scratch', true, 1, 1, undefined]);
  await h.fails('get_board', { board: 'sketch' }, 404, 'not-found', main.client);
  assert.deepEqual(filesOf(scratch), before, 'no lock, no agents file, no line');
  assert.equal(fs.existsSync(ledgerFiles(scratch).lock), false);
  assert.equal(fs.existsSync(ledgerFiles(scratch).agents), false);
});

test('the other ledger is followed: a line another writer appends there is read on the next read', async () => {
  const other = openLedger(fileOf(multi, 'scratch'), () => {});
  other.append({ type: 'board', board: 'later-idea', title: 'Later idea' }, PERSON);
  const listed = await h.ok('list_boards', { ledger: 'scratch' });
  assert.deepEqual(listed.boards.map((b: { board: string }) => b.board).sort(), ['later-idea', 'sketch']);
});

test('names: a bad one is bad-request, an unknown one or a data-folder name not-found naming the ledgers; the open one reads as usual', async () => {
  const bad = await h.fails('list_boards', { ledger: 'Not_A_Name' }, 400, 'bad-request');
  assert.match(bad.detail, /`ledger` is not a ledger name/);
  const unknown = await h.fails('get_board', { board: 'sketch', ledger: 'nope' }, 404, 'not-found');
  assert.equal(unknown.detail, '~/projects/multi has no ledger "nope" to read. Its ledgers: main, scratch.');
  await h.fails('list_boards', { ledger: 'images' }, 404, 'not-found');
  const open = await h.ok('get_board', { board: 'plans', ledger: 'main' });
  assert.deepEqual([open.ledger, open.readOnly], [undefined, undefined], 'the open ledger, not another');
});

test('no write takes `ledger`: sent anyway it is an unknown query parameter, and nothing is written anywhere', async () => {
  const before = [filesOf(scratch), fs.readFileSync(fileOf(multi, 'main'), 'utf8')];
  const item = { items: [{ type: 'board', key: 'no-ledger-1', title: 'Not here' }] };
  const refused = await h.fails('write_board', { board: 'not-here', ledger: 'scratch', body: item }, 400, 'bad-request', main.client);
  assert.match(refused.detail, /Unknown query parameter `ledger`/);
  assert.deepEqual([filesOf(scratch), fs.readFileSync(fileOf(multi, 'main'), 'utf8')], before);
});

test('an MCP agent joined on main reads scratch\'s board and draws a summary of it on main; scratch is unchanged', async () => {
  const before = filesOf(scratch);
  const mcp = ownMcp(h.base);
  const read = await callMcp(mcp, multi, 'get_board', { board: 'sketch', ledger: 'scratch' });
  assert.equal(read.isError, false, JSON.stringify(read));
  const sketch = JSON.parse(read.content[0].text) as { ledger: string; readOnly: true; view: { nodes: { title: string }[] } };
  assert.deepEqual([sketch.ledger, sketch.readOnly], ['scratch', true]);
  const summary = {
    board: 'sketch-summary', secret: main.secret, items: [
      { type: 'board', key: 'sum-1', title: 'From scratch: planning sketch' },
      { type: 'region', key: 'sum-2', region: { id: 'carried', title: 'Carried over', mode: 'grid' } },
      { type: 'node', key: 'sum-3', node: { region: 'carried', kind: 'note', title: sketch.view.nodes[0]!.title, body: 'Answered in scratch: yes, the server first.' } },
    ],
  };
  const wrote = await callMcp(mcp, multi, 'write_board', summary);
  assert.equal(wrote.isError, false, JSON.stringify(wrote));
  const drawn = await h.ok('get_board', { board: 'sketch-summary' });
  assert.equal(drawn.view.nodes[0].title, 'Ship in two steps?');
  assert.deepEqual(filesOf(scratch), before);
});

test('with the open ledger read-only too (readOnlyStart), another ledger reads the same; no lock is taken in either', async () => {
  const viewer = await startBoard({ home, flags: { ...FLAGS, readOnlyStart: true }, edit: false });
  try {
    await viewer.ok('open_project', { body: { path: multi, ledger: 'main' } });
    const listed = await viewer.ok('list_boards', { ledger: 'scratch' });
    assert.deepEqual([listed.ledger, listed.readOnly, listed.boards.length], ['scratch', true, 2]);
    assert.equal(fs.existsSync(ledgerFiles(scratch).lock), false);
  } finally { await viewer.close(); }
});

test('switching ledgers lets the other ledgers go: with scratch open, main is the other one', async () => {
  await h.ok('open_project', { body: { path: multi, ledger: 'scratch' } });
  try {
    const listed = await h.ok('list_boards', { ledger: 'main' });
    assert.deepEqual([listed.ledger, listed.readOnly], ['main', true]);
    assert.ok(listed.boards.some((b: { board: string }) => b.board === 'sketch-summary'));
    const own = await h.ok('list_boards', { ledger: 'scratch' });
    assert.deepEqual([own.ledger, own.readOnly], ['scratch', undefined], 'naming the open ledger reads it as usual');
  } finally { await h.ok('open_project', { body: { path: multi, ledger: 'main' } }); }
});

test('flag off: the standalone board keeps one ledger, and `ledger` is refused in words', async () => {
  const off = await startBoard({ flags: { ledgerFolders: false } });
  try {
    const refused = await off.fails('list_boards', { ledger: 'main' }, 400, 'bad-request');
    assert.equal(refused.detail, 'The query parameter `ledger` reads another ledger of the folder, and this board keeps one ledger: read without it.');
  } finally { await off.close(); }
});

test('a host\'s engine keeps one ledger: its bot is not given `ledger` (refused in words); with the rules off it is refused by the engine', async () => {
  const dir = makeTempDir('vb-read-ledger-host-');
  try {
    const tools = (flags: FlagOverrides) => createEngine({ dir, flags }).tools;
    const on = tools({ botToolRules: true });
    const listed = on.list().filter((t) => 'ledger' in (t.inputSchema.properties as object));
    assert.deepEqual(listed.map((t) => t.name), [], 'no tool lists `ledger` for a host\'s bot');
    const refused = await on.call('list_boards', { ledger: 'main' });
    assert.equal(refused.isError, true);
    assert.match((refused.content[0] as { text: string }).text, /takes no `ledger` here: your host keeps one ledger/);
    const off = tools({ botToolRules: false });
    const given = off.list().filter((t) => 'ledger' in (t.inputSchema.properties as object)).map((t) => t.name);
    assert.deepEqual(given.sort(), ['get_board', 'list_boards', 'show_node'], 'reads only: no write tool takes `ledger`');
    const engine = await off.call('list_boards', { ledger: 'main' });
    assert.equal(engine.isError, true);
    assert.match((engine.content[0] as { text: string }).text, /this board keeps one ledger/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
