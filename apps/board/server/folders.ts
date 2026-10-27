// The folders under the person's home folder (open-folder task, api.md 110): the only module that
// looks at folders other than the open one. A path is resolved with `realpath` and must be the home
// folder (itself a real path) or under it, so neither `..` nor a link leads out; no part of it under
// home may be hidden (a name starting with a dot) or `node_modules`; and it must be a folder.
// Listings hold folder names only: never a file's name or contents, never a hidden folder,
// `node_modules` or a link. Whether a folder has a Vision Board is whether its ledger file exists.
// The cloud storage places (folder-links-cloud task) are the real folders in `~/Library/CloudStorage`,
// where macOS keeps Dropbox and the like (home only holds links to them, and links are not listed);
// each passes the same checks, so a place is just another folder under home, by its real path.
import fs from 'node:fs';
import path from 'node:path';
import { boardList } from '#actions';
import type { OperationOutput } from '#format';
import { ledgerPath, openLedger } from './ledger.ts';
import { problem } from './problem.ts';

/** The most folders one listing holds; `more` says there were more. */
export const MAX_FOLDERS = 500;

/** The most cloud storage places one listing holds. */
export const MAX_PLACES = 20;

/** Where macOS keeps cloud storage folders, under home. */
const CLOUD_STORAGE = path.join('Library', 'CloudStorage');

/** One folder in a listing (`project.schema.json` `entry`), as `list_folders` answers it. */
export type FolderEntry = OperationOutput<'list_folders'>['folders'][number];

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

const UNREADABLE = 'The board server is not allowed to read this folder (macOS may need Files and Folders access for the app that started the board). Choose another one.';

/** The real folders in `dir` (no link, hidden folder or `node_modules`), by name. */
function folderNames(dir: string): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { throw problem('forbidden', UNREADABLE); }
  return entries.filter((e) => e.isDirectory() && !skipped(e.name)).map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : 1));
}

/** The folders in `dir`, by name; at most MAX_FOLDERS. */
export function childFolders(dir: string): { folders: FolderEntry[]; more: boolean } {
  const names = folderNames(dir);
  const folders = names.slice(0, MAX_FOLDERS).map((name) => {
    const p = path.join(dir, name);
    return { name, path: p, hasBoard: hasBoard(p) };
  });
  return { folders, more: names.length > MAX_FOLDERS };
}

/** The cloud storage places: each real folder in `~/Library/CloudStorage` that passes resolveFolder,
 * by its own name and real path; at most MAX_PLACES. Undefined when that folder is not there, can't
 * be read or fails the checks (other systems get none). */
export function cloudPlaces(home: string): FolderEntry[] | undefined {
  let names: string[];
  let root: string;
  try {
    root = resolveFolder(home, path.join(home, CLOUD_STORAGE));
    names = folderNames(root);
  } catch { return undefined; }
  return names.flatMap((name) => {
    try {
      const real = resolveFolder(home, path.join(root, name));
      return [{ name, path: real, hasBoard: hasBoard(real) }];
    } catch { return []; }
  }).slice(0, MAX_PLACES);
}
