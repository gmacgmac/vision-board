// The standalone page's state: the board's status (board/status.ts), mirrored here after every change
// so the Svelte shell redraws (App.svelte), and the page's own: its toast, dialogs, chat panel, open
// folder and the viewer's alignment. The board never reads or writes this file (D-005: Svelte
// arranges the page, the canvas stays framework-free; ARCH_03: the board is hostable). The toolbar,
// reply panel, confirm dialog and toast read it.
import type { BoardActionId } from '#actions';
import type { Align } from '#layout';
import type { ConfirmList } from '../board/host.ts';
import { initialStatus } from '../board/status.ts';
import type { FolderInfo } from './page-io.ts';
import { keptAlign } from './align.ts';

export type { AccessRequestRow } from '../board/access/index.ts';
export type { ConfirmItem, ConfirmList } from '../board/host.ts';

export interface Toast { text: string; tone: 'info' | 'error'; seq: number }

/** A confirmation the page asks for before a decision that takes something away (rule 8), or one
 * that makes several at once (Accept all): the board's `confirm` (board/host.ts), as the dialog holds it. */
export interface ConfirmRequest {
  heading: string;
  body: string;
  /** The confirming button's text, for example "Remove access". */
  confirm: string;
  list?: ConfirmList;
  resolve(ok: boolean): void;
}

/** The Send to agent button's own states; hover, focus and pressed are CSS. */
export type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'waiting' | 'disabled';

/** The New board or Rename board dialog (BoardDialog), with the words it opens with. */
export interface BoardDialogRequest { action: BoardActionId; title: string; summary: string }

export const shell = $state({
  /** The board's status (board/status.ts), as it last said it. */
  ...initialStatus(),
  /** The Archived list is open (ArchivedDialog.svelte). */
  archivedDialog: false,
  /** The viewer's alignment (alignSetting flag, field report batch 3 ruling 4): the "⋯" menu's Centre
   *  cards; kept in this browser (align.ts). The board reads it as a setting (page-host.ts). */
  align: keptAlign() as Align,
  toast: null as Toast | null,
  confirm: null as ConfirmRequest | null,
  /** The New board or Rename board dialog, open while set (navigation BE_01). */
  boardDialog: null as BoardDialogRequest | null,
  /** The chatPanel flag: the chat sidebar and its toolbar button (chat-panel FE_02). */
  chatPanel: false,
  /** The chat sidebar is open (ChatSidebar.svelte keeps it per viewer). */
  chatOpen: false,
  /** The chat panel's drawing (chat-view.ts): idle until the panel first opens, then loading, ready, or error. */
  chatView: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  /** Send to agent was pressed while the chat's agent was mid-turn: the answers go when it ends (chat-panel.ts). */
  sendWaiting: false,
  /** The chat has something to send with Send on the open board (cards or notes attached, or the
   * answers; chat-panel.ts `sendsInChat`): Send is enabled for it too (chat-board-context ruling 4). */
  chatAttached: false,
  /** The folder the server has open (openFolder flag, folder.ts); null until read, or with the flag off. */
  folder: null as FolderInfo | null,
  /** The folder picker is open (FolderDialog.svelte). */
  folderDialog: false,
});

let toastTimer = 0;
let toastSeq = 0;

export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  shell.toast = { text, tone, seq: ++toastSeq };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { shell.toast = null; }, tone === 'error' ? 6000 : 2200);
}

/** Opens the confirm dialog, with `list` under its words. Resolves true when confirmed, false when cancelled. */
export function askConfirm(heading: string, body: string, confirm: string, list?: ConfirmList): Promise<boolean> {
  return new Promise((resolve) => {
    shell.confirm = { heading, body, confirm, ...(list && { list }), resolve };
  });
}
