// One board as the page draws it and as `get_board` answers it, built once from the folded ledger
// (N12_FE_01 ruling 2): the page reads `read_ledger` once when it opens, folds it with this package, and
// applies each later line to the same state, so it never re-fetches a board to show one event. The
// page keeps the `BoardData` as it is; the server sends `boardJson` of it (`get_board`, api.md 147).
// A test holds the two equal. Pure: no DOM, no network.
import type { View } from '#format';
import { boardView, latest, nodesOf } from '#format';
import { boardState, statusOf } from '../board-state.ts';
import type { BoardState } from '../board-state.ts';
import { containerJson } from '../containers.ts';
import type { LedgerState } from '../fold.ts';
import { numberOf } from '../numbers.ts';
import { isDecided } from '../registry.ts';
import { boardAccess, itemsOut } from '../reads.ts';
import type { BoardAccess } from '../reads.ts';

/** One board as the page draws it. `versions`: node id -> latest `ver`, sent back with an act;
 * `head`: the ledger's latest `seq`; `access`: open grant requests and each region's holders. */
export interface BoardData { head: number; view: View; state: BoardState; versions: Record<string, number>; access: BoardAccess }

/** One board as the page draws it, from the held state. */
export function boardData(s: LedgerState, board: string): BoardData {
  return {
    head: s.seq,
    view: boardView(s, board),
    state: boardState(s, board),
    versions: Object.fromEntries(nodesOf(s, board).map((x) => [String(numberOf(s, x.id)), latest(x).ver])),
    access: boardAccess(s, board),
  };
}

/** `get_board`'s answer for a board (api.md 147, minus `locked`, which the server adds): the stored
 * statuses named at the edge (`itemsOut`), each map as an object, the container notes and pins, and
 * the access at the top level. */
export function boardJson(d: BoardData) {
  const st = d.state;
  return {
    head: d.head,
    view: d.view,
    state: {
      items: itemsOut(st.items), pins: Object.fromEntries(st.pins), modes: Object.fromEntries(st.modes),
      ...(st.widths.size > 0 && { widths: Object.fromEntries(st.widths) }),
      ...(st.sizes.size > 0 && { sizes: Object.fromEntries(st.sizes) }),
      ...(st.moves.size > 0 && { moves: Object.fromEntries(st.moves) }),
      ...containerJson(st),
    },
    versions: d.versions,
    ...d.access,
  };
}

/** The board's answered cards, only ever ones that need an answer (api.md 120): what "Hide
 * answered" leaves out. One the agent still owes an answer (`owed`, by number: `item.owed`) stays
 * until it lands, so the person sees the reply to their comment (every-node FE_01). */
export const answeredIds = (d: BoardData, owed: ReadonlySet<number> = new Set()): Set<string> =>
  new Set(d.view.nodes.filter((n) => isDecided(n.kind, statusOf(d.state, n.id)) && !owed.has(Number(n.id))).map((n) => n.id));
