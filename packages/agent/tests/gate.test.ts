// The gate (PLAN ruling 5): the facts it sends for each gated tool, the decision it prints for
// each answer, and every way of not getting a yes (no route, an unreachable host, a refusal, a bad
// answer, a gate that cannot start) ending in a denial. bin/gate.ts is run as the CLI runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ApprovalOutcome, Facts } from '../src/index.ts';
import { GATE_BIN, GATE_TOKEN_ENV, GATE_URL_ENV, GATE_WAIT_MS, PREVIEW_MAX, RELEASED_REFUSAL, UNREACHABLE, askOverHttp, decide, factsFor, gateSettings, runGate } from '../src/index.ts';
import { GATE_WAIT_ENV, gateWaitFrom } from '../src/gate.ts';

const hook = (tool_name: string, tool_input: Record<string, unknown>) => ({ hook_event_name: 'PreToolUse', tool_name, tool_input, cwd: '/home/someone/project' });
const none = () => false;

test('facts for each gated tool: a write\'s op, path and preview; a command as it would run', () => {
  assert.deepEqual(factsFor(hook('Write', { file_path: '/home/someone/project/a.md', content: 'hello\n' }), none),
    { kind: 'write', op: 'create', path: '/home/someone/project/a.md', preview: 'hello\n' });
  assert.equal((factsFor(hook('Write', { file_path: 'a.md', content: 'x' }), () => true) as Facts & { op: string }).op, 'replace');
  assert.deepEqual(factsFor(hook('Edit', { file_path: 'notes/a.md', old_string: 'old\nline', new_string: 'new' }), none),
    { kind: 'write', op: 'edit', path: '/home/someone/project/notes/a.md', preview: '- old\n- line\n+ new' });
  assert.deepEqual(factsFor(hook('MultiEdit', { file_path: '/p/a.md', edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: '' }] }), none),
    { kind: 'write', op: 'edit', path: '/p/a.md', preview: '- a\n+ b\n\n- c' });
  assert.deepEqual(factsFor(hook('NotebookEdit', { notebook_path: '/p/n.ipynb', new_source: 'print(1)' }), none),
    { kind: 'write', op: 'edit', path: '/p/n.ipynb', preview: '+ print(1)' });
  assert.deepEqual(factsFor(hook('Bash', { command: 'rm -rf build' }), none), { kind: 'command', command: 'rm -rf build', risks: [], paths: [] });
  assert.deepEqual(factsFor(hook('Write', { file_path: '/p/empty', content: '' }), none), { kind: 'write', op: 'create', path: '/p/empty' }, 'nothing to preview');
  const long = factsFor(hook('Write', { file_path: '/p/big', content: 'x'.repeat(5000) }), none) as { preview: string };
  assert.equal(long.preview.length, PREVIEW_MAX);
  assert.ok(long.preview.endsWith('…'));
});

test('refused without asking: an unknown tool, an unreadable call, a path or command that cannot be shown', () => {
  const refused = (input: unknown) => 'refuse' in (factsFor(input, none) as object);
  assert.ok(refused(hook('Read', { file_path: '/p/a' })));
  assert.ok(refused(hook('Bash', { command: '  ' })));
  assert.ok(refused(hook('Bash', { command: 'x'.repeat(20_001) })));
  assert.ok(refused(hook('Write', { file_path: '/p/a‮b.md', content: 'x' })), 'a text-direction character');
  assert.ok(refused(hook('Write', { file_path: '/p/a\nb.md', content: 'x' })), 'a line break');
  assert.ok(refused(hook('Write', {})));
  assert.ok(refused({ tool_name: 'Write' }));
  assert.ok(refused('nonsense'));
});

const decided = (out: Awaited<ReturnType<typeof decide>>) => [out.hookSpecificOutput.permissionDecision, out.hookSpecificOutput.permissionDecisionReason];
const answer = (outcome: ApprovalOutcome) => async () => outcome;
const WRITE = JSON.stringify(hook('Write', { file_path: '/p/a.md', content: 'hi' }));

test('the decision: allow only on a yes; a no, a lapse and a release each say why', async () => {
  assert.deepEqual(decided(await decide(WRITE, answer({ approved: true, status: 'approved', scope: 'once' }), none)), ['allow', 'The person allowed it.']);
  assert.deepEqual(decided(await decide(WRITE, answer({ approved: false, status: 'denied' }), none)), ['deny', 'Denied: the person said no. Do not retry it, and do not work around it.']);
  assert.match(decided(await decide(WRITE, answer({ approved: false, status: 'expired' }), none))[1]!, /nobody answered in time/);
  assert.deepEqual(decided(await decide(WRITE, answer({ approved: false, status: 'released' }), none)), ['deny', RELEASED_REFUSAL]);
  assert.deepEqual(decided(await decide(WRITE, async () => { throw new Error('ECONNREFUSED'); }, none)), ['deny', UNREACHABLE]);
  assert.equal(decided(await decide('{not json', answer({ approved: true, status: 'approved' }), none))[0], 'deny');
  assert.equal(decided(await decide(JSON.stringify(hook('Read', {})), answer({ approved: true, status: 'approved' }), none))[0], 'deny', 'never asks for a tool it does not know');
});

/** A local approval route that records what it was sent and answers with `reply`. */
async function route(reply: (body: unknown) => { status: number; body: string }) {
  const seen: { auth?: string; body: unknown }[] = [];
  const server = http.createServer((req, res) => {
    let text = '';
    req.on('data', (c) => { text += c; });
    req.on('end', () => {
      const body = JSON.parse(text);
      seen.push({ auth: req.headers.authorization, body });
      const r = reply(body);
      res.writeHead(r.status, { 'Content-Type': 'application/json' }).end(r.body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/run/approvals`;
  return { url, seen, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

test('askOverHttp posts the facts with the run token and reads the outcome; anything else throws', async () => {
  const ok = await route(() => ({ status: 200, body: JSON.stringify({ approved: true, status: 'approved', approvalId: 'ap-1', scope: 'once' }) }));
  try {
    const facts: Facts = { kind: 'command', command: 'ls', risks: [], paths: [] };
    assert.deepEqual(await askOverHttp(ok.url, 'run-token')(facts), { approved: true, status: 'approved', approvalId: 'ap-1', scope: 'once' });
    assert.deepEqual(ok.seen, [{ auth: 'Bearer run-token', body: facts }]);
  } finally { await ok.close(); }
  const no = await route(() => ({ status: 401, body: '{}' }));
  try { await assert.rejects(askOverHttp(no.url, 'wrong')({ kind: 'command', command: 'ls', risks: [], paths: [] }), /answered 401/); } finally { await no.close(); }
  const odd = await route(() => ({ status: 200, body: '{"ok":true}' }));
  try { await assert.rejects(askOverHttp(odd.url, 't')({ kind: 'command', command: 'ls', risks: [], paths: [] }), /no `approved`/); } finally { await odd.close(); }
});

/** Run bin/gate.ts as the CLI does: the hook input on stdin, the route in the environment. */
function gate(input: unknown, env: Record<string, string>) {
  const r = spawnSync(process.execPath, ['--no-warnings', GATE_BIN], { input: JSON.stringify(input), env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8' });
  return { status: r.status, out: JSON.parse(r.stdout).hookSpecificOutput as { permissionDecision: string; permissionDecisionReason: string } };
}

test('bin/gate.ts: allowed, denied, unreachable and unconfigured, as the CLI reads them', async () => {
  const seenFacts: unknown[] = [];
  const server = await route((body) => {
    seenFacts.push(body);
    const yes = (body as { command?: string }).command === 'ls';
    return { status: 200, body: JSON.stringify(yes ? { approved: true, status: 'approved' } : { approved: false, status: 'denied' }) };
  });
  const env = { [GATE_URL_ENV]: server.url, [GATE_TOKEN_ENV]: 'run-token' };
  try {
    const allowed = await runAsync(hook('Bash', { command: 'ls' }), env);
    assert.deepEqual([allowed.status, allowed.out.permissionDecision], [0, 'allow']);
    const denied = await runAsync(hook('Bash', { command: 'rm -rf build' }), env);
    assert.deepEqual([denied.status, denied.out.permissionDecision], [0, 'deny']);
    assert.equal(seenFacts.length, 2);
  } finally { await server.close(); }
  const unreachable = gate(hook('Bash', { command: 'ls' }), env);
  assert.deepEqual([unreachable.status, unreachable.out.permissionDecision, unreachable.out.permissionDecisionReason], [0, 'deny', UNREACHABLE]);
  assert.equal(gate(hook('Bash', { command: 'ls' }), {}).out.permissionDecision, 'deny', 'no route configured');
});

/** As `gate`, without blocking the event loop, so the in-process route can answer. */
async function runAsync(input: unknown, env: Record<string, string>) {
  const child = spawn(process.execPath, ['--no-warnings', GATE_BIN], { env: { PATH: process.env.PATH ?? '', ...env } });
  let stdout = '';
  child.stdout.on('data', (c) => { stdout += c; });
  child.stdin.end(JSON.stringify(input));
  const status = await new Promise<number | null>((resolve) => child.once('close', resolve));
  return { status, out: JSON.parse(stdout).hookSpecificOutput as { permissionDecision: string; permissionDecisionReason: string } };
}

test('the hook command blocks (exit 2) when the gate cannot even start', () => {
  const command = JSON.parse(gateSettings(process.execPath, '/no/such/gate.ts')).hooks.PreToolUse[0].hooks[0].command;
  const r = spawnSync('/bin/sh', ['-c', command], { input: WRITE, encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('the gate waits as long as AGENT_GATE_WAIT_MS says, and a bad value keeps its own limit', async () => {
  const sockets = new Set<import('node:net').Socket>();
  const silent = http.createServer(() => { /* the person has not answered */ });
  silent.on('connection', (c) => { sockets.add(c); });
  await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(silent.address() as AddressInfo).port}/api/run/approvals`;
  try {
    const started = Date.now();
    const out = await runGate(JSON.stringify(hook('Bash', { command: 'ls' })), { [GATE_URL_ENV]: url, [GATE_TOKEN_ENV]: 'run-token', [GATE_WAIT_ENV]: '200' }, none);
    assert.deepEqual([out.hookSpecificOutput.permissionDecision, out.hookSpecificOutput.permissionDecisionReason], ['deny', UNREACHABLE]);
    assert.ok(Date.now() - started < 5_000, 'gave up after its 200 ms');
  } finally { for (const c of sockets) c.destroy(); silent.close(); }
  assert.equal(gateWaitFrom({}), GATE_WAIT_MS);
  for (const bad of ['', 'x', '0', '-5', 'Infinity', '9999999999']) assert.equal(gateWaitFrom({ [GATE_WAIT_ENV]: bad }), GATE_WAIT_MS, bad);
  assert.equal(gateWaitFrom({ [GATE_WAIT_ENV]: '86385000' }), 86_385_000);
});
