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
import path from 'node:path';
import { ROUND_HEAD } from '#actions';
import type { AgentAdapter } from '#agent';
import { QUEUED } from '../server/chat-session.ts';
import { openLedger } from '../server/ledger.ts';
import { personAct, personCookie, startTestBoard } from './test-board.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, gone, readChat } from './chat-support.ts';
import { makeTempDir } from '#format/testing';
import * as serverChatWords from '../server/words/server-chat.ts';

const config = makeTempDir('vb-chat-send-');
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

test('with a session, Send hands it the answers in card order, ✓ and ✗ as marks (D-045), and the head', async () => {
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
  // Handed over first, then recorded with the head it read (point 383): the Send's own line comes after that head.
  assert.equal(sent.head, sent.seq - 1, 'the Send records the line its message read through');
  assert.deepEqual(lines.slice(2), [
    `${q} (question): ✓`, 'Nothing left open.',
    `These are the person's answers up to head ${sent.head}. To read anything newer, call check_responses on board "pricing" with after ${sent.head}.`,
    '', 'Board: pricing',
  ]);
  const events = await readChat(h.base, h.cookie, session, turns(1));
  for (const e of events) assert.deepEqual(schemaProblems(CHAT_EVENT_ID, e), [], JSON.stringify(e));
  assert.deepEqual([events[0]!.kind, events[0]!.text], ['message_in', run.prompt.replace('\n\nBoard: pricing', '')], 'the feed shows the answers as sent');
  const responses = await h.ok('check_responses', { board: 'pricing', after: 0 });
  const check = responses.responses.find((e: { action: string }) => e.action === 'check');
  assert.ok(check && !('means' in check), 'check_responses names ✓ `check`, with no meaning (D-045)');
});

test('while a turn runs the Send waits, once, and goes when the turn ends with every answer since', async () => {
  const { q, d } = h.seeded;
  const head = h.ledger.state().seq;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'Keep going.' } });
  const busy = await fake.run(2);
  const watermark = h.ledger.state().sentHead.get('pricing');
  await act({ action: 'comment', n: d, ver: 1, text: 'Too early.' });
  const pressed = await send();
  await act({ action: 'comment', n: q, ver: 2, text: 'Per seat, then.' });
  await send();
  // Point 383: a Send pressed while the turn runs is recorded, acknowledging nothing until its answers go.
  assert.equal(pressed.head, watermark, 'the press acknowledges nothing new');
  assert.equal(h.ledger.state().sentHead.get('pricing'), watermark, 'nothing counts as sent while the message waits');
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
  const read = Number(/head (\d+)\./.exec(run.prompt)![1]);
  assert.ok(read > head);
  assert.equal(h.ledger.state().acts.findLast((e) => e.action === 'send')!.head, read, 'recorded when it went, through what it read');
  assert.equal(h.ledger.state().sentHead.get('pricing'), read);
});

// A Send counts only what went (point 377): the standalone server reads the answers and records the Send in one
// step as the message goes, so its `head` is the line it read; an answer while the message waits goes with it, and
// one after it went is the next round's.
test('one path: a message records its Send through the line its answers were read at; a later answer stays unsent', async () => {
  const { q, d } = h.seeded;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'Carry on.' } });
  const busy = await fake.run(4);
  await act({ action: 'comment', n: d, ver: 1, text: 'While you work.' });
  await h.ok('send_chat', { session, body: { text: 'And this.' } });
  await act({ action: 'comment', n: q, ver: 2, text: 'Held too.' });
  fake.mode('replay');
  await h.ok('stop_chat', { session });
  await gone(busy.pid);
  const run = await fake.run(5);
  assert.ok(run.prompt.includes('While you work.') && run.prompt.includes('Held too.'), 'read when it went, with everything since');
  const line = h.ledger.state().acts.findLast((e) => e.action === 'send')!;
  assert.equal(line.head, line.seq - 1, 'through the line it read, written with the message');
  const late = await act({ action: 'comment', n: d, ver: 1, text: 'After it went.' });
  const unsent = await h.ok('get_board', { board: 'pricing' });
  assert.ok(JSON.stringify(unsent).includes('After it went.'));
  assert.equal(h.ledger.state().sentHead.get('pricing'), line.head);
  assert.ok(late.seq > line.head!);
});

// Point 383: the board's Send hands the answers over first and is recorded with the head it read, as a message is. A
// chat that cannot be reached (here the session cannot be loaded after a restart) is answered to the person (point 386):
// the Send is a 409 that says why and records nothing, so the answers stay unsent, and the next Send carries them.
test('a chat that cannot be reached answers the Send with why, records nothing, and the answers go with the next Send', async () => {
  const { q } = h.seeded;
  const note = await act({ action: 'comment', n: q, ver: 2, text: 'Before the restart.' });
  const watermark = h.ledger.state().sentHead.get('pricing');
  let failing = true;
  const claude = (): AgentAdapter => (failing ? { agent: 'claude', start: () => Promise.reject(new Error('the CLI is gone')) } : fake.adapters.claude!());
  const board = await startTestBoard({ ledger: openLedger(h.ledger.file, () => {}), dist: h.dist, chat: { adapters: { claude } } });
  const quiet = console.error;
  console.error = () => {};
  try {
    const cookie = await personCookie(board.base);
    const sends = () => h.ledger.state().acts.filter((e) => e.action === 'send').length;
    const before = sends();
    const refused = await fetch(`${board.base}/api/boards/pricing/act`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ type: 'act', action: 'send', board: 'pricing' }),
    });
    assert.equal(refused.status, 409);
    const why = await refused.json() as { type: string; detail: string };
    assert.match(why.type, /\/conflict$/);
    assert.equal(why.detail, serverChatWords.theChatCouldNotBeReached('Claude Code could not be started: the CLI is gone'));
    h.ledger.refresh();
    assert.equal(sends(), before, 'nothing is recorded');
    assert.equal(h.ledger.state().sentHead.get('pricing'), watermark);
    assert.ok(h.ledger.state().unsent.get('pricing')?.has(note.seq), 'the note is still unsent');
    failing = false;
    const runs = fake.given().length;
    await personAct(board.base, cookie, 'pricing', { action: 'send', board: 'pricing' });
    const run = await fake.run(runs + 1);
    assert.ok(run.prompt.includes('Before the restart.'), 'the next Send carries it');
    h.ledger.refresh();
    const went = h.ledger.state().acts.findLast((e) => e.action === 'send')!;
    assert.equal(went.head, Number(/head (\d+)\./.exec(run.prompt)![1]));
    assert.equal(h.ledger.state().unsent.get('pricing')?.size ?? 0, 0);
  } finally {
    console.error = quiet;
    await board.close();
  }
});
