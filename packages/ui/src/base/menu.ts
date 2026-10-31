// The menu (browser side of menu-core.ts): a role="menu" list of role="menuitem" buttons that float
// over the page. `menuKeydown` is its keys, for a menu that hears them itself; `openMenu` is the
// whole of an open menu: its keys, a press outside closing it (layer.ts), its opener's
// aria-expanded, its first item focused, and focus given back on Esc. The caller draws it open
// before `openMenu` and hides it in `onClose`. The menu handles its own keys, so none reaches a
// page's shortcuts. Nothing here touches the DOM at import.
import { menuStep } from './menu-core.ts';
import { focusBackOn } from './layer-core.ts';
import { dismissable } from './layer.ts';

export interface MenuKeyOptions {
  /** More keys that close the menu with focus back (Esc always does). */
  back?: readonly string[];
  /** Keep the key from the page (default true). */
  stop?: boolean;
}

/** Handle a key pressed in a menu whose items are `items`; `close(focusBack)` closes it. */
export function menuKeydown(e: KeyboardEvent, items: readonly HTMLElement[], close: (focusBack: boolean) => void, o: MenuKeyOptions = {}): void {
  if (o.stop !== false) e.stopPropagation();
  const step = menuStep(e.key, items.indexOf(document.activeElement as HTMLElement), items.length, o.back);
  if (!step) return;
  if ('focus' in step) {
    e.preventDefault();
    items[step.focus]?.focus({ preventScroll: true });
    return;
  }
  if (step.close === 'back') e.preventDefault();
  close(step.close === 'back');
}

/** The menu's items, in order: what its keys move between. */
export const menuItems = (menu: ParentNode): HTMLElement[] => [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];

/** The item an open menu focuses first: the first one not disabled, else the first. */
export const firstItem = (items: readonly HTMLElement[]): HTMLElement | undefined =>
  items.find((b) => b.getAttribute('aria-disabled') !== 'true') ?? items[0];

export interface OpenMenuOptions {
  /** The role="menu" element, drawn open. */
  menu: HTMLElement;
  /** The button that opened it: aria-expanded while open, focus back to it. Without one, focus goes
   * back to what had it when the menu opened. */
  opener?: HTMLElement | null;
  /** A press here does not close it (default: the menu and its opener). */
  within?: (target: Node) => boolean;
  /** A key the menu handles before its own keys (e.g. a row's shortcut); true when handled. */
  key?: (e: KeyboardEvent) => boolean;
  /** What its keys move between (default: its menu items), for a surface that also holds other controls. */
  items?: () => HTMLElement[];
  /** Hide the menu: it closed. */
  onClose(): void;
}

export interface OpenMenu {
  /** Close it; focus goes back to the opener when `focusBack` (default true). */
  close(focusBack?: boolean): void;
}

/** A menu drawn open: hear its keys and a press outside, focus its first item. */
export function openMenu(o: OpenMenuOptions): OpenMenu {
  const back = o.opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  let open = true;
  const within = o.within ?? ((t: Node) => o.menu.contains(t) || !!o.opener?.contains(t));
  const items = o.items ?? (() => menuItems(o.menu));
  const onKey = (e: KeyboardEvent) => {
    if (o.key?.(e)) return;
    menuKeydown(e, items(), close);
  };
  const stop = dismissable({ within, dismiss: (why) => close(focusBackOn(why)) });
  function close(focusBack = true): void {
    if (!open) return;
    open = false;
    stop();
    o.menu.removeEventListener('keydown', onKey);
    o.opener?.setAttribute('aria-expanded', 'false');
    o.onClose();
    if (focusBack && back?.isConnected) back.focus({ preventScroll: true });
  }
  o.menu.addEventListener('keydown', onKey);
  o.opener?.setAttribute('aria-expanded', 'true');
  firstItem(items())?.focus({ preventScroll: true });
  return { close };
}
