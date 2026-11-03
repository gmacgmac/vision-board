// A project's ledgers on disk (LEDGERS_01, D-084): the only module that lists or makes ledger folders
// in `.visionboard/` (paths from data-folder.ts). A ledger is a folder whose name passes
// `ledgerNameProblem` and that holds a ledger file; the old layout's one ledger sits in `.visionboard/`
// itself. That rule has one home, `#client` `ledgersIn`, which the agent's tools find their project with too
// (LEDGERS_02-R1). A new ledger's folder gets its own `.gitignore` (`ignoreInGit`): the agents' hashes, the lock
// and app state, or `*` when the person keeps it out of git (PLAN decision 8). Folders only: never a
// file's contents but a ledger's, read to count its boards. Also where an open ledger went when another server moved it
// between layouts (`movedLedger`), and the folder's other ledgers an agent's reads may name (`otherLedgers`, D-084 8).
import fs from 'node:fs';
import { boardList } from '#actions';
import { ledgersIn } from '#client';
import {
  AGENTS_FILE, APP_STATE_DIR, LOCK_FILE, MAIN_LEDGER, ledgerFiles, ledgerFolder, ledgerNameProblem,
} from '#format';
import { ignoreInGit } from './agents.ts';
import type { Ledger } from './ledger.ts';
import { openLedger } from './ledger.ts';
import { problem } from './problem.ts';
import * as serverFoldersWords from './words/server-folders.ts';
import * as writesWords from './words/writes.ts';

/** The line of a ledger folder's `.gitignore` that keeps the whole folder out of git. */
export const KEEP_OUT = '*';

/** One ledger of a project, as `get_project` lists it (`project.schema.json` `ledgerEntry`). */
export interface LedgerEntry { name: string; boards: number; keptOutOfGit: boolean }

const isFile = (file: string): boolean => {
  try { return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
};

/** The project's ledgers on disk, by the one rule (`ledgersIn`). */
const layout = (project: string) => ledgersIn(project, { fs });

/** The project is in the old layout: its ledger file sits in `.visionboard/` itself. */
export const isOldLayout = (project: string): boolean => layout(project).old;

/** The names of the project's ledgers in the new layout, sorted; none when `.visionboard/` can't be read. */
export const listLedgers = (project: string): string[] => layout(project).ledgers;

/** The project's ledger folders in either layout: the old layout's, then each named one's (LEDGERS_02-R2). */
export function ledgerFoldersIn(project: string): string[] {
  const { old, ledgers } = layout(project);
  return [...(old ? [ledgerFolder(project)] : []), ...ledgers.map((name) => ledgerFolder(project, name))];
}

/** With ledger folders off (`ledgerFolders`), a project whose ledgers are only in ledger folders is refused, before
 *  anything is written: the old layout's ledger would start empty beside `main/` and fork it (FIX_01 F5).
 *  `shown`: the folder as the person reads it. */
export function refuseLedgerFolders(project: string, shown: string): void {
  if (!isOldLayout(project) && listLedgers(project).length > 0) throw problem('conflict', serverFoldersWords.inLedgerFolders(shown));
}

/** The project has a Vision Board in either layout. A home folder's `.visionboard/`, holding only
 * `recent.json`, has none. */
export const hasLedger = (project: string): boolean => isOldLayout(project) || listLedgers(project).length > 0;

/** The ledger to open in the project: `asked` when given; else `main` in the old layout (it moves there);
 * else `last` (the one open there last) while it is still there; else `main`. */
export function chooseLedger(project: string, asked: string | undefined, last: string | undefined): string {
  if (asked !== undefined) return asked;
  if (isOldLayout(project) || last === undefined) return MAIN_LEDGER;
  return listLedgers(project).includes(last) ? last : MAIN_LEDGER;
}

/** How many boards the ledger file holds; undefined when it can't be read. */
export function boardsIn(file: string): number | undefined {
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return boardList(openLedger(file, () => {}).state()).length;
  } catch { return undefined; }
}

/** Ledger folder `dir`'s `.gitignore` keeps the whole folder out of git. */
export function keptOutOfGit(dir: string): boolean {
  try { return fs.readFileSync(ledgerFiles(dir).gitignore, 'utf8').split(/\r?\n/).some((l) => l.trim() === KEEP_OUT); } catch { return false; }
}

/** Every ledger of the project with its board count; `open` gives the open ledger's count from memory. */
export function ledgerEntries(project: string, open?: { name: string; boards: number }): LedgerEntry[] {
  return listLedgers(project).map((name) => {
    const dir = ledgerFolder(project, name);
    const boards = name === open?.name ? open.boards : boardsIn(ledgerFiles(dir).ledger) ?? 0;
    return { name, boards, keptOutOfGit: keptOutOfGit(dir) };
  });
}

/** A ledger name a request may name (`open_project`'s `ledger`): the schema has checked its characters; a data-folder
 * name is refused here, at its pointer. */
export function checkLedgerName(name: string | undefined): void {
  const why = name === undefined ? undefined : ledgerNameProblem(name);
  if (why) throw problem('invalid', writesWords.theRequestDoesNotFit, { errors: [{ pointer: '/ledger', detail: why }] });
}

/** Make ledger `name` of the project, when it is not there: its folder, its `.gitignore` and an empty
 * ledger file. Nothing already there is changed. The name is checked by the caller. */
export function makeLedger(project: string, name: string, keepOutOfGit: boolean): void {
  const dir = ledgerFolder(project, name);
  const files = ledgerFiles(dir);
  if (isFile(files.ledger)) return;
  fs.mkdirSync(dir, { recursive: true });
  if (keepOutOfGit) ignoreInGit(dir, KEEP_OUT);
  else for (const n of [AGENTS_FILE, LOCK_FILE, `${APP_STATE_DIR}/`]) ignoreInGit(dir, n);
  fs.writeFileSync(files.ledger, '', { flag: 'a' });
}

/** Where open ledger `name` (undefined: the old layout's) of the project is now, when its file `file` has gone since it
 *  was opened because another server moved it between layouts: into `main/` (decision 7), or back by `ledgers:undo`.
 *  Undefined while the file is there, or when it went nowhere this can tell (FIX_01 F1). */
export function movedLedger(project: string, name: string | undefined, file: string): string | undefined {
  if (isFile(file)) return undefined;
  const { old, ledgers } = layout(project);
  if (name === undefined && ledgers.includes(MAIN_LEDGER)) return ledgerFiles(ledgerFolder(project, MAIN_LEDGER)).ledger;
  if (name === MAIN_LEDGER && old) return ledgerFiles(ledgerFolder(project)).ledger;
  return undefined;
}

/** The folder's other ledgers, for the reads that name one (D-084 8): each opened read-only on its first read and kept
 * until `close`; undefined for the open ledger; `not-found`, naming the folder's ledgers, for a name it doesn't have.
 * `shown`: the folder as the person reads it. */
export function otherLedgers(project: () => string, open: () => string | undefined, shown: () => string) {
  const kept = new Map<string, Ledger>();
  return {
    get(name: string): Ledger | undefined {
      const dir = project();
      if (name === open() || (open() === undefined && name === MAIN_LEDGER && isOldLayout(dir))) return undefined;
      const names = listLedgers(dir);
      if (!names.includes(name)) {
        kept.delete(name);
        throw problem('not-found', serverFoldersWords.noLedgerToRead(shown(), name, names));
      }
      let ledger = kept.get(name);
      if (!ledger) kept.set(name, ledger = openLedger(ledgerFiles(ledgerFolder(dir, name)).ledger, undefined, { readOnly: () => true }));
      return ledger;
    },
    close: () => kept.clear(),
  };
}
