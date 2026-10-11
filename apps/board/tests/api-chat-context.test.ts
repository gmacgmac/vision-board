// The chat carries the board (chat-board-context rulings 2, 3, 5; api.md 131), with the agent
// package's fake `claude`: one message holds the person's words, the attached cards and notes and
// the answers since the agent was last told, in that order, and is recorded as the board's Send when
// it goes; with no words the context alone goes; with nothing at all, `invalid`. While the agent
// works, words alone are refused, and a message with something attached waits (one wait line), its
// words joined to any other waiting, and goes when the turn ends, built then.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ONLY_ATTACHED } from '../server/chat-prompt.ts';
import { ROUND_HEAD } from '../server/chat-round.ts';
import { QUEUED_WORDS } from '../server/chat-session.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, gone, readChat } from './chat-support.ts';

const config = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-context-'));
const fake = fakeChat(config);
let h: Harness;
let session = '';
let runs = 0;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const act = (body: Record<string, unknown>) => h.ok('act', { board: 'pricing', body: { type: 'act', ...body } });
const message = (body: Record<string, unknown>) => h.ok('send_chat', { session, body });
const sends = () => h.ledger.state().acts.filter((e) => e.action === 'send' && e.board === 'pricing').length;
const turns = (n: number) => (events: Event[]) => events.filter((e) => e.kind === 'system' && e.turn !== undefined).length >= n;
const headLine = (seq: number) => `These are the person's answers up to head ${seq}. To read anything newer, call check_responses on board "pricing" with after ${seq}.`;

test('a session names the agent id it writes as, the one in the index', async () => {
  const started = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  session = started.session;
  const index = JSON.parse(fs.readFileSync(path.join(h.project, '.visionboard', 'chat-sessions.json'), 'utf8'));
  assert.match(started.agentId, /^a-[a-z0-9]{8}$/);
  assert.equal(started.agentId, index.sessions[0].agentId);
  assert.equal((await h.ok('list_chats', { board: 'pricing' })).sessions[0].agentId, started.agentId);
  // The seed's container is another agent's: the session's agent may answer there once it holds it (api.md 41).
  const request = h.ledger.append({ type: 'grant-request', board: 'pricing', region: 'options', reason: 'Answer the options.' }, { by: 'agent', agent: started.agentId }).seq;
  await act({ action: 'grant', request });
});

test('one message: the words, the attached cards and notes, then the answers in card order and the head line, then the board', async () => {
  const { q, d } = h.seeded;
  await act({ action: 'ack', n: q, ver: 2 });
  const note = (await act({ action: 'comment', n: d, ver: 1, text: 'After the launch.' })).seq;
  const before = sends();
  const accepted = await message({ text: 'Write the tasks for these.', cards: [q], notes: [note] });
  const given = await fake.run(++runs);
  const head = h.ledger.state().acts.findLast((e) => e.action === 'send')!.seq - 1;
  const parts = given.prompt.split('\n\n');
  assert.equal(parts[0], 'Write the tasks for these.');
  assert.equal(parts[1], `Attached from the board:\n- Note ${note} on card ${d} "Choose the launch price": After the launch.\n- Card ${q}: Flat fee or per seat? (with the numbers)`);
  const round = parts[2]!.split('\n');
  assert.equal(round[0], ROUND_HEAD);
  assert.match(round[1]!, /^Board "Pricing options" \(v\d+\)$/);
  // The seed's own comment on q and Later on d had no Send yet: this message is the first to tell them.
  assert.equal(round.findIndex((l) => l.startsWith(`${q} (question): yes`)), 2, 'card order, q first');
  assert.match(round.find((l) => l.startsWith(`${d} `))!, /^\d+ \(decision\): .*After the launch\.$/);
  assert.equal(round.at(-1), headLine(head));
  assert.equal(parts.at(-1), 'Board: pricing');
  assert.equal(sends(), before + 1, 'recorded as the board\'s Send');
  assert.deepEqual([accepted.kind, accepted.text], ['message_in', `Write the tasks for these.\n\n${parts[2]}`]);
  assert.deepEqual(accepted.chips.map((c: { kind: string }) => c.kind), ['note', 'card']);
  assert.deepEqual(schemaProblems(CHAT_EVENT_ID, accepted), []);
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('the next message tells only what is new; words alone go as before', async () => {
  await message({ text: 'Thanks.' });
  const given = await fake.run(++runs);
  assert.equal(given.prompt, 'Thanks.\n\nBoard: pricing');
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('no words: the answers alone go, as the board\'s Send message; nothing at all is invalid', async () => {
  await h.fails('send_chat', { session, body: {} }, 422, 'invalid');
  const { d } = h.seeded;
  await act({ action: 'ack', n: d, ver: 1 });
  const accepted = await message({});
  const given = await fake.run(++runs);
  assert.ok(given.prompt.startsWith(`${ROUND_HEAD}\n`), given.prompt);
  assert.ok(given.prompt.endsWith('\n\nBoard: pricing'));
  assert.match(given.prompt, new RegExp(`^${d} \\(decision\\): `, 'm'));
  assert.equal(accepted.text, given.prompt.replace('\n\nBoard: pricing', ''));
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('no words, a card attached: the card goes, the bubble saying so', async () => {
  const { q } = h.seeded;
  const accepted = await message({ cards: [q] });
  const given = await fake.run(++runs);
  assert.equal(given.prompt, `Attached from the board:\n- Card ${q}: Flat fee or per seat? (with the numbers)\n\nBoard: pricing`);
  assert.equal(accepted.text, ONLY_ATTACHED);
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('while the agent works: words alone are refused; with something attached it waits, joined, and goes when the turn ends', async () => {
  const { q, d } = h.seeded;
  fake.mode('hang');
  try {
    await message({ text: 'Keep going.' });
    const busy = await fake.run(++runs);
    await h.fails('send_chat', { session, body: { text: 'Only words.' } }, 409, 'conflict');
    await act({ action: 'comment', n: q, ver: 2, text: 'Per seat, then.' });
    const before = sends();
    const waiting = await message({ text: 'And this one.' });
    assert.deepEqual([waiting.kind, waiting.text], ['system', QUEUED_WORDS]);
    await act({ action: 'drop', n: d, ver: 1 });
    const again = await message({ cards: [d] });
    assert.equal(again.seq, waiting.seq, 'one wait line for two messages');
    assert.equal(sends(), before, 'no Send until it goes');
    fake.mode('replay');
    await h.ok('stop_chat', { session });
    await gone(busy.pid);
    const given = await fake.run(++runs);
    const parts = given.prompt.split('\n\n');
    assert.deepEqual(parts.slice(0, 2), ['And this one.', `Attached from the board:\n- Card ${d}: Choose the launch price`]);
    assert.match(given.prompt, new RegExp(`^${q} \\(question\\): .*Per seat, then\\.$`, 'm'));
    assert.match(given.prompt, new RegExp(`^${d} \\(decision\\): drop`, 'm'), 'built when it went: the drop after the first wait is in');
    const events = await readChat(h.base, h.cookie, session, turns(runs));
    assert.equal(events.filter((e) => e.text === QUEUED_WORDS).length, 1);
    assert.equal(sends(), before + 1, 'recorded once, when it went');
  } finally {
    fake.mode('replay');
  }
});

test('a session in the folder takes words only; nothing is invalid', async () => {
  const folder = await h.ok('start_folder_chat', { body: { agent: 'claude' } });
  await h.fails('send_chat', { session: folder.session, body: {} }, 422, 'invalid');
});
