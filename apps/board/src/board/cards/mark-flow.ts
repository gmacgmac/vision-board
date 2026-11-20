// What a node's marks do on the board (D-099 1, decisions 4 to 7; the design review of DESIGN_01).
// Each mark is the control for what it shows, and a press never does two things depending on its timing:
// - the number: a click toggles Bookmark at once; a press held about 400 ms (a long press on touch) opens the
//   number's menu instead and toggles nothing; the menu key or Shift+F10 on it opens the menu too;
// - the disc: a click, or the pointer resting on it (disc-rest.ts), opens Tick and Cross over it with Tick on the disc,
//   so a click without moving ticks (D-112, amending DD-07: two clicks in one place answer); Enter or Space on it opens
//   them with focus on Tick; while the agent proposes an answer a click opens the proposal box instead;
// - the change badge, or H on the node: the history box; the notes mark, or C: the conversation;
// - right-click on a node, a long press on touch, the menu key or Shift+F10: the node's actions, at the pointer;
//   never on the board's background, which keeps the browser's own menu.
// One menu or box is open at a time. Tick and Cross go through the acts the footer's buttons used (item-acts.ts, its
// 400 ms guard included); a press the board can't take now (locked, read-only, a past version) turns the mark into a
// lock for a moment with the reason beside it, and a write that fails rings the mark (mark-tips.ts). This file hears
// the presses and holds; how each is done (menus, boxes, tips) loads once the board is idle, or on the first press
// (mark-acts.ts), out of the page's start weight. Browser only.
import type { ActionId, ViewNode } from '#format';
import type { NodeState } from '#ui';
import { smallMark } from '../canvas/index.ts';
import { DRAG_THRESHOLD } from '../input/index.ts';
import type { MarkActs } from './mark-acts.ts';

/** How long the number is held before its menu opens in place of the bookmark (D-099 1). */
export const HOLD_MS = 400;
/** How long a touch rests on a node before its actions open (a long press). */
export const LONG_PRESS_MS = 500;

export interface MarkFlowDeps {
  stage: HTMLElement;
  /** The mount's id prefix (the menus' ids). */
  prefix: string;
  node(id: string): ViewNode | undefined;
  /** What node `id` shows now, for its menus' rows (Remove bookmark, Bring back, Put back). */
  state(id: string): NodeState | undefined;
  card(id: string): HTMLElement | undefined;
  /** Why the board can't take an answer (`answer`) or a bookmark now, in the words the mark shows; null when it can. */
  paused(what: 'answer' | 'bookmark'): string | null;
  /** A node's act, as its key does it (the item acts behind the board's guards): true written, false failed. */
  act(id: string, action: ActionId): Promise<boolean | undefined> | void;
  bookmark(id: string): Promise<unknown> | void;
  unpin(id: string): void;
}

export interface MarkFlow {
  /** A click on mark `mark` of node `id`. */
  press(id: string, mark: string, el: HTMLElement): void;
  /** A key on node `id` (focus on `target`): the menu key or Shift+F10 (`menu`), or H (`history`). True when it acted. */
  key(id: string, target: HTMLElement, key: 'menu' | 'history'): boolean;
  /** A or X on node `id`: Tick or Cross as its mark gives it, a lock on the mark when the board can't take it (FIX_01). */
  answer(id: string, action: 'ack' | 'drop'): void;
  /** The view moved or the board was drawn again: what is open follows its anchor. */
  place(): void;
  /** Close what is open; true when something was. */
  close(): boolean;
  destroy(): void;
}

export function createMarkFlow(d: MarkFlowDeps): MarkFlow {
  let acts: MarkActs | null = null;
  let loading: Promise<MarkActs | null> | null = null;
  let gone = false;
  const load = () => (loading ??= import('./mark-acts.ts').then((m) => (gone ? null : (acts = m.createMarkActs(d))), () => { loading = null; return null; }));
  /** Run `f` with the marks' acts, at once once loaded. */
  const withActs = (f: (a: MarkActs) => void) => { if (acts) f(acts); else void load().then((a) => a && f(a)); };
  const idle = window.setTimeout(() => void load(), 200);

  /** The number was held, or a touch rested on the node, and its menu opened: the click that follows does nothing. */
  let held = false;
  let timer = 0;
  let from: { x: number; y: number } | null = null;
  const cancel = () => { clearTimeout(timer); from = null; };

  function onDown(e: PointerEvent) {
    cancel();
    held = false;
    const t = e.target as Element;
    const card = t.closest?.<HTMLElement>('vb-node[data-edges]');
    if (!card || e.button !== 0) return;
    const id = card.dataset.id!;
    const small = smallMark(t);
    const num = small ? null : t.closest<HTMLElement>('[data-mark="number"]');
    from = { x: e.clientX, y: e.clientY };
    // The number held: its menu, and the click that follows bookmarks nothing.
    if (num) timer = window.setTimeout(() => { held = true; num.focus({ preventScroll: true }); withActs((a) => a.numberMenu(id)); }, HOLD_MS);
    // A touch resting on the node (not on a control): its actions.
    else if (e.pointerType === 'touch' && (small || !t.closest('button, a, input, textarea'))) {
      const [x, y] = [e.clientX, e.clientY];
      timer = window.setTimeout(() => { held = true; withActs((a) => a.actions(id, x, y)); }, LONG_PRESS_MS);
    }
  }
  const onMove = (e: PointerEvent) => { if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) >= DRAG_THRESHOLD) cancel(); };
  /** Right-click, or a long press the browser reports as one: the node's actions; never on the background. */
  function onMenu(e: MouseEvent) {
    const t = e.target as Element;
    const card = t.closest?.<HTMLElement>('vb-node[data-edges]');
    if (!card || t.closest('a, input, textarea, [contenteditable]')) return;
    e.preventDefault();
    // A Ctrl+press on macOS comes as a right-click (main button, Ctrl held), but on the board Ctrl+click adds to the
    // selection and Ctrl+drag pans from anywhere (pointer.ts): it keeps that meaning and opens no list.
    if (e.ctrlKey && e.button === 0) return;
    const id = card.dataset.id!;
    if (held || acts?.showing(id)) return;
    const [x, y] = [e.clientX, e.clientY];
    withActs((a) => a.actions(id, x, y));
  }
  d.stage.addEventListener('pointerdown', onDown, true);
  d.stage.addEventListener('pointermove', onMove);
  for (const type of ['pointerup', 'pointercancel'] as const) d.stage.addEventListener(type, cancel);
  d.stage.addEventListener('contextmenu', onMenu);

  return {
    press(id, mark, el) {
      if (mark === 'number' && held) { held = false; return; }
      withActs((a) => a.press(id, mark, el));
    },
    key(id, target, which) {
      if (which === 'history') {
        if (!d.card(id)?.querySelector('.vb-card-pop[data-pop="history"]')) return false;
        withActs((a) => a.history(id));
        return true;
      }
      if (target.closest('[data-mark="number"]')) withActs((a) => a.numberMenu(id));
      else {
        const r = d.card(id)?.getBoundingClientRect();
        if (!r) return false;
        withActs((a) => a.actions(id, r.left + Math.min(24, r.width / 2), r.top + Math.min(24, r.height / 2)));
      }
      return true;
    },
    answer: (id, action) => withActs((a) => a.answer(id, action)),
    place: () => acts?.place(),
    close: () => acts?.close() ?? false,
    destroy() {
      gone = true;
      cancel();
      clearTimeout(idle);
      acts?.destroy();
    },
  };
}
