// The recent folders (open-folder task, api.md 110, 112; D-038 proposed): the only module that reads
// or writes the person's `recent.json` (`homeFiles(home).recent`, data-folder.ts), `{ folders }`, newest first, at most 10. It is a
// per-person setting, so it lives in the home folder, not in a repo. It is checked on read and a bad
// file is ignored (no recent folders), never fatal; a write replaces it atomically, readable by this
// user only. Also the folder the server starts in: VB_PROJECT wins, then the newest recent folder if
// it is still a folder under home, then the fallback (this repo).
import fs from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from './atomic-file.ts';
import { homeFiles } from '#format';
import { isUnder } from './folders.ts';

export const RECENT_MAX = 10;
/** An absolute path with no control character. */
const FOLDER = /^\/[^\u0000-\u001f\u007f]*$/;

export const recentPath = (home: string): string => homeFiles(home).recent;

/** The recent folders, newest first; none when the file is missing or not a valid recent file. */
export function readRecent(home: string): string[] {
  try {
    const doc = JSON.parse(fs.readFileSync(recentPath(home), 'utf8')) as unknown;
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc) || Object.keys(doc).join() !== 'folders') return [];
    const list = (doc as { folders: unknown }).folders;
    if (!Array.isArray(list) || !list.every((x) => typeof x === 'string' && FOLDER.test(x))) return [];
    return (list as string[]).slice(0, RECENT_MAX);
  } catch { return []; }
}

/** Put `dir` first in the recent list (once), keeping at most RECENT_MAX. */
export function addRecent(home: string, dir: string): void {
  const file = recentPath(home);
  const folders = [dir, ...readRecent(home).filter((x) => x !== dir)].slice(0, RECENT_MAX);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileAtomic(file, `${JSON.stringify({ folders }, null, 2)}\n`, 0o600);
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
