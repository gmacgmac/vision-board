// Reading the CLI's stream (PLAN ruling 3): the two recorded turns give exactly the updates the
// feed needs; text is held back a block (interim vs the reply); tools never surface their raw input
// or output; a board write's cards and head come from its result; an MCP server that did not
// connect, a missing result and an error result are errors; an unknown shape is logged once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AgentUpdate } from '../src/index.ts';
import { ClaudeStream, boardWriteSummary, shortToolName } from '../src/index.ts';
import { DRAW, REFUSED, events } from './support.ts';

function run(lines: unknown[], servers = ['vision-board']): { updates: AgentUpdate[]; logs: string[]; stream: ClaudeStream } {
  const logs: string[] = [];
  const stream = new ClaudeStream(servers, (l) => logs.push(l));
  const updates = lines.flatMap((e) => stream.push(e));
  return { updates: [...updates, ...stream.end()], logs, stream };
}

const INIT = { type: 'system', subtype: 'init', mcp_servers: [{ name: 'vision-board', status: 'connected' }] };
const RESULT = { type: 'result', subtype: 'success', is_error: false, result: 'All done.', usage: { input_tokens: 3, output_tokens: 9 } };
const say = (...content: unknown[]) => ({ type: 'assistant', message: { content } });
const text = (t: string) => ({ type: 'text', text: t });
const use = (id: string, name: string, input: unknown = {}) => ({ type: 'tool_use', id, name, input });
const answer = (id: string, content: unknown, isError = false) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, ...(isError && { is_error: true }) }] } });

test('the recorded draw: ToolSearch, one board write with its cards and head, the reply, done', () => {
  const { updates, logs } = run(events(DRAW));
  assert.deepEqual(updates, [
    { type: 'tool', call: 'toolu_fixture01', tool: 'ToolSearch', state: 'running' },
    { type: 'tool', call: 'toolu_fixture01', tool: 'ToolSearch', state: 'done' },
    { type: 'tool', call: 'toolu_fixture02', tool: 'write_board', state: 'running', board: 'scratch' },
    { type: 'tool', call: 'toolu_fixture02', tool: 'write_board', state: 'done', board: 'scratch', cards: [1, 2], head: 5 },
    { type: 'text', text: 'I wrote the "Scratch" board in one call, with an `ideas` grid region holding the question cards "Ship on Friday?" and "Add dark mode?". All four items succeeded.', interim: false },
    { type: 'done', usage: { input: 6, output: 392, cacheRead: 92442, cacheWrite: 14810, costUsd: 0.08166040000000001 } },
  ]);
  assert.deepEqual(logs, [], 'every event type in a real turn is known');
});

test('the recorded refusal: the Write fails, the agent says so, the turn is done', () => {
  const { updates } = run(events(REFUSED));
  assert.deepEqual(updates.map((u) => (u.type === 'tool' ? `${u.tool}:${u.state}` : u.type)), ['Write:running', 'Write:failed', 'text', 'done']);
  assert.deepEqual(updates[2], { type: 'text', text: 'The write was refused, so `notes.txt` was not created.', interim: false });
});

test('a tool\'s raw input and output never leave the stream', () => {
  const out = JSON.stringify([...run(events(DRAW)).updates, ...run(events(REFUSED)).updates]);
  for (const raw of ['file_path', 'hello', '/home/someone', '"items"', 'region-ideas', 'q-dark-mode', 'select:', 'hook error', '"seq"']) {
    assert.ok(!out.includes(raw), `${raw} leaked`);
  }
});

test('text is held back a block: interim when anything follows it, the last one is the reply', () => {
  const { updates } = run([INIT, say(text('Looking.')), say(use('t1', 'Read')), answer('t1', 'file body'), say(text('First.'), text('  ')), say(text('Second.')), RESULT]);
  assert.deepEqual(updates.filter((u) => u.type === 'text'), [
    { type: 'text', text: 'Looking.', interim: true },
    { type: 'text', text: 'First.', interim: true },
    { type: 'text', text: 'Second.', interim: false },
  ]);
  assert.deepEqual(run([INIT, say(use('t1', 'Read')), answer('t1', 'x'), RESULT]).updates.at(-2), { type: 'text', text: 'All done.', interim: false }, 'no text block: the result\'s words');
  assert.deepEqual(run([INIT, { ...RESULT, result: '' }]).updates.map((u) => u.type), ['done'], 'nothing said, nothing shown');
});

test('a board write: its board from the input, its cards and head from the result; a failed one has neither', () => {
  const write = use('w1', 'mcp__vision-board__write_board', { board: 'pricing', items: [{ type: 'node' }] });
  const result = JSON.stringify({ results: [{ index: 0, ok: true, seq: 7, n: 4 }, { index: 1, ok: true, seq: 8 }, { index: 2, ok: false, problem: {} }, { index: 3, ok: true, seq: 9, n: 4 }], head: 9, pending: [] });
  assert.deepEqual(run([INIT, say(write), answer('w1', [{ type: 'text', text: result }]), RESULT]).updates[1],
    { type: 'tool', call: 'w1', tool: 'write_board', state: 'done', board: 'pricing', cards: [4], head: 9 });
  assert.deepEqual(run([INIT, say(write), answer('w1', 'The board server is not answering.', true), RESULT]).updates[1],
    { type: 'tool', call: 'w1', tool: 'write_board', state: 'failed', board: 'pricing' });
  assert.deepEqual(run([INIT, say(use('w2', 'mcp__vision-board__write_board', { board: '../etc' })), RESULT]).updates[0],
    { type: 'tool', call: 'w2', tool: 'write_board', state: 'running' }, 'a board id that is not one is left out');
  assert.deepEqual(boardWriteSummary('not json'), { cards: [] });
  const replays = JSON.stringify({ results: [{ index: 0, ok: true, seq: 10, n: 5 }, { index: 1, ok: true, seq: 3, n: 2, replayed: true }, { index: 2, ok: true, seq: 4, n: 3, replayed: true }], head: 10 });
  assert.deepEqual(boardWriteSummary(replays), { cards: [5], head: 10 }, 'a retry\'s replay changed nothing: one card, not three');
});

test('tool names are short and fit the chat schema; a result for an unknown call is passed over', () => {
  assert.equal(shortToolName('mcp__vision-board__write_board'), 'write_board');
  assert.equal(shortToolName('mcp__my_server__do_it'), 'do_it');
  assert.equal(shortToolName('Bash'), 'Bash');
  assert.equal(shortToolName('weird name!'), 'weird-name-');
  assert.equal(shortToolName(''), 'tool');
  assert.deepEqual(run([INIT, answer('nobody', 'x'), RESULT]).updates.map((u) => u.type), ['text', 'done']);
});

test('an MCP server that did not connect stops the turn with a clear error', () => {
  const failed = { ...INIT, mcp_servers: [{ name: 'vision-board', status: 'failed' }] };
  const { updates, stream } = run([failed, RESULT]);
  assert.match(stream.problem!, /vision-board tool server did not connect \(status: failed\)/);
  assert.deepEqual(updates, [{ type: 'error', message: stream.problem }]);
  assert.match(run([{ ...INIT, mcp_servers: [] }, RESULT]).stream.problem!, /not registered/);
  assert.equal(run([INIT, RESULT], []).stream.problem, null, 'no servers asked for, none checked');
});

test('a turn with no result, or an error result, ends in an error', () => {
  const { updates } = run([INIT, say(text('Halfway.'))]);
  assert.deepEqual(updates, [{ type: 'text', text: 'Halfway.', interim: true }, { type: 'error', message: 'Claude Code ended without a result.' }]);
  const stream = new ClaudeStream([], () => {});
  assert.deepEqual(stream.end('Not logged in · Please run /login\n'), [{ type: 'error', message: 'Claude Code ended without a result. Not logged in · Please run /login' }]);
  assert.deepEqual(run([INIT, { ...RESULT, is_error: true, result: 'API Error: overloaded' }]).updates, [{ type: 'error', message: 'Claude Code could not answer: API Error: overloaded' }]);
});

test('an error the agent\'s last text only repeats shows once, as the error (VERIFY_01 bug 5); other text stays', () => {
  const limit = 'API Error: Rate limit reached';
  assert.deepEqual(run([INIT, say(text(`${limit}\n`)), { ...RESULT, is_error: true, result: limit }]).updates,
    [{ type: 'error', message: `Claude Code could not answer: ${limit}` }]);
  assert.deepEqual(run([INIT, say(text('Looking.')), { ...RESULT, is_error: true, result: limit }]).updates,
    [{ type: 'text', text: 'Looking.', interim: true }, { type: 'error', message: `Claude Code could not answer: ${limit}` }]);
});

test('an unknown event type or block is logged once and passed over', () => {
  const { updates, logs } = run([INIT, { type: 'novel' }, { type: 'novel' }, say({ type: 'hologram' }), say({ type: 'thinking', thinking: 'hmm' }), 'not an object', RESULT]);
  assert.deepEqual(updates.map((u) => u.type), ['text', 'done']);
  assert.deepEqual(logs, ['claude adapter: passed over an unknown event type novel', 'claude adapter: passed over an unknown assistant block hologram']);
});
