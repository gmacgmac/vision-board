// Selection bar pattern, layer 1 (core): where the bar sits over a selection, what it says, and
// the lasso's box. No DOM, so it is unit-tested under plain Node. Architect `updateSelbar` and
// `.selbar` (architect-extract README §2 point 9), 3_FE_02 rulings 1-2: a glass bar centred above
// the selection's screen box, below it when there is no room above, kept inside the stage; it
// draws above the cards and moves nothing.
import type { StageBox, StageSize } from '../note-bubble/note-bubble-core.ts';

/** Space between the selection and the bar (Architect: 12px); how close it may come to the edge. */
export const BAR_GAP = 12;
export const BAR_EDGE = 8;

export type BarSide = 'above' | 'below';
export interface BarPlacement { side: BarSide; x: number; y: number }

/** `v` within [lo, hi]; `lo` when the range is empty. */
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** How far a card's top tabs (number, kind, moved-by-you, size) rise above its box, in world
 *  pixels: node.css sets them at `top: -11px` inside the card's 1px border. */
export const TAB_RISE = 10;
/** The clear space between the bar's bottom and the tabs, in screen pixels: TAB_CLEAR_PER_K per
 *  unit of zoom, never under TAB_CLEAR_MIN (zoomed out) nor over TAB_CLEAR_MAX (zoomed in). */
export const TAB_CLEAR_MIN = 4;
export const TAB_CLEAR_MAX = 16;
export const TAB_CLEAR_PER_K = 8;

/** The bar over a selection of cards at zoom `k` (page-polish ruling C): the space from the
 *  selection's top edge to the bar's bottom, in screen pixels. The bar does not scale with zoom
 *  but the cards' tabs do, so it is the tabs' rise at this zoom plus a clear space that grows
 *  with zoom between its minimum and maximum: the bar never covers the tabs, and a press near
 *  them grabs the card, not the bar. */
export function pillGap(k: number): number {
  return TAB_RISE * k + clamp(TAB_CLEAR_PER_K * k, TAB_CLEAR_MIN, TAB_CLEAR_MAX);
}

/** The bar centred on `box` (the selection on the stage), `gap` above it (BAR_GAP, or `pillGap`
 *  over cards), else BAR_GAP below it. */
export function placeBar(box: StageBox, bar: StageSize, stage: StageSize, gap = BAR_GAP): BarPlacement {
  const x = clamp(box.x + box.w / 2 - bar.w / 2, BAR_EDGE, stage.w - BAR_EDGE - bar.w);
  const above = box.y - gap - bar.h;
  if (above >= BAR_EDGE) return { side: 'above', x, y: above };
  return { side: 'below', x, y: clamp(box.y + box.h + BAR_GAP, BAR_EDGE, stage.h - BAR_EDGE - bar.h) };
}

/** One button: `id` is what the `vb-command` event names; the page's command table supplies it. */
/** `title`: the whole meaning of a short `label` and its key, the tooltip and the accessible name. */
export interface BarButton { id: string; label: string; title?: string; primary?: boolean; disabled?: boolean }

/** What the bar says: `name` is its accessible name, `count` the words before the buttons (empty
 *  for the area bar, which only offers to zoom). `pill` (the selectionPill flag, stage5-follow-ups
 *  FE_02): the compact bar, whose count is a pill that shows the buttons only while `open`. */
export interface BarView { name: string; count: string; buttons: BarButton[]; pill?: true; open?: boolean }

export const selectedCount = (n: number): string => `${n} selected`;

/** The bar over a selection of `n` cards, or over an area a lasso drew round no card; with `pill`,
 *  the compact bar, its pill open or closed (the area bar has no pill: it is always open). */
export function barView(n: number, buttons: BarButton[], pill?: { open: boolean }): BarView {
  if (n === 0) return { name: 'Area', count: '', buttons, ...(pill && { pill: true }) };
  return { name: `Selection: ${selectedCount(n)}`, count: selectedCount(n), buttons, ...(pill && { pill: true, open: pill.open }) };
}

/** The box two corners of a drag span, in any order. */
export function boxBetween(a: { x: number; y: number }, b: { x: number; y: number }): StageBox {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Whether two boxes overlap or touch (a lasso "touches" a card). */
export const touches = (a: StageBox, b: StageBox): boolean =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

/** The box round several boxes; undefined for none. */
export function boxAround(boxes: readonly StageBox[]): StageBox | undefined {
  if (!boxes.length) return undefined;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}
