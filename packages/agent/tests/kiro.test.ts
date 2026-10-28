// The Kiro adapter end to end against a fake `kiro-cli acp` (tests/fake-kiro.ts) replaying one
// recorded real turn: the handshake and the board's tool server in session/new (env as name/value
// pairs, the secret there only); the turn's updates; the permission requests answered through the board's approval route (the board's own
// tool without asking, a file change asked, the person's answer as the option); resuming with
// session/load and the servers again; cancel; the time limit; a tool server that never starts; a
// CLI that cannot start. N34: Kiro starts as the vision-board agent (`--agent`, its file in a temp
// home), on the chosen model (Opus 5.5 when none is), effort high; a missing agent or a model the
// session does not offer stops it before any prompt; the skill is the agent's, never in a message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AgentUpdate, Facts, KiroAdapterOptions, StartOptions } from '../src/index.ts';
import { createKiroAdapter, writeKiroAgent } from '../src/index.ts';
import { FAKE_KIRO, KIRO_DENIED, KIRO_DRAW, collect } from './support.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'agent-kiro-'));
const instructions = path.join(dir, 'instructions.md');
writeFileSync(instructions, '# Instructions\nDraw on the board.\n');
/** The home the fake looks in for `.kiro/agents/vision-board.json`; `bare` has none. */
const home = path.join(dir, 'home');
const bare = path.join(dir, 'bare');
writeKiroAgent(home, instructions);
let notes = 0;

/** A stand-in for the board's approval route: records the facts and the token, answers `approve`. */
async function gateServer(approve: boolean) {
  const asked: { facts: Facts; token: string | undefined }[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      asked.push({ facts: JSON.parse(body), token: req.headers.authorization });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(approve ? { approved: true, status: 'approved', scope: 'once' } : { approved: false, status: 'denied' }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/run/approvals`;
  return { asked, url, close: () => { server.closeAllConnections(); server.close(); } };
}

const START = (url = 'http://127.0.0.1:1/api/run/approvals'): StartOptions => ({
  cwd: dir,
  mcpServers: { 'vision-board': { command: '/usr/local/bin/node', args: ['vb-mcp.ts'], env: { VB_SERVER: 'http://127.0.0.1:4466', VB_AGENT_SECRET: 'not-a-real-secret' } } },
  instructionsFile: instructions,
  allowedTools: ['mcp__vision-board__*'],
  gate: { url, token: 'run-token' },
});

function fake(mode = 'replay', options: KiroAdapterOptions = {}, fixture = KIRO_DENIED, extra: NodeJS.ProcessEnv = {}) {
  const note = path.join(dir, `note-${++notes}.jsonl`);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, FAKE_KIRO_FIXTURE: fixture, FAKE_KIRO_MODE: mode, FAKE_KIRO_NOTE: note, ...extra };
  const adapter = createKiroAdapter({ command: { file: process.execPath, args: [FAKE_KIRO] }, env, log: () => {}, ...options });
  const given = (): any[] => (existsSync(note) ? readFileSync(note, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const sent = (method: string) => given().filter((n) => n.method === method);
  return { adapter, given, sent };
}

const kinds = (updates: AgentUpdate[]) => updates.map((u) => (u.type === 'tool' ? `${u.tool}:${u.state}` : u.type));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const until = async (what: () => boolean) => { for (let i = 0; i < 300 && !what(); i++) await new Promise((r) => setTimeout(r, 20)); };
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('a turn: handshake, the tool server in session/new, the person\'s words alone, the updates, the permissions answered', async () => {
  const gate = await gateServer(false);
  const { adapter, sent, given } = fake();
  assert.equal(adapter.agent, 'kiro');
  const session = await adapter.start(START(gate.url));
  assert.match(session.id, /^[a-z0-9][a-z0-9-]{0,63}$/);
  assert.deepEqual(sent('initialize')[0].params.clientCapabilities, {}, 'no fs or terminal offered');
  const [made] = sent('session/new');
  assert.equal(made.params.cwd, dir);
  assert.deepEqual(made.params.mcpServers, [{
    name: 'vision-board', command: '/usr/local/bin/node', args: ['vb-mcp.ts'],
    env: [{ name: 'VB_SERVER', value: 'http://127.0.0.1:4466' }, { name: 'VB_AGENT_SECRET', value: 'not-a-real-secret' }],
  }]);
  assert.ok(!made.args.join(' ').includes('not-a-real-secret'), 'the secret is not on the command line');

  const updates = await collect(session.prompt('Draw two cards.'));
  assert.deepEqual(kinds(updates), ['text', 'write_board:running', 'write:running', 'write_board:failed', 'write:failed', 'text', 'done']);
  assert.deepEqual(updates[0], { type: 'text', text: 'I\'ll draw the two cards and create the file in parallel.', interim: true });
  assert.deepEqual(updates[1], { type: 'tool', call: 'toolu-1', tool: 'write_board', state: 'running', board: 'pricing' });
  assert.deepEqual(updates[2], { type: 'tool', call: 'toolu-2', tool: 'write', state: 'running' });
  assert.deepEqual(updates[3], { type: 'tool', call: 'toolu-1', tool: 'write_board', state: 'failed', board: 'pricing' });
  assert.equal((updates[5] as { interim: boolean }).interim, false);
  assert.match((updates[5] as { text: string }).text, /^Both actions were denied/);
  assert.deepEqual(updates[6], { type: 'done', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });

  const [asked] = sent('session/prompt');
  assert.equal(asked.params.sessionId, session.id);
  assert.equal(asked.params.prompt[0].text, 'Draw two cards.', 'the skill is the agent\'s prompt, not the message\'s');
  // The board's own tool went ahead unasked; the file create was asked (facts, the run token), refused.
  assert.deepEqual(gate.asked.map((a) => [a.token, a.facts]), [[
    'Bearer run-token', { kind: 'write', op: 'create', path: '/private/work/project/note.txt', preview: 'hi\n' },
  ]]);
  const answers = Object.fromEntries(given().filter((n) => n.answered).map((n) => [n.answered, n.result.outcome.optionId]));
  assert.deepEqual(answers, { 'req-1': 'reject_once', 'req-2': 'allow_once' }, 'req-1 the file (denied), req-2 the board tool (allowed)');
  gate.close();
  session.close?.();
});

test('a real successful board write: its cards and head come from the update\'s rawOutput, so the chip can zoom', async () => {
  const { adapter, given } = fake('replay', {}, KIRO_DRAW);
  const session = await adapter.start(START());
  try {
    const updates = await collect(session.prompt('Add one card.'));
    assert.deepEqual(kinds(updates), ['text', 'write_board:running', 'write_board:done', 'text', 'done']);
    assert.deepEqual(updates[2], { type: 'tool', call: 'toolu-1', tool: 'write_board', state: 'done', board: 'pricing', cards: [20], head: 57 });
    assert.deepEqual(given().filter((n) => n.answered).map((n) => n.result.outcome.optionId), ['allow_once'], 'the board tool goes ahead unasked');
  } finally { session.close?.(); }
});

test('the person\'s yes is the one-time allow option, and only that', async () => {
  const gate = await gateServer(true);
  const { adapter, given } = fake();
  const session = await adapter.start(START(gate.url));
  await collect(session.prompt('go'));
  const options = given().filter((n) => n.answered).map((n) => n.result.outcome.optionId);
  assert.deepEqual(options.sort(), ['allow_once', 'allow_once']);
  gate.close();
  session.close?.();
});

test('an unreachable approval route is a refusal, never a yes', async () => {
  const { adapter, given } = fake();
  const session = await adapter.start(START());
  await collect(session.prompt('go'));
  assert.deepEqual(given().filter((n) => n.answered).map((n) => n.result.outcome.optionId).sort(), ['allow_once', 'reject_once']);
  session.close?.();
});

test('no message carries the instructions, in a new session or a loaded one', async () => {
  const { adapter, sent } = fake();
  const first = await adapter.start(START());
  await collect(first.prompt('one'));
  await collect(first.prompt('two'));
  assert.deepEqual(sent('session/prompt').map((p) => p.params.prompt[0].text), ['one', 'two']);
  first.close?.();
  const resumed = fake();
  const again = await resumed.adapter.start({ ...START(), sessionId: first.id });
  await collect(again.prompt('three'));
  assert.equal(resumed.sent('session/prompt')[0].params.prompt[0].text, 'three');
  again.close?.();
});

test('resume: session/load with the id and the tool servers again; the replayed history is not a turn', async () => {
  const { adapter, sent } = fake();
  const session = await adapter.start({ ...START(), sessionId: '00000000-0000-4000-8000-000000000001' });
  const [loaded] = sent('session/load');
  assert.equal(loaded.params.sessionId, '00000000-0000-4000-8000-000000000001');
  assert.equal(loaded.params.mcpServers[0].name, 'vision-board');
  assert.equal(loaded.params.mcpServers[0].env[1].name, 'VB_AGENT_SECRET');
  assert.equal(sent('session/new').length, 0);
  const updates = await collect(session.prompt('hi'));
  assert.ok(!updates.some((u) => u.type === 'text' && /earlier/.test(u.text)), 'replayed history is dropped');
  await assert.rejects(adapter.start({ ...START(), sessionId: 'Not A Session' }), /Not a session id/);
  session.close?.();
});

test('Kiro starts as the vision-board agent, on the chosen model (Opus 5.5 when none is), effort high', async () => {
  const { adapter, sent } = fake();
  const session = await adapter.start({ ...START(), model: 'claude-sonnet-5.5' });
  assert.deepEqual(sent('initialize')[0].args, ['--agent', 'vision-board', '--model', 'claude-sonnet-5.5', '--effort', 'high']);
  session.close?.();
  const plain = fake();
  const other = await plain.adapter.start(START());
  assert.deepEqual(plain.sent('initialize')[0].args.slice(-5), ['vision-board', '--model', 'claude-opus-5.5', '--effort', 'high']);
  other.close?.();
});

test('a missing vision-board agent (Kiro then starts kiro_default) stops the session before any prompt', async () => {
  const { adapter, sent, given } = fake('replay', {}, KIRO_DENIED, { HOME: bare });
  await assert.rejects(adapter.start(START()), /kiro_default, not the vision-board agent.*\.kiro\/agents\/vision-board\.json/s);
  assert.equal(sent('session/prompt').length, 0);
  const { pid } = given()[0];
  await until(() => !alive(pid));
  assert.equal(alive(pid), false, 'its process is ended');
});

test('a model the session does not offer is refused before any prompt; auto never runs', async () => {
  const { adapter, sent } = fake('replay', {}, KIRO_DENIED, { FAKE_KIRO_MODELS: 'auto,claude-sonnet-5.5' });
  await assert.rejects(adapter.start({ ...START(), model: 'claude-opus-5.5' }), /does not offer the model claude-opus-5\.5.*auto, claude-sonnet-5\.5/s);
  await assert.rejects(adapter.start({ ...START(), model: 'auto' }), /auto/);
  assert.equal(sent('session/prompt').length, 0);
  assert.ok(!sent('initialize').some((n) => n.args.includes('auto')), 'auto never reaches the command line');
});

test('cancel: session/cancel ends the turn stopped; close ends the process', async () => {
  const { adapter, sent, given } = fake('hang');
  const session = await adapter.start(START());
  const turn = collect(session.prompt('wait'));
  await until(() => sent('session/prompt').length > 0);
  session.cancel();
  assert.deepEqual(kinds(await turn), ['text', 'stopped']);
  assert.equal(sent('session/cancel')[0].params.sessionId, session.id);
  const { pid } = given()[0];
  assert.equal(alive(pid), true, 'the process stays for the next turn');
  session.close?.();
  await until(() => !alive(pid));
  assert.equal(alive(pid), false);
});

test('cancel: a Kiro that ignores it is killed after the grace', async () => {
  const { adapter, sent, given } = fake('stubborn', { killGraceMs: 200 });
  const session = await adapter.start(START());
  const turn = collect(session.prompt('wait'));
  await until(() => sent('session/prompt').length > 0);
  await new Promise((r) => setTimeout(r, 300));
  const at = Date.now();
  session.cancel();
  assert.deepEqual(kinds(await turn), ['stopped']);
  assert.ok(Date.now() - at >= 150, 'the kill waited for the grace');
  assert.equal(alive(given()[0].pid), false);
  session.close?.();
});

test('a Kiro that ended between turns is started again and the session loaded', async () => {
  const { adapter, sent, given } = fake();
  const session = await adapter.start(START());
  await collect(session.prompt('one'));
  const { pid } = given()[0];
  process.kill(pid);
  await until(() => !alive(pid));
  const updates = await collect(session.prompt('two'));
  assert.equal(updates.at(-1)?.type, 'done');
  const [loaded] = sent('session/load');
  assert.deepEqual([loaded.params.sessionId, loaded.params.mcpServers[0].name], [session.id, 'vision-board']);
  assert.equal(sent('session/prompt')[1].params.prompt[0].text, 'two');
  session.close?.();
});

test('the time limit stops a turn that runs too long, as an error', async () => {
  const { adapter } = fake('hang', { turnLimitMs: 300 });
  const session = await adapter.start(START());
  const updates = await collect(session.prompt('wait'));
  assert.deepEqual(kinds(updates), ['text', 'error']);
  assert.match((updates[1] as { message: string }).message, /did not finish within 0 minutes and was stopped/);
  session.close?.();
});

/** A stand-in for the board while a question waits: tells the session to hold, answers after `ms`
 * (yes), tells it to go on. `answered` says whether the answer was sent. */
async function slowGate(ms: number, hold: (on: boolean) => void) {
  const state = { answered: false, asks: 0 };
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      state.asks++;
      hold(true);
      const timer = setTimeout(() => {
        state.answered = true;
        hold(false);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ approved: true, status: 'approved', scope: 'once' }));
      }, ms);
      res.on('close', () => clearTimeout(timer));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/run/approvals`;
  return { state, url, close: () => { server.closeAllConnections(); server.close(); } };
}

test('questions wait: a permission request held for 2.5 times the limit does not stop the turn (hold)', async () => {
  const { adapter } = fake('replay', { turnLimitMs: 300 });
  let session: Awaited<ReturnType<typeof adapter.start>> | undefined;
  const gate = await slowGate(750, (on) => session?.hold?.(on));
  session = await adapter.start({ ...START(gate.url), approvalHold: true });
  const updates = await collect(session.prompt('go'));
  assert.equal(gate.state.answered, true);
  assert.equal(updates.at(-1)?.type, 'done', kinds(updates).join(','));
  gate.close();
  session.close?.();
});

test('questions wait: without hold the same wait is stopped at the limit (today)', async () => {
  const { adapter } = fake('replay', { turnLimitMs: 300 });
  const gate = await slowGate(750, () => {});
  const session = await adapter.start(START(gate.url));
  const updates = await collect(session.prompt('go'));
  assert.equal(updates.at(-1)?.type, 'error');
  assert.match((updates.at(-1) as { message: string }).message, /did not finish within/);
  gate.close();
  session.close?.();
});

test('questions wait: Stop while a question waits cuts the wait; nothing is answered for the person', async () => {
  const { adapter, sent } = fake('replay', { turnLimitMs: 300 });
  let session: Awaited<ReturnType<typeof adapter.start>> | undefined;
  const gate = await slowGate(60_000, (on) => session?.hold?.(on));
  session = await adapter.start({ ...START(gate.url), approvalHold: true });
  const turn = collect(session.prompt('go'));
  await until(() => gate.state.asks > 0);
  session.cancel();
  const updates = await turn; // the wait ended at once (the fake ignores session/cancel, as a Kiro that answers late)
  assert.equal(sent('session/cancel').length, 1);
  assert.equal(gate.state.answered, false, 'the question was not answered for the person');
  assert.notEqual(updates.at(-1)?.type, 'error');
  gate.close();
  session.close?.();
});

test('a tool server that never starts ends the turn in an error before anything is sent', async () => {
  const { adapter, sent } = fake('no-servers', { serversWaitMs: 300 });
  const session = await adapter.start(START());
  assert.deepEqual(await collect(session.prompt('hi')), [{ type: 'error', message: 'The vision-board tool server did not start in Kiro, so the turn was not run.' }]);
  assert.equal(sent('session/prompt').length, 0);
  session.close?.();
});

test('a CLI that cannot start is an error from start', async () => {
  const adapter = createKiroAdapter({ command: { file: path.join(dir, 'no-such-kiro') }, env: {}, log: () => {} });
  await assert.rejects(adapter.start(START()), /Kiro could not be started: .*ENOENT/);
});
