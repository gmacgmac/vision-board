// The Claude adapter end to end against a fake CLI (tests/fake-claude.ts) replaying the recorded
// turns: one process per prompt, the prompt on stdin, new then resumed, the gate's route and token
// in its environment, the MCP config a private file that is gone after the turn; the API-key
// refusal; cancel (SIGTERM, then SIGKILL); the time limit; the session-flag retry; a CLI that
// cannot start; an MCP server that did not connect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AgentUpdate, ClaudeAdapterOptions, StartOptions } from '../src/index.ts';
import { createClaudeAdapter } from '../src/index.ts';
import { DRAW, FAKE_CLAUDE, REFUSED, collect } from './support.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'agent-claude-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));
let notes = 0;

const START: StartOptions = {
  cwd: dir,
  mcpServers: { 'vision-board': { command: 'node', args: ['vb-mcp.ts'], env: { VB_AGENT_SECRET: 'not-a-real-secret' } } },
  allowedTools: ['mcp__vision-board__*'],
  gate: { url: 'http://127.0.0.1:1/api/run/approvals', token: 'run-token' },
};

/** An adapter over the fake CLI; `note` is where the fake writes what it was given. */
function fake(fixture: string, mode = 'replay', options: ClaudeAdapterOptions = {}) {
  const note = path.join(dir, `note-${++notes}.jsonl`);
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CONFIG_DIR: dir, FAKE_CLAUDE_FIXTURE: fixture, FAKE_CLAUDE_MODE: mode, FAKE_CLAUDE_NOTE: note };
  delete env.ANTHROPIC_API_KEY;
  const adapter = createClaudeAdapter({ command: { file: process.execPath, args: [FAKE_CLAUDE] }, env, log: () => {}, ...options });
  const given = () => (existsSync(note) ? readFileSync(note, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  return { adapter, given };
}

const kinds = (updates: AgentUpdate[]) => updates.map((u) => (u.type === 'tool' ? `${u.tool}:${u.state}` : u.type));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('a turn: one CLI process, the prompt on stdin, the gate in its environment, the updates streamed', async () => {
  const { adapter, given } = fake(DRAW);
  assert.equal(adapter.agent, 'claude');
  const session = await adapter.start(START);
  assert.match(session.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const updates = await collect(session.prompt('Draw two cards.'));
  assert.deepEqual(kinds(updates), ['ToolSearch:running', 'ToolSearch:done', 'write_board:running', 'write_board:done', 'text', 'done']);
  const [note] = given();
  assert.equal(note.prompt, 'Draw two cards.');
  assert.ok(!note.args.includes('Draw two cards.'), 'the prompt is not on the command line');
  assert.deepEqual(note.args.slice(4, 6), ['--session-id', session.id]);
  assert.deepEqual(note.gate, { url: START.gate.url, token: 'run-token' });
  assert.deepEqual(note.mcpConfig, { mcpServers: START.mcpServers });
  assert.ok(!existsSync(note.args[note.args.indexOf('--mcp-config') + 1]), 'the MCP config file is removed after the turn');
});

test('the second turn resumes the session; a session id given to start resumes it', async () => {
  const { adapter, given } = fake(REFUSED);
  const session = await adapter.start(START);
  await collect(session.prompt('one'));
  assert.deepEqual(kinds(await collect(session.prompt('two'))), ['Write:running', 'Write:failed', 'text', 'done']);
  assert.deepEqual(given().map((n) => n.args[4]), ['--session-id', '--resume']);
  const again = fake(REFUSED, 'new-in-use');
  const resumed = await again.adapter.start({ ...START, sessionId: session.id });
  assert.equal(resumed.id, session.id);
  assert.equal((await collect(resumed.prompt('three'))).at(-1)!.type, 'done');
  await assert.rejects(adapter.start({ ...START, sessionId: '../../etc' }), /Not a session id/);
});

test('when the CLI refuses the session flag, the turn runs once more with the other', async () => {
  const { adapter, given } = fake(DRAW, 'new-in-use');
  const session = await adapter.start({ ...START, sessionId: '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37' });
  const updates = await collect(session.prompt('hi'));
  assert.equal(updates.at(-1)!.type, 'done');
  assert.deepEqual(given().map((n) => n.args[4]), ['--session-id', '--resume'], 'no transcript on disk, so new first, then resumed');
});

test('ANTHROPIC_API_KEY set: start refuses, unless allowed', async () => {
  const env = { ...process.env, ANTHROPIC_API_KEY: 'sk-not-real' };
  await assert.rejects(createClaudeAdapter({ env }).start(START), /ANTHROPIC_API_KEY is set/);
  assert.ok(await createClaudeAdapter({ env, allowApiKey: true }).start(START));
});

test('one turn at a time', async () => {
  const { adapter } = fake(DRAW, 'hang');
  const session = await adapter.start(START);
  const first = session.prompt('a')[Symbol.asyncIterator]();
  const pending = first.next();
  await assert.rejects(session.prompt('b')[Symbol.asyncIterator]().next(), /already running/);
  session.cancel();
  await pending;
  await collect({ [Symbol.asyncIterator]: () => first });
});

test('cancel: SIGTERM ends the CLI and the turn ends stopped', async () => {
  const { adapter, given } = fake(DRAW, 'hang');
  const session = await adapter.start(START);
  session.cancel();
  const turn = collect(session.prompt('wait'));
  while (given().length === 0) await new Promise((r) => setTimeout(r, 20));
  session.cancel();
  assert.deepEqual(kinds(await turn), ['stopped']);
  assert.equal(alive(given()[0].pid), false);
});

test('cancel: a CLI that ignores SIGTERM is killed after the grace', async () => {
  const { adapter, given } = fake(DRAW, 'stubborn', { killGraceMs: 200 });
  const session = await adapter.start(START);
  const turn = collect(session.prompt('wait'));
  while (given().length === 0) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 300)); // the fake has set its SIGTERM handler
  const at = Date.now();
  session.cancel();
  assert.deepEqual(kinds(await turn), ['stopped']);
  assert.ok(Date.now() - at >= 150, 'SIGKILL waited for the grace');
  assert.equal(alive(given()[0].pid), false);
});

test('the time limit stops a turn that runs too long, as an error', async () => {
  const { adapter } = fake(DRAW, 'hang', { turnLimitMs: 300 });
  const session = await adapter.start(START);
  const updates = await collect(session.prompt('wait'));
  assert.equal(updates.length, 1);
  assert.match((updates[0] as { message: string }).message, /did not finish within 0 seconds and was stopped/);
});

test('a CLI that cannot start, and an MCP server that did not connect, end in errors', async () => {
  const missing = createClaudeAdapter({ command: { file: path.join(dir, 'no-such-claude') }, env: {}, log: () => {} });
  const [only] = await collect((await missing.start(START)).prompt('hi'));
  assert.match((only as { message: string }).message, /could not be started: .*ENOENT/);
  const { adapter } = fake(DRAW, 'replay');
  const other = await adapter.start({ ...START, mcpServers: { ...START.mcpServers, extra: { command: 'node' } } });
  assert.deepEqual(await collect(other.prompt('hi')), [{ type: 'error', message: 'The extra tool server did not connect (status: not registered), so the turn was stopped.' }]);
});

test('questions wait: the time limit counts only the agent\'s own working time (hold)', async () => {
  const { adapter, given } = fake(DRAW, 'hang', { turnLimitMs: 400 });
  const session = await adapter.start(START);
  const turn = collect(session.prompt('wait'));
  while (given().length === 0) await new Promise((r) => setTimeout(r, 20));
  session.hold?.(true);
  await new Promise((r) => setTimeout(r, 1_000));
  assert.ok(alive(given()[0].pid), 'a question waiting for 2.5 times the limit did not stop the turn');
  session.hold?.(false);
  const updates = await turn;
  assert.deepEqual(updates.map((u) => u.type), ['error']);
  assert.match((updates[0] as { message: string }).message, /did not finish within/, 'the time left after the wait still runs out');
});

test('questions wait: Stop ends a held turn at once', async () => {
  const { adapter, given } = fake(DRAW, 'hang', { turnLimitMs: 400 });
  const session = await adapter.start(START);
  const turn = collect(session.prompt('wait'));
  while (given().length === 0) await new Promise((r) => setTimeout(r, 20));
  session.hold?.(true);
  session.cancel();
  assert.deepEqual(kinds(await turn), ['stopped']);
  assert.equal(alive(given()[0].pid), false);
});

test('hold with no turn running does nothing; the next turn starts with its clock running', async () => {
  const { adapter } = fake(DRAW, 'hang', { turnLimitMs: 300 });
  const session = await adapter.start(START);
  session.hold?.(true);
  const updates = await collect(session.prompt('wait'));
  assert.match((updates[0] as { message: string }).message, /did not finish within/);
});

test('approvalHold: the gate is told to wait as long as the hook does', async () => {
  const on = fake(DRAW);
  await collect((await on.adapter.start({ ...START, approvalHold: true })).prompt('hi'));
  const hook = JSON.parse(on.given()[0].args[on.given()[0].args.indexOf('--settings') + 1]).hooks.PreToolUse[0].hooks[0];
  assert.equal(hook.timeout, 86_400);
  assert.equal(on.given()[0].gateWaitMs, String((86_400 - 15) * 1000));
  const off = fake(DRAW);
  await collect((await off.adapter.start(START)).prompt('hi'));
  const was = JSON.parse(off.given()[0].args[off.given()[0].args.indexOf('--settings') + 1]).hooks.PreToolUse[0].hooks[0];
  assert.equal(was.timeout, 600);
  assert.equal(off.given()[0].gateWaitMs, undefined, 'off, the gate keeps its own 585 s');
});
