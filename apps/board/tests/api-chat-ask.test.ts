// Ask now reaches the board's chat session (api.md 188, node-overhaul FE_03 run 2): the page records the person's `ask`
// as before, and the standalone server hands the session in use on the board the asked note at once, with the board,
// as its own message: never the board's other answers, and no Send, so those still go with the next Send. With no
// session nothing runs. With the agent package's fake `claude`.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUND_HEAD } from '#actions';
import { projectFiles } from '#format';
import { makeTempDir } from '#format/testing';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat, readChat } from './chat-support.ts';
import * as serverChatWords from '../server/words/server-chat.ts';

const config = makeTempDir('vb-chat-ask-');
const fake = fakeChat(config);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const act = (body: Record<string, unknown>) => h.ok('act', { board: 'pricing', body: { type: 'act', ...body } });
const ask = (seq: number) => act({ action: 'ask', board: 'pricing', lines: [seq], context: 'board' });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('an ask on a board with no chat session runs no agent', async () => {
  const { q } = h.seeded;
  const note = await act({ action: 'comment', n: q, ver: 2, text: 'Is a truck free?' });
  await ask(note.seq);
  await pause(150);
  assert.deepEqual(fake.given(), []);
});

test('with a session, the asked note goes at once with the board, alone: no answers, no Send, which still go with Send', async () => {
  const { q, d } = h.seeded;
  const { session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const index = JSON.parse(fs.readFileSync(projectFiles(h.project).chatSessions, 'utf8'));
  const agent = index.sessions[0].agentId as string;
  const request = h.ledger.append({ type: 'grant-request', board: 'pricing', region: 'options', reason: 'Answer the options.' }, { by: 'agent', agent }).seq;
  await act({ action: 'grant', request });
  await act({ action: 'ack', n: d, ver: 1 }); // another answer, waiting for Send
  const sends = h.ledger.state().acts.filter((e) => e.action === 'send').length;
  const note = await act({ action: 'comment', n: q, ver: 2, text: 'Before noon, please.' });
  await ask(note.seq);
  const run = await fake.run(1);
  assert.ok(run.prompt.startsWith(serverChatWords.askedNowFromTheBoard), run.prompt);
  assert.match(run.prompt, /Before noon, please\./);
  assert.ok(run.prompt.endsWith('Board: pricing'));
  assert.ok(!run.prompt.includes(ROUND_HEAD), 'the board\'s other answers are not carried');
  assert.equal(h.ledger.state().acts.filter((e) => e.action === 'send').length, sends, 'no Send is recorded');
  const events = await readChat(h.base, h.cookie, session, (ev) => ev.some((e) => e.kind === 'message_in'));
  const sent = events.find((e) => e.kind === 'message_in')!;
  assert.equal(sent.text, serverChatWords.askedNow);
  assert.deepEqual(sent.chips.map((c: { kind: string; ref: number }) => [c.kind, c.ref]), [['note', note.seq]]);
  // The tick still waits: the next Send hands it over, and not the asked note again.
  await act({ action: 'send', board: 'pricing' });
  const next = await fake.run(2);
  assert.ok(next.prompt.startsWith(ROUND_HEAD), next.prompt);
  assert.match(next.prompt, new RegExp(`${d} \\(decision\\): ✓`));
  assert.ok(!next.prompt.includes('Before noon, please.'), next.prompt);
});
