// The Move to list (3_FE_03 ruling 8): Shift+M, or the selection bar's Move to, opens a small menu
// of the board's containers, Later last, under the bar. Up and Down (Home, End) move between them,
// Enter or a click moves the selection there, Esc or a click elsewhere closes it and gives focus
// back. A container the selection cannot go in (Later, when a card cannot be saved for later) is
// shown disabled. The menu handles its own keys, so none reaches the board's shortcuts (keys.ts).
// It is drawn on the stage, above the cards, and touches none of them.
import type { StageBox } from '../../../../packages/ui/src/index.ts';

export interface MoveTarget { id: string; title: string; disabled?: boolean }

export interface MoveMenuDeps {
  stage: HTMLElement;
  /** The person picked a container. */
  pick(region: string): void;
}

export interface MoveMenu {
  readonly open: boolean;
  /** Show the list for `count` cards under `anchor` (stage pixels) and focus its first item. */
  show(count: number, targets: readonly MoveTarget[], anchor: StageBox): void;
  close(): void;
  destroy(): void;
}

/** Room kept between the anchor and the menu, and between the menu and the stage's edge. */
const GAP = 6;

export function createMoveMenu(d: MoveMenuDeps): MoveMenu {
  const el = document.createElement('div');
  el.className = 'vb-move-menu';
  el.setAttribute('role', 'menu');
  el.hidden = true;
  d.stage.append(el);
  let back: HTMLElement | null = null;

  const items = () => [...el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

  function close(focusBack = true) {
    if (el.hidden) return;
    el.hidden = true;
    el.replaceChildren();
    document.removeEventListener('pointerdown', outside, true);
    if (focusBack && back?.isConnected) back.focus({ preventScroll: true });
    back = null;
  }
  function outside(e: PointerEvent) {
    if (!el.contains(e.target as Node)) close(false);
  }

  function show(count: number, targets: readonly MoveTarget[], anchor: StageBox) {
    close(false);
    back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.setAttribute('aria-label', `Move ${count} card${count === 1 ? '' : 's'} to`);
    for (const t of targets) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vb-move-item';
      b.setAttribute('role', 'menuitem');
      b.tabIndex = -1;
      b.dataset.region = t.id;
      b.textContent = t.title;
      if (t.disabled) b.setAttribute('aria-disabled', 'true');
      el.append(b);
    }
    el.hidden = false;
    const w = d.stage.clientWidth;
    const h = d.stage.clientHeight;
    const below = anchor.y + anchor.h + GAP;
    const top = below + el.offsetHeight > h - GAP ? Math.max(GAP, anchor.y - GAP - el.offsetHeight) : below;
    // CSSOM, not a style attribute: the page's CSP refuses inline styles.
    el.style.left = `${Math.round(Math.min(Math.max(GAP, anchor.x), w - el.offsetWidth - GAP))}px`;
    el.style.top = `${Math.round(top)}px`;
    document.addEventListener('pointerdown', outside, true);
    const first = items().find((b) => !b.hasAttribute('aria-disabled')) ?? items()[0];
    first?.focus({ preventScroll: true });
  }

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[role="menuitem"]');
    if (!b || b.hasAttribute('aria-disabled')) return;
    close();
    d.pick(b.dataset.region!);
  });
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const to = (i: number) => { e.preventDefault(); list[(i + list.length) % list.length]?.focus({ preventScroll: true }); };
    switch (e.key) {
      case 'ArrowDown': return to(at + 1);
      case 'ArrowUp': return to(at - 1);
      case 'Home': return to(0);
      case 'End': return to(list.length - 1);
      case 'Escape': e.preventDefault(); return close();
      case 'Tab': return close(false);
    }
  });

  return {
    get open() { return !el.hidden; },
    show,
    close: () => close(),
    destroy() { close(false); el.remove(); },
  };
}
