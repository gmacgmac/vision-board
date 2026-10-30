// What a host's own chat reads of the board, beside the host interface (host.ts): the standalone
// page's chat panel (shell/chat-bridge.ts) attaches the selected cards and the answers to its
// composer, zooms to a change chip's cards and links a changed card's stepper to the chat. A host
// whose chat takes chips (nclite) needs none of it: Send hands it the chips (`addToChat`).
import type { BoardData, LedgerState } from '#actions';
import type { Selection } from './selection/index.ts';

export interface BoardSide {
  stage: HTMLElement;
  /** The open board as drawn; null before one opens. */
  data(): BoardData | null;
  /** The ledger as folded now (not a past version's); null before it is read. */
  ledger(): LedgerState | null;
  id(): string;
  selection: Selection;
  /** A past version shows: nothing attached (no message can go). */
  readOnly(): boolean;
  /** Zoom to these cards, leaving the selection as it is (a selection would go with the next message). */
  zoom(ids: readonly string[]): void;
  /** Open another board; it is drawn before this returns (boards.ts). */
  switchTo(board: string): void;
  /** Open a board now when it is held, else once its line arrives (boards.ts `jump`). */
  jump(board: string): void;
  toast(text: string): void;
  /** The chat's words for card `n`'s stepper link (`SOURCE_LABEL`), when a board write in the chat
   * changed it; the chat sets it while attached, null when it detaches. */
  source(link: ((n: number) => string | undefined) | null): void;
}
