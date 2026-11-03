// The one move between layouts (D-084 6, PLAN decision 7): a project's old-layout ledger
// (`.visionboard/ledger.jsonl` and its files) into the ledger folder `.visionboard/main/`, and back.
// Only while holding the lock of every folder it touches (a live lock anywhere refuses, `holderMessage`),
// by rename only: nothing is copied, rewritten or deleted but the `.gitignore` lines, which are split
// (per-ledger names go with the ledger) and joined again. The ledger file goes last, so until it has
// moved the folder still reads as the old layout; a failure part-way leaves each entry whole in one
// place or the other, says which, and the next open finishes the move (an entry in both places stops it).
import fs from 'node:fs';
import path from 'node:path';
import {
  GITIGNORE_FILE, LEDGER_FILE, LOCK_FILE, MAIN_LEDGER, PER_LEDGER_NAMES, ledgerFiles, ledgerFolder,
} from '#format';
import { ignoreInGit } from './agents.ts';
import { writeFileAtomic } from './atomic-file.ts';
import { isOldLayout, listLedgers } from './ledgers.ts';
import type { Lock, LockEnv } from './lock.ts';
import { holderMessage, takeLock } from './lock.ts';
import { problem } from './problem.ts';
import * as serverFoldersWords from './words/server-folders.ts';

export interface MoveOptions {
  /** The port written into the locks this takes. */
  port: number;
  /** The folder as the person reads it, for the refusals; default its path. */
  name?: string | undefined;
  /** The lock's clock, host and process check, for tests. */
  env?: LockEnv | undefined;
}

/** The entries renamed, in order: the ledger file last (its place says which layout the folder is in). */
const MOVED: readonly string[] = [...PER_LEDGER_NAMES.filter((n) => n !== LOCK_FILE && n !== GITIGNORE_FILE && n !== LEDGER_FILE), LEDGER_FILE];

const exists = (p: string): boolean => fs.lstatSync(p, { throwIfNoEntry: false }) !== undefined;
const rel = (project: string, p: string): string => path.relative(project, p).split(path.sep).join('/');

/** Take the lock of ledger folder `dir`, or refuse naming who holds it. */
function hold(dir: string, o: MoveOptions): Lock {
  const taken = takeLock(dir, o.port, o.env);
  if (!taken.ok) throw problem('conflict', holderMessage(taken.holder));
  return taken.lock;
}

/** Rename each of MOVED that is in `from` into `to`; a failure part-way says what is where. */
function renameAll(project: string, from: string, to: string, name: string): void {
  const moved: string[] = [];
  for (const n of MOVED) {
    if (!exists(path.join(from, n))) continue;
    try { fs.renameSync(path.join(from, n), path.join(to, n)); } catch (err) {
      const left = MOVED.filter((m) => !moved.includes(m) && exists(path.join(from, m)));
      throw problem('conflict', serverFoldersWords.movePartWay(name, (err as Error).message, moved.join(', ') || serverFoldersWords.nothingYet,
        rel(project, to), left.join(', '), rel(project, from)));
    }
    moved.push(n);
  }
}

/** Refuse when an entry is in both folders: a rename would replace one. */
function refuseBoth(project: string, from: string, to: string, name: string): void {
  const both = MOVED.filter((n) => exists(path.join(from, n)) && exists(path.join(to, n)));
  if (both.length) throw problem('conflict', serverFoldersWords.inBothPlaces(name, both.join(', '), rel(project, from), rel(project, to)));
}

/** A `.gitignore` line's name: `app-state/` is `app-state`. */
const lineName = (line: string): string => line.trim().replace(/\/$/, '');
const perLedger = (line: string): boolean => (PER_LEDGER_NAMES as readonly string[]).includes(lineName(line));

/** Split the old folder's `.gitignore`: its per-ledger lines join `main/`'s, the rest stay. */
function splitIgnore(root: string, main: string): void {
  const file = path.join(root, GITIGNORE_FILE);
  if (!exists(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  for (const l of lines.filter(perLedger)) ignoreInGit(main, l.trim());
  const rest = lines.filter((l) => !perLedger(l));
  writeFileAtomic(file, rest.length ? `${rest.join('\n')}\n` : '');
}

/** Join `main/`'s `.gitignore` back into the old folder's, its lines first (where a ledger's own lines
 * usually stood, so a file the move split often reads as it did), then take it away. */
function joinIgnore(root: string, main: string): void {
  const file = path.join(main, GITIGNORE_FILE);
  if (!exists(file)) return;
  const lines = (f: string) => (exists(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []);
  const mine = lines(file);
  const rest = lines(path.join(root, GITIGNORE_FILE)).filter((l) => !mine.includes(l));
  writeFileAtomic(path.join(root, GITIGNORE_FILE), `${[...mine, ...rest].join('\n')}\n`);
  fs.rmSync(file);
}

/** Move the project's old-layout ledger into `.visionboard/main/` and answer `main/`'s lock, held. The old
 * folder's lock is taken first and let go last, after `main/`'s is taken. */
export function moveIntoMain(project: string, o: MoveOptions): Lock {
  const name = o.name ?? project;
  const root = ledgerFolder(project);
  const main = ledgerFolder(project, MAIN_LEDGER);
  const oldFile = rel(project, ledgerFiles(root).ledger);
  if (!isOldLayout(project)) throw problem('conflict', serverFoldersWords.nothingToMove(name, oldFile));
  const rootLock = hold(root, o);
  try {
    if (exists(ledgerFiles(main).ledger)) {
      throw problem('conflict', serverFoldersWords.movedBefore(name, oldFile, rel(project, ledgerFiles(main).ledger)));
    }
    refuseBoth(project, root, main, name);
    fs.mkdirSync(main, { recursive: true });
    splitIgnore(root, main);
    renameAll(project, root, main, name);
    return hold(main, o);
  } finally {
    rootLock.release();
  }
}

/** Move `.visionboard/main/` back to `.visionboard/` (`npm run ledgers:undo`): only when `main` is the
 * project's only ledger and no server holds either folder. `main/` itself goes when nothing else is in it;
 * answers what was left in it (not the board's), else nothing. */
export function undoMove(project: string, o: MoveOptions): string | undefined {
  const name = o.name ?? project;
  const root = ledgerFolder(project);
  const main = ledgerFolder(project, MAIN_LEDGER);
  const mainFile = rel(project, ledgerFiles(main).ledger);
  const ledgers = listLedgers(project);
  if (!ledgers.includes(MAIN_LEDGER)) throw problem('conflict', serverFoldersWords.noMainToUndo(name, mainFile));
  const others = ledgers.filter((l) => l !== MAIN_LEDGER);
  if (others.length) throw problem('conflict', serverFoldersWords.otherLedgers(name, others.join(', ')));
  if (isOldLayout(project)) throw problem('conflict', serverFoldersWords.oldLayoutAlready(name, rel(project, ledgerFiles(root).ledger), mainFile));
  const mainLock = hold(main, o);
  let rootLock: Lock | undefined;
  try {
    rootLock = hold(root, o);
    refuseBoth(project, main, root, name);
    renameAll(project, main, root, name);
    joinIgnore(root, main);
  } finally {
    mainLock.release();
    rootLock?.release();
  }
  const leftover = fs.readdirSync(main);
  if (leftover.length === 0) { fs.rmdirSync(main); return undefined; }
  return serverFoldersWords.mainNotEmpty(rel(project, main), leftover.join(', '));
}
