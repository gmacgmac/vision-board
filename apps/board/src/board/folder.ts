// The open folder on the page (openFolder flag, open-folder task, api.md 113): which folder the
// server has open, read once at boot; the page title names it; the last board is kept per folder
// (start-board.ts); and when the live stream opens again (the server ends it on a switch), a
// different folder reloads the page onto it, without its board hash. Off, none of this runs.
import { flagOn } from '../../../../packages/format/src/index.ts';
import { pageFlags } from '../flags.ts';
import { shell } from '../shell/shell.svelte.ts';
import type { FolderInfo } from './io.ts';
import { getProject } from './io.ts';
import { LAST_BOARD_KEY } from './start-board.ts';

export const openFolderOn = (): boolean => flagOn('openFolder', pageFlags());

/** The folder's own name: the last part of its path. */
export const folderName = (f: Pick<FolderInfo, 'path' | 'name'>): string => f.path.split('/').filter(Boolean).at(-1) ?? f.name;

/** Read the open folder and name it in the page title; null when it can't be read (the board
 * still opens, with the last board kept for every folder alike). */
export async function loadFolder(): Promise<FolderInfo | null> {
  try {
    const f = await getProject();
    shell.folder = f;
    document.title = `${folderName(f)} · Vision Board`;
    return f;
  } catch { return null; }
}

/** Where the board last looked at is kept: per folder when the folder is known. */
export const lastBoardKey = (f: FolderInfo | null): string => (f ? `${LAST_BOARD_KEY}:${f.path}` : LAST_BOARD_KEY);

/** Reload onto the folder now open: without the board hash, so that folder's own last board opens. */
export function reloadOnto(): void {
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

/** On a stream reopen: when the server's folder is not the page's, reload. True when it does. */
export async function folderMoved(): Promise<boolean> {
  const was = shell.folder;
  if (!was) return false;
  try {
    if ((await getProject()).path === was.path) return false;
  } catch { return false; }
  reloadOnto();
  return true;
}
