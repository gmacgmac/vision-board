// Whether the open ledger may be written (D-085, ledgers-and-read-only PLAN decisions 11-13): one per open folder
// (project.ts). With read-only opening (`readOnlyStart`, unless the server runs with `--edit`) a ledger opens with no
// lock and writes nothing; Edit takes the ledger folder's lock (`takeLock`, which refuses while another server holds it
// live) and Stop editing lets it go. Without read-only opening every ledger opens for writing, as before, under the lock
// the opener took (tests take none). While guarded, a lock this server no longer holds (another computer took it over
// after a sleep) reads as read-only, so a writer stops before its next line. The ledger, the engine and the agents store
// ask `readOnly` (ledger.ts `gate`); the change streams hear `onChange`: after Edit and Stop editing, and when the lock's
// beat finds it changed hands elsewhere (`look`: this server's lock taken over, another computer starting or stopping).
import type { Lock, LockEnv } from './lock.ts';
import { lockHolder } from './lock.ts';

/** Who is writing the ledger (`get_project`'s `editing`): this server, or another computer's live server. */
export type EditingInfo = { here: true } | { host: string; since: string };

export interface Editing {
  /** Ledgers open read-only here (`readOnlyStart`, no `--edit`): the open folder's answers always say who is editing.
   *  In edit mode they say it only while read-only (after Stop editing), so they read as before otherwise. */
  readonly startsReadOnly: boolean;
  /** The lock this folder holds now, if any. */
  readonly lock: Lock | undefined;
  /** True while nothing may be written. */
  readOnly(): boolean;
  /** Open for writing under `lock` (Edit). */
  take(lock: Lock): void;
  /** Let the lock go and write nothing more (Stop editing, a switch away, the server closing). */
  drop(): void;
  /** Who is writing ledger folder `dir`: here, another live server, or nobody. */
  info(dir: string): EditingInfo | undefined;
  /** Called with the read-only state after Edit or Stop editing, and after a `look` that found a change. Returns an
   *  unsubscribe. */
  onChange(fn: (readOnly: boolean) => void): () => void;
  /** Look again at ledger folder `dir`'s lock (the beat): tell `onChange` when this server lost it, or another computer
   *  started or stopped editing, since the last look or since a page was told who is editing (`info`; FIX_01 F6, and
   *  Run 2 N2: a change before the first beat is told on it). The first look with neither only notes what it sees. */
  look(dir: string): void;
}

/** `lock`: the one the opener took. `writable`: open for writing at first. `guard`: read-only opening is on, so a lock
 * lost to another server reads as read-only. `startsReadOnly`: and no `--edit`. `env`: what another server's lock is
 * read with (tests). */
export function createEditing(lock: Lock | undefined, writable: boolean, guard: boolean, startsReadOnly: boolean, env?: LockEnv): Editing {
  let held = lock;
  let editing = writable;
  const listeners = new Set<(readOnly: boolean) => void>();
  const readOnly = () => !editing || (guard && held !== undefined && !held.held());
  const tell = () => { for (const fn of [...listeners]) fn(readOnly()); };
  /** What the last `look` saw: whether read-only, and who held the lock since when. */
  let seen: string | undefined;
  const state = (dir: string) => {
    const x = readOnly() ? lockHolder(dir, env) : undefined;
    return JSON.stringify([readOnly(), x?.host, x?.started]);
  };
  return {
    startsReadOnly,
    get lock() { return held; },
    readOnly,
    take(next) {
      if (held !== next) held?.release();
      held = next;
      editing = true;
      tell();
    },
    drop() {
      held?.release();
      held = undefined;
      if (!editing) return;
      editing = false;
      tell();
    },
    info(dir) {
      seen = state(dir); // what the page is told now: a later look tells it of any change from this
      if (!readOnly()) return { here: true };
      const x = lockHolder(dir, env);
      return x && { host: x.host, since: x.started };
    },
    onChange(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    look(dir) {
      const now = state(dir);
      if (seen !== undefined && now !== seen) tell();
      seen = now;
    },
  };
}
