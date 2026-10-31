// The chat carries the board (chat-board-context rulings 2, 3, 5; api.md 131), with the agent
// package's fake `claude`: one message holds the person's words, the attached cards and notes and
// the answers since the agent was last told, in that order, and is recorded as the board's Send when
// it goes; with no words the context alone goes; with nothing at all, `invalid`. While the agent
// works, a message waits, words alone too (one wait line, point 328), its words joined to any other
// waiting, and goes when the turn ends, built then. The answers and the cards are read through the
// engine's `resolve`, as any host reads a chip (D-074 rule 6).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROUND_HEAD, SELECTED_HEAD } from '#actions';
import { NOTES_HEAD, ONLY_ATTACHED } from '../server/chat-prompt.ts';
import { QUEUED_WORDS } from '../server/chat-session.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, gone, readChat } from './chat-support.ts';
import { createEngine } from '../server/engine/index.ts';
import { openChats } from '../server/chat-sessions.ts';
import { DEFAULT_SERVER } from '#format';
import { makeTempDir } from '#format/testing';

const config = makeTempDir('vb-chat-context-');
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

test('one message: the words, "The person selected these cards:", then the answers in card order and the head line, then the board', async () => {
  const { q, d } = h.seeded;
  await act({ action: 'ack', n: q, ver: 2 });
  const note = (await act({ action: 'comment', n: d, ver: 1, text: 'After the launch.' })).seq;
  const before = sends();
  const accepted = await message({ text: 'Write the tasks for these.', cards: [q], notes: [note] });
  const given = await fake.run(++runs);
  const head = h.ledger.state().acts.findLast((e) => e.action === 'send')!.seq - 1;
  const parts = given.prompt.split('\n\n');
  assert.equal(parts[0], 'Write the tasks for these.');
  // The note is one of the answers (below), so it is not attached as well (chat-no-double-note ruling 3); the card is both
  // selected and answered, so it stays, with nothing of its answer (ruling 4).
  assert.equal(parts[1], `${SELECTED_HEAD}\n- Card ${q}: Flat fee or per seat? (with the numbers)`, 'the selection right after the words, before the answers (composer-one-chip ruling 3)');
  assert.doesNotMatch(given.prompt, /Attached from the board/);
  assert.equal(given.prompt.split('After the launch.').length - 1, 1, 'the note\'s words go once');
  const round = parts[2]!.split('\n');
  assert.equal(round[0], ROUND_HEAD);
  assert.match(round[1]!, /^Board "Pricing options" \(v\d+\)$/);
  // The seed's own comment on q and Later on d had no Send yet: this message is the first to tell them.
  assert.equal(round.findIndex((l) => l.startsWith(`${q} (question): ✓`)), 2, 'card order, q first');
  assert.match(round.find((l) => l.startsWith(`${d} `))!, /^\d+ \(decision\): .*After the launch\.$/);
  assert.equal(round.at(-1), headLine(head));
  assert.equal(parts.at(-1), 'Board: pricing');
  assert.equal(sends(), before + 1, 'recorded as the board\'s Send');
  assert.deepEqual([accepted.kind, accepted.text], ['message_in', `Write the tasks for these.\n\n${parts[2]}`]);
  assert.deepEqual(accepted.chips.map((c: { kind: string }) => c.kind), ['card'], 'no chip for the answered note');
  assert.equal(accepted.text.split('After the launch.').length - 1, 1);
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
  assert.equal(given.prompt, `${SELECTED_HEAD}\n- Card ${q}: Flat fee or per seat? (with the numbers)\n\nBoard: pricing`);
  assert.equal(accepted.text, ONLY_ATTACHED);
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('a note named alone that is among the answers goes once, as the answer; no chip, no "Attached"', async () => {
  const { q } = h.seeded;
  const note = (await act({ action: 'comment', n: q, ver: 2, text: 'Check with finance.' })).seq;
  const accepted = await message({ notes: [note] });
  const given = await fake.run(++runs);
  assert.ok(given.prompt.startsWith(`${ROUND_HEAD}\n`), given.prompt);
  assert.ok(!given.prompt.includes(NOTES_HEAD));
  assert.equal(given.prompt.split('Check with finance.').length - 1, 1);
  assert.equal(accepted.chips, undefined);
  assert.equal(accepted.text, given.prompt.replace('\n\nBoard: pricing', ''));
  await readChat(h.base, h.cookie, session, turns(runs));
});

test('while the agent works: a message waits, words alone too, joined, and goes when the turn ends', async () => {
  const { q, d } = h.seeded;
  fake.mode('hang');
  try {
    await message({ text: 'Keep going.' });
    const busy = await fake.run(++runs);
    const before = sends();
    const waiting = await message({ text: 'Only words.' });
    assert.deepEqual([waiting.kind, waiting.text], ['system', QUEUED_WORDS]);
    await act({ action: 'comment', n: q, ver: 2, text: 'Per seat, then.' });
    assert.equal((await message({ text: 'And this one.' })).seq, waiting.seq);
    await act({ action: 'drop', n: d, ver: 1 });
    const again = await message({ cards: [d] });
    assert.equal(again.seq, waiting.seq, 'one wait line for three messages');
    assert.equal(sends(), before, 'no Send until it goes');
    fake.mode('replay');
    await h.ok('stop_chat', { session });
    await gone(busy.pid);
    const given = await fake.run(++runs);
    const parts = given.prompt.split('\n\n');
    assert.deepEqual(parts.slice(0, 3), ['Only words.', 'And this one.', `${SELECTED_HEAD}\n- Card ${d}: Choose the launch price`]);
    assert.match(given.prompt, new RegExp(`^${q} \\(question\\): .*Per seat, then\\.$`, 'm'));
    assert.match(given.prompt, new RegExp(`^${d} \\(decision\\): ✗`, 'm'), 'built when it went: the ✗ after the first wait is in');
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

test('a session reads the answers and the cards through the resolve it is given, and tells its agent exactly what that says', async () => {
  const config2 = makeTempDir('vb-chat-resolve-');
  const own = fakeChat(config2);
  const dir = makeTempDir('vb-chat-resolve-data-');
  const engine = createEngine({ dir, warn: () => {} });
  const asked: string[] = [];
  const resolve = ((kind: string, ref: unknown) => { asked.push(kind); return engine.resolve(kind, ref); }) as typeof engine.resolve;
  const chats = openChats({ ledger: engine.ledger, resolve, agents: engine.agents, base: () => DEFAULT_SERVER, adapters: own.adapters });
  try {
    const person = { by: 'person' as const };
    assert.equal((await engine.route({ method: 'PUT', path: 'boards/plans', body: { title: 'Plans' } }, { caller: person }))?.status, 201);
    const started = await chats.start('plans', 'claude');
    const agent = { by: 'agent' as const, agent: started.agentId };
    const items = [{ type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } }, { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' } }];
    assert.equal((await engine.tools.call('write_board', { board: 'plans', items }, { caller: agent })).isError, false);
    await engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Friday is fine.' } }, { caller: person });
    const expected = engine.resolve('answers', { board: 'plans', since: 0, agent: started.agentId });
    const said = 'refused' in expected ? assert.fail('refused') : expected.text;
    assert.match(said, /Friday is fine\./);
    asked.length = 0;
    chats.tell(await chats.live(started.session), { text: 'Go on.', cards: [1] });
    assert.deepEqual([...new Set(asked)].sort(), ['answers', 'card']);
    const given = await own.run(1);
    assert.equal(given.prompt.split('\n\n')[0], 'Go on.');
    assert.ok(given.prompt.includes(said), 'the answers, word for word');
    assert.ok(given.prompt.includes(`${SELECTED_HEAD}\n- Card 1: Ship on Friday?`), 'the card as `resolve` says it');
  } finally {
    chats.close();
    fs.rmSync(config2, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
