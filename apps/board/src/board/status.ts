// What a host shows of the board (host.ts): the board's own status, one plain observable per
// mounted board. The board's modules set it; the board's controls draw from it (chrome/), and a host reads
// `now` and hears each change (`on`) for what it shows of the board (the standalone page's chat, shell.svelte.ts).
// Nothing in it is the host's: a host never writes it, and the board never reads the host's state.
import type { AccessHolder, ArchivedBoard, BoardListItem, BoardMark, BoardRun, FreshCard, OpenCard, ProposalRow } from '#actions';
import type { AccessRequestRow } from './access/index.ts';
import type { ContainerRow } from './find/index.ts';
import type { GoBox } from './find/index.ts';
import type { ChatWork } from './host.ts';
import * as boardWords from './words/board.ts';

export interface BoardStatus {
  /** The picker's list, from the held state after every batch (boards.ts `listed`). */
  boards: BoardListItem[];
  /** The archived boards, the latest archived first (archiveBoard flag, N39): the picker's Archived list. */
  archived: ArchivedBoard[];
  boardId: string;
  /** Boot found no board in the folder, and none has opened since (the chat then talks in the folder). */
  noBoards: boolean;
  /** Board id -> its picker mark, from the conditions table (attention.ts); never the open board.
   * Replaced, never changed in place. */
  boardMarks: Record<string, BoardMark>;
  title: string;
  /** The open board's version: with the versionView flag its own last line ("now", versions.ts),
   * else the ledger's latest line; null before a board opens. */
  version: number | null;
  /** The versionView flag: the version dropdown in place of the title and the version chip. */
  versionView: boolean;
  /** The open board's past versions, newest first (the dropdown below "now"). */
  versions: BoardRun[];
  /** The past version on show, read-only, or null for now. */
  past: BoardRun | null;
  /** A past version is being read. */
  loadingVersion: boolean;
  /** The container finder's rows, board order, Later last; none with the containerFinder flag off. */
  containers: ContainerRow[];
  summary: string;
  /** "N open · N replied · N answered · N later" (D-046): `withAgent` is the "replied" chip, shown only above 0. */
  counts: { open: number; withAgent: number; answered: number; later: number };
  /** The open cards, by board number (`openCards`): the "N open" chip's list (openList flag). */
  openCards: OpenCard[];
  /** The new and updated cards, in board order (`freshCards`): the "N new" chip and its list (freshCards flag). */
  freshCards: FreshCard[];
  answered: number;
  /** How many cards on the open board the person flagged (cardFlag flag): the toolbar's chip. */
  flagged: number;
  /** The board's zoom as a whole percentage (viewport.ts `zoomPercent`). */
  zoom: number;
  /** The board's Reply text (the reply panel). */
  replyText: string;
  /** Set false when Esc reaches the board with nothing of its own open: the reply panel closes. */
  replyOpen: boolean;
  /** "Hide answered" is on. */
  hide: boolean;
  /** The agentAccess flag: Send to agent, the requests strip and the holders on each frame. */
  agentAccess: boolean;
  requests: AccessRequestRow[];
  /** The grant requests that arrived in the latest batch that brought any: the strip announces them. */
  requestNews: number[];
  /** The agents that may draw on the open board, creator first (the toolbar's Agents list). */
  boardHolders: AccessHolder[];
  /** What the selection's live region says ("3 cards selected", "Selection cleared"). */
  selection: string;
  /** The agent's open proposals on the open board, newest first (the proposals flag): the bar. */
  proposals: ProposalRow[];
  /** The proposals that arrived in the latest batch that brought any: the bar announces them. */
  proposalNews: number[];
  /** The person answered on the open board since its last Send (`board.unsent`, attention.ts). */
  unsent: boolean;
  /** The open board is locked (N40, lock-flow.ts): read-only until the person unlocks it. */
  locked: boolean;
  /** The Go to card box (goToCard flag, go-to-card.ts), open while set. */
  go: GoBox | null;
  /** How many times the board was drawn. */
  drawn: number;
  /** What the host's chat says its agent is doing (`BoardChat.status`): the working mark. */
  chatWork: ChatWork;
  /** The Send the person pressed waits for the agent's turn to end (`held`): Send's waiting state. */
  sendWaiting: boolean;
  /** The host's chat holds what Send would carry (`staged`): Send is enabled for it. */
  chatAttached: boolean;
  /** A note holds changed words not yet saved (host.ts `BoardView.unsaved`): set each time it turns,
   *  so a host can guard a close (the standalone page's `beforeunload`, leaveGuard flag). */
  unsaved: boolean;
}

/** The status before anything is read: what a host draws while the board boots. */
export const initialStatus = (): BoardStatus => ({
  boards: [], archived: [], boardId: '', noBoards: false, boardMarks: {}, title: boardWords.visionBoard, version: null,
  versionView: false, versions: [], past: null, loadingVersion: false, containers: [], summary: '',
  counts: { open: 0, withAgent: 0, answered: 0, later: 0 }, openCards: [], freshCards: [], answered: 0, flagged: 0,
  zoom: 100, replyText: '', replyOpen: false, hide: false, agentAccess: false, requests: [], requestNews: [],
  boardHolders: [], selection: '', proposals: [], proposalNews: [], unsent: false, locked: false, go: null, drawn: 0, chatWork: 'idle', sendWaiting: false, chatAttached: false, unsaved: false,
});

export interface Status {
  /** The status now. Read it; change it only through `set`. */
  readonly now: Readonly<BoardStatus>;
  /** Change some fields; every listener hears the patch, even when a value is the same. */
  set(patch: Partial<BoardStatus>): void;
  /** Hear every change; returns the unsubscribe. */
  on(listener: (patch: Partial<BoardStatus>) => void): () => void;
}

export function createStatus(): Status {
  const now = initialStatus();
  const listeners = new Set<(patch: Partial<BoardStatus>) => void>();
  return {
    now,
    set(patch) {
      Object.assign(now, patch);
      for (const l of listeners) l(patch);
    },
    on(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
