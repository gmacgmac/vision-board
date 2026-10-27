// The menu's rules (the WAI-ARIA menu pattern), pure: what a key pressed in a menu does. Up and
// Down move between the items, wrapping (Up with no item focused goes to the last); Home and End go
// to the first and the last; Esc closes the menu and gives focus back to what opened it; Tab closes
// it and lets focus move on. A menu may name more keys that close it with focus back (a rail's menu
// opens to the right of its button, so Left goes back to it). The browser side is menu.ts.

/** What a key does: focus item `focus`, close the menu (`back`: focus goes back to its opener;
 * `on`: focus moves on), or nothing (null). */
export type MenuStep = { readonly focus: number } | { readonly close: 'back' | 'on' } | null;

/** The keys that close a menu with focus back, unless the menu names more. */
export const MENU_BACK_KEYS: readonly string[] = ['Escape'];

/** What `key` does in a menu of `count` items whose item `at` has focus (-1: none has). */
export function menuStep(key: string, at: number, count: number, back: readonly string[] = MENU_BACK_KEYS): MenuStep {
  if (key === 'Escape' || back.includes(key)) return { close: 'back' };
  if (key === 'Tab') return { close: 'on' };
  if (count === 0) return null;
  switch (key) {
    case 'ArrowDown': return { focus: (at + 1) % count };
    case 'ArrowUp': return { focus: at <= 0 ? count - 1 : at - 1 };
    case 'Home': return { focus: 0 };
    case 'End': return { focus: count - 1 };
    default: return null;
  }
}
