// The whole board: lay out each region in its mode, apply the person's pins, move unpinned cards
// out from under them (collide.ts), pack regions into rows, then route every link (including links
// across regions). Pure and deterministic. `layoutRegion` and `packRegions` are the two halves, so
// a page can keep a region's result until its inputs change (N12, performance.md approach 2);
// `layoutBoard` is exactly the two composed.
import type { Link, Mode, Region, View, ViewNode, Widths } from '../../format/src/index.ts';
import { widthsOf } from '../../format/src/index.ts';
import type { Align, Box, BoardLayout, ModeFn, ModeOutput, Point, RegionBox, RegionPiece, Size } from './types.ts';
import { LANE_GUTTER, REGION_GAP, REGION_HEAD, REGION_PAD } from './types.ts';
import { column, grid, row } from './modes/grid.ts';
import { flow } from './modes/flow.ts';
import { lanes } from './modes/lanes/lanes.ts';
import { radial } from './modes/radial.ts';
import { boundsOf } from './geometry.ts';
import { applyPins, makeRoom } from './collide.ts';
import { placeContainers } from './place.ts';
import { routeLinks } from './route/route.ts';
import type { LayoutOptions } from './types.ts';

export const MODE_FNS: Record<Mode, ModeFn> = { grid, column, row, flow, lanes, radial };

const MIN_W = 280;
const EMPTY_H = 56;

/** What one region's layout reads besides its cards and links (LayoutOptions, for one region). */
export interface RegionOptions {
  mode?: Mode | undefined;
  pins?: Map<string, Point> | undefined;
  headInset?: number | undefined;
  /** The card widths in effect; absent: `widthsOf(mode, region.widths)`. */
  widths?: Widths | undefined;
  align?: Align | undefined;
}

/** One region: `nodes` are its visible nodes in view order, `links` the links between them. Pins
 * for other regions' nodes are ignored. `headInset` (LayoutOptions.headInsets) adds room under the
 * top line: the frame is that much taller and the content starts that much lower; the mode's
 * answer does not change. The result is never changed afterwards. */
export function layoutRegion(
  region: Region, nodes: ViewNode[], links: Link[], sizes: Map<string, Size>, opts: RegionOptions = {},
): RegionPiece {
  const mode = opts.mode ?? region.mode;
  const widths = opts.widths ?? widthsOf(mode, region.widths);
  const out: ModeOutput = nodes.length
    ? MODE_FNS[mode]({ region: { ...region, mode }, nodes, links, sizes, align: opts.align ?? 'start', widths })
    : { pos: new Map() };
  const pinned = applyPins(out.pos, opts.pins);
  const laneBoxes: Box[] = (out.lanes ?? []).map((l) => ({ x: 0, y: l.y, w: LANE_GUTTER, h: l.h }));
  makeRoom(out.pos, pinned, laneBoxes);
  const b = boundsOf([...out.pos.values(), ...laneBoxes]);
  const w = Math.max(b.w, MIN_W) + REGION_PAD * 2;
  // Absent, 0, negative or not finite: no inset.
  const inset = opts.headInset ?? 0;
  const head = Number.isFinite(inset) && inset > 0 ? inset : 0;
  const h = (nodes.length ? b.h : EMPTY_H) + REGION_HEAD + head + REGION_PAD;
  return { region, mode, out, b, w, h, head };
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
  for (const p of pieces) {
    if (p.mode !== 'radial') for (const id of p.out.pos.keys()) groups.set(id, p.region.id);
    const box = frames.get(p.region.id)!;
    const origin = { x: box.x + REGION_PAD - p.b.x, y: box.y + REGION_HEAD + p.head - p.b.y };
    regions.push({
      id: p.region.id, title: p.region.title, mode: p.mode, box, origin,
      lanes: p.out.lanes?.map((l) => ({ ...l, y: origin.y + l.y })),
    });
    for (const [id, at] of p.out.pos) nodes.set(id, { ...at, x: at.x + origin.x, y: at.y + origin.y });
  }
  const routes = routeLinks(links, nodes, groups);
  return { regions, nodes, routes, bounds: boundsOf(regions.map((r) => r.box)), groups };
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
      widths: opts.widths?.get(region.id), align: opts.align,
    });
  });
  return packRegions(pieces, view.links, { maxRowWidth: opts.maxRowWidth, pins: opts.regionPins });
}
