// What needs the person's attention with a board open, by the conditions table's rows, in the page's
// terms: cards by their board number (api.md 125), not their identity. Pure.
import type { FreshCard } from '../fresh.ts';
import { conditionsOf, freshCards } from '../conditions.ts';
import type { LedgerState } from '../fold.ts';
import { numberOf } from '../numbers.ts';
import type { ProposalFound } from './proposal-rows.ts';

/** A board's mark in the picker: `board.new` or `board.changed`. */
export type BoardMark = 'new' | 'changed';

/** How many new and updated cards a fresh container holds: its pill (`regionFresh`). */
export interface FreshCount { added: number; updated: number }

/** What needs the person's attention with `board` open, by the conditions table's rows: `marks`,
 * each other board's picker mark (`board.new`, `board.changed`); `owed`, the containers badged
 * (`container.owed`); `requests`, the open grant requests' lines (`grant.requested`); `drawn`, the
 * agent's last drawing line not yet seen (`board.drawn`); `proposals`, the agent's proposals not yet
 * answered (`proposal.open`, `proposal.stale`); `fresh`, the items the agent added in the board's
 * latest round and the person has not seen (`item.new`); `unseen`, the items whose latest version
 * the person has not seen (`item.unseen`), but a `fresh` one (NEW only); `awaiting`, the items in Later whose handover the agent still owes
 * (`item.awaiting`); `owedCards`, every card owed an answer or a handover (`item.owed`); `unsent`,
 * whether the person answered since the board's last Send, so Send to agent has something to send
 * (`board.unsent`); `freshCards`, the new and updated cards (`freshCards`: the toolbar's "N new"),
 * and `freshIn`, each fresh container (`container.fresh`) with how many of them it holds, counted from
 * that one list. Lines, so a batch's news can be told. */
export interface PageConditions {
  marks: Record<string, BoardMark>;
  owed: Set<string>;
  requests: number[];
  drawn?: number;
  proposals: ProposalFound[];
  fresh: Set<number>;
  unseen: Set<number>;
  awaiting: Set<number>;
  /** The cards the agent owes an answer or a handover (`item.owed`): "Hide answered" keeps them. */
  owedCards: Set<number>;
  unsent: boolean;
  freshCards: FreshCard[];
  freshIn: Map<string, FreshCount>;
}

/** The card rows name a card by its identity (`c.id`, conditions.ts); the page by its board number,
 * as the View does (api.md 125), so every card set here is in board numbers. */
export function pageConditions(s: LedgerState, board: string): PageConditions {
  const n = (c: { id?: number }) => numberOf(s, c.id!);
  const out: PageConditions = {
    marks: {}, owed: new Set(), requests: [], proposals: [], fresh: new Set(), unseen: new Set(), awaiting: new Set(), owedCards: new Set(), unsent: false,
    freshCards: freshCards(s, board), freshIn: new Map(),
  };
  for (const c of conditionsOf(s, { board })) {
    if (c.kind === 'board.new' || c.kind === 'board.changed') out.marks[c.board] = c.kind === 'board.new' ? 'new' : 'changed';
    else if (c.kind === 'container.owed') out.owed.add(c.container!);
    else if (c.kind === 'grant.requested') out.requests.push(c.seq!);
    else if (c.kind === 'board.drawn') out.drawn = c.seq!;
    else if (c.kind === 'item.new') out.fresh.add(n(c));
    else if (c.kind === 'item.unseen') out.unseen.add(n(c));
    else if (c.kind === 'item.awaiting') out.awaiting.add(n(c));
    else if (c.kind === 'item.owed') out.owedCards.add(n(c));
    else if (c.kind === 'board.unsent') out.unsent = true;
    else if (c.kind === 'container.fresh') out.freshIn.set(c.container!, { added: 0, updated: 0 });
    else if (c.kind === 'proposal.open' || c.kind === 'proposal.stale') out.proposals.push({ n: n(c), seq: c.seq!, stale: c.kind === 'proposal.stale' });
  }
  for (const x of out.fresh) out.unseen.delete(x);
  for (const c of out.freshCards) {
    const count = out.freshIn.get(c.container);
    if (count) count[c.updated ? 'updated' : 'added'] += 1;
  }
  return out;
}
