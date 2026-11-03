// Chat sessions on the board server (chat-panel BE_03, api.md 101-102) with the agent package's
// fake `claude` replaying a recorded real turn: starting a session joins the board as its agent and
// records the person's grant; a message becomes the prompt (chips spelled out, the board id) and the
// board's Send; the turn streams in order as valid chat events; the secret reaches only the board MCP
// server's environment; one turn at a time; Stop; a new session replaces the old one and stops its
// CLI; and after a restart the session is listed and resumed.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { projectSlug } from '#agent';
import { createClient } from '#client';
import { openAgents } from '../server/agents.ts';
import { personCookie, startTestBoard } from './test-board.ts';
import { INSTRUCTIONS_FILE } from '../server/chat-access.ts';
import { QUEUED_WORDS } from '../server/chat-session.ts';
import type { StoredSession } from '../server/chat-index.ts';
import { openLedger } from '../server/ledger.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, gone, readChat, turnEnded } from './chat-support.ts';
import { makeTempDir } from '#format/testing';
import { ledgerFolder, projectFiles } from '#format';

const config = makeTempDir('vb-chat-cli-');
const fake = fakeChat(config);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const dataDir = () => projectFiles(h.project).root;
const indexFile = () => projectFiles(h.project).chatSessions;
const stored = () => JSON.parse(fs.readFileSync(indexFile(), 'utf8')).sessions as StoredSession[];
const valid = (events: Event[]) => { for (const e of events) assert.deepEqual(schemaProblems(CHAT_EVENT_ID, e), [], JSON.stringify(e)); };
let first: { session: string; board: string };

test('start: a session for the board; the server joins as its agent and records the person\'s grant', async () => {
  const before = h.ledger.state().seq;
  first = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude', model: 'sonnet' } });
  assert.equal(h.last().status, 201);
  assert.deepEqual([first.board, (first as any).agent, (first as any).model], ['pricing', 'claude', 'sonnet']);
  const lines = h.ledger.events().filter((e) => e.seq > before);
  assert.deepEqual(lines.map((e) => [e.type, e.by]), [['join', 'agent'], ['grant-request', 'agent'], ['act', 'person']]);
  const agentId = lines[0]!.agent!;
  assert.equal((lines[0] as { label?: string }).label, path.basename(h.project));
  assert.equal((lines[2] as { action?: string }).action, 'grant');
  const board = await h.ok('get_board', { board: 'pricing' });
  assert.ok(board.boardHolders.some((x: { agent: string }) => x.agent === agentId), 'the session\'s agent holds the board');
  assert.deepEqual(stored(), [{ ...first, agentId }]);
  assert.equal(fs.statSync(indexFile()).mode & 0o777, 0o600);
  assert.match(fs.readFileSync(projectFiles(h.project).gitignore, 'utf8'), /^chat-sessions\.json$/m);
  assert.deepEqual(await h.ok('list_chats', { board: 'pricing' }), { sessions: [first] });
});

test('a message: chips, the board\'s Send, the prompt, and the turn streamed in order as chat events', async () => {
  const { q, comment } = h.seeded;
  const before = h.ledger.state().seq;
  const msg = await h.ok('send_chat', { session: first.session, body: { text: 'Draw the options.', notes: [comment], cards: [q] } });
  assert.equal(h.last().status, 202);
  const title = 'Flat fee or per seat? (with the numbers)';
  assert.deepEqual([msg.kind, msg.seq, msg.chips], ['message_in', 1, [{ kind: 'note', ref: comment, label: 'Why per seat?' }, { kind: 'card', ref: q, label: title }]]);
  const send = h.ledger.events().filter((e) => e.seq > before);
  assert.deepEqual(send.map((e) => [e.type, (e as { action?: string }).action, (e as { board?: string }).board]), [['act', 'send', 'pricing']]);
  const events = await readChat(h.base, h.cookie, first.session, turnEnded);
  valid(events);
  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1));
  assert.deepEqual(events.map((e) => e.kind), ['message_in', 'tool_activity', 'tool_activity', 'tool_activity', 'tool_activity', 'message_out', 'system']);
  assert.deepEqual([events[4]!.tool, events[4]!.cards, events.at(-1)!.turn], ['write_board', [1, 2], 'done']);
  const run = await fake.run(1);
  // The selection right after the words (composer-one-chip ruling 3), then the note an older client names.
  assert.equal(run.prompt, `Draw the options.\n\nThe person selected these cards:\n- Card ${q}: ${title}\n\nAttached from the board:\n- Note ${comment} on card ${q} "${title}": Why per seat?\n\nBoard: pricing`);
  const flag = (name: string) => run.args[run.args.indexOf(name) + 1];
  assert.deepEqual([flag('--session-id'), flag('--model'), flag('--append-system-prompt-file')], [first.session, 'sonnet', INSTRUCTIONS_FILE]);
  assert.ok(run.args.includes('mcp__vision-board__*'));
  assert.deepEqual(run.gate.url, `${h.base}/api/run/approvals`);
});

test('the secret reaches only the board MCP server\'s environment, and it is the session\'s agent', async () => {
  const run = await fake.run(1);
  const { env } = run.mcpConfig.mcpServers['vision-board']!;
  const secret = env.VB_AGENT_SECRET!;
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(env.VB_SERVER, h.base);
  const events = await readChat(h.base, h.cookie, first.session, turnEnded);
  for (const [where, text] of [['the CLI\'s arguments', run.args.join(' ')], ['the events', JSON.stringify(events)], ['the index', fs.readFileSync(indexFile(), 'utf8')], ['the ledger', fs.readFileSync(h.ledger.file, 'utf8')]]) {
    assert.ok(!text!.includes(secret), `the secret is in ${where}`);
  }
  assert.equal(openAgents(ledgerFolder(h.project)).find(secret, () => true), stored()[0]!.agentId);
  await h.ok('list_open', { board: 'pricing' }, { as: h.agent(secret) });
});

test('the stream from `after`; an `after` from before a restart starts over', async () => {
  const later = await readChat(h.base, h.cookie, first.session, turnEnded, 3);
  assert.equal(later[0]!.seq, 4);
  const again = await readChat(h.base, h.cookie, first.session, turnEnded, 999);
  assert.equal(again[0]!.seq, 1);
});

test('one turn at a time; Stop ends the CLI and the turn; a second Stop has nothing to stop', async () => {
  fake.mode('hang');
  await h.ok('send_chat', { session: first.session, body: { text: 'Keep going.' } });
  const run = await fake.run(2);
  assert.deepEqual(run.args.slice(4, 6), ['--resume', first.session], 'the second turn resumes the first');
  const queued = await h.ok('send_chat', { session: first.session, body: { text: 'And again.' } });
  assert.deepEqual([queued.kind, queued.text], ['system', QUEUED_WORDS], 'words alone wait for the turn (point 328)');
  fake.mode('replay');
  assert.deepEqual(await h.ok('stop_chat', { session: first.session }), { stopped: true });
  await gone(run.pid);
  const next = await fake.run(3);
  assert.match(next.prompt, /^And again\./, 'the waiting words go as the next turn');
  const events = await readChat(h.base, h.cookie, first.session, (ev) => ev.filter((e) => e.turn !== undefined).length >= 3);
  valid(events);
  assert.ok(events.some((e) => e.kind === 'system' && e.turn === 'stopped'));
  assert.deepEqual(events.at(-1), { ...events.at(-1), kind: 'system', turn: 'done' });
  assert.deepEqual(await h.ok('stop_chat', { session: first.session }), { stopped: false });
});

test('a new session replaces the board\'s current one and stops its CLI; the old one takes no message', async () => {
  fake.mode('hang');
  await h.ok('send_chat', { session: first.session, body: { text: 'Think it over.' } });
  const run = await fake.run(4);
  const second = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  await gone(run.pid);
  fake.mode('replay');
  assert.notEqual(second.session, first.session);
  assert.deepEqual((await h.ok('list_chats', { board: 'pricing' })).sessions, [second, first]);
  assert.notEqual(stored()[1]!.agentId, stored()[0]!.agentId, 'a new session is a new agent, with no memory');
  await h.fails('send_chat', { session: first.session, body: { text: 'Hello?' } }, 409, 'conflict');
  await h.fails('send_chat', { session: 'no-such-session', body: { text: 'Hello?' } }, 404, 'not-found');
  await h.fails('send_chat', { session: second.session, body: { text: 'Look.', cards: [9999] } }, 422, 'invalid');
  const kiro = await h.fails('start_chat', { board: 'pricing', body: { agent: 'kiro' } }, 422, 'invalid');
  assert.match(kiro.detail, /Kiro/);
  await h.fails('start_chat', { board: 'nowhere', body: { agent: 'claude' } }, 404, 'not-found');
});

test('after a restart the session is listed and resumed, as the same agent with a fresh secret', async () => {
  const current = stored()[1]!;
  const transcript = path.join(config, 'projects', projectSlug(h.project), `${current.session}.jsonl`);
  fs.mkdirSync(path.dirname(transcript), { recursive: true });
  fs.writeFileSync(transcript, '{}\n');
  const board = await startTestBoard({ ledger: openLedger(h.ledger.file, () => {}), dist: h.dist, chat: { adapters: fake.adapters } });
  try {
    const { base } = board;
    const cookie = await personCookie(base);
    const person = createClient({ base, fetch: (url, init) => fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: cookie } }) });
    const { sessions } = await person.call('list_chats', { board: 'pricing' }) as { sessions: { session: string }[] };
    assert.equal(sessions[0]!.session, current.session);
    const runs = fake.given().length;
    await person.call('send_chat', { session: current.session, body: { text: 'Where were we?' } });
    const events = await readChat(base, cookie, current.session, turnEnded);
    valid(events);
    // The events before the restart are gone (memory only); one line says so (VERIFY_01 bug 4).
    assert.deepEqual(events.slice(0, 2).map((e) => [e.seq, e.kind, e.text, e.turn]), [
      [1, 'system', 'Earlier messages aren\'t shown after a restart; the agent still remembers them.', undefined],
      [2, 'message_in', 'Where were we?', undefined],
    ]);
    assert.equal(events.filter((e) => e.kind === 'system' && e.turn === undefined).length, 1);
    const run = await fake.run(runs + 1);
    assert.deepEqual(run.args.slice(4, 6), ['--resume', current.session]);
    const secret = run.mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
    assert.equal(openAgents(ledgerFolder(h.project)).find(secret, () => true), current.agentId);
  } finally {
    await board.close();
  }
});
