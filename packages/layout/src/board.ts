// The whole board: lay out each region in its mode, apply the person's pins, move unpinned cards
// out from under them (collide.ts), pack regions into rows, then route every link (including links
// across regions). Pure and deterministic. `layoutRegion` and `packRegions` are the two halves, so
// a page can keep a region's result until its inputs change (N12, performance.md approach 2);
// `layoutBoard` is exactly the two composed.
import type { Direction, Link, Mode, Region, View, ViewNode, Widths } from '#format';
import { widthsOf } from '#format';
import type { Align, Box, BoardLayout, ModeFn, ModeOutput, Point, RegionBox, RegionPiece, Size } from './types.ts';
import { COL_GAP, LANE_GUTTER, REGION_GAP, REGION_HEAD, REGION_PAD } from './types.ts';
import { column, grid, row } from './modes/grid.ts';
import { flow } from './modes/flow.ts';
import { lanes } from './modes/lanes/lanes.ts';
import { radial } from './modes/radial.ts';
import { boundsOf } from './geometry.ts';
import { applyPins, makeRoom } from './collide.ts';
import { placeContainers } from './place.ts';
import { routeLinks } from './route/route.ts';
import type { TimelineLayout } from './timeline.ts';
import { layoutTimeline, reachTimeline, shiftTimeline } from './timeline.ts';
import type { LayoutOptions } from './types.ts';

export const MODE_FNS: Record<Mode, ModeFn> = { grid, column, row, flow, lanes, radial };

const MIN_W = 280;
const EMPTY_H = 56;

/** What one region's layout reads besides its cards and links (LayoutOptions, for one region). */
export interface RegionOptions {
  mode?: Mode | undefined;
  pins?: Map<string, Point> | undefined;
  headInset?: number | undefined;
  /** The card widths in effect, for every node of the region, dated or not; absent: `widthsOf(mode, region.widths)`, with
   *  the timeline's default when the region has dated nodes. */
  widths?: Widths | undefined;
  align?: Align | undefined;
  /** The gap between a card and the card under it (LayoutOptions.rowGap); absent: GAP. */
  rowGap?: number | undefined;
  /** Which way the region runs if it is a `flow`, and its timeline whatever its mode (LayoutOptions.directions);
   *  absent: `across`. */
  direction?: Direction | undefined;
}

/** One region: `nodes` are its visible nodes in view order, `links` the links between them. Pins
 * for other regions' nodes are ignored. `headInset` (LayoutOptions.headInsets) adds room under the
 * top line: the frame is that much taller and the content starts that much lower; the mode's
 * answer does not change. Nodes with a date (D-105) go on the container's timeline (`timeline.ts`),
 * across its top or, run down, as its first column; the rest go through the mode, below it or to its
 * right, with the links among them only. A dated node's pin is ignored; the others' pins win, and
 * unpinned ones keep out of the timeline's box. With no dated node, exactly the layout without one.
 * The result is never changed afterwards. */
export function layoutRegion(
  region: Region, nodes: ViewNode[], links: Link[], sizes: Map<string, Size>, opts: RegionOptions = {},
): RegionPiece {
  const mode = opts.mode ?? region.mode;
  const direction = opts.direction ?? 'across';
  const dated = nodes.filter((n) => n.timeline !== undefined);
  // One setting for the whole container, its dated nodes and the rest (point 595; After FE_02 (a)).
  const widths = opts.widths ?? widthsOf(mode, region.widths, undefined, dated.length ? direction : undefined);
  const line = dated.length ? layoutTimeline(dated, sizes, direction, { widths, rowGap: opts.rowGap }) : undefined;
  const rest = line ? nodes.filter((n) => n.timeline === undefined) : nodes;
  const ids = new Set(rest.map((n) => n.id));
  const inner = line ? links.filter((l) => ids.has(l.from) && ids.has(l.to)) : links;
  const mine: ModeOutput = rest.length
    ? MODE_FNS[mode]({
      region: { ...region, mode }, nodes: rest, links: inner, sizes, align: opts.align ?? 'start', widths, rowGap: opts.rowGap,
      direction: opts.direction,
    })
    : { pos: new Map() };
  const out = line ? beside(mine, line) : mine;
  const pinned = applyPins(out.pos, opts.pins);
  const laneBoxes: Box[] = (out.lanes ?? []).map((l) => ({ x: l.x ?? 0, y: l.y, w: LANE_GUTTER, h: l.h }));
  makeRoom(out.pos, pinned, line ? [...laneBoxes, bandOf(line)] : laneBoxes);
  const drawn = line ? reachTimeline(line, rightOf([line.box, ...out.pos.values()])) : undefined;
  const all: ModeOutput = drawn ? { ...out, pos: new Map([...drawn.pos, ...out.pos]) } : out;
  const b = boundsOf([...all.pos.values(), ...laneBoxes, ...(drawn ? [drawn.box] : [])]);
  const w = Math.max(b.w, MIN_W) + REGION_PAD * 2;
  // Absent, 0, negative or not finite: no inset.
  const inset = opts.headInset ?? 0;
  const head = Number.isFinite(inset) && inset > 0 ? inset : 0;
  const h = (nodes.length ? b.h : EMPTY_H) + REGION_HEAD + head + REGION_PAD;
  return { region, mode, out: all, b, w, h, head, ...(drawn && { timeline: drawn.drawing }) };
}

/** The timeline's band, which a card moved out of a pin's way keeps out of (decision 15): across, its rows the whole
 * way right (the line runs on to the content's right edge); run down, its column the whole way down. */
const BAND = 1e6;
function bandOf({ box, drawing }: TimelineLayout): Box {
  return drawing.direction === 'down' ? { ...box, h: BAND } : { ...box, w: BAND };
}

/** The right edge of the box round `boxes`. */
function rightOf(boxes: Box[]): number {
  const b = boundsOf(boxes);
  return b.x + b.w;
}

/** The mode's answer moved clear of the timeline: below it by REGION_GAP across; run down, COL_GAP to its right, tops
 * level with the line's start (569C). Lane bands move with their cards. A new output; `out` is not changed. */
function beside(out: ModeOutput, line: TimelineLayout): ModeOutput {
  const { box } = line;
  const [dx, dy] = line.drawing.direction === 'down' ? [box.x + box.w + COL_GAP, line.drawing.line.from.y] : [0, box.y + box.h + REGION_GAP];
  const pos = new Map([...out.pos].map(([id, b]) => [id, { ...b, x: b.x + dx, y: b.y + dy }]));
  return { ...out, pos, ...(out.lanes && { lanes: out.lanes.map((l) => ({ ...l, y: l.y + dy, ...(dx && { x: dx }) })) }) };
}

/** Pack laid-out regions into rows (in order), put pinned containers at their `pins` (frame
 * top-left, board coordinates; place.ts), and route `links` between the placed nodes. Reads the
 * pieces only, so a container pin re-lays-out no container (N12). */
export function packRegions(
  pieces: readonly RegionPiece[], links: Link[],
  opts: { maxRowWidth?: number | undefined; pins?: Map<string, Point> | undefined } = {},
): BoardLayout {
  const maxRow = opts.maxRowWidth ?? 1600;
  const frames = new Map<string, Box>();
  let x = 0, y = 0, rowH = 0;
  for (const p of pieces) {
    if (x > 0 && x + p.w > maxRow) { x = 0; y += rowH + REGION_GAP; rowH = 0; }
    frames.set(p.region.id, { x, y, w: p.w, h: p.h });
    x += p.w + REGION_GAP;
    rowH = Math.max(rowH, p.h);
  }
  placeContainers(frames, opts.pins);
  const regions: RegionBox[] = [];
  const nodes = new Map<string, Box>();
  // Links inside a container route around its cards, except in radial (out of scope, PLAN.md).
  const groups = new Map<string, string>();
  const downward = new Set<string>();
  for (const p of pieces) {
    // Dated nodes route around as cards whatever the mode; in radial the rest stay out, as without a timeline.
    const grouped = p.mode !== 'radial' ? p.out.pos.keys() : (p.timeline?.dots ?? []).map((d) => d.id);
    for (const id of grouped) groups.set(id, p.region.id);
    if (p.out.down) downward.add(p.region.id);
    const box = frames.get(p.region.id)!;
    const origin = { x: box.x + REGION_PAD - p.b.x, y: box.y + REGION_HEAD + p.head - p.b.y };
    regions.push({
      id: p.region.id, title: p.region.title, mode: p.mode, box, origin,
      lanes: p.out.lanes?.map((l) => ({ ...l, y: origin.y + l.y, ...(l.x !== undefined && { x: origin.x + l.x }) })),
      ...(p.timeline && { timeline: shiftTimeline(p.timeline, origin) }),
    });
    for (const [id, at] of p.out.pos) nodes.set(id, { ...at, x: at.x + origin.x, y: at.y + origin.y });
  }
  const routes = routeLinks(links, nodes, groups, downward);
  return { regions, nodes, routes, bounds: boundsOf(regions.map((r) => r.box)), groups, downward };
}

export function layoutBoard(view: View, sizes: Map<string, Size>, opts: LayoutOptions = {}): BoardLayout {
  const hidden = opts.hidden ?? new Set<string>();
  const visible = view.nodes.filter((n) => !hidden.has(n.id));
  const pieces = view.regions.map((region) => {
    const nodes = visible.filter((n) => n.region === region.id);
    const ids = new Set(nodes.map((n) => n.id));
    const links = view.links.filter((l) => ids.has(l.from) && ids.has(l.to));
    return layoutRegion(region, nodes, links, sizes, {
      mode: opts.modes?.get(region.id), pins: opts.pins, headInset: opts.headInsets?.get(region.id),
      widths: opts.widths?.get(region.id), align: opts.align, rowGap: opts.rowGap,
      direction: opts.directions?.get(region.id),
    });
  });
  return packRegions(pieces, view.links, { maxRowWidth: opts.maxRowWidth, pins: opts.regionPins });
}
