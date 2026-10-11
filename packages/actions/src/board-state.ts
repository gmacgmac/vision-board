// One board as the page reads it beside `boardView` (packages/format): the person's responses,
// pins, sizes, moves, modes, container places and notes, and the person's flags, keyed like the
// View, by node id = the card's board number as text (api.md 125). Cards retired from the board
// are left out (api.md 127). `get_board` sends all of it but the flags (api.md 128). Pure.
import type { Mode, NodeSize, View } from '../../format/src/index.ts';
import { containerKey, NODE_TYPES, nodesOf } from '../../format/src/index.ts';
import { flagsOn } from './card-flags.ts';
import type { Place } from './containers.ts';
import { containerState } from './containers.ts';
import type { LedgerState } from './fold.ts';
import { sentNotes } from './fold.ts';
import type { ItemNote, ItemState } from './notes.ts';
import { noteOut, numberOf } from './numbers.ts';
import { placeOf } from './references.ts';
import type { ItemStatus } from './registry.ts';
import { DECIDED } from './registry.ts';

/** The person's responses for one board, keyed by node id (`String(n)`, the board number), as the
 * page reads it. `moves`: the container the person put a card in, for each card not where the agent
 * has it (api.md 66-70); the page places cards from it, as from `pins`. */
export interface BoardState {
  items: Map<string, ItemState>;
  pins: Map<string, { x: number; y: number }>;
  modes: Map<string, Mode>;
  /** The person's card size picks (D-030); a node with none follows the agent or the auto tier. */
  sizes: Map<string, NodeSize>;
  moves: Map<string, string>;
  /** Region id -> where the person put that container, in the order last dropped (api.md 74). */
  regionPins: Map<string, Place>;
  /** Region id -> the person's notes on that whole container, oldest first (api.md 73). */
  regionNotes: Map<string, ItemNote[]>;
  /** The cards the person flagged, by node id, in card order: the page's only (api.md 128). */
  flags: Set<string>;
}

/** The person's responses on one board, keyed like `boardView` (`String(n)`). */
export function boardState(s: LedgerState, board: string): BoardState {
  const modes = [...(s.modes.get(board) ?? [])].filter(([r]) => !s.retiredRegions.has(containerKey(board, r)));
  const out: BoardState = {
    items: new Map(), pins: new Map(), modes: new Map(modes), sizes: new Map(), moves: new Map(),
    ...containerState(s, board), flags: new Set(flagsOn(s, board).map((id) => String(numberOf(s, id)))),
  };
  for (const { id } of nodesOf(s, board)) {
    const key = String(numberOf(s, id));
    const item = s.items.get(id);
    const pin = s.pins.get(id);
    const size = s.sizes.get(id);
    if (item) out.items.set(key, { status: item.status, notes: sentNotes(s, board, item.notes).map((x) => noteOut(s, x)) });
    if (pin) out.pins.set(key, pin);
    if (size) out.sizes.set(key, size);
    const place = placeOf(s, id);
    if (place && place.region !== place.drawn) out.moves.set(key, place.region);
  }
  return out;
}

/** One item's status on a board; an item nobody has answered is open. */
export const statusOf = (s: BoardState, id: string): ItemStatus => s.items.get(id)?.status ?? 'open';

/** How many of a board's cards that need an answer (api.md 118) are decided, later, still open. */
export function counts(view: View, s: BoardState) {
  const items = view.nodes.filter((n) => NODE_TYPES[n.kind].answer);
  const st = items.map((n) => statusOf(s, n.id));
  return {
    total: items.length,
    decided: st.filter((x) => DECIDED.has(x)).length,
    later: st.filter((x) => x === 'later').length,
    open: st.filter((x) => !DECIDED.has(x) && x !== 'later').length,
  };
}
