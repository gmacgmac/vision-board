// A container's timeline (D-105; PLAN.md decisions 7-15, § Design review 587-595): its dated nodes on one line,
// in date order (`#format` `sortByTimeline`), each on its own dot joined by a stem, alternating sides. Across, one step
// for the whole line and the line across the top; run down, the line down the middle of the timeline's column, each dot
// as high as the board's gaps allow. Not to scale. Not a mode: `layoutRegion` runs it beside the container's mode.
// Pure: region-local from (0, 0), the same answer for the same input, the input never changed.
import type { Direction, Point, TimelineDot, TimelineDrawing, TimelineSide, ViewNode, Widths } from '#format';
import { boxBetween, sortByTimeline, timelineYear } from '#format';
import type { Box, Size } from './types.ts';
import { ROW_GAP } from './types.ts';
import { boundsOf } from './geometry.ts';

/** The stem from a dot to its node's facing edge, both forms (§ Design review 591). */
export const TIMELINE_STEM = 30;
/** The least clear space between two nodes on the same side of a line across (call 6; run 2's 28px). */
export const TIMELINE_SIDE_GAP = 28;
/** The least step between two dots across (DESIGN_01: 120px). */
export const TIMELINE_MIN_STEP = 120;
/** The least distance between two dots run down: a dot and a year label between them (§ Design review 587; DESIGN_01
 * run 2: 56px). */
export const TIMELINE_MIN_DOT = 56;
/** Across, room on the line before the first dot, for the year at its start (mono 11.5px, four figures, its 8px gap,
 * the dot's ring). Run down the first node starts at the top of the content (DESIGN_01 run 2). */
export const TIMELINE_YEAR_ROOM = 56;
/** The line past its last dot, for the arrow (DESIGN_01: 30px). */
export const TIMELINE_END_ROOM = 30;

/** The side of the `i`th dot (from 0): above, then below, alternating; run down, left, then right (point 594). */
export const timelineSide = (i: number, direction: Direction): TimelineSide =>
  direction === 'down' ? (i % 2 ? 'right' : 'left') : i % 2 ? 'below' : 'above';

/** The dated nodes in line order with their sides: what `show_layout` reports and the drawing's dots carry. */
export function timelineOrder<T extends ViewNode>(nodes: readonly T[], direction: Direction): { node: T; side: TimelineSide }[] {
  return sortByTimeline(nodes).map((node, i) => ({ node, side: timelineSide(i, direction) }));
}

/** One container's timeline, region-local: each dated node's box, the drawing, and the box round both. */
export interface TimelineLayout { pos: Map<string, Box>; drawing: TimelineDrawing; box: Box }

export interface TimelineOptions {
  /** The dated nodes' widths, the container's (`#format` `widthsOf`); `match`: every one as wide as the widest. Absent: `own`. */
  widths?: Widths | undefined;
  /** The gap under a node on the same side, run down (the board's row gap); absent: ROW_GAP. */
  rowGap?: number | undefined;
}

/** Where the boxes and dots go, before sides and labels: one per node in line order. */
interface Placed { boxes: Box[]; dots: Point[]; line: { from: Point; to: Point } }

/** Across: one step for the whole line (call 6), the least that keeps two nodes on the same side `TIMELINE_SIDE_GAP`
 * apart, taken over neighbours too so two or three nodes never crowd. */
export function timelineStep(widths: readonly number[]): number {
  let s = TIMELINE_MIN_STEP;
  for (let i = 0; i + 1 < widths.length; i++) {
    for (const j of [i + 1, i + 2]) {
      if (j < widths.length) s = Math.max(s, ((widths[i]! + widths[j]!) / 2 + TIMELINE_SIDE_GAP) / 2);
    }
  }
  return s;
}

/** Across: dots one step apart; a node above sits on its bottom edge, a node below hangs from its top edge, each a
 * stem from the line; the line from the content's left to its right edge, or the arrow's room past the last dot. */
function across(sizes: readonly Size[]): Placed {
  const s = timelineStep(sizes.map((z) => z.w));
  const x0 = Math.max(TIMELINE_YEAR_ROOM, ...sizes.map((z, i) => z.w / 2 - i * s));
  const y = Math.max(...sizes.filter((_, i) => i % 2 === 0).map((z) => z.h)) + TIMELINE_STEM;
  const dots = sizes.map((_, i) => ({ x: x0 + i * s, y }));
  const boxes = sizes.map((z, i) => ({ x: dots[i]!.x - z.w / 2, y: i % 2 ? y + TIMELINE_STEM : y - TIMELINE_STEM - z.h, ...z }));
  const end = Math.max(dots.at(-1)!.x + TIMELINE_END_ROOM, ...boxes.map((b) => b.x + b.w));
  return { boxes, dots, line: { from: { x: 0, y }, to: { x: end, y } } };
}

/** Run down (§ Design review 587, 594; DESIGN_01 run 2): the line one stem from the widest node on each side (the
 * exact middle under `match`); the first node at the top of the content, then each dot as high as keeps its node
 * `gap` (the board's row gap) below the last node on its side and `TIMELINE_MIN_DOT` below the dot before; the node
 * centred on its dot, so the stem meets the middle of its facing side. Nodes on opposite sides may share height. */
function down(sizes: readonly Size[], gap: number): Placed {
  const left = Math.max(0, ...sizes.filter((_, i) => i % 2 === 0).map((z) => z.w));
  const x = left + TIMELINE_STEM;
  const bottom = [-gap, -gap];
  const dots: Point[] = [];
  sizes.forEach((z, i) => {
    const before = i ? dots[i - 1]!.y + TIMELINE_MIN_DOT : 0;
    const y = Math.max(before, bottom[i % 2]! + gap + z.h / 2);
    bottom[i % 2] = y + z.h / 2;
    dots.push({ x, y });
  });
  const boxes = sizes.map((z, i) => ({ x: i % 2 ? x + TIMELINE_STEM : x - TIMELINE_STEM - z.w, y: dots[i]!.y - z.h / 2, ...z }));
  return { boxes, dots, line: { from: { x, y: 0 }, to: { x, y: dots.at(-1)!.y + TIMELINE_END_ROOM } } };
}

/** The stem's far end: the middle of the node's facing edge. */
function stemEnd(at: Point, side: TimelineSide): Point {
  const d = side === 'above' || side === 'left' ? -TIMELINE_STEM : TIMELINE_STEM;
  return side === 'above' || side === 'below' ? { x: at.x, y: at.y + d } : { x: at.x + d, y: at.y };
}

/** The year at the line's start (`at` is the line's start: the label begins there), and at each turn, halfway between
 * the two dots (`at` is the label's centre). */
function yearsOf(dates: readonly string[], dots: readonly Point[], from: Point): TimelineDrawing['years'] {
  const years = [{ year: timelineYear(dates[0]!), at: from }];
  for (let i = 1; i < dates.length; i++) {
    const year = timelineYear(dates[i]!);
    if (year !== timelineYear(dates[i - 1]!)) years.push({ year, at: { x: (dots[i - 1]!.x + dots[i]!.x) / 2, y: (dots[i - 1]!.y + dots[i]!.y) / 2 } });
  }
  return years;
}

/** A band from the first to the last dot of each run of two or more consecutive, exactly equal dates. */
function bandsOf(dates: readonly string[], dots: readonly Point[]): TimelineDrawing['bands'] {
  const bands: TimelineDrawing['bands'] = [];
  for (let i = 0, j = 0; i < dates.length; i = j) {
    for (j = i + 1; j < dates.length && dates[j] === dates[i]; j++);
    if (j - i > 1) bands.push({ from: dots[i]!, to: dots[j - 1]! });
  }
  return bands;
}

/** Lay out a container's dated nodes (each carries `timeline`) on its line, region-local from (0, 0). `sizes` are the
 * nodes' own; under `match` each is drawn as wide as the widest. */
export function layoutTimeline(
  nodes: readonly ViewNode[], sizes: Map<string, Size>, direction: Direction, opts: TimelineOptions = {},
): TimelineLayout {
  const order = timelineOrder(nodes, direction);
  const widest = Math.max(...order.map(({ node }) => sizes.get(node.id)!.w));
  const own = order.map(({ node }) => sizes.get(node.id)!);
  const drawn = opts.widths === 'match' ? own.map((z) => ({ w: widest, h: z.h })) : own.map((z) => ({ w: z.w, h: z.h }));
  const { boxes, dots, line } = direction === 'down' ? down(drawn, opts.rowGap ?? ROW_GAP) : across(drawn);
  const dates = order.map(({ node }) => node.timeline!);
  const drawing: TimelineDrawing = {
    direction,
    line,
    dots: order.map(({ node, side }, i): TimelineDot => ({ id: node.id, at: dots[i]!, side, stem: { from: dots[i]!, to: stemEnd(dots[i]!, side) } })),
    years: yearsOf(dates, dots, line.from),
    bands: bandsOf(dates, dots),
  };
  const pos = new Map(order.map(({ node }, i) => [node.id, boxes[i]!]));
  return { pos, drawing, box: boundsOf([...boxes, boxBetween(line.from, line.to)]) };
}

/** Across, the line runs on to `right` (the content's right edge, nodes below included) when that is further. */
export function reachTimeline(t: TimelineLayout, right: number): TimelineLayout {
  const { drawing: d } = t;
  if (d.direction === 'down' || right <= d.line.to.x) return t;
  const line = { from: d.line.from, to: { x: right, y: d.line.to.y } };
  return { ...t, drawing: { ...d, line }, box: boundsOf([t.box, boxBetween(line.from, line.to)]) };
}

/** A drawing moved by `by` (region-local to board coordinates, as `packRegions` does a lane). */
export function shiftTimeline(d: TimelineDrawing, by: Point): TimelineDrawing {
  const m = (p: Point): Point => ({ x: p.x + by.x, y: p.y + by.y });
  return {
    direction: d.direction,
    line: { from: m(d.line.from), to: m(d.line.to) },
    dots: d.dots.map((t) => ({ ...t, at: m(t.at), stem: { from: m(t.stem.from), to: m(t.stem.to) } })),
    years: d.years.map((y) => ({ ...y, at: m(y.at) })),
    bands: d.bands.map((b) => ({ from: m(b.from), to: m(b.to) })),
  };
}
