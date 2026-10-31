// What the controller keeps between draws: the open board, what it was last drawn from, and the
// flags of a draw that is waiting for its frame. Split out of controller.ts (ARCH_06).
import type { View } from '#format';
import type { RetiredCount } from '#actions';
import type { BoardData } from '../io.ts';

export function createBoardState() {
  return {
    id: '',
    data: null as BoardData | null,
    /** A draw waiting for the next frame, so lines that land together draw once (approach 5). */
    frame: 0,
    /** The board was destroyed: a read still on its way applies nothing. */
    stopped: false,
    /** The waiting draw starts from scratch (the state was read afresh). */
    fresh: false,
    /** The waiting draw shows lines in which the agent drew on this board (`board.drawn`). */
    drew: false,
    /** A card is being dragged: Later shows as a drop target although it holds none (3_FE_03). */
    later: false,
    /** The board as the agent drew it, before the person's moves (where Reopen sends a card). */
    drawn: null as View | null,
    /** Each container's "N cards retired" marker (retiredMarker flag). */
    retired: new Map() as ReadonlyMap<string, RetiredCount>,
  };
}
