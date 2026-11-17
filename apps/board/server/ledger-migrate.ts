// The ledger migration's runner (D-103; ledger review § 3 "How it writes"): the one rewrite an append-only ledger
// allows (D-017). It upgrades every line to the current format with the pure chain (`#format` `upgradeLines`) and
// replaces the file in one step, only after: the lock is held (by the caller, or taken here: a live holder refuses in
// `holderMessage`'s words); the file was read once and something in it is old (every line current: nothing is written
// and no backup made, so a second run is a no-op); no line is newer than this build (D-103 4) and none stops the chain;
// the result has as many lines, each with the same `seq`, `at`, `by` and `type`, and the strict reader finds no problem
// in it that it did not find before. Then: the new text to `ledger.jsonl.migrating` beside the ledger, flushed; the
// ledger as it was to `backups/ledger.f<lowest>-<highest>.<head seq>.<UTC time>.jsonl`, flushed; the new file renamed
// over the ledger and the folder flushed. A crash before the rename leaves the original whole and a `.migrating` file
// the next run deletes; after it, a whole new ledger and its backup. Anyone following the file sees a new inode and reads
// it again (ledger.ts `replaced`, `reopen`, `onReset`; D-085 6). Beside the layout move (ledger-move.ts), in its shape.
import fs from 'node:fs';
import path from 'node:path';
import { BACKUPS_DIR, ledgerFiles, readLedger, upgradeLines } from '#format';
import { ignoreInGit } from './agents.ts';
import type { Lock, LockEnv } from './lock.ts';
import { holdLock } from './ledger-move.ts';
import { problem } from './problem.ts';
import * as serverFoldersWords from './words/server-folders.ts';

/** What a migration did, or would do (`planMigration`). Lines are counted from 1. */
export type Migration =
  | { status: 'current' }
  | { status: 'newer'; lines: number[] }
  | { status: 'stopped'; stops: { line: number; stop: string }[] }
  | { status: 'migrated'; changed: number; byFormat: Record<string, number>; backup: string };

/** Called at each point a crash could fall (tests throw from it to prove the file is whole). */
export type MigrateHook = (at: 'temp' | 'backup' | 'rename') => void;

/** The suffix of the new file while it is written, beside the ledger. */
export const MIGRATING_SUFFIX = '.migrating';

/** Every `seq` and format in the file, and its head: what a backup's name says. */
function spanOf(lines: readonly string[]): { lowest: string; highest: string; head: number } {
  let lowest = Infinity;
  let highest = 0;
  let head = 0;
  let none = false;
  for (const text of lines) {
    let e: { v?: unknown; seq?: unknown } | null;
    try { e = JSON.parse(text) as typeof e; } catch { continue; }
    if (e === null || typeof e !== 'object') continue;
    if (Number.isInteger(e.seq)) head = Math.max(head, e.seq as number);
    if (e.v === undefined) none = true;
    else if (Number.isInteger(e.v)) { lowest = Math.min(lowest, e.v as number); highest = Math.max(highest, e.v as number); }
  }
  return { lowest: none ? 'none' : String(lowest === Infinity ? 0 : lowest), highest: String(highest), head };
}

/** UTC time as a file name allows it everywhere: `20261116T110800Z`. */
const fileTime = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

/** `bytes` to `file`, flushed to disk before it returns. */
function writeDurable(file: string, bytes: string | Uint8Array, mode?: number): void {
  const fd = fs.openSync(file, 'w', mode);
  try {
    fs.writeSync(fd, typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes);
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

/** Flush folder `dir`, so a rename in it is on disk (not every system lets a folder be opened: then the rename stands). */
function flushFolder(dir: string): void {
  let fd: number | undefined;
  try {
    fd = fs.openSync(dir, 'r');
    fs.fsyncSync(fd);
  } catch { /* Windows: a folder can't be flushed this way */ } finally { if (fd !== undefined) fs.closeSync(fd); }
}

/** The file's lines as read once, and what the chain makes of them. */
function readPlan(file: string) {
  const bytes = fs.readFileSync(file);
  const lines = bytes.toString('utf8').split('\n');
  return { bytes, lines, up: upgradeLines(lines) };
}

/** What `up` says beyond "current" or "migrate": newer lines or stops, counted from 1. */
function verdict(up: ReturnType<typeof upgradeLines>): Migration | undefined {
  if (up.newer.length) return { status: 'newer', lines: up.newer.map((i) => i + 1) };
  if (up.stops.length) return { status: 'stopped', stops: up.stops.map((s) => ({ line: s.index + 1, stop: s.stop })) };
  if (up.changed === 0) return { status: 'current' };
  return undefined;
}

/** What a migration of ledger folder `dir` would do, reading only (`ledger:migrate --check`). */
export function planMigration(dir: string): Migration {
  const file = ledgerFiles(dir).ledger;
  if (!fs.existsSync(file)) return { status: 'current' };
  const { up } = readPlan(file);
  return verdict(up) ?? { status: 'migrated', changed: up.changed, byFormat: up.byFormat, backup: '' };
}

/** The fields no migration may change on a line (D-103 1); a card's identity and its board too. */
const KEPT = ['seq', 'at', 'by', 'type', 'n', 'board'] as const;

/** Refuse, writing nothing, a result that is not the same ledger line for line, or that reads worse than the old file
 * upgraded in memory (the read-only open's reading): a line the reader already skips (D-019) is no new problem. */
function checkSame(before: readonly string[], after: readonly string[]): void {
  if (after.length !== before.length) throw new Error(serverFoldersWords.migrationCheckFailed(before.length, 'line count'));
  before.forEach((text, i) => {
    if (text === after[i]) return;
    const [a, b] = [JSON.parse(text) as Record<string, unknown>, JSON.parse(after[i]!) as Record<string, unknown>];
    for (const k of KEPT) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) throw new Error(serverFoldersWords.migrationCheckFailed(i + 1, k));
  });
  const had = new Set(readLedger(upgradeLines([...before]).lines).problems);
  const worse = readLedger([...after]).problems.filter((p) => !had.has(p));
  if (worse.length) throw new Error(serverFoldersWords.migrationNewProblems(worse.slice(0, 3).join('; ')));
}

/** Migrate ledger folder `dir` (`ledgerFolder`) while its writer is held: the caller holds the lock, or is a host that
 * opens one `dir` with one engine at a time (plugin.md § The engine). A stale `.migrating` file is deleted first.
 * Throws an `Error` in plain words when the file can't be read or written, or the result fails its check; the ledger
 * is then whole as it was. `hook`: tests only. */
export function migrateHeld(dir: string, hook?: MigrateHook, now = new Date()): Migration {
  const file = ledgerFiles(dir).ledger;
  const temp = `${file}${MIGRATING_SUFFIX}`;
  fs.rmSync(temp, { force: true });
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat) return { status: 'current' };
  const { bytes, lines, up } = readPlan(file);
  const said = verdict(up);
  if (said) return said;
  checkSame(lines, up.lines);
  writeDurable(temp, up.lines.join('\n'), stat.mode & 0o777);
  hook?.('temp');
  const span = spanOf(lines);
  const backups = ledgerFiles(dir).backups;
  const backup = path.join(backups, `ledger.f${span.lowest}-${span.highest}.${span.head}.${fileTime(now)}.jsonl`);
  fs.mkdirSync(backups, { recursive: true });
  ignoreInGit(dir, `${BACKUPS_DIR}/`);
  writeDurable(backup, bytes, stat.mode & 0o777);
  flushFolder(backups);
  hook?.('backup');
  const still = fs.statSync(file);
  if (still.ino !== stat.ino || still.size !== bytes.length || still.mtimeMs !== stat.mtimeMs) {
    fs.rmSync(temp, { force: true });
    fs.rmSync(backup, { force: true });
    throw new Error(serverFoldersWords.migrationChangedWhileRead);
  }
  hook?.('rename');
  fs.renameSync(temp, file);
  flushFolder(dir);
  return { status: 'migrated', changed: up.changed, byFormat: up.byFormat, backup };
}

/** Migrate ledger folder `dir` under its lock, taken here and let go after (the command): a live holder refuses, in
 * `holderMessage`'s words (`conflict`). */
export function migrateLedger(dir: string, o: { port: number; env?: LockEnv | undefined; hook?: MigrateHook }): Migration {
  const lock: Lock = holdLock(dir, { port: o.port, env: o.env });
  try { return migrateHeld(dir, o.hook); } finally { lock.release(); }
}

/** Migrate on open, under the lock its opener holds (project.ts) or a host's single opener (engine.ts): what it did
 * goes to `warn`, and a migration that can't run leaves the ledger as it lies, read in memory (`upgradeLines`). */
export function migrateOnOpen(dir: string, warn: (m: string) => void = (m) => console.error(m)): Migration | undefined {
  const file = ledgerFiles(dir).ledger;
  try {
    const m = migrateHeld(dir);
    if (m.status === 'migrated') warn(serverFoldersWords.migrated(file, m.changed, m.backup));
    if (m.status === 'stopped') warn(serverFoldersWords.migrationStopped(file, m.stops.map((s) => serverFoldersWords.stoppedLine(s.line, s.stop)).join('; ')));
    return m;
  } catch (err) {
    warn(serverFoldersWords.migrationFailed(file, err instanceof Error ? err.message : String(err)));
    return undefined;
  }
}

/** The backups in ledger folder `dir`, newest last, each with the head `seq` its name says. */
function backupsIn(dir: string): { file: string; head: number }[] {
  const folder = ledgerFiles(dir).backups;
  const names = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
  return names.flatMap((n) => {
    const m = /^ledger\.f[a-z0-9]+-\d+\.(\d+)\.(\d{8}T\d{6}Z)\.jsonl$/.exec(n);
    return m ? [{ file: path.join(folder, n), head: Number(m[1]), time: m[2]! }] : [];
  }).sort((a, b) => a.time.localeCompare(b.time) || a.file.localeCompare(b.file)).map(({ file, head }) => ({ file, head }));
}

/** Put the newest backup of ledger folder `dir` back over its ledger (`ledger:migrate --undo`), under the lock, only
 * when no line was appended since it was taken (the head `seq` matches); else `conflict`, saying why. Answers the
 * backup put back. The backup itself is kept. */
export function undoMigration(dir: string, o: { port: number; env?: LockEnv | undefined }): string {
  const lock = holdLock(dir, { port: o.port, env: o.env });
  try {
    const last = backupsIn(dir).at(-1);
    if (!last) throw problem('conflict', serverFoldersWords.noBackupToUndo(ledgerFiles(dir).backups));
    const file = ledgerFiles(dir).ledger;
    const now = fs.existsSync(file) ? spanOf(fs.readFileSync(file, 'utf8').split('\n')).head : 0;
    if (now !== last.head) throw problem('conflict', serverFoldersWords.appendedSinceBackup(path.basename(last.file), last.head, now));
    const temp = `${file}${MIGRATING_SUFFIX}`;
    writeDurable(temp, fs.readFileSync(last.file), fs.statSync(last.file).mode & 0o777);
    fs.renameSync(temp, file);
    flushFolder(dir);
    return last.file;
  } finally { lock.release(); }
}
