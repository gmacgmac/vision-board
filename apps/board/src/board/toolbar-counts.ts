// What the toolbar and its panels read from the board as drawn, set on the board's status after each draw:
// the open, replied (with the agent), answered and later counts (D-046), the open cards (the "N open"
// chip's list, openList flag, open-list FE_01), the Reply text, the container finder's rows (containerFinder
// flag), how many cards the person answered, the grant requests and the board's holders (agentAccess
// flag) and how many cards are flagged (cardFlag flag, the "N flagged" chip). Split out of
// controller.ts (field report batch 2).
import type { View } from '#format';
import type { BoardLayout } from '#layout';
import { counts, openCards, replyText } from '#actions';
import { boardHoldersOf, requestRows } from './access.ts';
import { containerRows } from './finder.ts';
import type { BoardData } from './io.ts';
import type { Status } from './status.ts';

export interface ToolbarFlags { finder: boolean; access: boolean }

/** Set the toolbar's numbers for `data` drawn as `view` (the placed view) with `layout`. */
export function showCounts(status: Status, data: BoardData, view: View, layout: BoardLayout | null, flags: ToolbarFlags, flagged: number): void {
  const st = data.state;
  const c = counts(view, st);
  status.set({
    counts: { open: c.open, withAgent: c.withAgent, answered: c.answered, later: c.later },
    openCards: openCards(view, st),
    replyText: replyText(view, st),
    containers: flags.finder ? containerRows(view, layout) : [],
    answered: view.nodes.filter((n) => n.n !== undefined && st.items.has(n.id)).length,
    requests: flags.access ? requestRows(data) : [],
    boardHolders: flags.access ? boardHoldersOf(data) : [],
    flagged,
  });
}
