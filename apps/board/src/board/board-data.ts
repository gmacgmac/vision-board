// What the page draws, worked out from the ledger state it holds (N12_FE_01 ruling 2): the page's
// two rules over what packages/actions builds from the ledger (`boardData`, `pageConditions`): the
// view as the everyNode flag draws it, and whether a line can be applied in place. Pure.
import type { LedgerEvent, View } from '#format';
import { LEDGER_FORMAT, NODE_TYPES } from '#format';

/** The view as the everyNode flag draws it (rule 12): on, every card keeps its number, and so its
 * buttons; off, only a card that needs an answer does, so every other card draws as before the
 * kind decided (no number, no buttons, no tabs). Ids stay, so acts still name every card. */
export const numberedView = (view: View, everyNode: boolean): View => (everyNode ? view : {
  ...view, nodes: view.nodes.map((x) => (NODE_TYPES[x.kind].answer ? x : (({ n: _, ...rest }) => rest)(x))),
});

/** Whether the page can apply a line in place: a format it knows. A newer one makes the page read
 * the whole ledger again (a full fetch, counted). */
export const canApply = (e: LedgerEvent): boolean => e.v <= LEDGER_FORMAT;
