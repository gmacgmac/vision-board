// What the page draws, worked out from the ledger state it holds (N12_FE_01 ruling 2): the page's
// two rules over what packages/actions builds from the ledger (`boardData`, `pageConditions`): the
// view as the everyNode flag draws it, the view as the timeline flag draws it, and whether a line can be applied in
// place. Pure.
import type { LedgerEvent, View, ViewNode } from '#format';
import { LEDGER_FORMAT, NODE_TYPES } from '#format';
import { datedOf } from '#ui';

/** The view as the everyNode flag draws it (rule 12): on, every card keeps its number, and so its
 * buttons; off, only a card that needs an answer does, so every other card draws as before the
 * kind decided (no number, no buttons, no tabs). Ids stay, so acts still name every card. */
export const numberedView = (view: View, everyNode: boolean): View => (everyNode ? view : {
  ...view, nodes: view.nodes.map((x) => (NODE_TYPES[x.kind].answer ? x : (({ n: _, ...rest }) => rest)(x))),
});

/** The view as the timeline flag draws it (D-105; PLAN decision 25, the flag's one gate, FE_02): a node keeps its
 * `timeline` only while the flag is on and the node draws it as a date (`datedOf`: any kind but an app card), so the
 * layout, the node and the pointer agree on which nodes are dated. Off, no node has one: the board lays out and draws as
 * before the set. A copy where a key goes; the view itself, and the stored lines, are never changed. T_03 removes it. */
export function datedView(view: View, timeline: boolean): View {
  const drops = (x: ViewNode) => x.timeline !== undefined && !(timeline && datedOf(x));
  if (!view.nodes.some(drops)) return view;
  return { ...view, nodes: view.nodes.map((x) => (drops(x) ? (({ timeline: _, ...rest }) => rest)(x) : x)) };
}

/** Whether the page can apply a line in place: a format it knows. A newer one makes the page read
 * the whole ledger again (a full fetch, counted). */
export const canApply = (e: LedgerEvent): boolean => e.v <= LEDGER_FORMAT;
