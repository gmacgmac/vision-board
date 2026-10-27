// The selection pill (stage5-follow-ups FE_02 rulings 1-3, flag selectionPill): over a selection
// the bar starts as a pill ("3 selected" and a chevron), and a click or Enter on it opens the bar.
// It stays open until a press anywhere outside it (cards and the board's background included, so
// a drag that pans or lassos too), a pan with the wheel, Esc (selection-flow.ts `collapse`), or
// the selection clearing; a new selection starts closed. The selection's keys work either way
// (commands.ts). View state only, like the selection itself (selection.ts). The press outside is the
// shared dismissable layer's (`#ui` `dismissable`).
import { dismissable } from '#ui';
import type { Selection } from './selection.ts';

export interface PillDeps {
  stage: HTMLElement;
  bar: HTMLElement;
  selection: Selection;
  /** It opened or closed: show the bar again. */
  changed(): void;
}

export interface Pill {
  readonly open: boolean;
  /** Open or close it (the pill's own click or Enter). */
  set(open: boolean): void;
  /** Esc: close it, focus back on the pill when focus was in the bar; false when it was closed. */
  collapse(): boolean;
  destroy(): void;
}

export function createPill(d: PillDeps): Pill {
  let open = false;
  const set = (next: boolean) => {
    if (next === open) return;
    open = next;
    d.changed();
  };
  // Ctrl or Cmd with the wheel zooms (pointer.ts); only a pan closes it.
  const pan = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) set(false); };
  const stopOutside = dismissable({ within: (t) => !open || d.bar.contains(t), dismiss: () => set(false) });
  d.stage.addEventListener('wheel', pan, { passive: true });
  const stop = d.selection.onChange((c) => { if (!c.count) open = false; });

  return {
    get open() { return open; },
    set,
    collapse() {
      if (!open) return false;
      const back = d.bar.contains(document.activeElement);
      set(false);
      if (back) d.bar.querySelector<HTMLElement>('.vb-sb-pill')?.focus({ preventScroll: true });
      return true;
    },
    destroy() {
      stopOutside();
      d.stage.removeEventListener('wheel', pan);
      stop();
    },
  };
}
