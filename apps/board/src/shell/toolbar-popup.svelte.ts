// A menu that hangs from a toolbar button: the "⋯" menu (ToolbarMenu.svelte) and the zoom menu
// (ZoomMenu.svelte). Whether it is open, and its keys and the press outside (`#ui` `openMenu`): a click
// or Enter opens it and focuses its first item; a choice closes it, then does its job.
import { tick } from 'svelte';
import { openMenu } from '#ui';
import type { OpenMenu } from '#ui';

export interface ToolbarPopupParts {
  surface: () => HTMLElement;
  opener: () => HTMLElement;
  root: () => HTMLElement;
  key?: (e: KeyboardEvent) => boolean;
  items?: () => HTMLElement[];
}

export function toolbarPopup(parts: ToolbarPopupParts) {
  let open = $state(false);
  let menu: OpenMenu | null = null;
  const close = (focusBack = true) => { menu?.close(focusBack); };
  return {
    get open() { return open; },
    async show() {
      open = true;
      await tick();
      menu = openMenu({
        menu: parts.surface(), opener: parts.opener(), within: (t) => parts.root().contains(t),
        ...(parts.key && { key: parts.key }), ...(parts.items && { items: parts.items }),
        onClose: () => { open = false; menu = null; },
      });
    },
    close,
    /** Close, then do the row's job (a panel it opens then takes focus). */
    choose(run: () => void) {
      close();
      run();
    },
  };
}
