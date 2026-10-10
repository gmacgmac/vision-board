// The folders under the person's home folder (open-folder task, api.md 110): the only module that
// looks at folders other than the open one. A path is resolved with `realpath` and must be the home
// folder (itself a real path) or under it, so neither `..` nor a link leads out; no part of it under
// home may be hidden (a name starting with a dot) or `node_modules`; and it must be a folder.
// Listings hold folder names only: never a file's name or contents, never a hidden folder,
// `node_modules` or a link. Whether a folder has a Vision Board is whether its ledger file exists.
import fs from 'node:fs';
import path from 'node:path';
import { boardList } from '../../../packages/actions/src/index.ts';
import { ledgerPath, openLedger } from './ledger.ts';
import { problem } from './problem.ts';

/** The most folders one listing holds; `more` says there were more. */
export const MAX_FOLDERS = 500;

/** One folder in a listing (`project.schema.json` `entry`). */
export interface FolderEntry { name: string; path: string; hasBoard: boolean }

const OUTSIDE = 'Only folders under your home folder can be opened, and not hidden ones or node_modules. Choose a folder under ~.';

/** A folder name left out of every listing and refused in a path. */
const skipped = (name: string): boolean => name.startsWith('.') || name === 'node_modules';

/** `dir` is `home` or under it (both absolute). */
export function isUnder(home: string, dir: string): boolean {
  const rel = path.relative(home, dir);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

/** The folder as the person reads it: `~` and the rest under home, else the absolute path. */
export function displayName(home: string, dir: string): string {
  if (!isUnder(home, dir)) return dir;
  const rel = path.relative(home, dir);
  return rel ? `~/${rel.split(path.sep).join('/')}` : '~';
}

/** The folder has a Vision Board: its `.visionboard/ledger.jsonl` is a file. */
export function hasBoard(dir: string): boolean {
  try { return fs.statSync(ledgerPath(dir), { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
}

/** How many boards the folder's ledger holds; undefined when it can't be read. */
export function countBoards(dir: string): number | undefined {
  try {
    fs.accessSync(ledgerPath(dir), fs.constants.R_OK);
    return boardList(openLedger(ledgerPath(dir), () => {}).state()).length;
  } catch { return undefined; }
}

/** The real folder `raw` names, checked against `home` (a real path): `forbidden` outside home or
 * through a hidden part, `not-found` when it is not there or not a folder. */
export function resolveFolder(home: string, raw: string): string {
  let real: string;
  try { real = fs.realpathSync(raw); } catch {
    if (!isUnder(home, path.resolve(raw))) throw problem('forbidden', OUTSIDE);
    throw problem('not-found', `There is no folder ${displayName(home, path.resolve(raw))}. Choose one from list_folders.`);
  }
  if (!isUnder(home, real) || path.relative(home, real).split(path.sep).some(skipped)) throw problem('forbidden', OUTSIDE);
  if (!fs.statSync(real).isDirectory()) throw problem('not-found', `${displayName(home, real)} is not a folder. Choose one from list_folders.`);
  return real;
}

/** The folders in `dir`, by name; at most MAX_FOLDERS. */
export function childFolders(dir: string): { folders: FolderEntry[]; more: boolean } {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch {
    throw problem('forbidden', 'The board server is not allowed to read this folder. Choose another one.');
  }
  const names = entries.filter((e) => e.isDirectory() && !skipped(e.name)).map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : 1));
  const folders = names.slice(0, MAX_FOLDERS).map((name) => {
    const p = path.join(dir, name);
    return { name, path: p, hasBoard: hasBoard(p) };
  });
  return { folders, more: names.length > MAX_FOLDERS };
}
