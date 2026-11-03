// The open folder's ledgers on the page (ledgerFolders flag, D-084; LEDGER_UI_01): opening another ledger, or a new
// one, is the folder switch's path (api.md 113a): `open_project` with the folder and the ledger, then the page reloads
// onto it (folder.ts `reloadOnto`), where that ledger's own last board opens (`lastBoardKey`). A note's unsaved
// words ask first (leavePrompt flag), as the folder dialog's do. The chip (LedgerPart.svelte), New ledger…
// (LedgerRow.svelte) and the dialog (LedgerDialog.svelte) all come here.
import type { BoardView } from '../board/host.ts';
import { reloadOnto } from './folder.ts';
import { openProject } from './page-io.ts';
import { shell } from './shell.svelte.ts';

/** The board, asked before the ledger changes under it; none: nothing asks. */
export type LeaveGuard = Pick<BoardView, 'unsaved' | 'leave'>;

let guard: LeaveGuard | null = null;

/** The page's board, asked before a switch (App.svelte, leavePrompt flag). */
export function guardLedgers(board: LeaveGuard | null): void { guard = board; }

/** While a note holds unsaved words, the board's ask (it resolves false when the person stays); else null. */
export function unsavedAsk(): (() => Promise<boolean>) | null {
  const board = guard;
  return board?.unsaved() ? () => board.leave() : null;
}

/** True when nothing is unsaved, or the person let it go. */
export async function mayLeave(): Promise<boolean> {
  const ask = unsavedAsk();
  return !ask || await ask();
}

/** Open ledger `name` of the open folder (with `create`, make it first, `keepOutOfGit` writing its `.gitignore`), then
 *  reload onto it. Throws the server's refusal in its words; `shell.ledgerOpening` names it while on its way. */
export async function openLedger(name: string, create = false, keepOutOfGit = false): Promise<void> {
  const folder = shell.folder;
  if (!folder) return;
  shell.ledgerOpening = name;
  try {
    await openProject(folder.path, create, { ledger: name, ...(keepOutOfGit && { keepOutOfGit }) });
  } catch (err) {
    shell.ledgerOpening = null;
    throw err;
  }
  reloadOnto();
}

/** A name as the New ledger dialog shows it while it is typed: lowercase, a space or `_` as `-` (the same length,
 *  so the caret stays put). Anything else the name rule refuses is left for `ledgerNameProblem` to say. */
export const typedLedgerName = (typed: string): string => typed.toLowerCase().replace(/[\s_]/g, '-');

/** The error's words, as the dialog and the toast show them. */
export const problemWords = (err: unknown): string => (err instanceof Error ? err.message : String(err));
