// One board server per ledger (D-017, tracker U8): `<project>/.visionboard/lock` says which
// computer, process and port hold the ledger. The folder may be shared between computers (Dropbox),
// and a second writer would fork the ledger, so a second server refuses to start while the lock is
// live. Live: the heartbeat is under 2 minutes old and, on this computer, the process still runs.
// Written atomically (atomic-file.ts) and git-ignored.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeFileAtomic } from './atomic-file.ts';
import { ignoreInGit } from './agents.ts';
import * as serverFoldersWords from './words/server-folders.ts';

export const LOCK_FILE = 'lock';
/** How often the holder rewrites `beat`. */
export const BEAT_MS = 30_000;
/** A heartbeat this old (or older) means the holder is gone. */
export const STALE_MS = 120_000;

export interface LockInfo { host: string; pid: number; port: number; started: string; beat: string }

/** What the lock reads from the world, so tests can set the clock, host and process check. */
export interface LockEnv {
  now(): number;
  host: string;
  pid: number;
  alive(pid: number): boolean;
}

export interface Lock {
  /** Rewrite `beat`, if the lock is still ours. */
  beat(): void;
  /** Remove the lock, if it is still ours. Safe to call twice. */
  release(): void;
}

export type Taken =
  | { ok: true; lock: Lock; /** The stale lock this one replaced. */ replaced?: LockInfo }
  | { ok: false; holder: LockInfo };

/** A process exists if signal 0 reaches it (`EPERM`: it exists, owned by someone else). */
function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (err) { return (err as NodeJS.ErrnoException).code === 'EPERM'; }
}

const realEnv = (): LockEnv => ({ now: Date.now, host: os.hostname(), pid: process.pid, alive: pidAlive });

function readLock(file: string): LockInfo | undefined {
  try {
    const x = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<LockInfo>;
    const ok = typeof x.host === 'string' && Number.isInteger(x.pid) && Number.isInteger(x.port) &&
      typeof x.started === 'string' && Number.isFinite(Date.parse(String(x.beat)));
    return ok ? (x as LockInfo) : undefined;
  } catch { return undefined; }
}

function writeLock(file: string, info: LockInfo): void {
  writeFileAtomic(file, `${JSON.stringify(info)}\n`);
}

const live = (x: LockInfo, env: LockEnv): boolean =>
  env.now() - Date.parse(x.beat) < STALE_MS && (x.host !== env.host || env.alive(x.pid));

/** Who holds the ledger, for the refusal. */
export const holderMessage = (x: LockInfo): string =>
  serverFoldersWords.anotherBoardServerHoldsThis(x.host, x.pid, x.port) +
  serverFoldersWords.runningSinceStopThatServer(x.started);

/** Take the lock in `dir` (the project's `.visionboard` folder), or say who holds it. */
export function takeLock(dir: string, port: number, env: LockEnv = realEnv()): Taken {
  const file = path.join(dir, LOCK_FILE);
  const old = readLock(file);
  if (old && live(old, env)) return { ok: false, holder: old };
  const started = new Date(env.now()).toISOString();
  const mine: LockInfo = { host: env.host, pid: env.pid, port, started, beat: started };
  fs.mkdirSync(dir, { recursive: true });
  ignoreInGit(dir, LOCK_FILE);
  writeLock(file, mine);
  const ours = (): boolean => {
    const x = readLock(file);
    return x?.host === mine.host && x.pid === mine.pid && x.started === mine.started;
  };
  const lock: Lock = {
    beat() { if (ours()) writeLock(file, { ...mine, beat: new Date(env.now()).toISOString() }); },
    release() { if (ours()) fs.rmSync(file, { force: true }); },
  };
  return { ok: true, lock, ...(old && { replaced: old }) };
}
