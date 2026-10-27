// A click outside the read-only note bubble closes it (review polish ruling 7: the sent note and the
// conversation), as the × and Esc do. Only a click: a press that moves past the drag threshold is a
// pan or a lasso, and the bubble stays and follows its card. A press on a note, a reply or the pin
// opens what it opens (notes.ts moves the open conversation there), so it is not "outside". Focus
// goes back to what the bubble opened from unless the click gave it to something else (a card, a
// button, the toolbar).
// The click outside is the shared dismissable layer's (`#ui` `dismissable`, click only).
import { dismissable } from '#ui';
import { DRAG_THRESHOLD } from './pointer.ts';

/** Presses that open a bubble themselves (wiring.ts, region-notes.ts, group-pins.ts): never a click outside. */
const OPENS = '[data-note], .vb-group-pin, .vb-node-reply[data-reply], .vb-nblock-text, .vb-nblock-reply';

/** `shown`: whether a read-only bubble is open now; `close(focus)`: close it, focus back when true.
 *  Returns the unbind. */
export function bindOutside(bubble: HTMLElement, stage: HTMLElement, shown: () => boolean, close: (focus: boolean) => void): () => void {
  return dismissable({
    within: (t) => !shown() || bubble.contains(t) || !!(t as Element).closest?.(OPENS),
    clickWithin: DRAG_THRESHOLD,
    dismiss: () => {
      if (!shown()) return;
      const now = document.activeElement;
      close(!now || now === document.body || now === stage || bubble.contains(now));
    },
  });
}
