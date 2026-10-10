// The chat routes' contract (api.md 98-104, D-036): every chat operation is the person's alone
// (`x-agent: false`, the person cookie) except the gate's, which only a run token opens; the
// operations reference the chat package's schema by its `$id`; and the server refuses an agent, a
// request without the cookie, and a gate call carrying the cookie or no token.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS } from '../../../packages/format/src/index.ts';
import { CHAT_EVENT_ID } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { checkAnswer, doc } from './openapi-ajv.ts';

const PERSON_CHAT = ['start_chat', 'list_chats', 'start_folder_chat', 'list_folder_chats', 'send_chat', 'stop_chat', 'answer_approval', 'watch_chat'] as const;
const SESSION = '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37';

test('the chat operations are person-only and never offered to agents; the gate takes a run token', () => {
  for (const id of PERSON_CHAT) {
    const row = OPERATIONS[id];
    assert.deepEqual([row.xAgent, row.auth], [false, 'person'], id);
  }
  assert.deepEqual([OPERATIONS.ask_approval.xAgent, OPERATIONS.ask_approval.auth, OPERATIONS.ask_approval.path], [false, 'run', '/api/run/approvals']);
  const scheme = doc.components.securitySchemes.runToken;
  assert.deepEqual([scheme.type, scheme.scheme], ['http', 'bearer']);
});

test('the chat operations reference the chat package\'s schema by its $id', () => {
  const chatRefs = Object.entries<Rec>(doc.components.schemas).filter(([, s]) => String(s.$ref ?? '').startsWith(CHAT_EVENT_ID));
  assert.deepEqual(chatRefs.map(([name]) => name).sort(), ['approvalAnswer', 'approvalFacts', 'approvalOutcome', 'chatEvent']);
});

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

test('a chat route without the person cookie, or from an agent, is forbidden', async () => {
  const joined = await h.join('Chat test');
  const calls: [typeof PERSON_CHAT[number], Rec][] = [
    ['start_chat', { board: 'roadmap', body: { agent: 'claude' } }],
    ['list_chats', { board: 'roadmap' }],
    ['start_folder_chat', { body: { agent: 'claude' } }],
    ['list_folder_chats', {}],
    ['send_chat', { session: SESSION, body: { text: 'Hello.' } }],
    ['stop_chat', { session: SESSION }],
    ['answer_approval', { session: SESSION, approval: 'ap-1', body: { approved: true } }],
  ];
  for (const [id, input] of calls) {
    const nobody = await h.fails(id, input, 403, 'forbidden', h.client);
    assert.match(nobody.detail, /Only the person/, id);
    await h.fails(id, input, 403, 'forbidden', joined.client);
  }
  const stream = await fetch(`${h.base}/api/chats/${SESSION}/events`);
  assert.equal(stream.status, 403);
  checkAnswer('watch_chat', { status: 403, headers: stream.headers, media: 'application/problem+json', body: await stream.json() });
});

test('the gate route refuses the person cookie and a call with no run token', async () => {
  const facts = { kind: 'write', op: 'create', path: '/tmp/x.md' };
  await h.fails('ask_approval', { body: facts }, 403, 'forbidden', h.person);
  const none = await h.fails('ask_approval', { body: facts }, 401, 'not-authenticated', h.client);
  assert.equal(h.last().headers.get('www-authenticate'), 'Bearer realm="vision-board"');
  assert.match(none.detail, /run token/);
});
