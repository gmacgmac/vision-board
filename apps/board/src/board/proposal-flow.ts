// The agent's proposals on the page (proposals flag, FE_01, D-018, api.md 93): the rows behind each
// card's PROPOSAL tab and the bar above the board, from the conditions table's proposal rows
// (attention.ts), and the person's answers: Accept and Reject in a card's box, Review and Accept all
// in the bar. Accepting is a decision (rule 8) and the Accept click is the person's confirmation;
// Accept all first lists what it applies. Every act goes through the one sender, so a refusal shows
// as the act error toast. None while a past version shows. Split out of controller.ts.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import type { CardConditions } from '../../../../packages/ui/src/index.ts';
import type { ProposalFound } from './board-data.ts';
import type { ActFields } from './io.ts';
import type { ProposalAnswer, ProposalRow } from './proposals.ts';
import { acceptAllPlan, acceptAllWords, answerDone, proposalAct, proposalRows } from './proposals.ts';
import { versionTime } from './versions.ts';
import { askConfirm, shell } from '../shell/shell.svelte.ts';

export interface ProposalDeps {
  /** The proposals flag. */
  on: boolean;
  stage: HTMLElement;
  state(): LedgerState | null;
  /** The conditions table's open and out-of-date proposals on the open board. */
  found(): readonly ProposalFound[];
  /** A past version shows: no proposals. */
  readOnly(): boolean;
  /** Card `n`'s latest version, sent with an accept. */
  ver(n: number): number | undefined;
  card(id: string): HTMLElement | undefined;
  record(fields: ActFields): Promise<boolean>;
  run(steps: readonly (readonly ActFields[])[]): Promise<boolean>;
  toast(text: string): void;
}

export interface ProposalFlow {
  /** Work the rows out again, before each draw: the bar's and every card's. */
  refresh(): void;
  /** What the conditions table says about card `n`: its open proposals. */
  card(n: ViewNode): CardConditions;
  /** Accept or Reject proposal `seq` on card `id` (its box). */
  answer(id: string, seq: number, answer: ProposalAnswer): Promise<void>;
  /** The bar's Accept all: lists what it applies, then applies it in order. */
  acceptAll(): Promise<void>;
  /** The bar's Review: the first card with a proposal, its box open and focus in it. */
  review(): void;
}

const NONE: CardConditions = {};
const tabOf = (card: HTMLElement | undefined) => card?.querySelector<HTMLButtonElement>('[data-tab="proposal"]:not([hidden])') ?? null;

export function createProposalFlow(d: ProposalDeps): ProposalFlow {
  let rows: ProposalRow[] = [];
  let byCard = new Map<number, ProposalRow[]>();
  let busy = false;

  /** Focus that an answer took away (its button, or the bar, is gone) goes to the board. */
  function keepFocus() {
    if (!document.activeElement || document.activeElement === document.body) d.stage.focus({ preventScroll: true });
  }

  return {
    refresh() {
      const s = d.state();
      rows = d.on && s && !d.readOnly() ? proposalRows(s, d.found(), versionTime) : [];
      byCard = new Map();
      for (const r of rows) byCard.set(r.n, [...(byCard.get(r.n) ?? []), r]);
      if (JSON.stringify(rows) !== JSON.stringify(shell.proposals)) shell.proposals = rows;
    },
    card: (n) => (n.n !== undefined && byCard.has(n.n) ? { proposals: byCard.get(n.n)! } : NONE),
    async answer(id, seq, answer) {
      const row = rows.find((r) => r.seq === seq);
      if (!row || busy || (answer === 'accept' && row.stale)) return;
      const entry = d.card(id)?.querySelector<HTMLElement>(`.vb-prop[data-proposal="${seq}"]`);
      busy = true;
      entry?.setAttribute('aria-busy', 'true');
      const ok = await d.record(proposalAct(row, answer, d.ver(row.n)));
      busy = false;
      entry?.removeAttribute('aria-busy');
      if (!ok) return;
      // Another proposal on the card: back to its tab; else the card itself.
      const card = d.card(id);
      (tabOf(card) ?? card)?.focus({ preventScroll: true });
      keepFocus();
      d.toast(answerDone(row, answer));
    },
    async acceptAll() {
      const plan = acceptAllPlan(rows);
      if (!plan.apply.length) return;
      const w = acceptAllWords(plan);
      if (!(await askConfirm(w.heading, w.body, w.confirm, { items: w.items, skipped: w.skipped }))) return;
      const ok = await d.run(plan.apply.map((r) => [proposalAct(r, 'accept', d.ver(r.n))]));
      keepFocus();
      if (ok) d.toast(w.done);
    },
    review() {
      const first = [...rows].sort((a, b) => a.n - b.n)[0];
      const tab = first && tabOf(d.card(String(first.n)));
      if (!tab) return;
      if (tab.getAttribute('aria-expanded') === 'true') tab.focus({ preventScroll: true });
      else tab.click();
    },
  };
}
