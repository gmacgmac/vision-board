// An agent's proposals on the open board, as the page shows them (proposals FE_01, D-018, api.md 93):
// the rows behind the PROPOSAL tabs and the bar, worded from the ledger, and the acts and words for
// Accept, Reject and Accept all. Which proposals are open, or out of date, is the conditions table's
// answer (`pageConditions`), never worked out here. Plain data in, plain data out; proposal-flow.ts
// sends the acts through the one sender, so the server's checks judge every one.
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { ACTIONS } from '../../../../packages/actions/src/index.ts';
import type { CardProposal } from '../../../../packages/ui/src/index.ts';
import type { ProposalFound } from './board-data.ts';
import type { ActFields } from './io.ts';

/** One line of Accept all's list (the confirm dialog's `ConfirmItem`): a card's number and what is done to it. */
export interface ApplyLine { ref: string; text: string }

/** One open proposal: its card's number and what the card's box shows. */
export interface ProposalRow extends CardProposal { n: number }

export type ProposalAnswer = 'accept' | 'reject';

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

/** The act for an answer: accepting is the proposal's own action at the card's version `ver`, and
 * with no version there is no act (undefined), so the page never sends an accept the server refuses. */
export const proposalAct = (row: ProposalRow, answer: ProposalAnswer, ver?: number): ActFields | undefined =>
  answer === 'reject' ? { action: 'reject', n: row.n, proposal: row.seq }
    : ver === undefined ? undefined : { action: row.action, n: row.n, ver, proposal: row.seq };

const verb = (row: ProposalRow) => ACTIONS[row.action].label.toLowerCase();

/** The toast once an answer is recorded. */
export const answerDone = (row: ProposalRow, answer: ProposalAnswer): string =>
  `${answer === 'accept' ? 'Accepted' : 'Rejected'}: ${verb(row)} ${row.n}`;

/** The notice's words (ruling 4; proposals-notice ruling 3 and revision 2): "3 proposals", "1 out
 *  of date" when any is, and `n`, the pill's bare number while the notice is hidden. The count is
 *  `n` then `noun`, so the notice can set the number apart and keep it where the pill shows it
 *  (page-polish ruling A). */
export function barWords(rows: readonly ProposalRow[]): { count: string; stale: string; n: string; noun: string } {
  const k = rows.length;
  const stale = rows.filter((r) => r.stale).length;
  const noun = k === 1 ? 'proposal' : 'proposals';
  return { count: `${k} ${noun}`, stale: stale ? `${stale} out of date` : '', n: String(k), noun };
}

/** Accept all: on each card the newest proposal not out of date, in card order; the rest are not
 *  included, since accepting one closes every other on its card (api.md 93), with why. */
export function acceptAllPlan(rows: readonly ProposalRow[]): { apply: ProposalRow[]; skip: { row: ProposalRow; why: string }[] } {
  const apply = new Map<number, ProposalRow>();
  for (const r of rows) if (!r.stale && !apply.has(r.n)) apply.set(r.n, r);
  const skip = rows.filter((r) => apply.get(r.n) !== r).map((row) => ({
    row, why: row.stale ? `${row.n} changed after this was proposed` : `a newer proposal on ${row.n} is applied`,
  }));
  const byN = (a: { n: number }, b: { n: number }) => a.n - b.n;
  return { apply: [...apply.values()].sort(byN), skip: skip.sort((a, b) => byN(a.row, b.row)) };
}

const item = (r: ProposalRow, why?: string): ApplyLine =>
  ({ ref: String(r.n), text: `${ACTIONS[r.action].label}: ${r.reason}${why ? ` (${why})` : ''}` });

/** Accept all's confirm step (ruling 4): exactly what it applies, then what it leaves out and why. */
export function acceptAllWords(plan: ReturnType<typeof acceptAllPlan>) {
  const k = plan.apply.length;
  const what = `${k} proposal${k === 1 ? '' : 's'}`;
  return {
    heading: `Accept ${k === 1 ? 'this proposal' : `these ${what}`}?`,
    body: k === 1 ? 'This decision is applied to its card:' : 'These decisions are applied in this order, each to its card:',
    confirm: `Apply ${what}`,
    items: plan.apply.map((r) => item(r)),
    skipped: plan.skip.map((x) => item(x.row, x.why)),
    done: `Accepted ${what}`,
  };
}
