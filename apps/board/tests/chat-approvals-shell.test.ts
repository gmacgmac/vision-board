// Run 2 of FIX_01, Caught 3: a kept yes and the shell's folder. The gate judges a command's words from where Claude's
// shell is (the hook's `cwd`); the server must too, or a word that is an attached file there looks like any
// file to it and a kept yes answers unasked. The real `decide` and the real approvals, on a real board folder.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { Facts } from '#agent';
import { decide } from '#agent';
import { accessFixture } from '#agent/testing';
import type { ApprovalDraft } from '../server/chat-approvals.ts';
import { createApprovals } from '../server/chat-approvals.ts';
import { openPermissions } from '../server/chat-permissions.ts';
import { makeTempDir } from '#format/testing';

const fx = accessFixture();
after(() => fx.remove());
const DAY = path.join(fx.folder, '.visionboard/attachments/2026-10-30');

function setup() {
  const events: ApprovalDraft[] = [];
  const kept = openPermissions(makeTempDir('vb-shell-kept-'), fx.folder);
  const approvals = createApprovals((d) => { events.push(d); return { ...d, at: '2026-10-30T09:00:00Z', session: 's-1', seq: events.length }; }, { folder: fx.folder, kept, ttlMs: null });
  const run = (command: string, cwd: string) => decide(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd }),
    (facts: Facts) => approvals.ask(facts), () => false, { folder: fx.folder });
  return { events, kept, approvals, run };
}
const asked = (events: ApprovalDraft[]) => events.filter((e) => e.kind === 'approval_request') as Extract<ApprovalDraft, { kind: 'approval_request' }>[];
const tick = () => new Promise((r) => setTimeout(r, 20));

test('a kept yes for a command does not answer it unasked in the attachments folder: the person is asked, once', async () => {
  const { events, kept, approvals, run } = setup();
  kept.add({ kind: 'command', head: 'unzip' });
  void run('unzip -o x.zip', DAY);
  await tick();
  assert.equal(asked(events).length, 1, 'the person is asked');
  assert.deepEqual(asked(events)[0]!.scopes, ['once']);
  approvals.release();
});

test('a yes kept for the session does not answer it there either', async () => {
  const { events, approvals, run } = setup();
  void run('pdftotext src/x.pdf -', fx.folder);
  await tick();
  approvals.answer(asked(events)[0]!.approvalId, { approved: true, scope: 'session' });
  await tick();
  void run('pdftotext 1-a.pdf -', DAY);
  await tick();
  assert.equal(asked(events).length, 2, 'asked again');
  assert.deepEqual(asked(events)[1]!.scopes, ['once']);
  approvals.release();
});

test('outside the attachments folder a kept yes still answers, from the shell\'s folder too', async () => {
  const { events, kept, run } = setup();
  kept.add({ kind: 'command', head: 'pdftotext' });
  const here = await run('pdftotext x.pdf -', path.join(fx.folder, 'src'));
  assert.equal(here.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(asked(events).length, 0);
});
