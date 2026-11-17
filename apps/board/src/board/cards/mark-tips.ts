// The tips over a node's marks (nodeEdges flag; the maintainer's design review of DESIGN_01, "Hover" and point 328):
// one tip box on the stage, outside the scaled board, showing a mark's `data-tip` (packages/ui node-edges.ts) after a
// deliberate hover of about two seconds, or at once when the keyboard brings focus to the mark; never after a click.
// It also says a moment the page sets on a mark: a press on a locked board or a read-only ledger turns the mark into
// a lock with "Board is locked" (or "This ledger is read-only") beside it for a moment, then it goes back; a write that
// failed rings the mark in red with "!" and its words show by themselves for a few seconds, then come back on a hover
// until the next press. It moves nothing and holds no focus; Esc or a press anywhere hides it. Browser only.
import type { MarkSide } from './mark-place.ts';
import { moveTo, placeMark, stageBoxOf } from './mark-place.ts';

/** How long a pointer rests on a mark before its tip shows (the design review: about two seconds). */
export const TIP_HOVER_MS = 2000;
/** How long a press on a locked board or a read-only ledger shows the lock and its words. */
export const LOCK_MOMENT_MS = 2000;
/** How long a failed write's words show by themselves. */
export const FAIL_MOMENT_MS = 4000;

/** A mark the tips hear: one with words, on a node drawn with its edges. */
const MARK = 'vb-node[data-edges] [data-tip]';

export interface MarkTips {
  /** Show `words` by `mark` now, for `ms` (a moment), or until the pointer leaves or a press. */
  show(mark: HTMLElement, words: string, ms?: number): void;
  hide(): void;
  /** A press on a locked board or a read-only ledger: the mark is a lock for a moment, `why` beside it. */
  locked(mark: HTMLElement, why: string): void;
  /** A write from `mark` failed: it rings in red with "!", `words` show for a few seconds, then on a hover. */
  failed(mark: HTMLElement, words: string): void;
  /** The next press on `mark`: what the last one left (a failure) goes. */
  pressed(mark: HTMLElement): void;
  /** The view moved: the tip follows its mark. */
  place(): void;
  destroy(): void;
}

/** What a mark's tip says now: a failure's words while it carries one, else its own. */
const wordsOf = (mark: HTMLElement): string => mark.dataset.failTip ?? mark.dataset.tip ?? '';

/** Whether focus came from the keyboard: `:focus-visible`, and not a pointer's focus (pointer-focus.ts). */
const byKeyboard = (el: Element): boolean => el.matches(':focus-visible') && !el.closest('[data-pointer-focus]');

export function createMarkTips(stage: HTMLElement): MarkTips {
  const tip = document.createElement('div');
  tip.className = 'vb-tip vb-mark-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  let at: HTMLElement | null = null;
  let wait = 0;
  let end = 0;
  const moments = new Map<HTMLElement, number>();

  function place(): void {
    if (!at || tip.hidden) return;
    if (!at.isConnected) return hide();
    const side: MarkSide = 'above';
    moveTo(tip, placeMark(stageBoxOf(at, stage), { w: tip.offsetWidth, h: tip.offsetHeight }, { w: stage.clientWidth, h: stage.clientHeight }, side));
  }
  function show(mark: HTMLElement, words: string, ms?: number): void {
    clearTimeout(wait);
    clearTimeout(end);
    if (!words) return;
    if (!tip.isConnected) stage.append(tip);
    at = mark;
    tip.textContent = words;
    tip.hidden = false;
    place();
    end = ms ? window.setTimeout(hide, ms) : 0;
  }
  function hide(): void {
    clearTimeout(wait);
    clearTimeout(end);
    end = 0;
    at = null;
    tip.hidden = true;
  }
  /** Set `attr` on `mark` for `ms`, then take it off; a second moment on the mark starts it again. */
  function moment(mark: HTMLElement, attr: string, ms: number): void {
    clearTimeout(moments.get(mark));
    mark.toggleAttribute(attr, true);
    moments.set(mark, window.setTimeout(() => { mark.removeAttribute(attr); moments.delete(mark); }, ms));
  }

  const over = (e: PointerEvent) => {
    const mark = (e.target as Element).closest?.<HTMLElement>(MARK);
    if (!mark || mark === at || e.pointerType === 'touch') return;
    clearTimeout(wait);
    wait = window.setTimeout(() => show(mark, wordsOf(mark)), TIP_HOVER_MS);
  };
  const out = (e: PointerEvent) => {
    const mark = (e.target as Element).closest?.<HTMLElement>(MARK);
    if (!mark || mark.contains(e.relatedTarget as Node | null)) return;
    clearTimeout(wait);
    if (at === mark && !end) hide();
  };
  const focus = (e: FocusEvent) => {
    const mark = (e.target as Element).closest?.<HTMLElement>(MARK);
    if (mark && byKeyboard(mark)) show(mark, wordsOf(mark));
  };
  const blur = (e: FocusEvent) => { if (at && at === e.target && !end) hide(); };
  const press = () => hide();
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !tip.hidden) hide(); };
  stage.addEventListener('pointerover', over);
  stage.addEventListener('pointerout', out);
  stage.addEventListener('focusin', focus);
  stage.addEventListener('focusout', blur);
  stage.addEventListener('pointerdown', press, true);
  stage.addEventListener('keydown', key, true);
  // The pointer may already rest on a mark when this loads (it loads once the board is idle, mark-flow.ts): its wait starts now.
  const resting = stage.querySelector<HTMLElement>(`${MARK}:hover`);
  if (resting) wait = window.setTimeout(() => show(resting, wordsOf(resting)), TIP_HOVER_MS);

  return {
    show, hide, place,
    locked(mark, why) {
      moment(mark, 'data-locked', LOCK_MOMENT_MS);
      show(mark, why, LOCK_MOMENT_MS);
    },
    failed(mark, words) {
      mark.dataset.failTip = words;
      mark.toggleAttribute('data-failed', true);
      show(mark, words, FAIL_MOMENT_MS);
    },
    pressed(mark) {
      delete mark.dataset.failTip;
      mark.removeAttribute('data-failed');
    },
    destroy() {
      hide();
      for (const t of moments.values()) clearTimeout(t);
      tip.remove();
    },
  };
}
