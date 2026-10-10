// What the page draws, worked out from the ledger state it holds (N12_FE_01 ruling 2): the page
// reads `read_ledger` once when it opens, folds it with the shared action layer (packages/actions),
// and applies each later line to the same state, so it never re-fetches a board to show one event.
// `boardData` is `get_board`'s answer from that state, built from the same reads the server uses
// (apps/board/server/reads.ts `getBoard`); a test holds the two equal. `pageConditions` is what needs
// the person's attention, from the conditions table (attention.ts shows it). Pure: no DOM, no network.
import type { LedgerEvent, View } from '../../../../packages/format/src/index.ts';
import { boardView, LEDGER_FORMAT, latest, NODE_TYPES, nodesOf } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, conditionsOf, isDecided, statusOf } from '../../../../packages/actions/src/index.ts';
import type { BoardData } from './io.ts';

/** One board as the page draws it, from the held state. */
export function boardData(s: LedgerState, board: string): BoardData {
  return {
    head: s.seq,
    view: boardView(s, board),
    state: boardState(s, board),
    versions: Object.fromEntries(nodesOf(s, board).map((x) => [String(x.n), latest(x).ver])),
    access: boardAccess(s, board),
  };
}

/** The board's decided cards, only ever ones that need an answer (api.md 120): what "Hide
 * decided" leaves out. One the agent still owes an answer (`owed`, by number: `item.owed`) stays
 * until it lands, so the person sees the reply to their comment (every-node FE_01). */
export const decidedIds = (d: BoardData, owed: ReadonlySet<number> = new Set()): Set<string> =>
  new Set(d.view.nodes.filter((n) => isDecided(n.kind, statusOf(d.state, n.id)) && !owed.has(Number(n.id))).map((n) => n.id));

/** The view as the everyNode flag draws it (rule 12): on, every card keeps its number, and so its
 * buttons; off, only a card that needs an answer does, so every other card draws as before the
 * kind decided (no number, no buttons, no tabs). Ids stay, so acts still name every card. */
export const numberedView = (view: View, everyNode: boolean): View => (everyNode ? view : {
  ...view, nodes: view.nodes.map((x) => (NODE_TYPES[x.kind].answer ? x : (({ n: _, ...rest }) => rest)(x))),
});

/** A board's mark in the picker: `board.new` or `board.changed`. */
export type BoardMark = 'new' | 'changed';

/** An open proposal on the open board: its card, its line, and whether the card changed since. */
export interface ProposalFound { n: number; seq: number; stale: boolean }

/** What needs the person's attention with `board` open, by the conditions table's rows: `marks`,
 * each other board's picker mark (`board.new`, `board.changed`); `owed`, the containers badged
 * (`container.owed`); `requests`, the open grant requests' lines (`grant.requested`); `drawn`, the
 * agent's last drawing line not yet seen (`board.drawn`); `proposals`, the agent's proposals not yet
 * answered (`proposal.open`, `proposal.stale`); `fresh`, the items the agent added in the board's
 * latest round and the person has not seen (`item.new`); `unseen`, the items whose latest version
 * the person has not seen (`item.unseen`), but a `fresh` one (NEW only); `awaiting`, the items in Later whose handover the agent still owes
 * (`item.awaiting`); `owedCards`, every card owed an answer or a handover (`item.owed`). Lines, so a batch's news can be told. */
export interface PageConditions {
  marks: Record<string, BoardMark>;
  owed: Set<string>;
  requests: number[];
  drawn?: number;
  proposals: ProposalFound[];
  fresh: Set<number>;
  unseen: Set<number>;
  awaiting: Set<number>;
  /** The cards the agent owes an answer or a handover (`item.owed`): "Hide decided" keeps them. */
  owedCards: Set<number>;
}

export function pageConditions(s: LedgerState, board: string): PageConditions {
  const out: PageConditions = { marks: {}, owed: new Set(), requests: [], proposals: [], fresh: new Set(), unseen: new Set(), awaiting: new Set(), owedCards: new Set() };
  for (const c of conditionsOf(s, { board })) {
    if (c.kind === 'board.new' || c.kind === 'board.changed') out.marks[c.board] = c.kind === 'board.new' ? 'new' : 'changed';
    else if (c.kind === 'container.owed') out.owed.add(c.container!);
    else if (c.kind === 'grant.requested') out.requests.push(c.seq!);
    else if (c.kind === 'board.drawn') out.drawn = c.seq!;
    else if (c.kind === 'item.new') out.fresh.add(c.n!);
    else if (c.kind === 'item.unseen') out.unseen.add(c.n!);
    else if (c.kind === 'item.awaiting') out.awaiting.add(c.n!);
    else if (c.kind === 'item.owed') out.owedCards.add(c.n!);
    else if (c.kind === 'proposal.open' || c.kind === 'proposal.stale') out.proposals.push({ n: c.n!, seq: c.seq!, stale: c.kind === 'proposal.stale' });
  }
  for (const n of out.fresh) out.unseen.delete(n);
  return out;
}

/** Whether the page can apply a line in place: a format it knows. A newer one makes the page read
 * the whole ledger again (a full fetch, counted). */
export const canApply = (e: LedgerEvent): boolean => e.v <= LEDGER_FORMAT;
