// The page's saved panel states (app-state-kept FE_02, apps.md § Saving the panel's state): the
// latest value per card held in memory at once, the server's write debounced with one in flight per
// card and the latest winning, a restore from memory first, else one bounded read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppStateValue } from '#format';
import type { PanelKey } from '../src/board/apps/panel-states.ts';
import { createPanelStates, LOAD_WAIT_MS, SAVE_DELAY_MS } from '../src/board/apps/panel-states.ts';

const A: PanelKey = { board: 'b', n: 2, app: 'calculator' };
const B: PanelKey = { board: 'b', n: 3, app: 'calculator' };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A store whose server is fake: every write and read recorded; `slow` holds each write that long. */
function store(o: { slow?: number; fail?: unknown; read?: (k: PanelKey) => Promise<AppStateValue | undefined> } = {}) {
  const writes: [number, AppStateValue][] = [];
  const reads: PanelKey[] = [];
  let flying = 0;
  let most = 0;
  const s = createPanelStates({
    delayMs: 20, waitMs: 60,
    write: async (k, state) => {
      flying += 1;
      most = Math.max(most, flying);
      await wait(o.slow ?? 0);
      flying -= 1;
      if (o.fail) throw o.fail;
      writes.push([k.n, state]);
    },
    read: async (k) => { reads.push(k); return o.read ? o.read(k) : undefined; },
  });
  return { s, writes, reads, most: () => most };
}

test('the defaults: a half-second debounce, and a restore that waits a bounded time', () => {
  assert.equal(SAVE_DELAY_MS, 500);
  assert.ok(LOAD_WAIT_MS > 0 && LOAD_WAIT_MS <= 3000);
});

test('saves close together are one write of the latest, and every save is answered by it', async () => {
  const { s, writes } = store();
  const done = [s.save(A, 1), s.save(A, 2), s.save(A, 3)];
  assert.deepEqual(await s.load(A), 3, 'held in memory at once');
  await Promise.all(done);
  assert.deepEqual(writes, [[2, 3]]);
});

test('one write in flight per card: a save during it waits, then the latest goes', async () => {
  const { s, writes, most } = store({ slow: 50 });
  const first = s.save(A, 'one');
  await wait(30); // the first write is in flight
  const later = [s.save(A, 'two'), s.save(A, 'three')];
  await Promise.all([first, ...later]);
  assert.deepEqual(writes, [[2, 'one'], [2, 'three']]);
  assert.equal(most(), 1);
  // Two cards write independently.
  await Promise.all([s.save(A, 'a'), s.save(B, 'b')]);
  assert.deepEqual(writes.slice(2).sort(), [[2, 'a'], [3, 'b']]);
});

test('a write the server refused rejects the saves it carried; memory keeps the value', async () => {
  const refusal = { problem: 'too-large' };
  const { s } = store({ fail: refusal });
  await assert.rejects(s.save(A, { big: true }), (e) => e === refusal);
  assert.deepEqual(await s.load(A), { big: true });
});

test('a restore reads the server once when memory has nothing, and keeps what it read', async () => {
  const { s, reads } = store({ read: async () => ({ sum: '12' }) });
  assert.deepEqual(await s.load(A), { sum: '12' });
  assert.deepEqual(await s.load(A), { sum: '12' });
  assert.equal(reads.length, 1);
  // Another app on the same card is another value.
  assert.deepEqual(await s.load({ ...A, app: 'other' }), { sum: '12' });
  assert.equal(reads.length, 2);
});

test('a restore starts without when the read fails or takes too long', async () => {
  const failing = store({ read: async () => { throw new Error('unreachable'); } });
  assert.equal(await failing.s.load(A), undefined);
  const slow = store({ read: () => new Promise(() => {}) });
  const t = Date.now();
  assert.equal(await slow.s.load(A), undefined);
  assert.ok(Date.now() - t < 500);
});

test('a read that lands after a save never puts the older value back', async () => {
  let land: (v: AppStateValue) => void = () => {};
  const { s } = store({ read: () => new Promise((r) => { land = r; }) });
  const restoring = s.load(A);
  await s.save(A, 'new');
  land('old');
  assert.equal(await restoring, 'new', 'the latest wins');
  assert.equal(await s.load(A), 'new');
});
