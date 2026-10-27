// The agent package against the chat contract (rule 6; PLAN ruling 2): every update the Claude
// adapter makes from the recorded turns, mapped to a chat event and stamped as the host stamps it,
// is a valid chat event; so are the turn's endings; the gate's facts and an outcome fit the
// schema's `facts` and `outcome`. Here because packages/agent may not read packages/chat (D-037).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AgentUpdate } from '#agent';
import { ClaudeStream, factsFor, toChatEvent } from '#agent';
import { DRAW, REFUSED } from '#agent/testing';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';

const replay = (file: string): AgentUpdate[] => {
  const stream = new ClaudeStream(['vision-board'], () => {});
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return [...lines.flatMap((l) => stream.push(JSON.parse(l))), ...stream.end()];
};
const stamp = (seq: number) => ({ at: '2026-10-08T09:00:00Z', session: '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37', seq });
const problems = (value: unknown, def?: string) =>
  schemaProblems(def ? `${CHAT_EVENT_ID}#/$defs/${def}` : CHAT_EVENT_ID, JSON.parse(JSON.stringify(value)));

test('every update of the recorded turns maps to a valid chat event', () => {
  const updates = [...replay(DRAW), ...replay(REFUSED)];
  const mapped = updates.map((u, i) => ({ ...toChatEvent(u), ...stamp(i + 1) }));
  for (const event of mapped) assert.deepEqual(problems(event), [], JSON.stringify(event));
  assert.deepEqual(mapped.map((e) => e.kind), ['tool_activity', 'tool_activity', 'tool_activity', 'tool_activity', 'message_out', 'system', 'tool_activity', 'tool_activity', 'message_out', 'system']);
  assert.deepEqual(mapped[3], { kind: 'tool_activity', call: 'toolu_fixture02', tool: 'write_board', state: 'done', board: 'scratch', cards: [1, 2], head: 5, ...stamp(4) });
});

test('interim words, and each ending of a turn, are valid chat events', () => {
  const endings: AgentUpdate[] = [
    { type: 'text', text: 'Looking first.', interim: true },
    { type: 'text', text: ' ', interim: false },
    { type: 'done', usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 } },
    { type: 'stopped' },
    { type: 'error', message: 'Claude Code ended without a result.' },
    { type: 'error', message: '' },
  ];
  for (const u of endings) assert.deepEqual(problems({ ...toChatEvent(u), ...stamp(1) }), [], JSON.stringify(u));
  assert.deepEqual(toChatEvent(endings[0]!), { kind: 'message_out', text: 'Looking first.', interim: true });
  assert.deepEqual(['done', 'stopped', 'error'].map((t) => toChatEvent(endings.find((u) => u.type === t)!)), [
    { kind: 'system', text: 'Done.', turn: 'done' },
    { kind: 'system', text: 'Stopped.', turn: 'stopped' },
    { kind: 'system', text: 'Claude Code ended without a result.', turn: 'error' },
  ]);
});

test('the gate\'s facts and an outcome fit the chat schema\'s shapes', () => {
  const at = { cwd: '/home/someone/project' };
  const calls = [
    { tool_name: 'Write', tool_input: { file_path: 'a.md', content: 'hello' } },
    { tool_name: 'Edit', tool_input: { file_path: '/p/a.md', old_string: 'a', new_string: 'b' } },
    { tool_name: 'MultiEdit', tool_input: { file_path: '/p/a.md', edits: [{ old_string: 'a', new_string: 'b' }] } },
    { tool_name: 'NotebookEdit', tool_input: { notebook_path: '/p/n.ipynb', new_source: 'x' } },
    { tool_name: 'Bash', tool_input: { command: 'npm test' } },
    { tool_name: 'Write', tool_input: { file_path: '/p/big', content: 'y'.repeat(9000) } },
  ];
  for (const call of calls) assert.deepEqual(problems(factsFor({ ...at, ...call }, () => false), 'facts'), [], call.tool_name);
  assert.deepEqual(problems({ approved: false, status: 'denied', approvalId: 'ap-1' }, 'outcome'), []);
});
