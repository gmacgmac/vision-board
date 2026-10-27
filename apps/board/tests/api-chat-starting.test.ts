// A message while a new session is starting on the board (FIX_01 ruling 1, VERIFY_01 bug 1): the
// session being replaced takes no message then (a `conflict` that says to wait), and the board's
// Send is recorded only for a message that was accepted. Once the new session has started, the
// message goes to it. The agent package's fake `claude`, its start held by the test.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentAdapter } from '#agent';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { fakeChat, readChat, turnEnded } from './chat-support.ts';

const config = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-starting-'));
const fake = fakeChat(config);
let held: Promise<void> | null = null;
/** The fake Claude, whose start waits while `held` is set. */
const claude = (): AgentAdapter => {
  const inner = fake.adapters.claude!();
  return { agent: inner.agent, async start(o) { await held; return inner.start(o); } };
};
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: { claude } } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const sends = () => h.ledger.events().filter((e) => e.type === 'act' && (e as { action?: string }).action === 'send').length;

test('while a new session starts, the old one takes no message and no Send is recorded; then the new one takes it', async () => {
  const old = await h.ok<{ session: string }>('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  let release = () => {};
  held = new Promise<void>((resolve) => { release = resolve; });
  const starting = h.ok<{ session: string }>('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  await new Promise((r) => setTimeout(r, 50));
  const before = sends();
  const refused = await h.fails('send_chat', { session: old.session, body: { text: 'Hello?' } }, 409, 'conflict');
  assert.match(refused.detail, /new session is starting/);
  assert.equal(sends(), before, 'no Send for a message that was not accepted');
  release();
  held = null;
  const next = await starting;
  await h.ok('send_chat', { session: next.session, body: { text: 'Hello?' } });
  assert.equal(sends(), before + 1, 'the accepted message records the Send');
  const events = await readChat(h.base, h.cookie, next.session, turnEnded);
  assert.equal(events[0]!.kind, 'message_in');
  await h.fails('send_chat', { session: old.session, body: { text: 'Hello?' } }, 409, 'conflict');
  assert.equal(sends(), before + 1);
});
