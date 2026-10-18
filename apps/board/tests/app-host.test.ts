// The app host's processes over their life (app-cards BE_02; D-047 ruling 8): a full line of calls is
// refused as busy; an idle process stops; opening another folder stops the old folder's apps; and
// closing the server leaves no app process behind (each checked by its pid). Limits are shortened
// for time; their real values are APP_LIMITS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PERSON, startBoard } from './api-harness.ts';
import { addApp, allow, alive, gone, refused, run } from './app-support.ts';

const pidOf = async (h: Awaited<ReturnType<typeof startBoard>>, app = 'loop') =>
  (await run<{ pid: number }>(h, app, 'quick')).structuredContent!.pid;

test('calls past the in-flight limit wait in line; one past the line is refused as busy', async () => {
  const h = await startBoard({ appLimits: { inFlight: 1, queue: 1, callMs: 800 } });
  try {
    addApp(h.project, 'loop');
    await allow(h, 'loop');
    const spinning = refused(h, 'loop', 'spin', 504, 'app-timeout');
    await new Promise((r) => setTimeout(r, 100));
    const waiting = run<{ pid: number }>(h, 'loop', 'quick');
    await new Promise((r) => setTimeout(r, 50));
    const busy = await refused(h, 'loop', 'quick', 503, 'app-busy');
    assert.match(busy.detail, /busy/);
    await spinning;
    assert.ok((await waiting).structuredContent!.pid, 'the call in line ran once the line moved');
  } finally { await h.close(); }
});

test('a process with no calls stops after the idle time, and starts again on the next call', async () => {
  const h = await startBoard({ appLimits: { idleMs: 150 } });
  try {
    addApp(h.project, 'loop');
    await allow(h, 'loop');
    const pid = await pidOf(h);
    await gone(pid);
    assert.notEqual(await pidOf(h), pid);
  } finally { await h.close(); }
});

test('opening another folder stops the old folder\'s app processes', async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-home-')));
  const other = path.join(home, 'other');
  fs.mkdirSync(path.join(other, '.visionboard'), { recursive: true });
  fs.writeFileSync(path.join(other, '.visionboard', 'ledger.jsonl'), '');
  const h = await startBoard({ home });
  try {
    addApp(h.project, 'loop');
    await allow(h, 'loop');
    const pid = await pidOf(h);
    assert.equal(alive(pid), true);
    await h.ok('open_project', { body: { path: other } });
    await gone(pid);
  } finally {
    await h.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('closing the server leaves no app process behind', async () => {
  const h = await startBoard();
  let open = true;
  try {
    addApp(h.project, 'loop');
    addApp(h.project, 'crash');
    await allow(h, 'loop');
    await allow(h, 'crash');
    const pids = [await pidOf(h), (await run<{ pid: number }>(h, 'crash', 'ok')).structuredContent!.pid];
    assert.ok(pids.every(alive));
    await h.close();
    open = false;
    for (const pid of pids) await gone(pid);
  } finally { if (open) await h.close(); }
});

test('Stop app takes the allow back: the process stops, and the next call needs approval', async () => {
  const h = await startBoard();
  try {
    addApp(h.project, 'loop');
    await allow(h, 'loop');
    const pid = await pidOf(h);
    h.ledger.append({ type: 'act', action: 'app-revoke', app: 'loop' }, PERSON);
    await gone(pid);
    await refused(h, 'loop', 'quick', 403, 'needs-approval');
  } finally { await h.close(); }
});

test('a process that uses more memory than its limit is stopped, and counts as a crash', async () => {
  const h = await startBoard({ appLimits: { memoryMb: 32 } });
  try {
    addApp(h.project, 'crash');
    await allow(h, 'crash');
    const p = await refused(h, 'crash', 'hog', 502, 'app-failed');
    assert.match(p.detail, /stopped while it ran "hog"/);
    assert.ok((await run<{ pid: number }>(h, 'crash', 'ok')).structuredContent!.pid, 'it starts again');
  } finally { await h.close(); }
});

test('a call the page gives up aborts the tool\'s ctx.signal', async () => {
  const h = await startBoard();
  try {
    addApp(h.project, 'loop');
    await allow(h, 'loop');
    const page = new AbortController();
    const waiting = fetch(`${h.base}/api/apps/loop/calls`, {
      method: 'POST', signal: page.signal, headers: { Cookie: h.cookie, 'Content-Type': 'application/json' }, body: '{"tool":"wait"}',
    }).catch(() => 'given up');
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual((await run(h, 'loop', 'last')).structuredContent, { given: false });
    page.abort();
    assert.equal(await waiting, 'given up');
    const end = Date.now() + 2000;
    while (!(await run<{ given: boolean }>(h, 'loop', 'last')).structuredContent!.given) {
      if (Date.now() > end) assert.fail('the tool\'s signal never fired');
      await new Promise((r) => setTimeout(r, 20));
    }
  } finally { await h.close(); }
});
