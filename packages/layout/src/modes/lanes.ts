import type { Region, ViewNode } from '../../../format/src/index.ts';
import type { Box, Lane, ModeFn } from '../types.ts';
import { GAP, LANE_GUTTER } from '../types.ts';
import { columnX, graphOf, layersOf } from '../layers.ts';

/** Lane names; a region without declared lanes (switched here by the person) lanes by kind. */
export function laneNames(region: Region, nodes: ViewNode[]): string[] {
  return region.lanes?.length ? region.lanes : [...new Set(nodes.map((n) => n.kind))];
}
const laneOf = (region: Region, n: ViewNode, names: string[]): string =>
  region.lanes?.length ? (names.includes(n.lane ?? '') ? n.lane! : names[0]!) : n.kind;

/** Several left-to-right flows on one shared column grid; each lane as tall as it needs. */
export const lanes: ModeFn = ({ region, nodes, links, sizes }) => {
  const names = laneNames(region, nodes);
  const layers = layersOf(nodes, graphOf(nodes, links));
  const xs = columnX(layers, sizes, LANE_GUTTER);
  const pos = new Map<string, Box>();
  const out: Lane[] = [];
  let y = 0;
  for (const name of names) {
    const inLane = nodes.filter((n) => laneOf(region, n, names) === name);
    const stackH = new Map<number, number>();
    for (const n of inLane) {
      const s = sizes.get(n.id)!;
      const l = layers.get(n.id)!;
      const at = stackH.get(l) ?? 0;
      pos.set(n.id, { x: xs[l]!, y: y + GAP / 2 + at, ...s });
      stackH.set(l, at + s.h + GAP);
    }
    // The lane's padding stays GAP / 2 above and below; only the stack's own steps grew to GAP.
    const h = Math.max(64, ...[...stackH.values()].map((v) => v - GAP / 2)) + GAP / 2;
    out.push({ name, y, h });
    y += h;
  }
  return { pos, lanes: out };
};
