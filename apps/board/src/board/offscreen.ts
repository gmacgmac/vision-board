// Cards off screen stay cheap (N12_FE_01 ruling 5, performance.md approach 4). A card more than one
// screen outside the visible area gets `data-offscreen`, which board.css turns into
// `content-visibility: auto`: the browser skips drawing it, while it keeps its place in layout
// (its last measured size, as `contain-intrinsic-size`), its place in keyboard order and its
// accessible name. Content visibility clips what hangs off a card (the note pin, the size control),
// which is why only cards well off screen carry it: nothing on screen changes. Measuring a card
// takes the attribute off first (cards.ts), since a skipped card has no real size.
import type { BoardLayout, Size } from '../../../../packages/layout/src/index.ts';
import type { Viewport } from './viewport.ts';

/** How far past each edge of the stage a card still counts as on screen, in screens. */
const MARGIN = 1;

export function markOffscreen(
  cards: ReadonlyMap<string, HTMLElement>, layout: BoardLayout | null, sizes: ReadonlyMap<string, Size>,
  vp: Viewport, stage: HTMLElement,
): void {
  if (!layout) return;
  const w = stage.clientWidth / vp.k;
  const h = stage.clientHeight / vp.k;
  const x0 = -vp.x / vp.k - w * MARGIN;
  const y0 = -vp.y / vp.k - h * MARGIN;
  const x1 = x0 + w * (1 + 2 * MARGIN);
  const y1 = y0 + h * (1 + 2 * MARGIN);
  for (const [id, el] of cards) {
    const b = layout.nodes.get(id);
    const s = sizes.get(id);
    const off = b !== undefined && s !== undefined && (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1);
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
