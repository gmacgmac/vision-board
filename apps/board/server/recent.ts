// The recent folders (open-folder task, api.md 110, 112; D-038 proposed): the only module that reads
// or writes the person's `recent.json` (`homeFiles(home).recent`, data-folder.ts), `{ folders }`, newest first, at most 10. It is a
// per-person setting, so it lives in the home folder, not in a repo. It is checked on read and a bad
// file is ignored (no recent folders), never fatal; a write replaces it atomically, readable by this
// user only. Also the folder the server starts in: VB_PROJECT wins, then the newest recent folder if
// it is still a folder under home, then the fallback (this repo). With ledger folders (D-084) it also keeps,
// per recent folder, the ledger last open there (`ledgers`, by path): a file without it still reads, and a
// bad `ledgers` is dropped on its own, never the folders with it.
import fs from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from './atomic-file.ts';
import { homeFiles, ledgerNameProblem } from '#format';
import { isUnder } from './folders.ts';

export const RECENT_MAX = 10;
/** An absolute path with no control character. */
const FOLDER = /^\/[^\u0000-\u001f\u007f]*$/;

export const recentPath = (home: string): string => homeFiles(home).recent;

interface Recent { folders: string[]; ledgers: Record<string, string> }

/** The recent file, checked: none when it is missing or not a valid recent file. */
function readFile(home: string): Recent {
  const none: Recent = { folders: [], ledgers: {} };
  try {
    const doc = JSON.parse(fs.readFileSync(recentPath(home), 'utf8')) as unknown;
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return none;
    const keys = Object.keys(doc);
    if (!keys.includes('folders') || !keys.every((k) => k === 'folders' || k === 'ledgers')) return none;
    const list = (doc as { folders: unknown }).folders;
    if (!Array.isArray(list) || !list.every((x) => typeof x === 'string' && FOLDER.test(x))) return none;
    const folders = (list as string[]).slice(0, RECENT_MAX);
    const map = (doc as { ledgers?: unknown }).ledgers;
    const good = typeof map === 'object' && map !== null && !Array.isArray(map) &&
      Object.entries(map).every(([k, v]) => FOLDER.test(k) && typeof v === 'string' && ledgerNameProblem(v) === undefined);
    const ledgers = good ? Object.fromEntries(Object.entries(map as Record<string, string>).filter(([k]) => folders.includes(k))) : {};
    return { folders, ledgers };
  } catch { return none; }
}

/** The recent folders, newest first; none when the file is missing or not a valid recent file. */
export const readRecent = (home: string): string[] => readFile(home).folders;

/** The ledger last open in recent folder `dir`, if one is kept: by `dir` as given, else by its real path, which the
 * board keeps (`VB_PROJECT` through a link, or `/var` for `/private/var`; FIX_01 F14). */
export function lastLedger(home: string, dir: string): string | undefined {
  const { ledgers } = readFile(home);
  if (ledgers[dir] !== undefined) return ledgers[dir];
  try { return ledgers[fs.realpathSync(dir)]; } catch { return undefined; }
}

/** Put `dir` first in the recent list (once), keeping at most RECENT_MAX; with `ledger`, keep it as the
 * folder's last ledger. */
export function addRecent(home: string, dir: string, ledger?: string): void {
  const file = recentPath(home);
  const old = readFile(home);
  const folders = [dir, ...old.folders.filter((x) => x !== dir)].slice(0, RECENT_MAX);
  const kept = Object.entries({ ...old.ledgers, ...(ledger !== undefined && { [dir]: ledger }) }).filter(([k]) => folders.includes(k));
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const doc = kept.length ? { folders, ledgers: Object.fromEntries(kept) } : { folders };
  writeFileAtomic(file, `${JSON.stringify(doc, null, 2)}\n`, 0o600);
}

/** The folder the server opens at start: `project` (VB_PROJECT) when set; else the newest recent
 * folder, if it is still a folder under `home`; else `fallback`. */
export function startFolder({ project, home, fallback }: { project?: string | undefined; home: string; fallback: string }): string {
  if (project) return path.resolve(project);
  const last = readRecent(home)[0];
  if (!last) return fallback;
  try {
    const real = fs.realpathSync(last);
    if (isUnder(fs.realpathSync(home), real) && fs.statSync(real).isDirectory()) return real;
  } catch { /* gone: the fallback */ }
  return fallback;
}
