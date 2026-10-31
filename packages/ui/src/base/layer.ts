// The dismissable layer (browser side of layer-core.ts): one way for every menu, popover and tip to
// close on a press outside it and, when asked, on Esc. The page's document hears both first, in the
// capture phase, so a press on a card or the board's background closes the layer before it does its
// own thing. `dismissable` starts listening and returns the stop; a layer listens only while it is
// open. Nothing here touches the DOM at import, so the ui front door stays importable from Node.
import type { DismissReason, ScreenPoint } from './layer-core.ts';
import { isClick } from './layer-core.ts';

export interface DismissOptions {
  /** A press on this target never dismisses: the layer itself, its opener, or anything the caller
   * says opens a layer of its own. */
  within(target: Node): boolean;
  /** The layer should close: `escape` (only with `escape` on) or `outside`. */
  dismiss(reason: DismissReason): void;
  /** Esc dismisses; it is stopped and marked used there, so nothing else hears it. Given an element (the
   *  layer's own, or what holds it), only an Esc that is this board's (`escapeIsOurs`), so a host's own
   *  Esc stays the host's; `true` hears it anywhere on the page. */
  escape?: boolean | Element;
  /** Only a click outside dismisses: a press that travels this many px or more before it lifts (a pan
   * or a lasso) leaves the layer open. Without it, the press itself dismisses. */
  clickWithin?: number;
  /** Where to listen: the page's document unless a test passes its own. */
  doc?: EventTarget;
}

/** Capture phase, as an options object (a bare `true` is not matched on removal by every EventTarget). */
const CAPTURE = { capture: true } as const;

/** Whether an Esc at `target` belongs to the board that holds `at`: focus is in that board, or nowhere (the
 *  page's body, so a tip under the pointer still closes, WCAG 1.4.13). With focus in a host's own control
 *  or in another board, it is theirs. With no board round it (a gallery's sample), the page is its own. */
export function escapeIsOurs(at: Element, target: Node): boolean {
  const board = at.closest('.vb-board');
  return !board || board.contains(target) || target === at.ownerDocument.body || target === at.ownerDocument.documentElement;
}

/** Start listening for what dismisses a layer; returns the stop (call it when the layer closes). */
export function dismissable(o: DismissOptions): () => void {
  const doc = o.doc ?? document;
  let down: ScreenPoint | null = null;
  const outside = (e: Event) => !o.within(e.target as Node);
  const onDown = (e: Event) => {
    const p = e as PointerEvent;
    if (o.clickWithin === undefined) {
      if (outside(e)) o.dismiss('outside');
    } else down = outside(e) ? { x: p.clientX, y: p.clientY } : null;
  };
  const onUp = (e: Event) => {
    const p = e as PointerEvent;
    const at = down;
    down = null;
    if (at && isClick(at, { x: p.clientX, y: p.clientY }, o.clickWithin!)) o.dismiss('outside');
  };
  const onKey = (e: Event) => {
    if ((e as KeyboardEvent).key !== 'Escape') return;
    if (typeof o.escape === 'object' && !escapeIsOurs(o.escape, e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    o.dismiss('escape');
  };
  doc.addEventListener('pointerdown', onDown, CAPTURE);
  if (o.clickWithin !== undefined) doc.addEventListener('pointerup', onUp, CAPTURE);
  if (o.escape) doc.addEventListener('keydown', onKey, CAPTURE);
  return () => {
    doc.removeEventListener('pointerdown', onDown, CAPTURE);
    doc.removeEventListener('pointerup', onUp, CAPTURE);
    doc.removeEventListener('keydown', onKey, CAPTURE);
  };
}
