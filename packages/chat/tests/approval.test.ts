// The approval card's core and template (PLAN ruling 5; nclite's ApprovalAsk): the facts shown as
// facts, Allow once / Allow for this session / Deny, the time left, and one line once settled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApprovalEntry } from '../src/index.ts';
import { approvalTemplate, approvalView, choicesFor, outcomeOf, timeLeft } from '../src/index.ts';
import { COMMAND, WRITE } from './support.ts';

const NOW = Date.parse('2026-10-08T09:00:08Z');
const entry = (facts = WRITE): ApprovalEntry => ({ type: 'approval', key: 'a-ap-1', approvalId: 'ap-1', facts, expiresAt: '2026-10-08T09:02:00Z' });

test('the answers of a request that lists no scopes: Allow once (the primary), Allow for this session, then Deny', () => {
  assert.deepEqual(choicesFor().map((c) => [c.label, c.answer]), [
    ['Allow once', { approved: true, scope: 'once' }],
    ['Allow for this session', { approved: true, scope: 'session' }],
    ['Deny', { approved: false }],
  ]);
});

test('a file change: what it does to which file, and the preview', () => {
  const v = approvalView(entry(), true, NOW);
  assert.equal(v.phase, 'open');
  assert.equal(v.family, 'File change');
  assert.equal(v.title, 'Edit a file');
  assert.equal(v.subject, '/home/someone/project/notes.md');
  assert.equal(v.preview, '- old line\n+ new line');
  const titles = (['create', 'replace', 'edit', 'append'] as const).map((op) => approvalView(entry({ kind: 'write', op, path: 'a' }), true, NOW).title);
  assert.deepEqual(titles, ['Create a file', 'Overwrite a file', 'Edit a file', 'Add to the end of a file']);
});

test('a shell command: the command exactly, its risks and paths', () => {
  const v = approvalView(entry(COMMAND), true, NOW);
  assert.deepEqual([v.family, v.title, v.subject, v.risks, v.paths], ['Shell command', 'Run a command', 'rm -rf build', ['rm-recursive'], ['build']]);
});

test('time left counts down to Expired; an open card past its time is lapsed', () => {
  assert.equal(timeLeft('2026-10-08T09:02:00Z', NOW), '1:52 left');
  assert.equal(timeLeft('2026-10-08T09:02:00Z', Date.parse('2026-10-08T09:01:59.200Z')), '0:01 left');
  assert.equal(timeLeft('2026-10-08T09:02:00Z', Date.parse('2026-10-08T09:03:00Z')), 'Expired');
  assert.equal(approvalView(entry(), true, Date.parse('2026-10-08T09:03:00Z')).phase, 'expired');
});

test('settled, closed: one line, toned', () => {
  assert.deepEqual(outcomeOf({ approved: true, status: 'approved', scope: 'once' }), { text: 'Allowed once', tone: 'ok' });
  assert.deepEqual(outcomeOf({ approved: true, status: 'approved', scope: 'session' }), { text: 'Allowed for this session', tone: 'ok' });
  assert.deepEqual(outcomeOf({ approved: false, status: 'denied' }), { text: 'Denied', tone: 'danger' });
  assert.equal(outcomeOf({ approved: false, status: 'expired' }).tone, 'danger');
  assert.equal(outcomeOf({ approved: false, status: 'released' }).tone, 'quiet');
  const settled = approvalView({ ...entry(), result: { approved: false, status: 'denied' } }, false, NOW);
  assert.equal(settled.phase, 'settled');
  assert.equal(approvalView(entry(), false, NOW).phase, 'closed');
});

test('template: an open card has the three buttons, Deny last; a settled one its line instead', () => {
  const open = approvalTemplate(approvalView(entry(), true, NOW), '1:52 left');
  assert.deepEqual([...open.matchAll(/data-choice="(\w+)"/g)].map((m) => m[1]), ['once', 'session', 'deny']);
  assert.match(open, /class="chat-btn chat-btn-primary" data-choice="once"/);
  assert.match(open, /<span class="chat-ask-ttl">1:52 left<\/span>/);
  assert.match(open, /<pre class="chat-ask-preview" tabindex="0"[^>]*>- old line\n\+ new line<\/pre>/);
  const done = approvalTemplate(approvalView({ ...entry(), result: { approved: true, status: 'approved', scope: 'once' } }, false, NOW), '');
  assert.doesNotMatch(done, /data-choice/);
  assert.match(done, /<p class="chat-ask-outcome" data-tone="ok">Allowed once<\/p>/);
});

test('template: the path and the command are escaped, never markup', () => {
  const html = approvalTemplate(approvalView(entry({ kind: 'command', command: 'echo "<b>x</b>" & rm', risks: [], paths: [] }), true, NOW), '');
  assert.match(html, /echo &quot;&lt;b&gt;x&lt;\/b&gt;&quot; &amp; rm/);
  assert.doesNotMatch(html, /chat-ask-risks|chat-ask-paths/);
});
