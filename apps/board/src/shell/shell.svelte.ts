// The standalone page's state: the board's status (board/status.ts), mirrored here after every change
// so the chat and the page's parts redraw (App.svelte, page-parts.ts), and the page's own: its toast, confirm
// dialog, chat panel, open folder and its ledger, theme and the viewer's alignment. The board never reads or writes this file.
import type { Align } from '#layout';
import type { ConfirmList } from '../board/host.ts';
import { initialStatus } from '../board/status.ts';
import type { FolderInfo } from './page-io.ts';
import { keptAlign } from './align.ts';
import { keptTheme } from './theme.ts';
import type { AgentWork } from './chat-news.ts';

export type { AccessRequestRow } from '../board/access/index.ts';
export type { ConfirmItem, ConfirmList } from '../board/host.ts';

/** A toast's one action (the reply's Open, workAlongside flag): a toast with one is polite news, not an alert. */
export interface ToastAction { label: string; run(): void }
export interface Toast { text: string; tone: 'info' | 'error'; seq: number; action?: ToastAction }

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

export const shell = $state({
  /** The board's status (board/status.ts), as it last said it. */
  ...initialStatus(),
  /** The viewer's alignment (alignSetting flag, field report batch 3 ruling 4): the "⋯" menu's Centre
   *  cards; kept in this browser (align.ts). The board reads it as a setting (page-host.ts). */
  align: keptAlign() as Align,
  /** The page's theme (theme.ts), kept in this browser. */
  theme: keptTheme(),
  toast: null as Toast | null,
  confirm: null as ConfirmRequest | null,
  /** The chatPanel flag: the chat sidebar (chat-panel FE_02). */
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
  /** The workAlongside flag (point 328): the chat button's mark and count, Send queued, a reply announced. */
  workAlongside: false,
  /** What the chat's agent is doing, as the chat button's mark shows it (chat-news.ts `agentWork`). */
  chatWork: 'idle' as AgentWork,
  /** Replies that landed while the person could not see them (chat-news.ts `createReplyNews`). */
  chatNews: 0,
  /** The folder the server has open (openFolder flag, folder.ts); null until read, or with the flag off. */
  folder: null as FolderInfo | null,
  /** The folder picker is open (FolderDialog.svelte). */
  folderDialog: false,
  /** The New ledger dialog is open (ledgerFolders flag, LedgerDialog.svelte). */
  ledgerDialog: false,
  /** The ledger being opened, until the page reloads onto it (ledgers.ts `openLedger`); null otherwise. */
  ledgerOpening: null as string | null,
  /** Edit or Stop editing on its way to the server (readOnlyStart flag, editing.ts); null otherwise. */
  editBusy: null as 'edit' | 'stop' | null,
});

let toastTimer = 0;
let toastSeq = 0;

/** How long a toast shows: an error longer, one with an action longer still, so there is time to take it. */
const TOAST_MS = { info: 2200, error: 6000, action: 8000 };

export function toast(text: string, tone: Toast['tone'] = 'info', action?: ToastAction): void {
  shell.toast = { text, tone, seq: ++toastSeq, ...(action && { action }) };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { shell.toast = null; }, TOAST_MS[action ? 'action' : tone]);
}

/** Take the toast's action and close it. */
export function takeToast(): void {
  const action = shell.toast?.action;
  clearTimeout(toastTimer);
  shell.toast = null;
  action?.run();
}

/** Opens the confirm dialog, with `list` under its words. Resolves true when confirmed, false when cancelled. */
export function askConfirm(heading: string, body: string, confirm: string, list?: ConfirmList): Promise<boolean> {
  return new Promise((resolve) => {
    shell.confirm = { heading, body, confirm, ...(list && { list }), resolve };
  });
}
