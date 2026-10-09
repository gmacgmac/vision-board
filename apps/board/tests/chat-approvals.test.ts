// One session's approvals (chat-panel BE_03 ruling 4, api.md 100): a request event, then exactly one
// result, by the person's answer, the time limit (expired), or a release (Stop, a new message, the
// gate gone); the first answer wins; a yes for the session answers that kind of change at once.
// Every event fits the chat schema's kinds and the gate's outcome fits `outcome`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Facts } from '../../../packages/agent/src/index.ts';
import type { ApprovalDraft } from '../server/chat-approvals.ts';
import { createApprovals } from '../server/chat-approvals.ts';
import { ProblemError } from '../server/problem.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';

const WRITE: Facts = { kind: 'write', op: 'create', path: '/tmp/notes.md', preview: 'hello' };
const COMMAND: Facts = { kind: 'command', command: 'ls', risks: [], paths: [] };

function setup(ttlMs?: number) {
  const events: ApprovalDraft[] = [];
  let seq = 0;
  const approvals = createApprovals((d) => {
    events.push(d);
    const e = { ...d, at: '2026-10-08T09:00:00Z', session: 's-1', seq: ++seq };
    assert.deepEqual(schemaProblems(CHAT_EVENT_ID, JSON.parse(JSON.stringify(e))), [], JSON.stringify(e));
    return e;
  }, ttlMs);
  const idOf = (i: number) => (events[i] as { approvalId: string }).approvalId;
  return { approvals, events, idOf };
}

const outcomeOk = (o: unknown) => assert.deepEqual(schemaProblems(`${CHAT_EVENT_ID}#/$defs/outcome`, o), []);

function code(fn: () => unknown): string {
  try { fn(); } catch (err) { return err instanceof ProblemError ? err.code : String(err); }
  return 'no error';
}

test('allowed: the request, then the answer; the gate is told yes, once', async () => {
  const { approvals, events, idOf } = setup();
  const asked = approvals.ask(WRITE);
  assert.equal(events[0]!.kind, 'approval_request');
  assert.deepEqual((events[0] as { facts: Facts }).facts, WRITE);
  const result = approvals.answer(idOf(0), { approved: true });
  assert.deepEqual([result.kind, result.seq], ['approval_result', 2]);
  const outcome = await asked;
  outcomeOk(outcome);
  assert.deepEqual(outcome, { approved: true, status: 'approved', approvalId: idOf(0), scope: 'once' });
  assert.equal(code(() => approvals.answer(idOf(0), { approved: false })), 'conflict');
  assert.equal(code(() => approvals.answer('ap-nope', { approved: true })), 'not-found');
});

test('denied: the gate is told no, with no scope', async () => {
  const { approvals, events, idOf } = setup();
  const asked = approvals.ask(COMMAND);
  approvals.answer(idOf(0), { approved: false, scope: 'session' });
  const outcome = await asked;
  outcomeOk(outcome);
  assert.deepEqual(outcome, { approved: false, status: 'denied', approvalId: idOf(0) });
  assert.deepEqual(events[1], { kind: 'approval_result', approvalId: idOf(0), approved: false, status: 'denied' });
  approvals.ask(COMMAND);
  assert.equal(events.length, 3, 'a no for the session is not kept: the next command asks again');
  approvals.release();
});

test('timed out: silence past the limit is a denial, and a late answer is a conflict', async () => {
  const { approvals, events, idOf } = setup(30);
  const outcome = await approvals.ask(WRITE);
  assert.deepEqual(outcome, { approved: false, status: 'expired', approvalId: idOf(0) });
  assert.equal(events[1]!.kind, 'approval_result');
  assert.equal(code(() => approvals.answer(idOf(0), { approved: true })), 'conflict');
  assert.ok(Date.parse((events[0] as { expiresAt: string }).expiresAt) > 0);
});

test('session scope: a yes for the session answers that kind at once, unasked; another kind still asks', async () => {
  const { approvals, events, idOf } = setup();
  const first = approvals.ask(WRITE);
  approvals.answer(idOf(0), { approved: true, scope: 'session' });
  assert.deepEqual(await first, { approved: true, status: 'approved', approvalId: idOf(0), scope: 'session' });
  const again = await approvals.ask({ ...WRITE, op: 'edit', path: '/tmp/other.md' });
  outcomeOk(again);
  assert.deepEqual(again, { approved: true, status: 'approved', scope: 'session', asked: false });
  assert.equal(events.length, 2, 'nobody was asked');
  const command = approvals.ask(COMMAND);
  assert.equal(events[2]!.kind, 'approval_request');
  approvals.release();
  assert.equal((await command).status, 'released');
});

test('released: a Stop, a new message or the gate going away settles every wait as a denial', async () => {
  const { approvals, events } = setup();
  const a = approvals.ask(WRITE);
  const b = approvals.ask(COMMAND);
  approvals.release();
  for (const o of [await a, await b]) { outcomeOk(o); assert.deepEqual([o.approved, o.status], [false, 'released']); }
  const gone = new AbortController();
  const c = approvals.ask(WRITE, gone.signal);
  gone.abort();
  assert.equal((await c).status, 'released');
  assert.deepEqual(events.filter((e) => e.kind === 'approval_result').map((e) => (e as { status: string }).status), ['released', 'released', 'released']);
});
