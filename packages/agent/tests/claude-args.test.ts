// The Claude CLI's command line (PLAN ruling 3, after nclite's buildTurnArgs): new vs resumed, the
// instructions every turn, the MCP config as a file, the gate as an inline settings hook, the
// variadic allowed tools last, no prompt and never `--bare`. And the start-or-resume decision.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { StartOptions } from '../src/index.ts';
import { GATED_TOOLS, GATE_BIN, HOOK_TIMEOUT_S, buildClaudeArgs, gateSettings, isWrongSessionFlag, mcpConfigJson, projectSlug, transcriptExists } from '../src/index.ts';

const ID = '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37';
const START: StartOptions = {
  cwd: '/home/someone/project',
  mcpServers: { vb: { command: 'node', args: ['vb-mcp.ts'], env: { VB_SERVER: 'http://127.0.0.1:4466', VB_AGENT_SECRET: 'not-a-real-secret' } } },
  allowedTools: ['mcp__vb__*', 'Read'],
  gate: { url: 'http://127.0.0.1:4466/api/run/approvals', token: 'run-token' },
};

test('a new session names its id with --session-id; a resumed one with --resume', () => {
  const fresh = buildClaudeArgs(START, { id: ID, resume: false }, '/tmp/mcp.json');
  assert.deepEqual(fresh.slice(0, 6), ['-p', '--output-format', 'stream-json', '--verbose', '--session-id', ID]);
  const resumed = buildClaudeArgs(START, { id: ID, resume: true }, '/tmp/mcp.json');
  assert.deepEqual(resumed.slice(4, 6), ['--resume', ID]);
  assert.ok(!resumed.includes('--session-id'));
});

test('the MCP config is a file, strict; permission mode default; the gate inline; allowed tools last', () => {
  const args = buildClaudeArgs(START, { id: ID, resume: false }, '/tmp/mcp.json', '{"hooks":{}}');
  const at = (flag: string) => args[args.indexOf(flag) + 1];
  assert.equal(at('--mcp-config'), '/tmp/mcp.json');
  assert.ok(args.includes('--strict-mcp-config'));
  assert.equal(at('--permission-mode'), 'default');
  assert.equal(at('--settings'), '{"hooks":{}}');
  assert.deepEqual(args.slice(-3), ['--allowedTools', 'mcp__vb__*', 'Read']);
  assert.ok(!args.includes('--bare'), 'never --bare: it would skip the person\'s login');
  assert.ok(!args.includes('--model') && !args.includes('--append-system-prompt-file'), 'only when asked');
  assert.ok(!args.join(' ').includes('not-a-real-secret'), 'no secret on the command line');
});

test('the model and the instructions file when given; the instructions on a resumed turn too', () => {
  const args = buildClaudeArgs({ ...START, model: 'opus', instructionsFile: '/skills/SKILL.md' }, { id: ID, resume: true }, '/tmp/mcp.json');
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.equal(args[args.indexOf('--append-system-prompt-file') + 1], '/skills/SKILL.md');
  assert.ok(!buildClaudeArgs({ ...START, allowedTools: [] }, { id: ID, resume: false }, 'c').includes('--allowedTools'));
});

test('the gate hook: every gated tool, anchored, the gate run by node, fail-closed, with a timeout', () => {
  const settings = JSON.parse(gateSettings('/usr/bin/node', '/pkg/bin/gate.ts'));
  const [entry, ...rest] = settings.hooks.PreToolUse;
  assert.equal(rest.length, 0);
  assert.equal(entry.matcher, '^(Write|Edit|MultiEdit|NotebookEdit|Bash)$');
  for (const tool of GATED_TOOLS) assert.match(tool, new RegExp(entry.matcher));
  for (const tool of ['Read', 'mcp__vb__write_board', 'NotebookEditor', 'ToolSearch']) assert.doesNotMatch(tool, new RegExp(entry.matcher));
  assert.deepEqual(entry.hooks, [{ type: 'command', command: `'/usr/bin/node' --no-warnings '/pkg/bin/gate.ts' || exit 2`, timeout: HOOK_TIMEOUT_S }]);
  assert.match(JSON.parse(gateSettings()).hooks.PreToolUse[0].hooks[0].command, new RegExp(path.basename(GATE_BIN)));
  assert.match(JSON.parse(gateSettings("/it's/node", '/g')).hooks.PreToolUse[0].hooks[0].command, /^'\/it'\\''s\/node'/, 'quoted for the shell');
});

test('the MCP config file carries the servers, with their env', () => {
  assert.deepEqual(JSON.parse(mcpConfigJson(START.mcpServers)), { mcpServers: START.mcpServers });
});

test('a session has started when the CLI\'s transcript exists for its folder', () => {
  const config = mkdtempSync(path.join(tmpdir(), 'agent-args-'));
  try {
    const env = { CLAUDE_CONFIG_DIR: config };
    assert.equal(projectSlug('/home/some one/project.x'), '-home-some-one-project-x');
    assert.equal(transcriptExists('/home/someone/project', ID, env), false);
    mkdirSync(path.join(config, 'projects', '-home-someone-project'), { recursive: true });
    writeFileSync(path.join(config, 'projects', '-home-someone-project', `${ID}.jsonl`), '');
    assert.equal(transcriptExists('/home/someone/project', ID, env), true);
    assert.equal(transcriptExists('/home/someone/project', '00000000-0000-4000-8000-000000000001', env), false);
  } finally {
    rmSync(config, { recursive: true, force: true });
  }
});

test('the CLI\'s two ways of refusing the session flag', () => {
  assert.ok(isWrongSessionFlag(`Error: Session ID ${ID} is already in use.`));
  assert.ok(isWrongSessionFlag(`No conversation found with session ID: ${ID}`));
  assert.ok(!isWrongSessionFlag('Not logged in'));
});
