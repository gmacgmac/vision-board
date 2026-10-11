// Shared state between the board controller (plain TypeScript) and the Svelte shell around it.
// The controller writes here; the toolbar, reply panel, confirm dialog and toast read it (D-005: Svelte
// arranges the page, the canvas stays framework-free).
import type { AccessHolder, BoardActionId, BoardListItem, BoardRun } from '../../../../packages/actions/src/index.ts';
import type { BoardMark } from '../board/board-data.ts';
import type { FolderInfo } from '../board/io.ts';
import type { ContainerRow } from '../board/finder.ts';
import type { ProposalRow } from '../board/proposals.ts';

export interface Toast { text: string; tone: 'info' | 'error'; seq: number }

/** One line of a confirm step's list: a card's number and what is done to it. */
export interface ConfirmItem { ref: string; text: string }

/** What a confirm step lists (Accept all, proposals FE_01): what it does, and what it leaves out. */
export interface ConfirmList { items: readonly ConfirmItem[]; skipped?: readonly ConfirmItem[] }

/** A confirmation the page asks for before a decision that takes something away (rule 8), or one
 * that makes several at once (Accept all). */
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

/** One open grant request as the strip shows it (agentAccess flag): `container` is the region's
 * title, left out for a request for the whole board (D-034); `label` the asking agent's. */
export interface AccessRequestRow { seq: number; label: string; container?: string; reason: string }

/** The New board or Rename board dialog (BoardDialog), with the words it opens with. */
export interface BoardDialogRequest { action: BoardActionId; title: string; summary: string }

export const shell = $state({
  /** The picker's list, from the held state after every batch (boards.ts `listed`). */
  boards: [] as BoardListItem[],
  boardId: '',
  /** Boot found no board in the folder, and none has opened since (the chat then talks in the folder). */
  noBoards: false,
  /** Board id -> its picker mark, from the conditions table (board/attention.ts); never the open
   * board. Replaced, never changed in place. */
  boardMarks: {} as Record<string, BoardMark>,
  title: 'Vision Board',
  /** The open board's version: with the versionView flag its own last line ("now", board/versions.ts),
   * else the ledger's latest line; null before a board opens. */
  version: null as number | null,
  /** The versionView flag: the version dropdown in place of the title and the version chip. */
  versionView: false,
  /** The open board's past versions, newest first (the dropdown below "now"). */
  versions: [] as BoardRun[],
  /** The past version on show, read-only, or null for now. */
  past: null as BoardRun | null,
  /** A past version is being read. */
  loadingVersion: false,
  /** The container finder's rows, board order, Later last; none with the containerFinder flag off. */
  containers: [] as ContainerRow[],
  summary: '',
  counts: { open: 0, decided: 0, later: 0 },
  answered: 0,
  /** How many cards on the open board the person flagged (cardFlag flag): the toolbar's chip. */
  flagged: 0,
  replyText: '',
  replyOpen: false,
  hide: false,
  message: null as string | null,
  toast: null as Toast | null,
  confirm: null as ConfirmRequest | null,
  /** The New board or Rename board dialog, open while set (navigation BE_01). */
  boardDialog: null as BoardDialogRequest | null,
  /** The agentAccess flag: Send to agent, the requests strip and the holders on each frame. */
  agentAccess: false,
  requests: [] as AccessRequestRow[],
  /** The grant requests that arrived in the latest batch that brought any: the strip announces them. */
  requestNews: [] as number[],
  /** The agents that may draw on the open board, creator first (the toolbar's Agents list). */
  boardHolders: [] as AccessHolder[],
  /** What the selection's live region says ("3 cards selected", "Selection cleared"), 3_FE_01. */
  selection: '',
  /** The agent's open proposals on the open board, newest first (the proposals flag, FE_01): the bar. */
  proposals: [] as ProposalRow[],
  /** The proposals that arrived in the latest batch that brought any: the bar announces them. */
  proposalNews: [] as number[],
  /** The chatPanel flag: the chat sidebar and its toolbar button (chat-panel FE_02). */
  chatPanel: false,
  /** The chat sidebar is open (ChatSidebar.svelte keeps it per viewer). */
  chatOpen: false,
  /** Send to agent was pressed while the chat's agent was mid-turn: the answers go when it ends (board/chat-panel.ts). */
  sendWaiting: false,
  /** The person answered on the open board since its last Send (`board.unsent`, board/attention.ts):
   * without it Send to agent is disabled, "Nothing new to send". */
  unsent: false,
  /** The chat has something to send with Send on the open board (cards or notes attached, or the
   * answers; board/chat-panel.ts `sendsInChat`): Send is enabled for it too (chat-board-context ruling 4). */
  chatAttached: false,
  /** The folder the server has open (openFolder flag, board/folder.ts); null until read, or with the flag off. */
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
