// A click outside the read-only note bubble closes it (review polish ruling 7: the sent note and the
// conversation), as the × and Esc do. Only a click: a press that moves past the drag threshold is a
// pan or a lasso, and the bubble stays and follows its card. A press on a note, a reply or the pin
// opens what it opens (notes.ts moves the open conversation there), so it is not "outside". Focus
// goes back to what the bubble opened from unless the click gave it to something else (a card, a
// button, the toolbar).
import { DRAG_THRESHOLD } from './pointer.ts';

/** Presses that open a bubble themselves (wiring.ts, region-notes.ts): never a click outside. */
const OPENS = '[data-note], .vb-node-reply[data-reply], .vb-nblock-text, .vb-nblock-reply';

/** `shown`: whether a read-only bubble is open now; `close(focus)`: close it, focus back when true.
 *  Returns the unbind. */
export function bindOutside(bubble: HTMLElement, stage: HTMLElement, shown: () => boolean, close: (focus: boolean) => void): () => void {
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    const t = e.target as Element;
    down = shown() && !bubble.contains(t) && !t.closest(OPENS) ? { x: e.clientX, y: e.clientY } : null;
  };
  const onUp = (e: PointerEvent) => {
    const at = down;
    down = null;
    if (!at || !shown() || Math.hypot(e.clientX - at.x, e.clientY - at.y) >= DRAG_THRESHOLD) return;
    const now = document.activeElement;
    close(!now || now === document.body || now === stage || bubble.contains(now));
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointerup', onUp, true);
  return () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('pointerup', onUp, true);
  };
}
