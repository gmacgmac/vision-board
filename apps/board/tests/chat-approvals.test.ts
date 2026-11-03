// One session's approvals (chat-panel BE_03 ruling 4, api.md 100): a request event, then exactly one
// result, by the person's answer, the time limit (expired), or a release (Stop, a new message, the
// gate gone); the first answer wins; a yes for the session answers what it covers at once. The
// access rules come first, and a kept yes is narrow (D-066, the tests at the end). Every event fits
// the chat schema's kinds and the gate's outcome fits `outcome`. On a real board folder; the facts'
// paths in /tmp are outside it, so they are asked.
// verify: data-folder-literal paths as the agent's file tools send them to the gate (the access rules' layout, D-037)
import { after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Facts } from '#agent';
import { accessFixture } from '#agent/testing';
import type { ApprovalDraft, ApprovalOptions } from '../server/chat-approvals.ts';
import { createApprovals } from '../server/chat-approvals.ts';
import { openPermissions } from '../server/chat-permissions.ts';
import { makeTempDir } from '#format/testing';
import { ProblemError } from '../server/problem.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';

const WRITE: Facts = { kind: 'write', op: 'create', path: '/tmp/notes.md', preview: 'hello' };
const COMMAND: Facts = { kind: 'command', command: 'npm test', risks: [], paths: [] };
const fx = accessFixture();
after(() => fx.remove());

function setup(ttlMs?: number | null, onWait?: (waiting: boolean) => void, more: Partial<ApprovalOptions> = {}) {
  const events: ApprovalDraft[] = [];
  let seq = 0;
  const approvals = createApprovals((d) => {
    events.push(d);
    const e = { ...d, at: '2026-10-08T09:00:00Z', session: 's-1', seq: ++seq };
    // A request with no `expiresAt` (approvalHold) waits for the schema to make it optional (HOLD_01 REQUESTS).
    if (!(d.kind === 'approval_request' && d.expiresAt === undefined)) assert.deepEqual(schemaProblems(CHAT_EVENT_ID, JSON.parse(JSON.stringify(e))), [], JSON.stringify(e));
    return e;
  }, { folder: fx.folder, ttlMs, onWait, ...more });
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

test('session scope: a yes for the session answers what it covers at once, unasked; another kind still asks', async () => {
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

test.afterEach(() => mock.timers.reset());

test('approvalHold (no expiry): no timer, no `expiresAt`; an answer after an hour is still the answer', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { approvals, events, idOf } = setup(null);
  const asked = approvals.ask(WRITE);
  assert.equal('expiresAt' in events[0]!, false, 'nothing lapses, so nothing is dated');
  mock.timers.tick(121_000);
  mock.timers.tick(3_600_000);
  mock.timers.tick(24 * 3_600_000);
  assert.deepEqual(events.map((e) => e.kind), ['approval_request'], 'two minutes, an hour, a day: still waiting');
  approvals.answer(idOf(0), { approved: true });
  assert.deepEqual(await asked, { approved: true, status: 'approved', approvalId: idOf(0), scope: 'once' });
});

test('approvalHold: Stop, a new message and the gate going away still release a wait', async () => {
  const { approvals, events } = setup(null);
  const a = approvals.ask(WRITE);
  const b = approvals.ask(COMMAND);
  approvals.release();
  assert.deepEqual([(await a).status, (await b).status], ['released', 'released']);
  const gone = new AbortController();
  const c = approvals.ask(WRITE, gone.signal);
  gone.abort();
  assert.equal((await c).status, 'released');
  assert.equal(events.filter((e) => e.kind === 'approval_result').length, 3);
});

test('onWait: told once when the first question opens, once when the last settles (answer, release, abort)', async () => {
  const told: boolean[] = [];
  const { approvals, idOf } = setup(null, (w) => told.push(w));
  const a = approvals.ask(WRITE);
  const b = approvals.ask(COMMAND);
  assert.deepEqual(told, [true], 'two questions waiting are one wait');
  approvals.answer(idOf(0), { approved: true });
  await a;
  assert.deepEqual(told, [true], 'one is still waiting');
  approvals.release();
  await b;
  assert.deepEqual(told, [true, false]);
  const gone = new AbortController();
  const c = approvals.ask(WRITE, gone.signal);
  gone.abort();
  await c;
  assert.deepEqual(told, [true, false, true, false]);
});

test('onWait: a yes already kept for the session opens no wait; an expiry (hold off) ends one', async () => {
  const told: boolean[] = [];
  const { approvals, idOf } = setup(30, (w) => told.push(w));
  const first = approvals.ask(WRITE);
  approvals.answer(idOf(0), { approved: true, scope: 'session' });
  await first;
  told.length = 0;
  await approvals.ask({ ...WRITE, path: '/tmp/other.md' });
  assert.deepEqual(told, [], 'answered at once, nobody waited');
  assert.equal((await approvals.ask(COMMAND)).status, 'expired');
  assert.deepEqual(told, [true, false]);
});

// ---- The access rules first, and a narrow kept yes (D-066; agent-access WIRE_01)

const at = (rel: string) => `${fx.folder}/${rel}`;
const write = (rel: string): Facts => ({ kind: 'write', op: 'edit', path: rel.startsWith('/') ? rel : at(rel) });
const command = (c: string): Facts => ({ kind: 'command', command: c, risks: [], paths: [] });

/** Ask `facts`, answer the request it makes with `answer`; the outcome. */
async function answered(a: ReturnType<typeof setup>, facts: Facts, answer: { approved: boolean; scope?: 'once' | 'session' | 'folder' }) {
  const before = a.events.length;
  const asked = a.approvals.ask(facts);
  assert.equal(a.events[before]?.kind, 'approval_request', `${JSON.stringify(facts)} was asked`);
  a.approvals.answer(a.idOf(before), answer);
  return asked;
}

test('the rules first: a refused path is denied unasked, whatever is kept; an allowed one goes unasked', async () => {
  const a = setup();
  await answered(a, write('notes.md'), { approved: true, scope: 'session' });
  const seen = a.events.length;
  for (const f of [write('.visionboard/ledger.jsonl'), write('.env'), write('.git/hooks/pre-commit'), { kind: 'read', path: '.env' } as Facts, command('cat .env')]) {
    const o = await a.approvals.ask(f);
    outcomeOk(o);
    assert.deepEqual(o, { approved: false, status: 'denied', asked: false }, JSON.stringify(f));
  }
  assert.deepEqual(await a.approvals.ask({ kind: 'read', path: at('src/x.ts') }), { approved: true, status: 'approved', asked: false });
  assert.deepEqual(await a.approvals.ask(write('.visionboard/images/a.svg')), { approved: true, status: 'approved', asked: false });
  assert.equal(a.events.length, seen, 'nobody was asked');
});

test('the open ledger, asked at each question (FIX_01 F2): its pictures go while it may be written; read-only, or another ledger\'s, are denied unasked', async () => {
  let writable = true;
  const a = setup(undefined, undefined, { ledger: () => ({ folder: '.visionboard/main', writable }) });
  const go = { approved: true, status: 'approved', asked: false };
  const no = { approved: false, status: 'denied', asked: false };
  assert.deepEqual(await a.approvals.ask(write('.visionboard/main/images/a.svg')), go);
  assert.deepEqual(await a.approvals.ask(write('.visionboard/ui/images/a.svg')), no, 'another ledger\'s');
  assert.deepEqual(await a.approvals.ask(write('.visionboard/images/a.svg')), no, 'today\'s layout, with main open');
  writable = false; // Stop editing, or the lock lost: the next question already knows
  for (const f of [write('.visionboard/main/images/a.svg'), write('.visionboard/main/apps/calc/x.js'), command('cp a.svg .visionboard/main/images/a.svg')]) {
    assert.deepEqual(await a.approvals.ask(f), no, JSON.stringify(f));
  }
  assert.equal(a.events.length, 0, 'nobody was asked');
  writable = true;
  assert.deepEqual(await a.approvals.ask(write('.visionboard/main/images/a.svg')), go, 'Edit again');
});

test('a kept yes is narrow: a write covers its file\'s folder; a command its first words; an interpreter never', async () => {
  const a = setup();
  await answered(a, write('src/a.ts'), { approved: true, scope: 'session' });
  assert.equal((await a.approvals.ask(write('src/b.ts'))).asked, false, 'src/b.ts: same folder');
  const docs = a.approvals.ask(write('docs/x.md'));
  assert.equal(a.events.at(-1)!.kind, 'approval_request', 'docs/x.md: asked');
  const sub = a.approvals.ask(write('src/sub/c.ts'));
  assert.equal(a.events.at(-1)!.kind, 'approval_request', 'src/sub/c.ts: a subfolder is asked');
  a.approvals.release();
  await Promise.all([docs, sub]);
  await answered(a, command('npm test'), { approved: true, scope: 'session' });
  assert.equal((await a.approvals.ask(command('npm test -- foo'))).asked, false);
  const build = a.approvals.ask(command('npm run build'));
  assert.equal(a.events.at(-1)!.kind, 'approval_request', 'npm run build: asked');
  a.approvals.release();
  await build;
  const py = a.approvals.ask(command('python3 x.py'));
  const request = a.events.at(-1) as { scopes: string[]; approvalId: string };
  assert.deepEqual(request.scopes, ['once'], 'a command that can\'t be remembered is offered once only');
  assert.equal(code(() => a.approvals.answer(request.approvalId, { approved: true, scope: 'session' })), 'invalid');
  a.approvals.answer(request.approvalId, { approved: true });
  assert.equal((await py).scope, 'once');
});

test('outside the folder: once or session only; a hard link: once only', async () => {
  const a = setup(undefined, undefined, { kept: openPermissions(makeTempDir('vb-perm-'), fx.folder) });
  const out = a.approvals.ask(WRITE);
  const request = a.events.at(-1) as { scopes: string[]; approvalId: string };
  assert.deepEqual(request.scopes, ['once', 'session']);
  assert.equal(code(() => a.approvals.answer(request.approvalId, { approved: true, scope: 'folder' })), 'invalid');
  a.approvals.release();
  await out;
  const hard = a.approvals.ask(write('clean-hard.txt'));
  assert.deepEqual((a.events.at(-1) as { scopes: string[] }).scopes, ['once']);
  a.approvals.release();
  await hard;
});

test('for this folder: kept in the store, so a new session and a restart answer it unasked; strict keeps and uses nothing', async () => {
  const dir = makeTempDir('vb-perm-');
  const a = setup(undefined, undefined, { kept: openPermissions(dir, fx.folder) });
  const first = a.approvals.ask(write('src/a.ts'));
  assert.deepEqual((a.events.at(-1) as { scopes: string[] }).scopes, ['once', 'session', 'folder']);
  a.approvals.answer(a.idOf(0), { approved: true, scope: 'folder' });
  assert.equal((await first).scope, 'folder');
  const restarted = setup(undefined, undefined, { kept: openPermissions(dir, fx.folder) });
  assert.deepEqual(await restarted.approvals.ask(write('src/b.ts')), { approved: true, status: 'approved', scope: 'folder', asked: false });
  assert.deepEqual(await restarted.approvals.ask(write('.visionboard/ledger.jsonl')), { approved: false, status: 'denied', asked: false }, 'never a refused path');
  const strict = setup(undefined, undefined, { strict: true, kept: openPermissions(dir, fx.folder) });
  const asked = strict.approvals.ask(write('src/b.ts'));
  assert.deepEqual((strict.events.at(-1) as { scopes: string[] }).scopes, ['once', 'session'], 'strict: no folder scope, the store unused');
  strict.approvals.release();
  await asked;
});

test('a command the gate asked about is never let through unasked by the server (its words may point elsewhere, F4)', async () => {
  const a = setup();
  const asked = a.approvals.ask(command('cat src/x.ts'));
  const request = a.events.at(-1) as { kind: string; scopes: string[] };
  assert.equal(request.kind, 'approval_request', 'the server, which can\'t see the shell\'s folder, asks');
  assert.deepEqual(request.scopes, ['once', 'session']);
  a.approvals.release();
  await asked;
  assert.deepEqual(await a.approvals.ask(command('cat .env')), { approved: false, status: 'denied', asked: false }, 'a refusal still holds');
});
