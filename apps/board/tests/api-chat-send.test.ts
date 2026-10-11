// The board's Send hands the chat session the person's answers (panel-send ruling 1, api.md 121),
// with the agent package's fake `claude`: no session, nothing changes; with one, the Send's message
// is the session's prompt and its `message_in`: "The person updated the board:", the numbered reply
// of what was answered since it was last told (each card's kind and word), and the head it covers;
// the prompt then names the board, as every message does (chat-board-context ruling 2).
// While a turn runs it waits (one system line, one message however many Sends) and goes when the
// turn ends, made then.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROUND_HEAD } from '../../../packages/actions/src/index.ts';
import { QUEUED } from '../server/chat-session.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, gone, readChat } from './chat-support.ts';

const config = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-send-'));
const fake = fakeChat(config);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const act = (body: Record<string, unknown>) => h.ok('act', { board: 'pricing', body: { type: 'act', ...body } });
const send = () => act({ action: 'send', board: 'pricing' });
const turns = (n: number) => (events: Event[]) => events.filter((e) => e.kind === 'system' && e.turn !== undefined).length >= n;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
let session = '';

test('a Send on a board with no chat session changes nothing', async () => {
  await send();
  await pause(150);
  assert.deepEqual(fake.given(), [], 'no agent ran');
});

test('with a session, Send hands it the answers in card order with their words, and the head', async () => {
  const { q } = h.seeded;
  ({ session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } }));
  // The seed's container is another agent's: the session's agent hears only what it may answer
  // (api.md 41), so it asks for the container and the person allows it.
  const index = JSON.parse(fs.readFileSync(path.join(h.project, '.visionboard', 'chat-sessions.json'), 'utf8'));
  const agent = index.sessions[0].agentId as string;
  const request = h.ledger.append({ type: 'grant-request', board: 'pricing', region: 'options', reason: 'Answer the options.' }, { by: 'agent', agent }).seq;
  await act({ action: 'grant', request });
  await act({ action: 'ack', n: q, ver: 2 });
  const sent = await send();
  const run = await fake.run(1);
  const lines = run.prompt.split('\n');
  assert.equal(lines[0], ROUND_HEAD);
  assert.match(lines[1]!, /^Board "Pricing options" \(v\d+\)$/);
  // The seed's comment on q and Later on d came before the Send in the first test: told then, so not again.
  assert.deepEqual(lines.slice(2), [
    `${q} (question): yes`, 'Nothing left open.',
    `These are the person's answers up to head ${sent.seq}. To read anything newer, call check_responses on board "pricing" with after ${sent.seq}.`,
    '', 'Board: pricing',
  ]);
  const events = await readChat(h.base, h.cookie, session, turns(1));
  for (const e of events) assert.deepEqual(schemaProblems(CHAT_EVENT_ID, e), [], JSON.stringify(e));
  assert.deepEqual([events[0]!.kind, events[0]!.text], ['message_in', run.prompt.replace('\n\nBoard: pricing', '')], 'the feed shows the answers as sent');
  const responses = await h.ok('check_responses', { board: 'pricing', after: 0 });
  assert.equal(responses.responses.find((e: { action: string }) => e.action === 'ack').means, 'yes');
});

test('while a turn runs the Send waits, once, and goes when the turn ends with every answer since', async () => {
  const { q, d } = h.seeded;
  const head = h.ledger.state().seq;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'Keep going.' } });
  const busy = await fake.run(2);
  await act({ action: 'comment', n: d, ver: 1, text: 'Too early.' });
  await send();
  await act({ action: 'comment', n: q, ver: 2, text: 'Per seat, then.' });
  await send();
  const waiting = await readChat(h.base, h.cookie, session, (ev) => ev.filter((e) => e.text === QUEUED).length >= 1);
  fake.mode('replay');
  assert.deepEqual(await h.ok('stop_chat', { session }), { stopped: true });
  await gone(busy.pid);
  const run = await fake.run(3);
  const events = await readChat(h.base, h.cookie, session, turns(3));
  assert.equal(events.filter((e) => e.text === QUEUED).length, 1, 'one waiting line for two Sends');
  assert.equal(waiting.at(-1)!.text, QUEUED);
  const stopped = events.findIndex((e) => e.turn === 'stopped');
  assert.deepEqual([events[stopped + 1]!.kind, `${events[stopped + 1]!.text}\n\nBoard: pricing`], ['message_in', run.prompt], 'it goes when the turn ends');
  const lines = run.prompt.split('\n');
  assert.match(lines.find((l) => l.startsWith(`${q} `))!, /^\d+ \(question\): .*: Per seat, then\.$/);
  assert.match(lines.find((l) => l.startsWith(`${d} `))!, /^\d+ \(decision\): .*: Too early\.$/);
  assert.ok(!run.prompt.includes('Why per seat?'), 'nothing the agent was already told');
  assert.ok(Number(/head (\d+)\./.exec(run.prompt)![1]) > head);
});
