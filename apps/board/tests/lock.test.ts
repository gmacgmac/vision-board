import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { LockEnv, LockInfo } from '../server/lock.ts';
import { BEAT_MS, LOCK_FILE, STALE_MS, holderMessage, takeLock } from '../server/lock.ts';
import { makeTempDir } from '#format/testing';

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

const T0 = Date.parse('2026-10-07T10:00:00.000Z');
const dir = (): string => {
  const d = makeTempDir('vb-lock-');
  dirs.push(d);
  return d;
};
/** An environment with a settable clock and a set of running pids. */
const env = (host = 'mac-a', pid = 100, running: number[] = [100]) => {
  const e: LockEnv & { time: number; running: Set<number> } = {
    time: T0, running: new Set(running), host, pid,
    now: () => e.time,
    alive: (p) => e.running.has(p),
  };
  return e;
};
const read = (d: string): LockInfo => JSON.parse(fs.readFileSync(path.join(d, LOCK_FILE), 'utf8'));
const put = (d: string, info: LockInfo) => fs.writeFileSync(path.join(d, LOCK_FILE), JSON.stringify(info));
const held = (over: Partial<LockInfo> = {}): LockInfo =>
  ({ host: 'mac-b', pid: 7, port: 4466, started: new Date(T0 - 60_000).toISOString(), beat: new Date(T0 - 1_000).toISOString(), ...over });

test('takes a free ledger: writes who, where and when, and ignores the file in git', () => {
  const d = dir();
  const r = takeLock(d, 4466, env());
  assert.equal(r.ok, true);
  assert.deepEqual(read(d), { host: 'mac-a', pid: 100, port: 4466, started: '2026-10-07T10:00:00.000Z', beat: '2026-10-07T10:00:00.000Z' });
  assert.match(fs.readFileSync(path.join(d, '.gitignore'), 'utf8'), /^lock$/m);
  assert.deepEqual(fs.readdirSync(d).filter((f) => f.endsWith('.tmp')), []);
});

test('refuses a live lock: same host with a running pid', () => {
  const d = dir();
  put(d, held({ host: 'mac-a', pid: 200 }));
  const r = takeLock(d, 4466, env('mac-a', 100, [100, 200]));
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.holder.pid, 200);
});

test('refuses a live lock: another host with a fresh beat, whatever its pid', () => {
  const d = dir();
  put(d, held());
  const e = env('mac-a', 100, [100]); // pid 7 is not running here, but this is mac-b's pid
  e.time = T0 + STALE_MS - 2_000; // the beat is 1 s before T0: 1 s under the limit
  const r = takeLock(d, 4467, e);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.holder.host, 'mac-b');
});

test('replaces a stale lock: dead pid on this host', () => {
  const d = dir();
  put(d, held({ host: 'mac-a', pid: 200 }));
  const r = takeLock(d, 4466, env('mac-a', 100, [100]));
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.replaced?.pid, 200);
  assert.equal(read(d).pid, 100);
});

test('replaces a stale lock: beat 2 minutes old, even on this host with a running pid', () => {
  for (const host of ['mac-a', 'mac-b']) {
    const d = dir();
    put(d, held({ host, pid: 200, beat: new Date(T0 - STALE_MS).toISOString() }));
    const r = takeLock(d, 4466, env('mac-a', 100, [100, 200]));
    assert.equal(r.ok, true, host);
    assert.equal(r.ok && r.replaced?.host, host);
  }
});

test('replaces a lock file that cannot be read', () => {
  const d = dir();
  fs.writeFileSync(path.join(d, LOCK_FILE), '{not json');
  const r = takeLock(d, 4466, env());
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.replaced, undefined);
  assert.equal(read(d).pid, 100);
});

test('release removes only our own lock', () => {
  const d = dir();
  const r = takeLock(d, 4466, env());
  assert.ok(r.ok);
  put(d, held({ host: 'mac-b' })); // someone replaced it
  r.lock.release();
  assert.equal(read(d).host, 'mac-b');
  const mine = takeLock(dir(), 4466, env());
  assert.ok(mine.ok);
  mine.lock.release();
  mine.lock.release(); // twice is fine
});

test('release removes our lock', () => {
  const d = dir();
  const r = takeLock(d, 4466, env());
  assert.ok(r.ok);
  r.lock.release();
  assert.equal(fs.existsSync(path.join(d, LOCK_FILE)), false);
});

test('beat refreshes the heartbeat and keeps the start; it leaves a lock that is not ours', () => {
  const d = dir();
  const e = env();
  const r = takeLock(d, 4466, e);
  assert.ok(r.ok);
  e.time = T0 + BEAT_MS;
  r.lock.beat();
  assert.equal(read(d).beat, new Date(T0 + BEAT_MS).toISOString());
  assert.equal(read(d).started, new Date(T0).toISOString());
  put(d, held());
  r.lock.beat();
  assert.equal(read(d).host, 'mac-b');
});

test('a held lock is read as live by the next taker while beats keep coming', () => {
  const d = dir();
  const a = env('mac-a', 100, [100]);
  const r = takeLock(d, 4466, a);
  assert.ok(r.ok);
  const b = env('mac-b', 300, [300]);
  b.time = T0 + 90_000;
  assert.equal(takeLock(d, 4466, b).ok, false);
  a.time = T0 + 90_000;
  r.lock.beat();
  b.time = T0 + 200_000; // 110 s after the beat
  assert.equal(takeLock(d, 4466, b).ok, false);
});

test('the refusal names the computer, port and start', () => {
  const text = holderMessage(held());
  assert.match(text, /mac-b/);
  assert.match(text, /4466/);
  assert.match(text, /2026-10-07T09:59:00/);
});
