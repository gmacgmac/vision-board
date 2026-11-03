// Whether the open ledger may be written, and who is writing it (editing.ts, D-085 2): Edit and Stop editing tell the
// change streams, and so does the lock's beat when the lock changed hands elsewhere (FIX_01 F6): this server's lock taken
// over by another computer (after a sleep), or another computer starting or stopping editing while this one watches.
// Two lock environments on one folder stand for two computers.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTempDir } from '#format/testing';
import { createEditing } from '../server/editing.ts';
import type { Lock, LockEnv } from '../server/lock.ts';
import { STALE_MS, takeLock } from '../server/lock.ts';

const dir = makeTempDir('vb-editing-');
after(() => fs.rmSync(dir, { recursive: true, force: true }));
let now = Date.now();
const here: LockEnv = { now: () => now, host: 'here', pid: 1, alive: () => true };
const there: LockEnv = { now: () => now, host: 'there', pid: 2, alive: () => true };
const take = (env: LockEnv): Lock => {
  const taken = takeLock(dir, 1, env);
  assert.ok(taken.ok);
  return taken.lock;
};

test('the beat tells when the lock changed hands elsewhere, once per change', () => {
  const editor = createEditing(take(here), true, true, true, here);
  const watcher = createEditing(undefined, false, true, true, there);
  const mine: boolean[] = [];
  const theirs: boolean[] = [];
  editor.onChange((readOnly) => mine.push(readOnly));
  watcher.onChange((readOnly) => theirs.push(readOnly));
  editor.look(dir);
  watcher.look(dir);
  assert.deepEqual([mine, theirs], [[], []], 'the first look tells nothing');
  now += STALE_MS + 60_000; // this computer asleep: the other takes the lock over
  const other = take(there);
  editor.look(dir);
  assert.deepEqual([mine, editor.readOnly()], [[true], true], 'the lock lost: read-only, and told');
  editor.look(dir);
  assert.deepEqual(mine, [true], 'nothing new: told once');
  other.release(); // the other computer stops editing
  editor.look(dir);
  assert.deepEqual(mine, [true, true], 'still read-only, but who is editing changed');
  const watching = createEditing(undefined, false, true, true, here);
  const seen: boolean[] = [];
  watching.onChange((readOnly) => seen.push(readOnly));
  watching.look(dir);
  const again = take(there); // another computer starts editing
  watching.look(dir);
  again.release();
  watching.look(dir);
  assert.deepEqual(seen, [true, true], 'a watcher hears another computer start and stop');
});

test('what a page was told is noted: a change before the first beat is told on it (N2)', () => {
  const other = take(there); // another computer edits when this server opens the ledger
  const watching = createEditing(undefined, false, true, true, here);
  assert.equal((watching.info(dir) as { host: string }).host, 'there', 'the page is told who edits');
  const seen: boolean[] = [];
  watching.onChange((readOnly) => seen.push(readOnly));
  other.release(); // it stops a second later, before this server's first beat
  watching.look(dir);
  assert.deepEqual(seen, [true], 'told on the first beat');
});
