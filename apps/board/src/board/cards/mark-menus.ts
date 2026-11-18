// A node's three menus on the board (D-099, D-101; loaded on the first open, lazy.ts): the number's
// menu, the answer picker and the right-click list, drawn from the pattern's markup (packages/ui node-menus.ts) on the
// stage, outside the scaled board, so each keeps one size at any zoom. It is placed from its anchor (mark-place.ts),
// and placed again when the view moves, so it stays attached while the person zooms or pans: a drag outside it pans
// and leaves it open; a click outside it, Esc, Tab or a choice closes it. Focus goes to its first row and comes back
// to what opened it. Up and Down move between the rows (the shared menu's keys); the picker, laid out side by side,
// takes Left and Right too. A row acts by its `data-menu-act`, which the caller runs once the menu has closed.
import type { ViewNode } from '#format';
import type { NodeState, StageBox } from '#ui';
import { answerPicker, contextMenu, dismissable, firstItem, menuItems, menuKeydown, numberMenu, returnFocus } from '#ui';
import { DRAG_THRESHOLD } from '../input/index.ts';
import type { MarkSide } from './mark-place.ts';
import { moveTo, placeMark } from './mark-place.ts';

/** Which menu: the number's, the answer picker, or the right-click list. */
export type MarkMenuName = 'number' | 'answer' | 'actions';

export interface MarkMenuSpec {
  name: MarkMenuName;
  node: ViewNode;
  state: NodeState;
  /** The mount's id prefix. */
  prefix: string;
  /** The mark that opened it (the disc says it controls the picker while open), if any. */
  opener: HTMLElement | null;
  /** Its anchor in stage pixels now, or null once the node has gone (it closes). */
  anchor(): StageBox | null;
  side: MarkSide;
  /** A row was chosen, after the menu closed. */
  act(act: string): void;
  /** It closed, however. */
  closed(): void;
}

export interface MarkMenu {
  readonly name: MarkMenuName;
  readonly id: string;
  /** Place it again from its anchor (the view moved, the board redrew). */
  place(): void;
  /** Close it; focus goes back to what had it when it opened (default true). */
  close(focusBack?: boolean): void;
}

const MARKUP: Record<MarkMenuName, (s: MarkMenuSpec) => string> = {
  number: (s) => numberMenu(s.node, s.state, s.prefix),
  answer: (s) => answerPicker(s.node, s.prefix),
  actions: (s) => contextMenu(s.node, s.state, s.prefix),
};

/** Left and Right in the picker, which lays its rows side by side: the previous and next row, wrapping. */
function sideways(e: KeyboardEvent, items: readonly HTMLElement[]): boolean {
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!step || !items.length) return false;
  e.preventDefault();
  e.stopPropagation();
  const at = items.indexOf(document.activeElement as HTMLElement);
  items[(at + step + items.length) % items.length]?.focus({ preventScroll: true });
  return true;
}

/** Draw menu `spec` on `stage`, place it and open it. */
export function showMarkMenu(stage: HTMLElement, spec: MarkMenuSpec): MarkMenu {
  const back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const holder = document.createElement('div');
  holder.className = 'vb-mark-menu';
  // Markup from node-menus.ts, which escapes every text run.
  holder.innerHTML = MARKUP[spec.name](spec);
  const menu = holder.firstElementChild as HTMLElement;
  menu.hidden = false;
  stage.append(holder);
  const items = () => menuItems(menu);
  let open = true;

  function place(): void {
    const anchor = spec.anchor();
    if (!anchor) return close(false);
    moveTo(holder, placeMark(anchor, { w: menu.offsetWidth, h: menu.offsetHeight }, { w: stage.clientWidth, h: stage.clientHeight }, spec.side));
  }
  const onKey = (e: KeyboardEvent) => {
    if (spec.name === 'answer' && sideways(e, items())) return;
    menuKeydown(e, items(), close);
  };
  const onClick = (e: MouseEvent) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-menu-act]');
    if (!row || row.getAttribute('aria-disabled') === 'true') return;
    close(true);
    spec.act(row.dataset.menuAct!);
  };
  // A press that travels (a pan, a lasso) leaves it open; a click outside closes it, with focus where it was pressed.
  // Esc is a layer's too, so the newest one open closes first (a tip under it waits; FIX_01): focus back where it was.
  const stop = dismissable({
    within: (t) => holder.contains(t) || !!spec.opener?.contains(t), clickWithin: DRAG_THRESHOLD, escape: stage,
    dismiss: (reason) => close(reason === 'escape'),
  });
  function close(focusBack = true): void {
    if (!open) return;
    open = false;
    stop();
    menu.removeEventListener('keydown', onKey);
    holder.remove();
    spec.opener?.setAttribute('aria-expanded', 'false');
    spec.opener?.removeAttribute('aria-controls');
    spec.closed();
    if (focusBack) returnFocus(back);
  }
  menu.addEventListener('keydown', onKey);
  holder.addEventListener('click', onClick);
  spec.opener?.setAttribute('aria-expanded', 'true');
  spec.opener?.setAttribute('aria-controls', menu.id);
  place();
  firstItem(items())?.focus({ preventScroll: true });
  return { name: spec.name, id: menu.id, place, close };
}
