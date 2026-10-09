// Kiro's side of the protocol as pure functions: the turn's updates (text held back a block, tool
// calls by id, a board write's cards and head from its result, an unknown kind noted once, each
// stopReason) and the permission rules (the board's own tools and reading go ahead; a file change
// or a command is asked with the facts; anything else is refused; only one-time options are chosen).
// The recorded turns are in kiro.test.ts: one with its writes refused, one with a successful board
// write (kiro-cli 2.28.0 puts an MCP tool's result in `rawOutput`, not `content`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AgentUpdate } from '../src/index.ts';
import { KiroTurn, outcome, pickOption, readRequest, verdictFor } from '../src/index.ts';

const none = () => false;
const text = (t: string) => ({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: t } });
const run = (updates: unknown[], stop: unknown = 'end_turn', log: (l: string) => void = () => {}): AgentUpdate[] => {
  const turn = new KiroTurn(log);
  return [...updates.flatMap((u) => turn.push(u)), ...turn.end(stop)];
};

test('text chunks join into a block; a tool after it makes the block interim; the last block is the reply', () => {
  const out = run([text('One '), text('thing.'), { sessionUpdate: 'tool_call', toolCallId: 'a', title: 'Running: @vb/get_board', _meta: { kiro: { toolName: 'get_board', mcpServerName: 'vb' } } }, text('Done '), text('now.')]);
  assert.deepEqual(out.map((u) => u.type), ['text', 'tool', 'text', 'done']);
  assert.deepEqual(out[0], { type: 'text', text: 'One thing.', interim: true });
  assert.deepEqual(out[1], { type: 'tool', call: 'a', tool: 'get_board', state: 'running' });
  assert.deepEqual(out[2], { type: 'text', text: 'Done now.', interim: false });
});

test('a board write names its board when called and its cards and head when done (ACP content shape)', () => {
  const result = JSON.stringify({ head: 61, results: [{ ok: true, n: 3 }, { ok: true, n: 4 }, { ok: false }, { ok: true, n: 3 }] });
  const out = run([
    { sessionUpdate: 'tool_call', toolCallId: 'w', title: 'Running: @vb/write_board', rawInput: { board: 'pricing', items: [{ secret: 'never leaves' }] }, _meta: { kiro: { toolName: 'write_board' } } },
    { sessionUpdate: 'tool_call_update', toolCallId: 'w', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: result } }], rawOutput: { never: 'leaves' } },
  ]);
  assert.deepEqual(out.slice(0, 2), [
    { type: 'tool', call: 'w', tool: 'write_board', state: 'running', board: 'pricing' },
    { type: 'tool', call: 'w', tool: 'write_board', state: 'done', board: 'pricing', cards: [3, 4], head: 61 },
  ]);
  assert.ok(!JSON.stringify(out).includes('never'), 'raw input and output stay inside');
});

test('a board write\'s result in rawOutput (kiro-cli 2.28.0: items of Json content) gives its cards and head', () => {
  const result = JSON.stringify({ head: 57, results: [{ ok: true, seq: 56 }, { ok: true, n: 20 }] });
  const out = run([
    { sessionUpdate: 'tool_call', toolCallId: 'w', title: 'Running: @vb/write_board', rawInput: { board: 'pricing' }, _meta: { kiro: { toolName: 'write_board' } } },
    { sessionUpdate: 'tool_call_update', toolCallId: 'w', status: 'completed', rawOutput: { items: [{ Json: { content: [{ type: 'text', text: result }], isError: false } }] } },
  ]);
  assert.deepEqual(out[1], { type: 'tool', call: 'w', tool: 'write_board', state: 'done', board: 'pricing', cards: [20], head: 57 });
});

test('a tool update for a call not seen starts it; a bad board name is dropped; a failed call has no cards', () => {
  const out = run([
    { sessionUpdate: 'tool_call_update', toolCallId: 'x', title: 'write', status: 'failed', _meta: { kiro: { toolName: 'write' } } },
    { sessionUpdate: 'tool_call', toolCallId: 'y', title: 'Running: @vb/write_board', rawInput: { board: '../etc' }, _meta: { kiro: { toolName: 'write_board' } } },
  ]);
  assert.deepEqual(out.slice(0, 3), [
    { type: 'tool', call: 'x', tool: 'write', state: 'running' },
    { type: 'tool', call: 'x', tool: 'write', state: 'failed' },
    { type: 'tool', call: 'y', tool: 'write_board', state: 'running' },
  ]);
});

test('a call\'s facts are kept for the permission request, which carries less', () => {
  const turn = new KiroTurn(() => {});
  turn.push({ sessionUpdate: 'tool_call', toolCallId: 'e', title: 'Creating a.txt', kind: 'edit', content: [{ type: 'diff', path: '/p/a.txt', oldText: null, newText: 'hi' }] });
  turn.push({ sessionUpdate: 'tool_call_update', toolCallId: 'e', status: 'in_progress', content: null });
  assert.equal((turn.known('e') as { kind: string }).kind, 'edit');
  assert.equal(Array.isArray((turn.known('e') as { content: unknown }).content), true, 'a null does not wipe what was known');
  assert.deepEqual(turn.known('nope'), {});
});

test('unknown update kinds are noted once; known quiet ones are not', () => {
  const noted: string[] = [];
  run([{ sessionUpdate: 'agent_thought_chunk' }, { sessionUpdate: 'plan' }, { sessionUpdate: 'surprise' }, { sessionUpdate: 'surprise' }, 'junk'], 'end_turn', (l) => noted.push(l));
  assert.deepEqual(noted, ['kiro adapter: passed over an unknown update kind surprise']);
});

test('each stopReason ends the turn: done, stopped, or an error that says why', () => {
  const end = (reason: unknown) => run([text('Partial.')], reason);
  assert.deepEqual(end('end_turn').map((u) => u.type), ['text', 'done']);
  assert.deepEqual(end('cancelled').map((u) => u.type), ['text', 'stopped']);
  for (const reason of ['refusal', 'max_tokens', 'max_turn_requests', 'something-new']) {
    const last = end(reason).at(-1) as { type: string; message: string };
    assert.equal(last.type, 'error');
    assert.ok(last.message.length > 10);
  }
  assert.match((end('something-new').at(-1) as { message: string }).message, /something-new/);
});

const request = (toolCall: object, extra: object = {}) => readRequest({
  sessionId: 's', toolCall, options: [
    { optionId: 'allow_once', name: 'Yes', kind: 'allow_once' }, { optionId: 'allow_always', name: 'Always', kind: 'allow_always' },
    { optionId: 'reject_once', name: 'No', kind: 'reject_once' }], ...extra,
})!;

test('a permission request: read from its parts, answered with a one-time option only', () => {
  const r = request({ toolCallId: 't' }, { _meta: { mcpToolIdentity: { serverName: 'vb', toolName: 'write_board' } } });
  assert.equal(r.server, 'vb');
  assert.equal(pickOption(r.options, true), 'allow_once');
  assert.equal(pickOption(r.options, false), 'reject_once');
  assert.equal(pickOption([{ optionId: 'a', name: '', kind: 'allow_always' }], true), null, 'never an "always"');
  assert.deepEqual(outcome('allow_once'), { outcome: { outcome: 'selected', optionId: 'allow_once' } });
  assert.deepEqual(outcome(null), { outcome: { outcome: 'cancelled' } });
  assert.equal(readRequest({ sessionId: 's' }), null);
  assert.equal(readRequest('x'), null);
});

test('verdicts: own tools and reading go ahead; changes and commands are asked with facts; the rest is refused', () => {
  assert.deepEqual(verdictFor({ title: 'x' }, true, '/p', none), { allow: true });
  assert.deepEqual(verdictFor({ kind: 'read' }, false, '/p', none), { allow: true });
  assert.deepEqual(verdictFor({ kind: 'search' }, false, '/p', none), { allow: true });
  assert.deepEqual(verdictFor({ kind: 'execute', rawInput: { command: 'rm -rf build' } }, false, '/p', none),
    { ask: { kind: 'command', command: 'rm -rf build', risks: [], paths: [] } });
  assert.ok('refuse' in verdictFor({ kind: 'execute', rawInput: {} }, false, '/p', none), 'no command to show');
  assert.deepEqual(verdictFor({ kind: 'edit', content: [{ type: 'diff', path: '/p/a.txt', oldText: null, newText: 'hi\n' }] }, false, '/p', none),
    { ask: { kind: 'write', op: 'create', path: '/p/a.txt', preview: 'hi\n' } });
  assert.deepEqual(verdictFor({ kind: 'edit', content: [{ type: 'diff', path: '/p/a.txt', oldText: 'old', newText: 'new' }] }, false, '/p', () => true),
    { ask: { kind: 'write', op: 'edit', path: '/p/a.txt', preview: '- old\n+ new' } });
  assert.deepEqual(verdictFor({ kind: 'edit', rawInput: { command: 'create', path: 'b.txt', content: 'x' } }, false, '/p', none),
    { ask: { kind: 'write', op: 'create', path: '/p/b.txt', preview: 'x' } }, 'no diff: from the tool\'s own input');
  assert.deepEqual(verdictFor({ kind: 'edit', rawInput: { path: '/p/c.txt', oldStr: 'a', newStr: 'b' } }, false, '/p', none),
    { ask: { kind: 'write', op: 'edit', path: '/p/c.txt', preview: '- a\n+ b' } });
  assert.ok('refuse' in verdictFor({ kind: 'edit' }, false, '/p', none), 'no file named');
  assert.ok('refuse' in verdictFor({ kind: 'edit', locations: [{ path: '/p/a\nb' }] }, false, '/p', none), 'a path that cannot be shown');
  assert.ok('refuse' in verdictFor({ kind: 'fetch' }, false, '/p', none));
  assert.ok('refuse' in verdictFor({ title: 'someone else\'s MCP tool' }, false, '/p', none));
});
