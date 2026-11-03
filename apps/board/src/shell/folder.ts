// The open folder on the page (openFolder flag, open-folder task, api.md 113): which folder the
// server has open, read once at boot; the page title names it; the last board is kept per folder
// (start-board.ts); and when the live stream opens again (the server ends it on a switch), a
// different folder reloads the page onto it, without its board hash. Off, none of this runs.
// With ledger folders (the server's ledgerFolders flag, D-084) the same holds for the folder's open ledger: the last
// board is kept per folder and ledger, and another ledger opened in the same folder reloads too.
import { flagOn } from '#format';
import { pageFlags } from '../flags.ts';
import { shell } from './shell.svelte.ts';
import type { FolderInfo } from './page-io.ts';
import { getProject } from './page-io.ts';
import { folderName } from './folder-path.ts';
import { LAST_BOARD_KEY } from '../board/boards/index.ts';
import * as foldersWords from './words/folders.ts';

export const openFolderOn = (): boolean => flagOn('openFolder', pageFlags());

export { elidePath, folderName, folderPath } from './folder-path.ts';
/** The current-folder flag (on by default; needs openFolder): the open folder is always on show. */
export const currentFolderOn = (): boolean => openFolderOn() && flagOn('currentFolder', pageFlags());

/** Read the open folder and name it in the page title; null when it can't be read (the board
 * still opens, with the last board kept for every folder alike). */
export async function loadFolder(): Promise<FolderInfo | null> {
  try {
    const f = await getProject();
    shell.folder = f;
    document.title = foldersWords.visionBoard(folderName(f));
    return f;
  } catch { return null; }
}

/** The board last looked at: its key in the page's store (kept.ts `pageStore`), so it is kept as the board's own memory
 *  is (PLAN decision 11): per folder and ledger, `vb.lastBoard:<ledgerScope>`, where `main` and the old layout have the
 *  folder's own key, so the board last looked at before the move into `main/` still opens; one kept before folders
 *  (`vb.lastBoard`) is read once, by `main` of the folder open, and kept under its key, so another folder never opens on
 *  it. With no folder read, `vb.lastBoard` as before. */
export const lastBoardKey = LAST_BOARD_KEY.slice('vb.'.length);

/** Reload onto the folder now open: without the board hash, so that folder's own last board opens. */
export function reloadOnto(): void {
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

/** On a stream reopen: when the server's folder, or its ledger, is not the page's, reload. True when it does. */
export async function folderMoved(): Promise<boolean> {
  const was = shell.folder;
  if (!was) return false;
  try {
    const now = await getProject();
    if (now.path === was.path && now.ledger === was.ledger) return false;
  } catch { return false; }
  reloadOnto();
  return true;
}
