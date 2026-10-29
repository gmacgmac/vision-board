// "Allow for this folder" and what goes with it (agent-access-and-working ASK_01; HOLD_01-R3, WIRE_01-R2
// and R3): the approval offers only the scopes its request lists, shows reads, and with no `expiresAt`
// has no countdown and never lapses; the header lists what was allowed for the folder in words, each
// with Forget; a host that queues lets words go while the agent works.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApprovalEntry, ChatEvent, Facts } from '../src/index.ts';
import {
  allowedLabel, allowedTemplate, applyEvents, approvalTemplate, approvalView, canSend, chatConditions, choicesFor, composerView,
  EMPTY_CHAT, headerTemplate, headerView, msLeft, outcomeOf, sendIntent, timeLeft,
} from '../src/index.ts';
import { stamp, TURN, WRITE } from './support.ts';

const NOW = Date.parse('2026-10-08T09:00:08Z');
const entry = (over: Partial<ApprovalEntry> = {}, facts: Facts = WRITE): ApprovalEntry =>
  ({ type: 'approval', key: 'a-ap-1', approvalId: 'ap-1', facts, ...over });
const choices = (html: string) => [...html.matchAll(/data-choice="(\w+)"/g)].map((m) => m[1]);

test('no expiresAt: the time left is no number, never NaN, and the card never lapses (HOLD_01-R3)', () => {
  assert.equal(Number.isNaN(msLeft(undefined, NOW)), false);
  assert.equal(msLeft(undefined, NOW), Number.POSITIVE_INFINITY);
  assert.equal(timeLeft(undefined, NOW), '');
  const open = approvalView(entry(), true, NOW + 30 * 24 * 3_600_000);
  assert.equal(open.phase, 'open', 'a month later it still waits');
  assert.equal(open.timed, false);
  assert.equal(approvalView(entry({ expiresAt: '2026-10-08T09:02:00Z' }), true, NOW).timed, true);
  assert.equal(approvalView(entry({ expiresAt: '2026-10-08T09:02:00Z' }), true, Date.parse('2026-10-08T09:03:00Z')).phase, 'expired');
});

test('no expiresAt: no countdown in the band, and it says it waits for the person\'s answer', () => {
  const html = approvalTemplate(approvalView(entry(), true, NOW), '');
  assert.match(html, /<span class="chat-ask-ttl"><\/span>/);
  assert.match(html, /<span class="chat-ask-lapse">Waiting for your answer<\/span>/);
  assert.doesNotMatch(html, /Denied if not answered|NaN|left/);
  const timed = approvalTemplate(approvalView(entry({ expiresAt: '2026-10-08T09:02:00Z' }), true, NOW), '1:52 left');
  assert.match(timed, /<span class="chat-ask-ttl">1:52 left<\/span>/);
  assert.match(timed, /Denied if not answered/);
});

test('the answers are the scopes the request lists; an older host (none listed) offers once and session; Deny is last', () => {
  const ids = (scopes?: ApprovalEntry['scopes']) => choicesFor(scopes).map((c) => c.id);
  assert.deepEqual(ids(undefined), ['once', 'session', 'deny']);
  assert.deepEqual(ids(['once', 'session', 'folder']), ['once', 'session', 'folder', 'deny']);
  assert.deepEqual(ids(['once', 'folder']), ['once', 'folder', 'deny']);
  assert.deepEqual(ids(['once']), ['once', 'deny']);
  assert.deepEqual(choicesFor(['once', 'session', 'folder']).map((c) => [c.label, c.answer]), [
    ['Allow once', { approved: true, scope: 'once' }],
    ['Allow for this session', { approved: true, scope: 'session' }],
    ['Allow for this folder', { approved: true, scope: 'folder' }],
    ['Deny', { approved: false }],
  ]);
  const inside = approvalTemplate(approvalView(entry({ scopes: ['once', 'session', 'folder'] }), true, NOW), '');
  assert.deepEqual(choices(inside), ['once', 'session', 'folder', 'deny']);
  const outside = approvalTemplate(approvalView(entry({ scopes: ['once', 'session'] }), true, NOW), '');
  assert.deepEqual(choices(outside), ['once', 'session', 'deny']);
  const oneShot = approvalTemplate(approvalView(entry({ scopes: ['once'] }), true, NOW), '');
  assert.deepEqual(choices(oneShot), ['once', 'deny']);
});

test('settled for the folder: one line says so', () => {
  assert.deepEqual(outcomeOf({ approved: true, status: 'approved', scope: 'folder' }), { text: 'Allowed for this folder', tone: 'ok' });
});

test('a read is shown as a read, a search as a search of the folder; the path exactly', () => {
  const read = approvalView(entry({}, { kind: 'read', path: 'src/app.ts' }), true, NOW);
  assert.deepEqual([read.family, read.title, read.subject], ['File read', 'Read a file', 'src/app.ts']);
  const search = approvalView(entry({}, { kind: 'read', path: 'src', recursive: true }), true, NOW);
  assert.deepEqual([search.family, search.title, search.subject], ['Folder search', 'Search a folder', 'src']);
  assert.equal(read.preview, undefined);
});

test('the feed keeps the request\'s scopes, and expiresAt only when it has one', () => {
  const [timed, held] = [
    applyEvents(EMPTY_CHAT, stamp([TURN[0]!, { kind: 'approval_request', approvalId: 'ap-1', facts: WRITE, expiresAt: '2026-10-08T09:02:00Z', scopes: ['once', 'session', 'folder'] }])),
    applyEvents(EMPTY_CHAT, stamp([TURN[0]!, { kind: 'approval_request', approvalId: 'ap-2', facts: { kind: 'read', path: 'a' } }])),
  ].map((s) => s.entries.find((e) => e.type === 'approval') as ApprovalEntry);
  assert.deepEqual([timed!.expiresAt, timed!.scopes], ['2026-10-08T09:02:00Z', ['once', 'session', 'folder']]);
  assert.equal('expiresAt' in held!, false);
  assert.equal('scopes' in held!, false);
});

test('a host that queues lets words go while the agent works, and while it waits for an OK (WIRE_01-R2)', () => {
  const busy = applyEvents(EMPTY_CHAT, stamp(TURN.slice(0, 1)));
  const asking = applyEvents(EMPTY_CHAT, stamp([TURN[0]!, { kind: 'approval_request', approvalId: 'ap-1', facts: WRITE }]));
  assert.deepEqual(chatConditions(asking), ['busy', 'waiting']);
  for (const s of [busy, asking]) {
    assert.equal(canSend(s), false, 'without queues, as before');
    assert.equal(canSend(s, { queues: true }), true);
    assert.equal(canSend(s, { queues: true, blocked: 'A past version is showing.' }), false, 'a blocked chat takes none');
  }
  const v = composerView(busy, { queues: true });
  assert.equal(v.send, true);
  assert.match(v.hint, /^The agent is working\. A message you send now is queued/);
  assert.equal(sendIntent('And this', v), 'send');
  assert.equal(sendIntent('', v), 'skip');
  assert.match(composerView(asking, { queues: true }).hint, /waiting for your OK/);
  assert.match(composerView(busy, { queues: true, holds: true }).hint, /What is attached goes when it finishes; words you send now are queued/);
  assert.deepEqual(composerView(EMPTY_CHAT, { queues: true }), composerView(EMPTY_CHAT), 'idle: nothing changes');
  assert.match(composerView(busy).hint, /Stop it to send now/, 'the flag off: as before');
});

test('what was allowed for the folder is said in words', () => {
  assert.equal(allowedLabel({ id: 'pm-1', kind: 'write', path: 'src' }), 'Write files in src/');
  assert.equal(allowedLabel({ id: 'pm-1', kind: 'write', path: 'src/ui' }), 'Write files in src/ui/');
  assert.equal(allowedLabel({ id: 'pm-1', kind: 'write', path: '' }), 'Write files in the folder');
  assert.equal(allowedLabel({ id: 'pm-2', kind: 'command', command: 'npm test' }), 'Run npm test');
  assert.equal(allowedLabel({ id: 'pm-3', kind: 'read', path: 'docs/notes.md' }), 'Read docs/notes.md');
  assert.equal(allowedLabel({ id: 'pm-4', kind: 'search', path: 'docs' }), 'Search docs/');
  assert.equal(allowedLabel({ id: 'pm-4', kind: 'search', path: '' }), 'Search the folder');
});

const KEPT = [{ id: 'pm-0123456789ab', kind: 'write' as const, path: 'src' }, { id: 'pm-ba9876543210', kind: 'command' as const, command: 'npm test' }];

test('header: no list given, nothing new is drawn; given, a button with the count and, opened, each yes with Forget', () => {
  const plain = headerView({ agent: 'claude' }, EMPTY_CHAT);
  assert.equal(plain.allowed, undefined);
  assert.doesNotMatch(headerTemplate(plain), /chat-hd-allow|data-forget/);
  assert.equal(allowedTemplate(undefined, false, 'x'), '');
  const v = headerView({ agent: 'claude', allowed: KEPT }, EMPTY_CHAT);
  assert.deepEqual(v.allowed, [{ id: 'pm-0123456789ab', label: 'Write files in src/' }, { id: 'pm-ba9876543210', label: 'Run npm test' }]);
  const closed = allowedTemplate(v.allowed, false, 'allow-1');
  assert.match(closed, /<button type="button" class="chat-hd-allow" aria-expanded="false" data-allowed>Allowed for this folder <span class="chat-hd-count">2<\/span>/);
  assert.doesNotMatch(closed, /data-forget|role="region"/);
  const open = allowedTemplate(v.allowed, true, 'allow-1');
  assert.match(open, /aria-expanded="true" aria-controls="allow-1"/);
  assert.match(open, /<div class="chat-hd-pop" id="allow-1" role="region" aria-label="Allowed for this folder">/);
  assert.match(open, /<li><span class="chat-hd-what">Write files in src\/<\/span><button type="button" class="chat-btn" data-forget="pm-0123456789ab" aria-label="Forget: Write files in src\/">Forget<\/button><\/li>/);
  assert.match(open, /<span class="chat-hd-what">Run npm test<\/span>.*data-forget="pm-ba9876543210" aria-label="Forget: Run npm test"/);
});

test('header: with none allowed yet, the list says so and how to add one; the words are escaped', () => {
  const none = allowedTemplate(headerView({ agent: 'claude', allowed: [] }, EMPTY_CHAT).allowed, true, 'a');
  assert.match(none, /<p class="chat-hd-none">Nothing yet\. Choose Allow for this folder when the agent asks\.<\/p>/);
  assert.doesNotMatch(none, /chat-hd-count/);
  const odd = allowedTemplate(headerView({ agent: 'claude', allowed: [{ id: 'pm-1', kind: 'command', command: 'echo "<b>"' }] }, EMPTY_CHAT).allowed, true, 'a');
  assert.match(odd, /Run echo &quot;&lt;b&gt;&quot;/);
});
