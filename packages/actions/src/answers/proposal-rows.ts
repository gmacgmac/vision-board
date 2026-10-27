// An agent's proposals on the open board, as the page shows them (proposals FE_01, D-018, api.md 93):
// the rows behind the PROPOSAL tabs and the bar, worded from the ledger, and which of them Accept all
// applies. Which proposals are open, or out of date, is the conditions table's answer
// (`pageConditions`), never worked out here. Plain data in, plain data out; the page's
// proposal-flow.ts sends the acts through the one sender, so the server's checks judge every one.
import type { LedgerState, Proposal } from '../fold.ts';
import * as actionsRefusalsWords from '../words/actions-refusals.ts';

/** An open proposal on the open board: its card, its line, and whether the card changed since
 * (`proposal.open`, `proposal.stale`). */
export interface ProposalFound { n: number; seq: number; stale: boolean }

/** One open proposal: its card's number and what the card's box shows. `when` is its time in the
 * person's clock; `agent` the proposing agent's label. */
export interface ProposalRow {
  n: number; seq: number; action: Proposal['action']; reason: string; source?: string; when: string; agent?: string; stale: boolean;
}

/** The rows for the proposals found, newest first. `time` writes a line's time in the person's clock. */
export function proposalRows(s: LedgerState, found: readonly ProposalFound[], time: (at: string) => string): ProposalRow[] {
  return found.flatMap(({ n, seq, stale }) => {
    const p = s.proposals.get(seq);
    const agent = p?.agent === undefined ? undefined : s.agents.get(p.agent);
    return p ? [{
      n, seq, action: p.action, reason: p.reason, when: time(p.at), stale,
      ...(p.source !== undefined && { source: p.source }), ...(agent && { agent }),
    }] : [];
  }).sort((a, b) => b.seq - a.seq);
}

/** The rows the person can answer: those on a card the board has a version for. A card the board
 * can't find (it was removed) has none, and an accept without a version is one the server refuses. */
export const answerable = (rows: readonly ProposalRow[], ver: (n: number) => number | undefined): ProposalRow[] =>
  rows.filter((r) => ver(r.n) !== undefined);

/** Accept all: on each card the newest proposal not out of date, in card order; the rest are not
 *  included, since accepting one closes every other on its card (api.md 93), with why. */
export function acceptAllPlan(rows: readonly ProposalRow[]): { apply: ProposalRow[]; skip: { row: ProposalRow; why: string }[] } {
  const apply = new Map<number, ProposalRow>();
  for (const r of rows) if (!r.stale && !apply.has(r.n)) apply.set(r.n, r);
  const skip = rows.filter((r) => apply.get(r.n) !== r).map((row) => ({
    row, why: row.stale ? actionsRefusalsWords.changedAfterThisWasProposed(row.n) : actionsRefusalsWords.aNewerProposalOnIs(row.n),
  }));
  const byN = (a: { n: number }, b: { n: number }) => a.n - b.n;
  return { apply: [...apply.values()].sort(byN), skip: skip.sort((a, b) => byN(a.row, b.row)) };
}
