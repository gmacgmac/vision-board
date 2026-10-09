// The gate's route on the board server (chat-panel BE_03 ruling 4, api.md 100-102): only the run
// token of a session with a turn running opens it; the facts become an approval_request on the
// session's stream and the call is held until the person answers (allowed, denied, or for the
// session, which later asks of that kind skip); the first answer wins; Stop and a new message
// release a waiting ask; once the turn is over the token opens nothing. The expiry is in
// chat-approvals.test.ts.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event, Given } from './chat-support.ts';
import { ask, fakeChat, gone, readChat } from './chat-support.ts';
import { checkAnswer } from './openapi-ajv.ts';

const config = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-gate-'));
const fake = fakeChat(config);
let h: Harness;
let session: string;
let run: Given;
let seen = 0;

before(async () => {
  h = await startBoard({ chat: { adapters: fake.adapters } });
  session = (await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } })).session;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'Tidy the notes file.' } });
  run = await fake.run(1);
});
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const WRITE = { kind: 'write', op: 'edit', path: '/tmp/notes.md', preview: '- old\n+ new' };
const COMMAND = { kind: 'command', command: 'ls', risks: [], paths: [] };

/** The next event of `kind` on the session's stream. */
async function next(kind: string): Promise<Event> {
  const events = await readChat(h.base, h.cookie, session, (ev) => ev.some((e) => e.kind === kind), seen);
  const event = events.find((e) => e.kind === kind)!;
  seen = event.seq;
  return event;
}

/** The gate's answer, held to the spec. */
async function outcome(pending: Promise<Response>): Promise<Record<string, unknown>> {
  const res = await pending;
  const body = await res.json();
  checkAnswer('ask_approval', { status: res.status, headers: res.headers, media: 'application/json', body });
  assert.equal(res.status, 200);
  return body;
}

test('allowed: the facts reach the stream, the person allows, the gate is told yes; a second answer is a conflict', async () => {
  const pending = ask(h.base, run.gate.token, WRITE);
  const request = await next('approval_request');
  assert.deepEqual(request.facts, WRITE);
  const result = await h.ok('answer_approval', { session, approval: request.approvalId, body: { approved: true } });
  assert.deepEqual([result.kind, result.approved, result.status, result.scope], ['approval_result', true, 'approved', 'once']);
  assert.deepEqual(await outcome(pending), { approved: true, status: 'approved', approvalId: request.approvalId, scope: 'once' });
  seen = result.seq;
  await h.fails('answer_approval', { session, approval: request.approvalId, body: { approved: false } }, 409, 'conflict');
  await h.fails('answer_approval', { session, approval: 'ap-unknown', body: { approved: true } }, 404, 'not-found');
});

test('denied: the gate is told no', async () => {
  const pending = ask(h.base, run.gate.token, COMMAND);
  const request = await next('approval_request');
  await h.ok('answer_approval', { session, approval: request.approvalId, body: { approved: false } });
  assert.deepEqual(await outcome(pending), { approved: false, status: 'denied', approvalId: request.approvalId });
});

test('session scope: a yes for the session answers the next write at once, without asking', async () => {
  const pending = ask(h.base, run.gate.token, WRITE);
  const request = await next('approval_request');
  await h.ok('answer_approval', { session, approval: request.approvalId, body: { approved: true, scope: 'session' } });
  assert.deepEqual(await outcome(pending), { approved: true, status: 'approved', approvalId: request.approvalId, scope: 'session' });
  seen = (await next('approval_result')).seq;
  assert.deepEqual(await outcome(ask(h.base, run.gate.token, { ...WRITE, path: '/tmp/other.md' })),
    { approved: true, status: 'approved', scope: 'session', asked: false });
});

test('a wrong token, a bad body, or the person\'s cookie are refused before anything is asked', async () => {
  const wrong = await ask(h.base, 'x'.repeat(43), WRITE);
  assert.equal(wrong.status, 401);
  checkAnswer('ask_approval', { status: 401, headers: wrong.headers, media: 'application/problem+json', body: await wrong.json() });
  const bad = await ask(h.base, run.gate.token, { kind: 'write', op: 'shred', path: '/tmp/x' });
  assert.equal(bad.status, 422);
  await h.fails('ask_approval', { body: WRITE }, 403, 'forbidden', h.person);
});

test('a new message releases a waiting ask; Stop releases one too, and then the token opens nothing', async () => {
  const first = ask(h.base, run.gate.token, COMMAND);
  await next('approval_request');
  await h.fails('send_chat', { session, body: { text: 'Never mind.' } }, 409, 'conflict');
  assert.deepEqual([(await outcome(first)).approved, (await next('approval_result')).status], [false, 'released']);
  const second = ask(h.base, run.gate.token, COMMAND);
  await next('approval_request');
  assert.deepEqual(await h.ok('stop_chat', { session }), { stopped: true });
  const settled = await outcome(second);
  assert.deepEqual([settled.approved, settled.status], [false, 'released']);
  await gone(run.pid);
  await next('system');
  const after = await ask(h.base, run.gate.token, WRITE);
  assert.equal(after.status, 401, 'the turn is over, so its token opens nothing');
});
