// Navigation and focus on the board: the cards in reading order that are drawn, the next one in
// either direction, and the focused card, which lights up its connectors. Focus never moves the
// board (review-polish ruling 11): only another card the keyboard reached (Tab, J) is panned into
// view, by `revealPan`'s rule, and a popover's box when a key opened it (proposals FE_01, PLAN
// decision 2); a click, focus coming back to the card it left, or the window getting focus back
// pans nothing. Split out of controller.ts
// (N12_FE_01); keys.ts and the controller call it.
import type { View } from '#format';
import type { BoardLayout } from '#layout';
import { POPOVER_OPEN } from '#ui';
import { lastInput } from './pointer-focus.ts';
import { readingOrder } from './render.ts';
import type { Viewport } from './viewport.ts';

export interface FocusDeps {
  cards: HTMLElement;
  vp: Viewport;
  view(): View;
  layout(): BoardLayout | null;
  /** The focused card changed: redraw what it lights up. */
  changed(): void;
}

export interface Focus {
  readonly id: string | null;
  /** The drawn card after (1) or before (-1) `id`, wrapping; the first or last with none. */
  neighbour(id: string | null, dir: 1 | -1): string | null;
}

export function createFocus(d: FocusDeps): Focus {
  let focus: string | null = null;
  /** The card that last had focus: focus coming back to it (a note or popover closed) is not a move. */
  let left: string | null = null;

  function visibleOrder(): string[] {
    const layout = d.layout();
    return readingOrder(d.view()).map((n) => n.id).filter((id) => layout?.nodes.has(id));
  }

  function set(id: string | null) {
    if (focus === id) return;
    const back = id !== null && id === left;
    focus = id;
    if (id) left = id;
    d.changed();
    const b = id ? d.layout()?.nodes.get(id) : undefined;
    if (b && !back && lastInput() === 'key') d.vp.reveal(b);
  }

  d.cards.addEventListener('focusin', (e) => {
    set((e.target as HTMLElement).closest<HTMLElement>('vb-node')?.dataset.id ?? null);
  });
  // A card's popover opened by Enter (Review too): the box beside the card is brought into view
  // with it; opened by a click it is not. Its offset is in the card's own units, as the layout's are.
  d.cards.addEventListener(POPOVER_OPEN, (e) => {
    if (lastInput() !== 'key') return;
    const box = (e as CustomEvent<HTMLElement>).detail;
    const b = d.layout()?.nodes.get((e.target as HTMLElement).dataset.id ?? '');
    if (b) d.vp.reveal({ ...b, w: Math.max(b.w, box.offsetLeft + box.offsetWidth), h: Math.max(b.h, box.offsetTop + box.offsetHeight) });
  });
  // Focus leaving the cards clears it; the window losing focus does not, so its return is no new focus.
  d.cards.addEventListener('focusout', (e) => {
    const to = (e as FocusEvent).relatedTarget as HTMLElement | null;
    if (!to?.closest('vb-node') && document.hasFocus()) set(null);
  });

  return {
    get id() { return focus; },
    neighbour(id, dir) {
      const ids = visibleOrder();
      if (!ids.length) return null;
      const i = id ? ids.indexOf(id) : -1;
      return ids[(i + dir + ids.length) % ids.length] ?? null;
    },
  };
}
