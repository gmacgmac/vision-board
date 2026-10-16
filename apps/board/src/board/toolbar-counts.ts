// What the toolbar and its panels read from the board as drawn, set on the shell after each draw:
// the open, replied (with the agent), answered and later counts (D-046), the Reply text, the container finder's rows (containerFinder
// flag), how many cards the person answered, the grant requests and the board's holders (agentAccess
// flag) and how many cards are flagged (cardFlag flag, the "N flagged" chip). Split out of
// controller.ts (field report batch 2).
import type { View } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import { counts, replyText } from '../../../../packages/actions/src/index.ts';
import { boardHoldersOf, requestRows } from './access.ts';
import { containerRows } from './finder.ts';
import type { BoardData } from './io.ts';
import { shell } from '../shell/shell.svelte.ts';

export interface ToolbarFlags { finder: boolean; access: boolean }

/** Set the toolbar's numbers for `data` drawn as `view` (the placed view) with `layout`. */
export function showCounts(data: BoardData, view: View, layout: BoardLayout | null, flags: ToolbarFlags, flagged: number): void {
  const st = data.state;
  const c = counts(view, st);
  shell.counts = { open: c.open, withAgent: c.withAgent, answered: c.answered, later: c.later };
  shell.replyText = replyText(view, st);
  shell.containers = flags.finder ? containerRows(view, layout) : [];
  shell.answered = view.nodes.filter((n) => n.n !== undefined && st.items.has(n.id)).length;
  [shell.requests, shell.boardHolders] = flags.access ? [requestRows(data), boardHoldersOf(data)] : [[], []];
  shell.flagged = flagged;
}
