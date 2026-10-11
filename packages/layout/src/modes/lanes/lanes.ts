// The `lanes` mode (field-report batch 3 ruling 1): several left-to-right flows, one per lane, on
// one column grid. Columns come from `laneColumns` (each lane packed left), the order inside each
// lane's column from `orderStacks`, then `untangle`; each lane is as tall as its tallest stack, with LANE_PAD above
// and below so the gutters between lanes carry connectors (ruling 2). Cards in a stack line up at
// the lane's top (align `start`) or are centred in the lane (`center`); under `match` every card
// takes its column's widest width.
import type { Region, ViewNode } from '../../../../format/src/index.ts';
import type { Box, Cell, Lane, ModeFn } from '../../types.ts';
import { GAP, LANE_GUTTER, LANE_PAD } from '../../types.ts';
import { columnX, matched } from '../../layers.ts';
import { laneColumns } from './columns.ts';
import { orderStacks } from './order.ts';
import { untangle } from './untangle.ts';

/** The height of an empty lane. */
const MIN_LANE = 64;

/** Lane names; a region without declared lanes (switched here by the person) lanes by kind. */
export function laneNames(region: Region, nodes: ViewNode[]): string[] {
  return region.lanes?.length ? region.lanes : [...new Set(nodes.map((n) => n.kind))];
}
const laneOf = (region: Region, n: ViewNode, names: string[]): string =>
  region.lanes?.length ? (names.includes(n.lane ?? '') ? n.lane! : names[0]!) : n.kind;

export const lanes: ModeFn = ({ region, nodes, links, sizes: own, align, widths }) => {
  const names = laneNames(region, nodes);
  const lane = new Map(nodes.map((n) => [n.id, names.indexOf(laneOf(region, n, names))]));
  const { cols, dag } = laneColumns(nodes, links, lane, names.length);
  const sizes = matched(cols, own, widths);
  const h = (id: string) => sizes.get(id)!.h;

  const stacks: string[][][] = names.map(() => []);
  for (const n of nodes) (stacks[lane.get(n.id)!]![cols.get(n.id)!] ??= []).push(n.id);
  const stackH = (stack: string[] | undefined) =>
    stack?.length ? stack.reduce((s, id) => s + h(id), 0) + (stack.length - 1) * GAP : 0;
  // reduce skips the columns a lane leaves empty (holes in its array).
  const inner = stacks.map((cs) => cs.reduce((m, s) => Math.max(m, stackH(s)), 0));
  const out: Lane[] = [];
  let y = 0;
  names.forEach((name, i) => {
    const hl = Math.max(MIN_LANE, inner[i]! + 2 * LANE_PAD);
    out.push({ name, y, h: hl });
    y += hl;
  });
  orderStacks(stacks, out.map((l) => l.y + LANE_PAD), h, dag);

  const xs = columnX(cols, sizes, LANE_GUTTER);
  const cells = new Map<string, Cell>();
  /** The cards placed for the stacks' order now. */
  const draw = () => {
    const pos = new Map<string, Box>();
    stacks.forEach((cs, l) => cs.forEach((stack, c) => {
      let at = out[l]!.y + LANE_PAD + (align === 'center' ? (inner[l]! - stackH(stack)) / 2 : 0);
      stack.forEach((id, r) => {
        pos.set(id, { x: xs[c]!, y: at, ...sizes.get(id)! });
        cells.set(id, { column: c + 1, row: r + 1, lane: names[l]! });
        at += h(id) + GAP;
      });
    }));
    return pos;
  };
  untangle(stacks, draw, links);
  return { pos: draw(), lanes: out, cells };
};
