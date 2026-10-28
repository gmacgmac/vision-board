// The agent's proposals on the page (proposals flag, FE_01, D-018, api.md 93): the rows behind each
// card's PROPOSAL tab and the bar above the board, from the conditions table's proposal rows
// (attention.ts), and the person's answers: Accept and Reject in a card's box, Review and Accept all
// in the bar. Accepting is a decision (rule 8) and the Accept click is the person's confirmation;
// Accept all first lists what it applies. Every act goes through the one sender, so a refusal shows
// as the act error toast, and after a refused answer the rows are worked out again. A proposal on
// a card the board has no version for (it was removed) is never shown, and an accept with no
// version is never sent. None while a past version shows. Review (reviewList flag, ruling 319) goes
// to a card chosen from the bar's list, or to the first, as Go to card does (a find, so the card
// keeps its marks, ruling 322), zooms in when the board is too far out for the box's controls, then
// opens the card's box; off, it opens the first card's box where the card is. Split out of controller.ts.
import type { ViewNode } from '#format';
import type { Box } from '#layout';
import type { LedgerState, ProposalFound, ProposalRow } from '#actions';
import { acceptAllPlan, answerable, proposalRows } from '#actions';
import type { CardConditions } from '#ui';
import { versionTime } from '#ui';
import type { ActFields } from '../io.ts';
import type { ProposalAnswer } from './proposals.ts';
import { acceptAllWords, answerDone, proposalAct } from './proposals.ts';
import { FAR_K, isFar } from '../canvas/index.ts';
import type { Viewport } from '../canvas/index.ts';
import type { ConfirmAsk } from '../host.ts';
import type { Status } from '../status.ts';

export interface ProposalDeps {
  /** The proposals flag. */
  on: boolean;
  /** The reviewList flag: Review lists the cards and goes to one. */
  list: boolean;
  stage: HTMLElement;
  /** The board's pan and zoom, to zoom in on a card the controls can't be seen on. */
  vp: Pick<Viewport, 'k' | 'hideFar' | 'fit' | 'zoomCentre'>;
  /** Card `id`'s box on the board as drawn. */
  box(id: string): Box | undefined;
  /** Card `n`'s title on the board as drawn. */
  title(n: number): string | undefined;
  /** Go to card `n` as Go to card does (board/find/go-to-card.ts `to`). */
  go(n: number): void;
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
  status: Status;
  confirm(ask: ConfirmAsk): Promise<boolean>;
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
  /** The bar's Review: card `n` with a proposal, or the first, brought into view with its box open
   *  and focus in it. */
  review(n?: number): void;
}

/** Zoom in on a card the board is too far out to use: half the stage, up to full size. */
const READ_FIT = { fill: 0.5, cap: 1 };

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

  function refresh() {
    const s = d.state();
    rows = d.on && s && !d.readOnly() ? answerable(proposalRows(s, d.found(), versionTime), d.ver) : [];
    // The notice lists the cards by title (reviewList flag): the board has them, the ledger does not.
    if (d.list) rows = rows.map((r) => ({ ...r, title: d.title(r.n) ?? '' }));
    byCard = new Map();
    for (const r of rows) byCard.set(r.n, [...(byCard.get(r.n) ?? []), r]);
    if (JSON.stringify(rows) !== JSON.stringify(d.status.now.proposals)) d.status.set({ proposals: rows });
  }

  return {
    refresh,
    card: (n) => (n.n !== undefined && byCard.has(n.n) ? { proposals: byCard.get(n.n)! } : NONE),
    async answer(id, seq, answer) {
      const row = rows.find((r) => r.seq === seq);
      if (!row || busy || (answer === 'accept' && row.stale)) return;
      const act = proposalAct(row, answer, d.ver(row.n));
      if (!act) return refresh(); // no version to accept at: the row goes, nothing is sent
      const entry = d.card(id)?.querySelector<HTMLElement>(`.vb-prop[data-proposal="${seq}"]`);
      busy = true;
      entry?.setAttribute('aria-busy', 'true');
      const ok = await d.record(act);
      busy = false;
      entry?.removeAttribute('aria-busy');
      if (!ok) return refresh(); // refused: work the rows out again, so nothing stays stuck
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
      if (!(await d.confirm({ heading: w.heading, body: w.body, confirm: w.confirm, list: { items: w.items, skipped: w.skipped } }))) return;
      const ok = await d.run(plan.apply.flatMap((r) => proposalAct(r, 'accept', d.ver(r.n)) ?? []).map((act) => [act]));
      keepFocus();
      if (ok) d.toast(w.done);
      else refresh();
    },
    review(n) {
      const row = n === undefined ? [...rows].sort((a, b) => a.n - b.n)[0] : rows.find((r) => r.n === n);
      if (!row) return;
      if (d.list) {
        d.go(row.n);
        const box = d.box(String(row.n));
        if (box && d.vp.hideFar && isFar(d.vp.k)) {
          d.vp.fit(box, true, READ_FIT);
          if (isFar(d.vp.k)) d.vp.zoomCentre(FAR_K / d.vp.k); // a card larger than the stage: at least where controls show
        }
      }
      const tab = tabOf(d.card(String(row.n)));
      if (!tab) return;
      if (tab.getAttribute('aria-expanded') === 'true') tab.focus({ preventScroll: true });
      else tab.click();
    },
  };
}
