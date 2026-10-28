// A question waits for the person (HOLD_01, PLAN ruling 335) in one live chat session: with `hold`
// on, the adapter's session is told to hold its turn clock when a question opens and to go on when
// it settles (answered, Stop, a new message), and nothing expires; with it off the session never
// holds and a question lapses as before. A fake adapter session stands in for the CLI.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { AgentSession, AgentUpdate, Facts } from '#agent';
import { createLiveSession } from '../server/chat-session.ts';
import type { ChatEvent } from '../server/chat-session.ts';
import type { StoredSession } from '../server/chat-index.ts';

const RECORD = { session: 's-1', board: 'pricing', agent: 'claude' } as unknown as StoredSession;
const WRITE: Facts = { kind: 'write', op: 'create', path: '/tmp/notes.md', preview: 'hello' };

/** An agent whose turn runs until `finish()` or `cancel()`; `held` is every `hold` call it got. */
function fakeAgent() {
  const held: boolean[] = [];
  let finish!: () => void;
  const agent: AgentSession = {
    id: 'a-1',
    async *prompt(): AsyncGenerator<AgentUpdate> {
      await new Promise<void>((resolve) => { finish = resolve; });
      yield { type: 'done', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
    },
    cancel: () => finish?.(),
    hold: (on) => { held.push(on); },
  };
  return { agent, held, finish: () => finish() };
}

const request = (events: ChatEvent[]) => events.find((e) => e.kind === 'approval_request') as ChatEvent & { approvalId: string };

test.afterEach(() => mock.timers.reset());

test('hold on: the agent holds while a question waits, and goes on when the person answers; nothing lapses', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { agent, held, finish } = fakeAgent();
  const live = createLiveSession(RECORD, agent, 'tok', { hold: true });
  live.send('go', { kind: 'message_in', text: 'go' });
  const asked = live.approvals.ask(WRITE);
  assert.deepEqual(held, [true]);
  mock.timers.tick(10 * 60_000 + 1);
  mock.timers.tick(3_600_000);
  const req = request(live.after(0));
  assert.equal('expiresAt' in req, false);
  live.approvals.answer(req.approvalId, { approved: true });
  assert.equal((await asked).status, 'approved');
  assert.deepEqual(held, [true, false]);
  finish();
});

test('hold on: Stop releases the question and the agent goes on (to be stopped); so does the turn ending', async () => {
  const { agent, held } = fakeAgent();
  const live = createLiveSession(RECORD, agent, 'tok', { hold: true });
  live.send('go', { kind: 'message_in', text: 'go' });
  const asked = live.approvals.ask(WRITE);
  assert.equal(live.stop(), true);
  assert.equal((await asked).status, 'released');
  assert.deepEqual(held, [true, false], 'released before the cancel, so the clock is not left held');
});

test('hold on: a new message (words alone while it works) releases the question', async () => {
  const { agent, held } = fakeAgent();
  const live = createLiveSession(RECORD, agent, 'tok', { hold: true });
  live.send('go', { kind: 'message_in', text: 'go' });
  const asked = live.approvals.ask(WRITE);
  live.approvals.release(); // what chat.ts `busy` does
  assert.equal((await asked).status, 'released');
  assert.deepEqual(held, [true, false]);
  live.close();
});

test('hold off (today): the agent is never told to hold, and an unanswered question lapses', async () => {
  const { agent, held, finish } = fakeAgent();
  const live = createLiveSession(RECORD, agent, 'tok', { ttlMs: 30 });
  live.send('go', { kind: 'message_in', text: 'go' });
  const outcome = await live.approvals.ask(WRITE);
  assert.equal(outcome.status, 'expired');
  assert.deepEqual(held, []);
  assert.ok(Date.parse((request(live.after(0)) as unknown as { expiresAt: string }).expiresAt) > 0);
  finish();
});

test('an adapter session with no hold is fine (hold is optional on the interface)', async () => {
  const { agent, finish } = fakeAgent();
  delete agent.hold;
  const live = createLiveSession(RECORD, agent, 'tok', { hold: true });
  live.send('go', { kind: 'message_in', text: 'go' });
  const asked = live.approvals.ask(WRITE);
  live.approvals.answer(request(live.after(0)).approvalId, { approved: false });
  assert.equal((await asked).status, 'denied');
  finish();
});
