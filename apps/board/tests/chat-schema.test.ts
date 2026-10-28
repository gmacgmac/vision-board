// The chat event schema (api.md 98-101, D-036, D-037): the chat package's own contract,
// packages/chat/schema/chat-event.schema.json. Every kind has a valid event and a broken one; a
// tool_activity never carries a tool's raw input; approval facts and answers follow nclite's shapes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_SCHEMA_DIR } from '#chat/files';
import { CHAT_EVENT_ID, SCHEMA_BASE, schemaFiles, schemaProblems } from '../server/schema.ts';

type Rec = Record<string, unknown>;
/** Problems with `value` as JSON (a field set to undefined is left out, as on the wire). */
const problems = (value: unknown, def?: string) =>
  schemaProblems(def ? `${CHAT_EVENT_ID}#/$defs/${def}` : CHAT_EVENT_ID, JSON.parse(JSON.stringify(value)));
const valid = (value: unknown, def?: string) => assert.deepEqual(problems(value, def), [], JSON.stringify(value));
const broken = (value: unknown, why: string, def?: string) => assert.notDeepEqual(problems(value, def), [], why);

const STAMP = { at: '2026-10-08T09:00:00Z', session: '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37', seq: 1 };
const WRITE = { kind: 'write', op: 'edit', path: '/home/someone/project/notes.md', preview: '- old line\n+ new line' };
const COMMAND = { kind: 'command', command: 'rm -rf build', risks: ['rm-recursive'], paths: ['build'] };

/** One valid event of every kind. */
const VALID: Record<string, Rec> = {
  message_in: { ...STAMP, kind: 'message_in', text: 'Draw the pricing options.', chips: [{ kind: 'card', ref: 4, label: 'Pricing tiers' }, { kind: 'note', ref: 81, label: 'Too many tiers?' }] },
  message_out: { ...STAMP, kind: 'message_out', text: 'I drew three options.' },
  tool_activity: { ...STAMP, kind: 'tool_activity', call: 'toolu_01AbC', tool: 'write_board', state: 'done', board: 'pricing', cards: [4, 5, 6], head: 91 },
  approval_request: { ...STAMP, kind: 'approval_request', approvalId: 'ap-1', facts: WRITE, expiresAt: '2026-10-08T09:02:00Z' },
  approval_result: { ...STAMP, kind: 'approval_result', approvalId: 'ap-1', approved: true, status: 'approved', scope: 'once' },
  system: { ...STAMP, kind: 'system', text: 'The turn ended.', turn: 'done' },
};

test('the chat schema lives in packages/chat, under its own versioned $id', () => {
  assert.equal(CHAT_EVENT_ID, `${SCHEMA_BASE}schema/chat/1/chat-event.schema.json`);
  assert.deepEqual(schemaFiles(CHAT_SCHEMA_DIR).map((f) => f.schema.$id), [CHAT_EVENT_ID]);
});

test('every kind has a valid event: nclite\'s five and tool_activity', () => {
  assert.deepEqual(Object.keys(VALID).sort(), ['approval_request', 'approval_result', 'message_in', 'message_out', 'system', 'tool_activity']);
  for (const e of Object.values(VALID)) valid(e);
  valid({ ...VALID.message_out, interim: true });
  valid({ ...VALID.message_in, chips: undefined });
  valid({ ...VALID.tool_activity, state: 'running', cards: undefined, head: undefined });
  valid({ ...VALID.tool_activity, tool: 'Read', board: undefined, cards: undefined, head: undefined });
  valid({ ...VALID.approval_request, facts: COMMAND });
  valid({ ...VALID.approval_result, approved: false, status: 'expired', scope: undefined });
  valid({ ...VALID.system, turn: undefined });
});

test('every event needs kind, at, session and seq; an unknown kind or field is refused', () => {
  for (const [kind, e] of Object.entries(VALID)) {
    for (const field of ['kind', 'at', 'session', 'seq']) broken({ ...e, [field]: undefined }, `${kind} without ${field}`);
    broken({ ...e, extra: 1 }, `${kind} with an unknown field`);
    broken({ ...e, at: '8 Oct 2026' }, `${kind} with a bad time`);
    broken({ ...e, seq: 0 }, `${kind} with seq 0`);
    broken({ ...e, session: '../etc' }, `${kind} with a session id that names a path`);
  }
  broken({ ...VALID.system, kind: 'turn' }, 'an unknown kind');
});

test('each kind refuses its own broken forms', () => {
  broken({ ...VALID.message_in, text: ' ' }, 'blank text');
  broken({ ...VALID.message_in, chips: [{ kind: 'region', ref: 1, label: 'x' }] }, 'a chip that is not a note or card');
  broken({ ...VALID.message_out, interim: false }, 'interim is present only when true');
  broken({ ...VALID.message_out, text: undefined }, 'message_out without text');
  broken({ ...VALID.tool_activity, state: 'queued' }, 'an unknown tool state');
  broken({ ...VALID.tool_activity, board: undefined }, 'cards and head without a board');
  broken({ ...VALID.tool_activity, cards: [0] }, 'card 0');
  // A request with no `expiresAt` is valid: it waits for the person (approvalHold, agent-access-and-working HOLD_01).
  broken({ ...VALID.approval_request, facts: { ...WRITE, op: 'delete' } }, 'an unknown write op');
  broken({ ...VALID.approval_request, facts: { kind: 'egress', host: 'example.com' } }, 'egress is not asked here');
  broken({ ...VALID.approval_result, approved: false }, 'approved must agree with status');
  broken({ ...VALID.approval_result, status: 'denied', approved: false, scope: 'session' }, 'a scope only on a yes');
  broken({ ...VALID.system, text: undefined }, 'system without text');
  broken({ ...VALID.system, turn: 'paused' }, 'an unknown turn end');
});

test('tool_activity never carries the raw input or output of a tool', () => {
  for (const field of ['input', 'output', 'arguments', 'result', 'content']) {
    broken({ ...VALID.tool_activity, [field]: { items: [{ type: 'node' }] } }, `tool_activity with ${field}`);
  }
});

test('approval facts follow nclite: a write (op, path, preview) or a command (command, risks, paths)', () => {
  valid(WRITE, 'facts');
  valid({ ...WRITE, preview: undefined }, 'facts');
  valid(COMMAND, 'facts');
  valid({ ...COMMAND, risks: [], paths: [] }, 'facts');
  broken({ ...WRITE, path: 'notes\n.md' }, 'a path with a line break', 'facts');
  broken({ ...WRITE, path: 'notes‮.md' }, 'a path with a text-direction character', 'facts');
  broken({ ...WRITE, preview: 'x'.repeat(2001) }, 'a preview that is not short', 'facts');
  broken({ ...COMMAND, command: ' ' }, 'a blank command', 'facts');
  broken({ ...COMMAND, paths: undefined }, 'a command without paths', 'facts');
  broken({ ...WRITE, command: 'ls' }, 'a write with a command', 'facts');
});

test('the person\'s answer is { approved, scope: once | session | folder }; the gate\'s outcome says how it was settled', () => {
  valid({ approved: true }, 'answer');
  valid({ approved: false, scope: 'once' }, 'answer');
  valid({ approved: true, scope: 'session' }, 'answer');
  valid({ approved: true, scope: 'folder' }, 'answer');
  broken({ approved: true, scope: 'always' }, 'no always', 'answer');
  broken({ scope: 'once' }, 'approved is required', 'answer');
  valid({ approved: true, status: 'approved', approvalId: 'ap-1', scope: 'session' }, 'outcome');
  valid({ approved: true, status: 'approved', asked: false }, 'outcome');
  valid({ approved: false, status: 'released', approvalId: 'ap-2' }, 'outcome');
  broken({ approved: true, status: 'denied' }, 'approved must agree with status', 'outcome');
  broken({ approved: false }, 'status is required', 'outcome');
});
