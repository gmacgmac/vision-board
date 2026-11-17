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

/** The room between a node and a box beside it, and how near a corner its arrow may come. */
export const BOX_GAP = 12;
const ARROW_CORNER = 16;

/** Where a box beside a node goes, and where its arrow meets the box's edge (`arrow`: down the left edge on the right,
 *  along the top edge below, along the bottom edge above), in stage pixels. */
export interface BoxPlace { side: 'right' | 'below' | 'above'; x: number; y: number; arrow: number }

/**
 * One place for every box that opens beside a node, the conversation, the proposal and the history box (the
 * maintainer's ruling, FE_03 run 2): its top level with the node's top, to the node's right when the stage has room,
 * else below the node with their left edges aligned; never over the node. Its arrow points at `mark`, what opened it
 * (the node itself when none). It stays on the stage (FIX_01, VERIFY_01 finding 7): on the right, a box that would run
 * past the stage's bottom (or top) moves up (or down) just enough, top aligned whenever it fits; below, one that would
 * run past the bottom opens above the node instead, and only when neither fits is it kept inside the stage. Pure.
 */
export function placeBeside(node: StageBox, size: { w: number; h: number }, stage: { w: number; h: number }, mark: StageBox = node): BoxPlace {
  const right = node.x + node.w + BOX_GAP;
  const inside = (y: number) => clamp(y, STAGE_EDGE, stage.h - size.h - STAGE_EDGE);
  if (right + size.w <= stage.w - STAGE_EDGE) {
    const y = inside(node.y);
    return { side: 'right', x: Math.round(right), y, arrow: clamp(mark.y + mark.h / 2 - y, ARROW_CORNER, size.h - ARROW_CORNER) };
  }
  const x = clamp(node.x, STAGE_EDGE, stage.w - size.w - STAGE_EDGE);
  const arrow = clamp(mark.x + mark.w / 2 - x, ARROW_CORNER, size.w - ARROW_CORNER);
  const below = node.y + node.h + BOX_GAP;
  const above = node.y - BOX_GAP - size.h;
  if (below + size.h > stage.h - STAGE_EDGE && above >= STAGE_EDGE) return { side: 'above', x, y: Math.round(above), arrow };
  return { side: 'below', x, y: below + size.h > stage.h - STAGE_EDGE ? inside(below) : Math.round(below), arrow };
}

/** A node's box for `placeBeside`, on the stage: its top and left as its border's, its right and bottom reaching past
 *  the marks that hang off those edges (the disc, the badge, the notes mark), so a box beside it never covers one. */
export function nodeReach(card: Element, stage: HTMLElement): StageBox {
  const b = stageBoxOf(card, stage);
  let [r, d] = [b.x + b.w, b.y + b.h];
  for (const m of card.querySelectorAll('[data-mark]')) {
    const at = stageBoxOf(m, stage);
    if (at.w) [r, d] = [Math.max(r, at.x + at.w), Math.max(d, at.y + at.h)];
  }
  return { x: b.x, y: b.y, w: r - b.x, h: d - b.y };
}
