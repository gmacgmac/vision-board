// What the board gives its host, and what it is made with (controller.ts `createBoard`). Split out
// of controller.ts (ARCH_06): the board's whole public surface reads in one place.
import type { LedgerState } from '#actions';
import type { AccessFlow } from '../access/index.ts';
import type { ProposalFlow } from '../cards/index.ts';
import type { CommandId } from '../input/index.ts';
import type { BoardEdit } from '../boards/index.ts';
import type { GoTo } from '../find/index.ts';
import type { BoardHost, BoardPage, BoardStore } from '../host.ts';
import type { Io } from '../io.ts';
import type { Status } from '../status.ts';

export interface Board {
  boot(): Promise<void>;
  /** Open board `id`; a note's unsaved words ask first (`leave`). True once switched, false on Cancel. */
  switchTo(id: string): Promise<boolean>;
  /** Show a past version of the open board, read-only, or now with null; `until`: a retired marker's (versions.ts). */
  showVersion(seq: number | null, until?: number): Promise<void>;
  /** A view command from the header (zoom out, Fit, zoom in; commands.ts), or the finder's zoom to a container. */
  command(id: CommandId): void;
  goToContainer(id: string): boolean;
  toggleHide(): void;
  /** Allow or Refuse a grant request, Remove access (agentAccess flag, access-flow.ts). */
  access: AccessFlow;
  /** The proposals notice's Review and Accept all (proposals flag, proposal-flow.ts). */
  proposals: Pick<ProposalFlow, 'review' | 'acceptAll'>;
  /** Send to agent; null when recorded, else the problem's detail. */
  send(): Promise<string | null>;
  /** New board, Rename board, Archive board, Restore, Lock board and Unlock board (board-edit.ts). */
  boardEdit: BoardEdit;
  /** The toolbar's "N flagged" chip: the next flagged card (cardFlag flag, flag-flow.ts). */
  nextFlagged(): void;
  go: GoTo; // the Go to card box's typing, Enter, Esc and offer (goToCard flag, go-to-card.ts)
  /** The open board's id; '' before one opens. */
  id(): string;
  /** The ledger as folded now; null before it is read. */
  ledger(): LedgerState | null;
  /** Zoom to these cards by number, selecting nothing; none on the board, the host is told so. */
  zoomToCards(cards: readonly number[]): void;
  /** Open a board now when it is held, else once its line arrives; a note's unsaved words ask first. False on Cancel. */
  jump(id: string): Promise<boolean>;
  /** Show note `seq` on card `id` in its bubble. */
  /** Bring card `n` into view; not there to go to, say so through the host's notice (`BoardView.reveal`). */
  revealCard(n: number): void;
  /** Bring note `seq` into view, on its card; not there, say so the same way. */
  revealNote(seq: number): void;
  /** A note holds changed words not yet saved; and the question before they are lost (host.ts `BoardView`). */
  unsaved(): boolean;
  leave(): Promise<boolean>;
  /** Throw away the held state, read the whole ledger, draw from scratch (a page test's `rebuild`). */
  rebuild(): Promise<void>;
  /** Resolves once no read is in flight and no draw is waiting for a frame (a page test's `idle`). */
  idle(): Promise<void>;
  destroy(): void;
}

/** What the board is made with: its host, its calls, its status and its message over the stage. */
export interface BoardDeps {
  host: BoardHost;
  io: Io;
  status: Status;
  /** The message over the stage ("No boards yet"); null hides it. */
  say(text: string | null): void;
  page: BoardPage;
  /** The mount's prefix for the ids its cards, frames and connectors set (mount-ids.ts). */
  ids?: string;
  /** Where the viewer's conveniences are kept (BoardHost.store, or the mount's own). */
  store: BoardStore;
}
