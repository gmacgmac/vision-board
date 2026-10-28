// Changed cards on the page (cardUpdates flag, FE_02 rulings 1-3, mockup 03 Part B option B): the
// "N updates" tab on each card the conditions table finds unseen (`item.unseen`: past version 1, or
// cleared by the agent's reply to its note, D-045, which is one update of its own),
// the stepper the tab opens in the card, and the card seen lines. Selecting a card (a click, Space, a
// lasso: the selection module) marks its latest version seen; each step shown marks its version
// seen. Hover and tabbing past send nothing, and nothing is sent while a past version shows. Every
// line goes out through the sender, in order. The stepper keeps the steps it opened with, so the
// count holds while each step ends the condition; past the last, "You're up to date", then it folds
// away. Opening, a step and folding draw again: only that card changes, so only it is measured.
// NEW (newCards flag, stage5-follow-ups FE_01): the card facts also say which cards the conditions
// table finds new (`item.new`); a selection marks seen every card a condition holds for whose row's
// `clearedBy` names select (`seenOnSelect`), so a NEW card is marked seen when selected. A card
// found, not clicked (Go to card, the finder lists), is selected by `find`: it marks nothing (ruling
// 322, findKeepsMarks flag); the person's click on it, or an act, still does.
import type { ViewNode } from '#format';
import type { LedgerState, SeenMark } from '#actions';
import { seenDue, seenMarks, seenOnSelect, unseenCount, unseenSteps } from '#actions';
import type { CardConditions, CardStep } from '#ui';
import { versionTime } from '#ui';
import type { SelectBy, Selection } from '../selection/index.ts';

/** How long "You're up to date" stays before the section folds away (node-steps.css fades it first). */
export const UP_TO_DATE_MS = 2200;

export interface UpdateDeps {
  /** The cardUpdates flag. */
  on: boolean;
  stage: HTMLElement;
  selection: Selection;
  state(): LedgerState | null;
  /** The open board's id. */
  board(): string;
  /** The conditions table's unseen items on the open board. */
  unseen(): ReadonlySet<number>;
  /** The newCards flag: the NEW tab. */
  newCards: boolean;
  /** The conditions table's new items on the open board (`item.new`). */
  fresh(): ReadonlySet<number>;
  /** A past version shows: no tabs, nothing sent. */
  readOnly(): boolean;
  card(id: string): HTMLElement | undefined;
  /** Send card seen lines in order (the sender). */
  seen(marks: readonly SeenMark[]): Promise<boolean>;
  redraw(): void;
  /** The stepper's link to where card `n` was last changed (the chat, chat-bridge.ts), if anywhere. */
  source?(n: number): string | undefined;
}

export interface UpdateFlow {
  /** Work the counts out again, before each draw. */
  refresh(): void;
  /** What the conditions table says about card `n`: NEW, or its updates and its stepper. */
  card(n: ViewNode): CardConditions;
  /** Cards `ids` were selected (a click too, on one already selected): mark those unseen seen, unless
   *  the person only found them (`by: 'find'`, ruling 322). */
  saw(ids: readonly string[], by?: SelectBy): void;
  destroy(): void;
}

/** An open stepper, on the board it opened on (its card is named by its number there). */
interface Stepper { board: string; steps: CardStep[]; at: number; timer?: number }

const NONE: CardConditions = {};

export function createUpdateFlow(d: UpdateDeps): UpdateFlow {
  let counts = new Map<number, number>();
  const open = new Map<number, Stepper>();
  /** Card seen lines on their way, so a second click sends none. */
  const sending = new Set<string>();
  const live = () => (d.on && !d.readOnly() ? d.state() : null);
  const none: ReadonlySet<number> = new Set();
  /** The state the card seen lines are worked out from: not while a past version shows. */
  const current = () => (d.readOnly() ? null : d.state());
  /** NEW cards (newCards flag). With it off they are the changed cards the table finds unseen, as before. */
  const fresh = () => (d.newCards ? d.fresh() : none);
  const unseen = () => (!d.on ? none : d.newCards ? d.unseen() : new Set([...d.unseen(), ...d.fresh()]));

  function send(marks: readonly SeenMark[]) {
    const s = current();
    const due = marks.filter((m) => s && seenDue(s, d.board(), m.n, m.ver) && !sending.has(`${m.n}:${m.ver}`));
    if (!due.length) return;
    for (const m of due) sending.add(`${m.n}:${m.ver}`);
    void d.seen(due).finally(() => { for (const m of due) sending.delete(`${m.n}:${m.ver}`); });
  }

  const pieceOf = (n: number, sel: string) => d.card(String(n))?.querySelector<HTMLElement>(sel);

  /** Draw the stepper at its step, focus where the person goes on, and mark the step seen. */
  function show(n: number, o: Stepper) {
    d.redraw();
    const step = o.steps[o.at];
    if (step) {
      const next = pieceOf(n, '[data-step="next"]');
      if (next && !next.closest('[hidden]')) next.focus({ preventScroll: true });
      return send([{ n, ver: step.ver }]);
    }
    // Past the last: "You're up to date"; the stepper's buttons are gone, so focus goes to the card.
    d.card(String(n))?.focus({ preventScroll: true });
    o.timer = window.setTimeout(() => fold(n), UP_TO_DATE_MS);
  }

  function fold(n: number) {
    const o = open.get(n);
    if (!o) return;
    clearTimeout(o.timer);
    open.delete(n);
    const card = d.card(String(n));
    const inside = card?.contains(document.activeElement);
    d.redraw();
    if (!inside) return;
    const tab = pieceOf(n, '[data-tab="updates"]');
    (tab && !tab.hidden ? tab : card)?.focus({ preventScroll: true });
  }

  /** The tab: open the stepper on the first unseen version, or fold it. */
  function toggle(n: number) {
    if (open.has(n)) return fold(n);
    const s = live();
    const steps = s ? unseenSteps(s, d.board(), n, versionTime) : [];
    if (!steps.length) return;
    const o: Stepper = { board: d.board(), steps, at: 0 };
    open.set(n, o);
    show(n, o);
  }

  function go(n: number, by: 1 | -1) {
    const o = open.get(n);
    if (!o || o.at + by < 0 || o.at >= o.steps.length) return;
    o.at += by;
    show(n, o);
  }

  const onClick = (e: MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>('vb-node [data-tab="updates"], vb-node [data-step]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const n = Number(b.closest<HTMLElement>('vb-node')!.dataset.id);
    if (b.dataset.tab) toggle(n);
    else go(n, b.dataset.step === 'next' ? 1 : -1);
  };
  // Esc in an open card folds its stepper; keys.ts then leaves the selection alone.
  const onKey = (e: KeyboardEvent) => {
    const n = Number((e.target as Element).closest<HTMLElement>('vb-node')?.dataset.id);
    if (e.key !== 'Escape' || e.defaultPrevented || !open.has(n)) return;
    e.preventDefault();
    fold(n);
  };
  d.stage.addEventListener('click', onClick);
  d.stage.addEventListener('keydown', onKey);
  const unlisten = d.selection.onChange((c) => flow.saw(c.changed, c.by));

  const flow: UpdateFlow = {
    refresh() {
      const s = live();
      counts = new Map();
      for (const [n, o] of open) {
        if (s && o.board === d.board()) continue;
        clearTimeout(o.timer);
        open.delete(n);
      }
      if (s) for (const n of unseen()) counts.set(n, unseenCount(s, d.board(), n));
    },
    card(n) {
      if (n.n === undefined) return NONE;
      if (!d.readOnly() && fresh().has(n.n)) return { new: true };
      const o = open.get(n.n);
      const count = counts.get(n.n) ?? 0;
      const source = o && d.source?.(n.n);
      return o ? { updates: { count, steps: o.steps, at: o.at, ...(source && { source }) } } : count ? { updates: { count } } : NONE;
    },
    saw(ids, by = 'select') {
      const s = current();
      if (s) send(seenMarks(s, d.board(), seenOnSelect({ fresh: fresh(), unseen: unseen() }, by), ids.filter((id) => d.selection.has(id))));
    },
    destroy() {
      d.stage.removeEventListener('click', onClick);
      d.stage.removeEventListener('keydown', onKey);
      unlisten();
      for (const o of open.values()) clearTimeout(o.timer);
    },
  };
  return flow;
}
