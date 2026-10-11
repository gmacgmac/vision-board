// An agent's proposals (D-018, api.md 93): a decision the agent proposes on one card, which only
// the person takes. How one ends, folded by fold.ts, and where an open one stands, read by the act
// rules (act.ts) and the conditions table (conditions.ts). Pure.
import type { ActEvent } from '../../format/src/index.ts';
import { latest, NODE_TYPES } from '../../format/src/index.ts';
import type { LedgerState, Proposal } from './fold.ts';
import { numberOf } from './numbers.ts';

/** A proposal still open ends at `seq`; one already ended keeps how it ended. */
export function endProposal(p: Proposal | undefined, seq: number, outcome: NonNullable<Proposal['outcome']>): void {
  if (p && p.decidedBy === undefined) Object.assign(p, { decidedBy: seq, outcome });
}

/** An acknowledge or drop on a card, through a proposal or not, ends every open proposal on it:
 * the one it names is accepted, the rest closed. */
export function closeProposals(s: LedgerState, e: ActEvent): void {
  for (const p of s.proposals.values())
    if (p.id === e.id) endProposal(p, e.seq, p.seq === e.proposal ? 'accepted' : 'closed');
}

/** Where a proposal stands: `open` while it was made on its card's latest version, `stale` once
 * the card has a newer one (it can then only be rejected), nothing once it has ended. */
export function standing(s: LedgerState, p: Proposal): 'open' | 'stale' | undefined {
  if (p.decidedBy !== undefined) return undefined;
  const node = s.nodes.get(p.id);
  return node && latest(node).ver > p.ver ? 'stale' : 'open';
}

/** Why an agent may not propose on card `id`, or undefined when it may (api.md 120): a proposal is
 * to acknowledge or drop, so only a card that needs an answer takes one. An unknown card is the
 * ledger's to report. Words name the card by its board number. */
export function proposeProblem(s: LedgerState, id: number): string | undefined {
  const node = s.nodes.get(id);
  const kind = node && latest(node).kind;
  return kind === undefined || NODE_TYPES[kind].answer ? undefined : `node ${numberOf(s, id)} is a ${kind}, which asks for no answer`;
}
