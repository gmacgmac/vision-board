// The agent's access on the board server, end to end (D-066; agent-access WIRE_01): a session runs the
// agent package's fake `claude`, and bin/gate.ts is run as that CLI would run it, with the environment
// it was given, against the server's approval route. The access rules decide first (a refusal says why
// and asks nobody; an allowed read goes unasked), the server decides again (the gate's route, called
// directly), a kept yes is narrow, and "for this folder" is kept across sessions and a restart, listed
// and forgotten. With both flags off, the gate is strict and a question lapses.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GATE_BIN, GATE_STRICT_ENV, GATE_WAIT_ENV, accessFor, policy } from '#agent';
import { createClient } from '#client';
import { makeTempDir } from '#format/testing';
import { openLedger } from '../server/ledger.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event, Given } from './chat-support.ts';
import { ask, fakeChat, readChat } from './chat-support.ts';
import { personCookie, startTestBoard } from './test-board.ts';

const config = makeTempDir('vb-chat-access-');
const outside = makeTempDir('vb-outside-');
const fake = fakeChat(config);
let h: Harness;
let session: string;
let run: Given;
let seen = 0;

before(async () => {
  h = await startBoard({ chat: { adapters: fake.adapters } });
  for (const f of ['.env', 'src/a.ts', 'docs/readme.md']) {
    fs.mkdirSync(path.dirname(path.join(h.project, f)), { recursive: true });
    fs.writeFileSync(path.join(h.project, f), 'x\n');
  }
  fs.writeFileSync(path.join(outside, 'notes.txt'), 'x\n');
  session = (await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } })).session;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'Tidy up.' } });
  run = await fake.run(1);
});
after(async () => { await h.close(); for (const d of [config, outside]) fs.rmSync(d, { recursive: true, force: true }); });

/** Run the gate as `given`'s CLI would for one tool call; its decision and reason. */
function gate(tool: string, input: Record<string, unknown>, given = run): Promise<[string, string]> {
  const child = spawn(process.execPath, ['--no-warnings', GATE_BIN], { env: { PATH: process.env.PATH ?? '', ...given.gateEnv } });
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stdin.end(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input, cwd: given.cwd }));
  return new Promise((resolve) => child.once('close', () => {
    const d = JSON.parse(out).hookSpecificOutput;
    resolve([d.permissionDecision, d.permissionDecisionReason]);
  }));
}

/** The next approval request on `id`'s stream. */
async function nextRequest(id = session): Promise<Event> {
  const events = await readChat(h.base, h.cookie, id, (ev) => ev.some((e) => e.kind === 'approval_request'), id === session ? seen : 0);
  const request = events.find((e) => e.kind === 'approval_request')!;
  if (id === session) seen = request.seq;
  return request;
}

/** A gate call that asks: its request, answered with `answer`; the gate's decision. */
async function asked(tool: string, input: Record<string, unknown>, answer: Record<string, unknown>, id = session, given = run) {
  const pending = gate(tool, input, given);
  const request = await nextRequest(id);
  const result = await h.ok('answer_approval', { session: id, approval: request.approvalId, body: answer });
  if (id === session) seen = result.seq;
  return { request, decision: await pending };
}

const ALLOWED = 'The board\'s access rules allow it.';
/** What the agent is told when a row refuses it. */
const why = (rel: string, op: 'read' | 'write') => accessFor(rel, op).rule.why;
/** What the agent is told for a git command (346), as the policy says it. */
const GIT_REFUSAL = (policy({ kind: 'command', command: 'git status', risks: [], paths: [] }, process.cwd()) as { refuse: string }).refuse;
const at = (rel: string) => path.join(h.project, rel);

test('Claude\'s Read: .env refused, a file in the folder allowed without a question, a file outside asked', async () => {
  assert.deepEqual(await gate('Read', { file_path: '.env' }), ['deny', why('.env', 'read')]);
  assert.deepEqual(await gate('Read', { file_path: at('src/a.ts') }), ['allow', ALLOWED]);
  assert.deepEqual(await gate('Grep', { pattern: 'x', path: 'src' }), ['allow', ALLOWED]);
  const { request, decision } = await asked('Read', { file_path: path.join(outside, 'notes.txt') }, { approved: true });
  assert.deepEqual(request.facts, { kind: 'read', path: path.join(outside, 'notes.txt') });
  assert.deepEqual(request.scopes, ['once', 'session'], 'outside the folder: never for the folder');
  assert.equal('expiresAt' in request, false, 'approvalHold is on: it waits');
  assert.deepEqual(decision, ['allow', 'The person allowed it.']);
});

test('VERIFY_01 (Run 3): a command naming a path outside is offered once only; a search of the parent is refused; the CLI\'s tools are only the chat\'s', async () => {
  const outsideCat = await asked('Bash', { command: `cat ${path.join(outside, 'notes.txt')}` }, { approved: true });
  assert.deepEqual(outsideCat.request.scopes, ['once'], 'F2');
  const parent = await gate('Bash', { command: `grep -r SECRET ${path.dirname(h.project)}` });
  assert.equal(parent[0], 'deny', 'F3');
  assert.match(parent[1], /^Searching /);
  assert.equal((await gate('Grep', { pattern: 'x', path: path.dirname(h.project) }))[0], 'deny', 'F3, Claude\'s Grep');
  assert.equal(run.args[run.args.indexOf('--tools') + 1], 'ToolSearch,Write,Edit,MultiEdit,NotebookEdit,Bash,Read,Glob,Grep', 'F8');
  assert.equal(run.gateEnv.AGENT_GATE_FOLDER !== undefined, true);
});

test('a write yes for this session covers its folder only, and never the ledger', async () => {
  assert.deepEqual((await asked('Write', { file_path: 'src/a.ts', content: 'y' }, { approved: true, scope: 'session' })).decision, ['allow', 'The person allowed it.']);
  assert.deepEqual(await gate('Edit', { file_path: 'src/b.ts', old_string: '', new_string: 'z' }), ['allow', 'The person allowed it.'], 'src/b.ts: kept');
  assert.deepEqual((await asked('Write', { file_path: 'docs/x.md', content: 'y' }, { approved: false })).decision[0], 'deny', 'docs/x.md: asked');
  assert.deepEqual(await gate('Write', { file_path: '.visionboard/ledger.jsonl', content: '{}' }), ['deny', why('.visionboard/ledger.jsonl', 'write')]);
  const direct = await ask(h.base, run.gate.token, { kind: 'write', op: 'append', path: at('.visionboard/ledger.jsonl') });
  assert.deepEqual(await direct.json(), { approved: false, status: 'denied', asked: false }, 'the server decides again, whatever the gate did');
});

test('a command yes for npm test covers npm test -- foo, not npm run build; cat .env is refused', async () => {
  assert.equal((await asked('Bash', { command: 'npm test' }, { approved: true, scope: 'session' })).decision[0], 'allow');
  assert.deepEqual(await gate('Bash', { command: 'npm test -- foo' }), ['allow', 'The person allowed it.']);
  assert.equal((await asked('Bash', { command: 'npm run build' }, { approved: false })).decision[0], 'deny');
  const cat = await gate('Bash', { command: 'cat .env' });
  assert.equal(cat[0], 'deny');
  assert.ok(cat[1].startsWith('The command names .env.') && cat[1].endsWith(why('.env', 'read')), cat[1]);
  const py = await asked('Bash', { command: 'python3 tidy.py' }, { approved: true });
  assert.deepEqual(py.request.scopes, ['once'], 'an interpreter is never remembered');
  const rm = await asked('Bash', { command: 'rm -rf build' }, { approved: true });
  assert.deepEqual(rm.request.scopes, ['once'], 'a command acting on its targets is asked every time (Run 2)');
  for (const c of ['git status', 'git -C . commit -m x', 'cd src && git log']) {
    assert.deepEqual(await gate('Bash', { command: c }), ['deny', GIT_REFUSAL], `${c}: git is the person's (346)`);
  }
  assert.deepEqual(await gate('Read', { file_path: '.git/config' }), ['deny', why('.git/config', 'read')]);
});

test('for this folder: kept across a new session and a restart, listed, and forgotten', async () => {
  const { request } = await asked('Write', { file_path: 'lib/a.ts', content: 'y' }, { approved: true, scope: 'folder' });
  assert.deepEqual(request.scopes, ['once', 'session', 'folder']);
  const { permissions } = await h.ok('list_permissions', {});
  assert.deepEqual(permissions.map((p: { kind: string; path: string }) => [p.kind, p.path]), [['write', 'lib']]);
  fake.mode('replay');
  const next = (await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } })).session;
  fake.mode('hang');
  await h.ok('send_chat', { session: next, body: { text: 'Go on.' } });
  const second = await fake.run(2);
  assert.deepEqual(await gate('Write', { file_path: 'lib/b.ts', content: 'y' }, second), ['allow', 'The person allowed it.'], 'a new session: unasked');
  const restarted = await startTestBoard({ ledger: openLedger(h.ledger.file, () => {}), dist: h.dist, chat: { adapters: fake.adapters } });
  try {
    const cookie = await personCookie(restarted.base);
    const person = createClient({ base: restarted.base, fetch: (url, init) => fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: cookie } }) });
    assert.deepEqual(await person.call('list_permissions', {}), { permissions }, 'read back after a restart');
  } finally { await restarted.close(); }
  assert.deepEqual(await h.ok('forget_permission', { body: { id: permissions[0].id } }), { permissions: [] });
  await h.fails('forget_permission', { body: { id: permissions[0].id } }, 404, 'not-found');
  const again = gate('Write', { file_path: 'lib/c.ts', content: 'y' }, second);
  await nextRequest(next);
  await h.ok('stop_chat', { session: next });
  assert.equal((await again)[0], 'deny', 'forgotten: asked again');
});

test('both flags off: the gate is strict (an allowed read is asked) and a question lapses', async () => {
  const off = await startBoard({ chat: { adapters: fake.adapters, approvalTtlMs: 50 }, flags: { agentAccessRules: false, approvalHold: false } });
  try {
    fs.mkdirSync(path.join(off.project, 'src'));
    fs.writeFileSync(path.join(off.project, 'src', 'a.ts'), 'x\n');
    const id = (await off.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } })).session;
    const runs = fake.given().length;
    await off.ok('send_chat', { session: id, body: { text: 'Look.' } });
    const given = await fake.run(runs + 1);
    assert.equal(given.gateEnv[GATE_STRICT_ENV], '1');
    assert.equal(given.gateEnv[GATE_WAIT_ENV], undefined);
    assert.deepEqual(await gate('Read', { file_path: '.env' }, given), ['deny', why('.env', 'read')], 'refusals hold either way');
    const [decision, reason] = await gate('Read', { file_path: path.join(off.project, 'src/a.ts') }, given);
    assert.deepEqual([decision, reason], ['deny', 'Denied: nobody answered in time, and silence is a denial here. Do not retry it, and do not work around it.']);
  } finally { await off.close(); }
});
