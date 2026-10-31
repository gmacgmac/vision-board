// The chat package against its contract and the recorded turns (rule 6, rule 11; chat-panel FE_01):
// the gallery's chat events (src/gallery/gallery.chat.json) pass the chat schema, and the agent's
// part of them is exactly the recorded Claude turns (packages/agent/tests/fixtures) through the
// agent package's mapper, so the gallery shows what a real run streams. The feed's reducer is then
// run over them. Here because packages/chat may read neither packages/agent nor the server (D-037).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AgentUpdate } from '#agent';
import { ClaudeStream, factsFor, toChatEvent } from '#agent';
import { DRAW, REFUSED } from '#agent/testing';
import type { ChatEvent } from '#chat';
import { activityLine, applyEvents, CHAT_EVENT_KINDS, chatStatus, EMPTY_CHAT } from '#chat';
import { ROUND_HEAD } from '#actions';
import { QUEUED } from '../server/chat-session.ts';
import { CHAT_SCHEMA_DIR } from '#chat/files';
import { schemaFiles } from '../server/format-files.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const SCENES = JSON.parse(read('../src/gallery/gallery.chat.json')) as Record<'session' | 'stopped' | 'error' | 'send', ChatEvent[]>;
const replay = (file: string): AgentUpdate[] => {
  const stream = new ClaudeStream(['vision-board'], () => {});
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return [...lines.flatMap((l) => stream.push(JSON.parse(l))), ...stream.end()];
};
const unstamp = ({ at: _, session: __, seq: ___, ...e }: ChatEvent) => e;
const FROM_AGENT = new Set(['message_out', 'tool_activity', 'system']);

test('the package\'s event kinds are the schema\'s', () => {
  type Def = { properties: { kind: { const: string } } };
  const schema = schemaFiles(CHAT_SCHEMA_DIR)[0]!.schema as unknown as { oneOf: { $ref: string }[]; $defs: Record<string, Def> };
  const kinds = schema.oneOf.map((o) => schema.$defs[o.$ref.split('/').at(-1)!]!.properties.kind.const);
  assert.deepEqual(kinds, [...CHAT_EVENT_KINDS]);
});

test('every gallery chat event passes the chat schema, numbered from 1 in its session', () => {
  for (const [name, events] of Object.entries(SCENES)) {
    events.forEach((e, i) => {
      assert.deepEqual(schemaProblems(CHAT_EVENT_ID, e), [], `${name} ${i}`);
      assert.equal(e.seq, i + 1);
      assert.equal(e.session, events[0]!.session);
    });
  }
});

test('the agent\'s events are the recorded turns through toChatEvent; the facts are the gate\'s', () => {
  const recorded = [...replay(DRAW), ...replay(REFUSED)].map(toChatEvent);
  assert.deepEqual(SCENES.session.filter((e) => FROM_AGENT.has(e.kind)).map(unstamp), recorded);
  assert.deepEqual(unstamp(SCENES.stopped.at(-1)!), toChatEvent({ type: 'stopped' }));
  assert.deepEqual(unstamp(SCENES.error.at(-1)!), toChatEvent({ type: 'error', message: 'Claude Code ended without a result.' }));
  const ask = SCENES.session.find((e) => e.kind === 'approval_request');
  const write = { cwd: '/home/someone/project', tool_name: 'Write', tool_input: { file_path: '/home/someone/project/notes.txt', content: 'hello\n' } };
  assert.deepEqual(ask?.kind === 'approval_request' && ask.facts, factsFor(write, () => false));
});

test('the reducer over the recorded turns: the person, the change chip, the replies, the settled card', () => {
  const s = applyEvents(EMPTY_CHAT, SCENES.session);
  assert.deepEqual(s.entries.map((e) => e.type), ['person', 'change', 'agent', 'person', 'approval', 'agent']);
  assert.deepEqual(s.entries[1], { type: 'change', key: 'e5', board: 'scratch', cards: [1, 2], head: 5 });
  const card = s.entries[4]!;
  assert.equal(card.type === 'approval' && card.result?.status, 'denied');
  assert.equal(s.busy, false);
  assert.equal(chatStatus(s).kind, 'ready');
  assert.equal(activityLine(applyEvents(EMPTY_CHAT, SCENES.session.slice(0, 2))), 'Using ToolSearch…');
  assert.equal(activityLine(applyEvents(EMPTY_CHAT, SCENES.session.slice(0, 4))), 'Drawing on the board…');
  assert.equal(chatStatus(applyEvents(EMPTY_CHAT, SCENES.session.slice(0, 10))).kind, 'waiting');
  assert.equal(chatStatus(applyEvents(EMPTY_CHAT, SCENES.stopped)).kind, 'stopped');
  assert.equal(chatStatus(applyEvents(EMPTY_CHAT, SCENES.error)).kind, 'error');
});

test('the board\'s Send in the gallery speaks the server\'s words: the waiting line, then the message after the turn ends', () => {
  const texts = SCENES.send.map((e) => ('text' in e ? e.text : ''));
  assert.ok(texts.includes(QUEUED));
  const handed = SCENES.send.at(-1)!;
  assert.equal(handed.kind, 'message_in');
  assert.equal(handed.kind === 'message_in' && handed.text.split('\n')[0], ROUND_HEAD);
  const end = SCENES.send.at(-2)!;
  assert.equal(end.kind === 'system' && end.turn, 'done', 'it follows the turn-end line');
});
