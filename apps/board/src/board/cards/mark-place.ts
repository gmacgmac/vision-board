// Where a node's menu, picker or tip goes on the stage (nodeEdges flag, D-101): in stage pixels, outside the scaled
// board, so it keeps one size at any zoom; placed again from its anchor whenever the view moves, so it stays attached.
// The answer picker opens to the right of the disc, never on it (DD-07), the number's menu under the number, the
// right-click list at the pointer, a tip above its mark. Each flips to the other side when the stage has no room, and
// is kept inside the stage. Pure.
import type { StageBox } from '#ui';

/** Where it goes against its anchor: `right` of it (the picker), `below` it (the number's menu), at its top left
 *  (`point`: the pointer, the right-click list), or `above` it (a tip). */
export type MarkSide = 'right' | 'below' | 'point' | 'above';

/** The room between an anchor and what opens beside it, and between that and the stage's edge. */
export const MARK_GAP = 6;
export const STAGE_EDGE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(v, Math.max(lo, hi))));

/** The top left, in stage pixels, of a box of `size` opened on `side` of `anchor`, on a stage of `stage`'s size. */
export function placeMark(anchor: StageBox, size: { w: number; h: number }, stage: { w: number; h: number }, side: MarkSide): { x: number; y: number } {
  const g = MARK_GAP;
  let x: number;
  let y: number;
  if (side === 'right') {
    x = anchor.x + anchor.w + g;
    if (x + size.w > stage.w - STAGE_EDGE) x = anchor.x - g - size.w;
    y = anchor.y + anchor.h / 2 - size.h / 2;
  } else if (side === 'below' || side === 'point') {
    const top = side === 'point' ? anchor.y : anchor.y + anchor.h + g;
    y = top + size.h > stage.h - STAGE_EDGE ? (side === 'point' ? anchor.y : anchor.y - g) - size.h : top;
    x = side === 'point' && anchor.x + size.w > stage.w - STAGE_EDGE ? anchor.x - size.w : anchor.x;
  } else {
    x = anchor.x + anchor.w / 2 - size.w / 2;
    y = anchor.y - g - size.h;
    if (y < STAGE_EDGE) y = anchor.y + anchor.h + g;
  }
  return { x: clamp(x, STAGE_EDGE, stage.w - size.w - STAGE_EDGE), y: clamp(y, STAGE_EDGE, stage.h - size.h - STAGE_EDGE) };
}

/** `el`'s box in the stage's pixels. */
export function stageBoxOf(el: Element, stage: HTMLElement): StageBox {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
}

/** Write a placed box's top left (CSSOM: the page's CSP refuses inline styles). */
export function moveTo(el: HTMLElement, at: { x: number; y: number }): void {
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
}
