// A chat session in a folder with no board open (panel-send ruling 2, api.md 122), with the agent
// package's fake `claude`: it starts with no board and grants nothing; its messages take no chips,
// record no Send and tell the agent no board is open; another agent's new board leaves it where it
// is; the first board its own agent creates becomes its board (index, lists), and its messages then
// name that board and record its Send.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { StoredSession } from '../server/chat-index.ts';
import { NO_BOARD } from '../server/chat-prompt.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, readChat } from './chat-support.ts';
import { makeTempDir } from '#format/testing';
import { projectFiles } from '#format';

const config = makeTempDir('vb-chat-folder-');
const fake = fakeChat(config);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const stored = () => JSON.parse(fs.readFileSync(projectFiles(h.project).chatSessions, 'utf8')).sessions as StoredSession[];
const turns = (n: number) => (events: Event[]) => events.filter((e) => e.kind === 'system' && e.turn !== undefined).length >= n;
const newBoard = (board: string, title: string) => ({ board, body: { items: [{ type: 'board', title, key: `${board}-board` }] } });
let session = '';

test('a session in the folder: no board, only its agent\'s join, listed apart from every board\'s', async () => {
  const before = h.ledger.state().seq;
  const started = await h.ok('start_folder_chat', { body: { agent: 'claude', model: 'sonnet' } });
  assert.equal(h.last().status, 201);
  session = started.session;
  assert.deepEqual([started.board, started.agent, started.model], [undefined, 'claude', 'sonnet']);
  const lines = h.ledger.events().filter((e) => e.seq > before);
  assert.deepEqual(lines.map((e) => [e.type, e.by]), [['join', 'agent']], 'nothing is granted');
  assert.deepEqual(await h.ok('list_folder_chats'), { sessions: [started] });
  assert.deepEqual(await h.ok('list_chats', { board: 'pricing' }), { sessions: [] });
});

test('its message: no chips, no Send, and the agent is told no board is open', async () => {
  await h.fails('send_chat', { session, body: { text: 'Look.', cards: [1] } }, 422, 'invalid');
  const before = h.ledger.state().seq;
  await h.ok('send_chat', { session, body: { text: 'Plan the launch.' } });
  const run = await fake.run(1);
  assert.equal(run.prompt, `Plan the launch.\n\n${NO_BOARD}`);
  await readChat(h.base, h.cookie, session, turns(1));
  assert.equal(h.ledger.state().seq, before, 'no Send on any board');
});

test('another agent\'s new board leaves it; the first board its own agent creates becomes its board', async () => {
  const other = await h.join('Another chat');
  await h.ok('write_board', newBoard('elsewhere', 'Elsewhere'), { as: other.client });
  assert.equal(stored()[0]!.board, undefined);
  const secret = (await fake.run(1)).mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
  await h.ok('write_board', newBoard('launch', 'Launch plan'), { as: h.agent(secret) });
  await h.ok('write_board', newBoard('second', 'Second board'), { as: h.agent(secret) });
  assert.equal(stored()[0]!.board, 'launch', 'the first board only');
  assert.deepEqual(await h.ok('list_folder_chats'), { sessions: [] });
  const listed = (await h.ok('list_chats', { board: 'launch' })).sessions;
  assert.deepEqual(listed.map((x: { session: string; board: string }) => [x.session, x.board]), [[session, 'launch']]);
  const before = h.ledger.state().seq;
  await h.ok('send_chat', { session, body: { text: 'Now refine it.' } });
  assert.ok((await fake.run(2)).prompt.endsWith('\n\nBoard: launch'));
  const send = h.ledger.events().filter((e) => e.seq > before);
  assert.deepEqual(send.map((e) => [e.type, (e as { action?: string }).action, (e as { board?: string }).board]), [['act', 'send', 'launch']]);
  await readChat(h.base, h.cookie, session, turns(2));
});
