// A project's ledgers on disk (LEDGERS_01, D-084): the only module that lists or makes ledger folders
// in `.visionboard/` (paths from data-folder.ts). A ledger is a folder whose name passes
// `ledgerNameProblem` and that holds a ledger file; the old layout's one ledger sits in `.visionboard/`
// itself. A new ledger's folder gets its own `.gitignore` (`ignoreInGit`): the agents' hashes, the lock
// and app state, or `*` when the person keeps it out of git (PLAN decision 8). Folders only: never a
// file's contents but a ledger's, read to count its boards.
import fs from 'node:fs';
import { boardList } from '#actions';
import {
  AGENTS_FILE, APP_STATE_DIR, LOCK_FILE, MAIN_LEDGER, ledgerFiles, ledgerFolder, ledgerNameProblem, projectFiles,
} from '#format';
import { ignoreInGit } from './agents.ts';
import { openLedger } from './ledger.ts';

/** The line of a ledger folder's `.gitignore` that keeps the whole folder out of git. */
export const KEEP_OUT = '*';

/** One ledger of a project, as `get_project` lists it (`project.schema.json` `ledgerEntry`). */
export interface LedgerEntry { name: string; boards: number; keptOutOfGit: boolean }

const isFile = (file: string): boolean => {
  try { return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
};

/** The project is in the old layout: its ledger file sits in `.visionboard/` itself. */
export const isOldLayout = (project: string): boolean => isFile(ledgerFiles(ledgerFolder(project)).ledger);

/** The names of the project's ledgers in the new layout, sorted; none when `.visionboard/` can't be read. */
export function listLedgers(project: string): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(projectFiles(project).root, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((e) => e.isDirectory() && ledgerNameProblem(e.name) === undefined && isFile(ledgerFiles(ledgerFolder(project, e.name)).ledger))
    .map((e) => e.name).sort();
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
