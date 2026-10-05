// The whole board: lay out each region in its mode, apply the person's pins, move unpinned cards
// out from under them (collide.ts), pack regions into rows, then route every link (including links
// across regions). Pure and deterministic.
import type { Mode, View } from '../../format/src/index.ts';
import type { BoardLayout, Box, ModeFn, ModeOutput, RegionBox, Size } from './types.ts';
import { LANE_GUTTER, REGION_GAP, REGION_HEAD, REGION_PAD } from './types.ts';
import { grid, list } from './modes/grid.ts';
import { flow } from './modes/flow.ts';
import { lanes } from './modes/lanes.ts';
import { radial } from './modes/radial.ts';
import { boundsOf } from './geometry.ts';
import { applyPins, makeRoom } from './collide.ts';
import { routeLinks } from './route.ts';
import type { LayoutOptions } from './types.ts';

export const MODE_FNS: Record<Mode, ModeFn> = { grid, list, flow, lanes, radial };

const MIN_W = 280;
const EMPTY_H = 56;

export function layoutBoard(view: View, sizes: Map<string, Size>, opts: LayoutOptions = {}): BoardLayout {
  const hidden = opts.hidden ?? new Set<string>();
  const visible = view.nodes.filter((n) => !hidden.has(n.id));

  const pieces = view.regions.map((region) => {
    const mode = opts.modes?.get(region.id) ?? region.mode;
    const nodes = visible.filter((n) => n.region === region.id);
    const ids = new Set(nodes.map((n) => n.id));
    const links = view.links.filter((l) => ids.has(l.from) && ids.has(l.to));
    const out: ModeOutput = nodes.length
      ? MODE_FNS[mode]({ region: { ...region, mode }, nodes, links, sizes })
      : { pos: new Map() };
    const pinned = applyPins(out.pos, opts.pins);
    const laneBoxes: Box[] = (out.lanes ?? []).map((l) => ({ x: 0, y: l.y, w: LANE_GUTTER, h: l.h }));
    makeRoom(out.pos, pinned, laneBoxes);
    const b = boundsOf([...out.pos.values(), ...laneBoxes]);
    const w = Math.max(b.w, MIN_W) + REGION_PAD * 2;
    const h = (nodes.length ? b.h : EMPTY_H) + REGION_HEAD + REGION_PAD;
    return { region, mode, out, b, w, h };
  });

  const maxRow = opts.maxRowWidth ?? 1600;
  const regions: RegionBox[] = [];
  const nodes = new Map<string, Box>();
  let x = 0, y = 0, rowH = 0;
  for (const p of pieces) {
    if (x > 0 && x + p.w > maxRow) { x = 0; y += rowH + REGION_GAP; rowH = 0; }
    const origin = { x: x + REGION_PAD - p.b.x, y: y + REGION_HEAD - p.b.y };
    regions.push({
      id: p.region.id, title: p.region.title, mode: p.mode,
      box: { x, y, w: p.w, h: p.h }, origin,
      lanes: p.out.lanes?.map((l) => ({ ...l, y: origin.y + l.y })),
    });
    for (const [id, at] of p.out.pos) nodes.set(id, { ...at, x: at.x + origin.x, y: at.y + origin.y });
    x += p.w + REGION_GAP;
    rowH = Math.max(rowH, p.h);
  }

  const routes = routeLinks(view.links, nodes);
  return { regions, nodes, routes, bounds: boundsOf(regions.map((r) => r.box)) };
}
