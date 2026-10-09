// A menu's keys (the WAI-ARIA menu pattern), shared by the Move to list (move-menu.ts) and the
// toolbar's "⋯" menu (shell/ToolbarMenu.svelte): Up and Down (Home, End) move between the items,
// wrapping; Esc closes it and gives focus back; Tab closes it and lets focus move on. The menu
// handles its own keys, so none reaches the board's shortcuts (keys.ts).

/** Handle a key pressed in a menu whose items are `items`; `close(focusBack)` closes it. */
export function menuKeydown(e: KeyboardEvent, items: readonly HTMLElement[], close: (focusBack: boolean) => void): void {
  e.stopPropagation();
  const at = items.indexOf(document.activeElement as HTMLElement);
  const to = (i: number) => { e.preventDefault(); items[(i + items.length) % items.length]?.focus({ preventScroll: true }); };
  switch (e.key) {
    case 'ArrowDown': return to(at + 1);
    case 'ArrowUp': return to(at - 1);
    case 'Home': return to(0);
    case 'End': return to(items.length - 1);
    case 'Escape': e.preventDefault(); return close(true);
    case 'Tab': return close(false);
  }
}
