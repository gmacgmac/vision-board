// A ledger open read-only (D-085 3, 4; READONLY_01), walked as api-lock.test.ts walks a locked board: every agent
// operation openapi.json lists (contract-walk.ts) is called before Stop editing, while read-only, and after Edit. Read-only,
// every write answers 409 `read-only` in the caller's words, `join` too (it would write the agents file), and nothing is
// written: the ledger file's bytes, the agents file and the ledger folder's listing are unchanged. Every read answers as
// before plus `readOnly: true`. Every person operation that writes the ledger's folder is refused the same way; the
// rest are named with why they still go. Edit takes the lock; a live lock of another computer refuses it, naming that
// computer. In edit mode a locked board still answers `locked` and the person's flag still goes (D-043 unchanged).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { OperationId } from '#format';
import { ledgerFiles, ledgerFolder } from '#format';
import { LOCKED, READ_ONLY, READ_ONLY_PERSON } from '#actions';
import { makeTempDir } from '#format/testing';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { ops } from './openapi-ajv.ts';
import { agentOps, answer, WALK_REGION } from './contract-walk.ts';
import { fakeChat, gone } from './chat-support.ts';

const PLANS = 'plans';
const config = makeTempDir('vb-read-only-');
const fake = fakeChat(config);
let h: Harness;
let A: Joined;
let B: Joined;
before(async () => {
  h = await startBoard({ flags: { ledgerFolders: false, readOnlyStart: true }, chat: { adapters: fake.adapters } });
  A = await h.join('Plans chat');
  B = await h.join('Other chat');
  const items = [
    { type: 'board', title: 'Plans', key: 'plans-board' },
    { type: 'region', region: { id: WALK_REGION, title: 'Ideas', mode: 'grid' }, key: 'plans-ideas' },
    { type: 'node', node: { region: WALK_REGION, kind: 'question', title: 'Which idea first?' }, key: 'plans-node' },
  ];
  assert.ok((await h.ok('write_board', { board: PLANS, body: { items } }, { as: A.client })).results.every((r: Rec) => r.ok));
  await h.ok('request_grant', { body: { board: PLANS, reason: 'Adding ideas.' } }, { as: B.client });
});
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const AGENT_OPS = agentOps(PLANS);
type Answers = Map<string, { status: number; body: unknown }>;
const folder = () => ledgerFolder(h.project);

/** Each agent operation's answer on "plans", as its maker and as another agent. */
async function walk(): Promise<Answers> {
  const out: Answers = new Map();
  for (const o of AGENT_OPS) for (const [who, as] of [['maker', A], ['other', B]] as const) out.set(`${o.id} (${who})`, await answer(h, o.id, o.input, as.client));
  return out;
}
const opOf = (name: string) => AGENT_OPS.find((o) => name.startsWith(`${o.id} `))!;
/** An answer without what moves on every line (`head`, a View's `version`) and without `readOnly`. */
function plain(a: { status: number; body: unknown }) {
  const { head: _h, readOnly: _r, ...rest } = (a.body ?? {}) as Rec;
  return { status: a.status, body: rest.view ? { ...rest, view: { ...rest.view, version: 0 } } : rest };
}
/** What read-only must leave as it was: the ledger file's bytes, the agents file and the ledger folder's listing. */
function disk() {
  const files = ledgerFiles(folder());
  const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  return { ledger: read(files.ledger), agents: read(files.agents), listing: fs.readdirSync(folder(), { recursive: true }).map(String).sort() };
}
let open: Answers;

test('editing (edit mode), every agent operation answers, no read says readOnly, and get_project is as before', async () => {
  await walk(); // writes what the walk writes (a node, a join, a request); walked again, it replays
  open = await walk();
  for (const [name, a] of open) assert.ok(a.status < 300, `${name} answered ${a.status}`);
  assert.doesNotMatch(JSON.stringify([...open.values()].map((a) => a.body)), /"readOnly"/);
  const project = await h.ok('get_project');
  assert.deepEqual([project.readOnly, project.editing], [undefined, undefined]);
});

test('Stop editing: the ledger is read-only; get_project says so, and that nobody is editing', async () => {
  const project = await h.ok('stop_editing');
  assert.deepEqual([project.readOnly, project.editing], [true, undefined]);
  assert.equal((await h.ok('get_project')).readOnly, true);
  assert.equal((await h.ok('stop_editing')).readOnly, true, 'twice changes nothing');
});

test('read-only, every agent write answers 409 `read-only` in the agent\'s words, join too, and nothing is written', async () => {
  const before = disk();
  const now = await walk();
  for (const [name, a] of now) {
    if (!opOf(name).writes) continue;
    const body = a.body as Rec;
    assert.deepEqual([a.status, body.type, body.title, body.detail], [409, 'https://vision-board.invalid/problems/read-only', 'Read-only', READ_ONLY], name);
  }
  assert.deepEqual(disk(), before, 'no line, no agent, no file');
});

test('read-only, every read answers as before, and says `readOnly: true`', async () => {
  const now = await walk();
  for (const [name, a] of now) {
    if (opOf(name).writes) continue;
    assert.deepEqual(plain(a), plain(open.get(name)!), name);
  }
  assert.equal((now.get('get_board (maker)')!.body as Rec).readOnly, true);
  assert.equal((now.get('list_boards (other)')!.body as Rec).readOnly, true);
  assert.equal((await h.ok('read_ledger', { after: 0 })).readOnly, true, 'the page learns it from its read');
});

/** The person's operations that write the ledger's folder, each with a call on "plans": refused while read-only. */
const PERSON_WRITES: Partial<Record<OperationId, Rec>> = {
  act: { board: PLANS, body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Why this one?' } },
  mark_seen: { board: PLANS, body: { n: 1, ver: 1 } },
  put_board: { board: PLANS, body: { title: 'Plans, renamed' } },
  retire_cards: { board: PLANS, body: { cards: [1] } },
  put_panel_state: { board: PLANS, n: 1, body: { state: { x: 1 } } },
  start_chat: { board: PLANS, body: { agent: 'claude' } },
  start_folder_chat: { body: { agent: 'claude' } },
};
/** The rest of the person's writes, and why they still go: none writes the ledger's folder (D-085 3). */
const STILL_GO: Partial<Record<OperationId, string>> = {
  open_project: 'opens a folder: read-only, with no lock (api-read-only start and switch below)',
  edit_ledger: 'is how the person leaves read-only', stop_editing: 'is how the person enters it',
  send_chat: 'the repo-wide chat; recorded as no Send while read-only (chat-sessions.ts deliver)',
  stop_chat: 'stops a turn', answer_approval: 'the repo-wide chat', ask_approval: 'the gate of a running turn',
  forget_permission: 'the repo-wide permissions file', attach_chat_file: 'the repo-wide attachments folder',
  call_app_tool: 'runs an app\'s tool; its allow is a ledger line, which the gate refuses',
};

test('every person write is either refused while read-only or named here with why it still goes', () => {
  const writes = ops.filter((o) => !o.op['x-agent'] && o.method !== 'GET').map((o) => o.id).sort();
  assert.deepEqual(writes, [...Object.keys(PERSON_WRITES), ...Object.keys(STILL_GO)].sort());
});

test('read-only, every person write of the ledger\'s folder answers 409 `read-only` in the person\'s words, writing nothing', async () => {
  const before = disk();
  for (const [id, input] of Object.entries(PERSON_WRITES) as [OperationId, Rec][]) {
    const refused = await h.fails(id, input, 409, 'read-only');
    assert.equal(id.includes('chat') ? /read-only.*Press Edit/.test(refused.detail) : refused.detail === READ_ONLY_PERSON, true, `${id}: ${refused.detail}`);
  }
  for (const action of ['flag', 'send', 'ack', 'lock']) {
    const body = { type: 'act', action, ...(action === 'send' || action === 'lock' ? { board: PLANS } : { n: 1, ver: 1 }) };
    await h.fails('act', { board: PLANS, body }, 409, 'read-only');
  }
  assert.deepEqual(fake.given(), [], 'no chat started');
  assert.deepEqual(disk(), before);
});

test('the ledger module itself refuses a line handed to it while read-only, from either caller', () => {
  const seq = h.ledger.state().seq;
  assert.throws(() => h.ledger.append({ type: 'join', label: 'Chat' }, { by: 'agent', agent: A.agent }), (err: any) => err.status === 409 && err.body.detail === READ_ONLY);
  assert.throws(() => h.ledger.append({ type: 'act', action: 'send', board: PLANS }, { by: 'person' }, { board: PLANS }), (err: any) => err.status === 409 && err.body.detail === READ_ONLY_PERSON);
  assert.equal(h.ledger.state().seq, seq);
});

/** A lock another computer's board server holds live on the ledger folder, as lock.ts writes one. */
function anotherComputer(): void {
  const now = new Date().toISOString();
  fs.writeFileSync(ledgerFiles(folder()).lock, `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4466, started: now, beat: now })}\n`);
}

test('Edit while another computer edits: `conflict` naming that computer; still read-only, and get_project says who', async () => {
  anotherComputer();
  try {
    const refused = await h.fails('edit_ledger', {}, 409, 'conflict');
    assert.match(refused.detail, /^Computer "another-computer" \(process 1, port 4466\) has been editing this ledger since .*, so it stays read-only here\. Press Edit again once it stops editing\.$/);
    assert.doesNotMatch(refused.detail, /Stop that server/, 'the person\'s words, not a second server\'s (READONLY_UI_01-R1)');
    const project = await h.ok('get_project');
    assert.equal(project.readOnly, true);
    assert.equal(project.editing.host, 'another-computer');
    await h.fails('write_board', { board: PLANS, body: { items: [] } }, 409, 'read-only', A.client);
  } finally { fs.rmSync(ledgerFiles(folder()).lock, { force: true }); }
});

test('Edit takes the lock; every answer is as before Stop editing (but the ledger\'s position), and Stop editing lets it go', async () => {
  const project = await h.ok('edit_ledger');
  assert.deepEqual([project.readOnly, project.editing], [undefined, undefined], 'edit mode: as before');
  const lock = JSON.parse(fs.readFileSync(ledgerFiles(folder()).lock, 'utf8'));
  assert.equal(lock.pid, process.pid);
  assert.equal((await h.ok('edit_ledger')).readOnly, undefined, 'twice changes nothing');
  const back = await walk();
  for (const [name, a] of back) {
    if (name.startsWith('join')) assert.equal(a.status, open.get(name)!.status, name);
    else assert.deepEqual(plain(a), plain(open.get(name)!), name);
  }
  await h.ok('stop_editing');
  assert.equal(fs.existsSync(ledgerFiles(folder()).lock), false, 'the lock let go');
  await h.ok('edit_ledger');
});

test('editing, a locked board still answers `locked` to an agent, and the person\'s flag still goes (D-043 unchanged)', async () => {
  const act = (body: Rec) => h.ok('act', { board: PLANS, body: { type: 'act', ...body } });
  await act({ action: 'lock', board: PLANS });
  const refused = await h.fails('write_board', { board: PLANS, body: { items: [{ type: 'node', node: { region: WALK_REGION, kind: 'question', title: 'More?' } }] } }, 423, 'locked', A.client);
  assert.equal(refused.detail, LOCKED);
  await act({ action: 'flag', n: 1 });
  await act({ action: 'unlock', board: PLANS });
});

test('a lock taken over by another computer (after a sleep) stops this server before its next line', async () => {
  anotherComputer();
  try {
    await h.fails('act', { board: PLANS, body: { type: 'act', action: 'unflag', n: 1 } }, 409, 'read-only');
    assert.equal((await h.ok('get_project')).editing.host, 'another-computer');
  } finally { fs.rmSync(ledgerFiles(folder()).lock, { force: true }); }
  await h.ok('stop_editing');
  await h.ok('edit_ledger');
  await h.ok('act', { board: PLANS, body: { type: 'act', action: 'unflag', n: 1 } });
});

test('a chat running when the person stops editing still takes a message: the words go alone, with no Send', async () => {
  const { session } = await h.ok('start_chat', { board: PLANS, body: { agent: 'claude' } });
  await h.ok('act', { board: PLANS, body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'This one first.' } });
  await h.ok('stop_editing');
  const seq = h.ledger.state().seq;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'What is on the board?' } });
  const run = await fake.run(1);
  assert.equal(h.ledger.state().seq, seq, 'no Send recorded, no join');
  assert.doesNotMatch(run.prompt, /This one first/, 'no answers handed over');
  assert.match(run.prompt, /What is on the board\?/);
  await h.ok('stop_chat', { session });
  await gone(run.pid);
  fake.mode('replay');
  await h.ok('edit_ledger');
});

test('a replaced ledger file is read again, and the project stream says `reset`', async () => {
  const file = ledgerFiles(folder()).ledger;
  const res = await fetch(`${h.base}/api/events`, { headers: { Cookie: h.cookie } });
  const reader = res.body!.getReader();
  const shorter = fs.readFileSync(file, 'utf8').split('\n').slice(0, 10).join('\n');
  fs.writeFileSync(`${file}.new`, `${shorter}\n`);
  fs.renameSync(`${file}.new`, file); // as git or a sync replaces a file
  assert.equal((await h.ok('list_boards')).head, 10, 'read again from the start');
  let text = '';
  while (!text.includes('event: reset')) text += new TextDecoder().decode((await reader.read()).value);
  assert.match(text, /event: reset\ndata: \{"seq":10\}/);
  await reader.cancel();
});
