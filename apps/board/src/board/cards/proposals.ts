// The words and acts of an agent's proposals on the page (proposals FE_01, D-018, api.md 93): the
// acts and words for Accept, Reject and Accept all, over the rows packages/actions builds from the
// ledger (`proposalRows`, `acceptAllPlan`). Plain data in, plain data out; proposal-flow.ts sends the
// acts through the one sender, so the server's checks judge every one.
import type { acceptAllPlan, ProposalRow } from '#actions';
import { ACTIONS } from '#actions';
import type { ActFields } from '../io.ts';
import * as proposalsWords from '../words/proposals.ts';

/** One line of Accept all's list (the confirm dialog's `ConfirmItem`): a card's number and what is done to it. */
export interface ApplyLine { ref: string; text: string }

export type ProposalAnswer = 'accept' | 'reject';

/** The act for an answer: accepting is the proposal's own action at the card's version `ver`, and
 * with no version there is no act (undefined), so the page never sends an accept the server refuses. */
export const proposalAct = (row: ProposalRow, answer: ProposalAnswer, ver?: number): ActFields | undefined =>
  answer === 'reject' ? { action: 'reject', n: row.n, proposal: row.seq }
    : ver === undefined ? undefined : { action: row.action, n: row.n, ver, proposal: row.seq };

const verb = (row: ProposalRow) => ACTIONS[row.action].label.toLowerCase();

/** The toast once an answer is recorded. */
export const answerDone = (row: ProposalRow, answer: ProposalAnswer): string =>
  `${answer === 'accept' ? proposalsWords.accepted : proposalsWords.rejected}: ${verb(row)} ${row.n}`;

/** The notice's words (ruling 4; proposals-notice ruling 3 and revision 2): "3 proposals", "1 out
 *  of date" when any is, and `n`, the pill's bare number while the notice is hidden. The count is
 *  `n` then `noun`, so the notice can set the number apart and keep it where the pill shows it
 *  (page-polish ruling A). */
export function barWords(rows: readonly ProposalRow[]): { count: string; stale: string; n: string; noun: string } {
  const k = rows.length;
  const stale = rows.filter((r) => r.stale).length;
  return { count: proposalsWords.count(k), stale: stale ? proposalsWords.outOfDate(stale) : '', n: String(k), noun: proposalsWords.noun(k) };
}

const item = (r: ProposalRow, why?: string): ApplyLine =>
  ({ ref: String(r.n), text: `${ACTIONS[r.action].label}: ${r.reason}${why ? ` (${why})` : ''}` });

/** Accept all's confirm step (ruling 4): exactly what it applies, then what it leaves out and why. */
export function acceptAllWords(plan: ReturnType<typeof acceptAllPlan>) {
  const k = plan.apply.length;
  return {
    heading: proposalsWords.acceptHeading(k),
    body: proposalsWords.acceptBody(k),
    confirm: proposalsWords.apply(k),
    items: plan.apply.map((r) => item(r)),
    skipped: plan.skip.map((x) => item(x.row, x.why)),
    done: proposalsWords.accepted2(k),
  };
}
