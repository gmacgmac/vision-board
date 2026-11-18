// Box geometry, once (D-016: format is the layer both `layout` and `ui` may use). A box is where
// something sits, in whatever pixels the caller works in; these answer where boxes meet, what
// surrounds them and how far a value may go. Pure.
import type { Direction } from './view.ts';

export interface Size { w: number; h: number }
export interface Point { x: number; y: number }
export interface Box extends Point, Size {}

/** Where a dated node sits beside its container's timeline (D-105 3): above or below a line that runs across, beside
 * (to its right) a line that runs down. */
export type TimelineSide = 'above' | 'below' | 'beside';

/** One dated node on the line: its dot, its side, and the stem from the dot to the node. */
export interface TimelineDot { id: string; at: Point; side: TimelineSide; stem: { from: Point; to: Point } }

/** A container's timeline as drawn (D-105): region-local in a RegionPiece, board coordinates in a RegionBox. The one
 * shape the layout returns and the page draws. */
export interface TimelineDrawing {
  direction: Direction;
  /** The line; its arrow is at `to`. */
  line: { from: Point; to: Point };
  /** One per dated node, in line order. */
  dots: TimelineDot[];
  /** The year at the line's start, and at each turn of the year between two dots. */
  years: { year: string; at: Point }[];
  /** Behind each run of consecutive dots whose dates are exactly equal. */
  bands: { from: Point; to: Point }[];
}

/** `v` within [lo, hi]; `lo` when the range is empty (a box bigger than its stage). */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Whether two boxes share any area, with `gap` of clear space needed between them: boxes that only
 * touch do not overlap at `gap` 0. */
export const overlaps = (a: Box, b: Box, gap = 0): boolean =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Whether two boxes overlap or touch (a lasso "touches" a card). */
export const touches = (a: Box, b: Box): boolean =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

/** The box round `boxes`: the zero box for none. */
export function boundsOf(boxes: Iterable<Box>): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The box round several boxes; undefined for none. */
export const boxAround = (boxes: readonly Box[]): Box | undefined => (boxes.length ? boundsOf(boxes) : undefined);

/** The box two corners span, in any order. */
export function boxBetween(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}
