// Cards off screen stay cheap (N12_FE_01 ruling 5, performance.md approach 4). A card more than one
// screen outside the visible area gets `data-offscreen`, which board.css turns into
// `content-visibility: auto`: the browser skips drawing it, while it keeps its place in layout
// (its last measured size, as `contain-intrinsic-size`), its place in keyboard order and its
// accessible name. Content visibility clips what hangs off a card (the note pin, the size control),
// which is why only cards well off screen carry it: nothing on screen changes. Measuring a card
// takes the attribute off first (cards.ts), since a skipped card has no real size. App cards'
// frames (app-cards.ts) read the same bounds to load only on screen.
import type { BoardLayout, Box, Size } from '#layout';
import type { Viewport } from './viewport.ts';

/** How far past each edge of the stage a card still counts as on screen, in screens. */
const MARGIN = 1;

/** The part of the world the stage shows, grown by `margin` screens past each edge, in world px. */
export interface ViewBounds { x0: number; y0: number; x1: number; y1: number }

export function viewBounds(vp: Viewport, stage: HTMLElement, margin = MARGIN): ViewBounds {
  const w = stage.clientWidth / vp.k;
  const h = stage.clientHeight / vp.k;
  const x0 = -vp.x / vp.k - w * margin;
  const y0 = -vp.y / vp.k - h * margin;
  return { x0, y0, x1: x0 + w * (1 + 2 * margin), y1: y0 + h * (1 + 2 * margin) };
}

/** Whether box `b` lies wholly outside `v`. */
export const outside = (b: Box, v: ViewBounds): boolean => b.x + b.w < v.x0 || b.x > v.x1 || b.y + b.h < v.y0 || b.y > v.y1;

export function markOffscreen(
  cards: ReadonlyMap<string, HTMLElement>, layout: BoardLayout | null, sizes: ReadonlyMap<string, Size>,
  vp: Viewport, stage: HTMLElement,
): void {
  if (!layout) return;
  const v = viewBounds(vp, stage);
  for (const [id, el] of cards) {
    const b = layout.nodes.get(id);
    const s = sizes.get(id);
    const off = b !== undefined && s !== undefined && outside(b, v);
    if (off === el.hasAttribute('data-offscreen')) continue;
    if (off) {
      el.style.setProperty('contain-intrinsic-size', `${s!.w}px ${s!.h}px`);
      el.setAttribute('data-offscreen', '');
    } else {
      el.removeAttribute('data-offscreen');
      el.style.removeProperty('contain-intrinsic-size');
    }
  }
}
