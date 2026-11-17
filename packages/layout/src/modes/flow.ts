import type { Box, Cell, ModeFn, ModeInput, ModeOutput } from '../types.ts';
import { GAP } from '../types.ts';
import type { Graph } from '../layers.ts';
import { columnX, graphOf, layersOf, matched, mean, place } from '../layers.ts';
import { normalise } from '../geometry.ts';
import { branchRows } from './branches.ts';
import { crossingLines } from '../route/crossings.ts';
import { routeLines } from '../route/route.ts';

/** Left to right with branches, or with `direction: 'down'` top to bottom (flowDirection flag). Across: layered,
 *  then three barycentre sweeps to cut crossings; with `branching` (flowBranches flag), each branch of a fork on
 *  its own row instead (branches.ts), unless its links, routed, would cross more than stacked: then stacked. Cards
 *  line up by their tops (align `start`, ruling 4) or their centres. */
export const flow: ModeFn = (input) => (input.direction === 'down' ? down(input) : across(input));

/** `turned`: the cards are a flow down turned a quarter (down), so arrangements are weighed turned back. */
function across({ nodes, links, sizes: own, align, widths, rowGap = GAP, branching }: ModeInput, turned = false): ModeOutput {
  const g = graphOf(nodes, links);
  const layers = layersOf(nodes, g);
  const sizes = matched(layers, own, widths);
  const h = (id: string) => sizes.get(id)!.h;
  // The anchor: the point that lines up across a row, f of the way down a card.
  const f = align === 'center' ? 0.5 : 0;
  const cols: string[][] = [];
  for (const n of nodes) (cols[layers.get(n.id)!] ??= []).push(n.id);
  const xs = columnX(layers, sizes);
  const at = (ay: Map<string, number>) => {
    const pos = new Map<string, Box>();
    for (const n of nodes) {
      const s = sizes.get(n.id)!;
      pos.set(n.id, { x: xs[layers.get(n.id)!]!, y: ay.get(n.id)! - s.h * f, ...s });
    }
    return pos;
  };
  let rows = branching ? branchRows(nodes, g, layers) : undefined;
  let pos = at(rows ? onRows(rows, h, rowGap, f) : swept(cols, g, h, rowGap, f));
  // Rows are kept unless the links cross more on them than stacked by their links' average.
  if (rows && links.length > 1) {
    const count = links.length <= ROUTE_WEIGH ? (l: ModeInput['links'], p: Map<string, Box>) => crossed(l, p, turned) : straight;
    const mine = count(links, pos);
    const other = mine > 0 ? at(swept(cols, g, h, rowGap, f)) : undefined;
    if (other && count(links, other) < mine) [pos, rows] = [other, undefined];
  }
  // A card's cell: its column, and its branch's row (an empty row in a column counts) or its place in the column.
  const cells = new Map<string, Cell>();
  cols.forEach((col, c) => [...col].sort((a, b) => pos.get(a)!.y - pos.get(b)!.y)
    .forEach((id, r) => cells.set(id, { column: c + 1, row: (rows ? rows.get(id)! : r) + 1 })));
  return { pos: normalise(pos), cells };
}

/** Up to this many links in a container, its two arrangements are weighed by routing them as the board does; above
 *  it, by straight strokes, so a dense container stays inside the layout's time budget (performance.md, the
 *  1,200-link timing test). A flow an agent draws has far fewer. */
const ROUTE_WEIGH = 30;

/** How many pairs of links cross, each a straight stroke from the middle of its source's right side to the middle
 *  of its target's left side (strokes that only meet at an end don't). */
function straight(links: ModeInput['links'], pos: Map<string, Box>): number {
  const all = links.flatMap((l) => {
    const [a, b] = [pos.get(l.from), pos.get(l.to)];
    return a && b && l.from !== l.to ? [[a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2] as const] : [];
  });
  type S = (typeof all)[number];
  const side = (s: S, px: number, py: number) => Math.sign((s[2] - s[0]) * (py - s[1]) - (s[3] - s[1]) * (px - s[0]));
  let n = 0;
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i]!, all[j]!];
      if (side(a, b[0], b[1]) * side(a, b[2], b[3]) < 0 && side(b, a[0], a[1]) * side(b, a[2], a[3]) < 0) n++;
    }
  return n;
}

/** How many of the links cross another, routed as the board routes them (one container); `turned`: turned back
 *  first and routed as a flow running down. */
function crossed(links: ModeInput['links'], pos: Map<string, Box>, turned: boolean): number {
  const boxes = turned ? new Map([...pos].map(([id, b]) => [id, { x: b.y, y: b.x, w: b.h, h: b.w }])) : pos;
  const groups = new Map([...boxes.keys()].map((id) => [id, '']));
  return crossingLines(routeLines(links, boxes, groups, turned ? new Set(['']) : undefined).map((r) => r.pts));
}

/** Each card's anchor on its branch's row (branches.ts): rows as tall as their tallest card, `gap` apart. */
function onRows(rows: Map<string, number>, h: (id: string) => number, gap: number, f: number): Map<string, number> {
  const tall: number[] = [];
  for (const [id, r] of rows) tall[r] = Math.max(tall[r] ?? 0, h(id));
  const tops: number[] = [];
  tall.reduce((y, t, r) => { tops[r] = y; return y + t + gap; }, 0);
  return new Map([...rows].map(([id, r]) => [id, tops[r]! + tall[r]! * f]));
}

/** Each card's anchor stacked in its column, then three barycentre sweeps towards its links' other ends. */
function swept(cols: string[][], g: Graph, h: (id: string) => number, gap: number, f: number): Map<string, number> {
  const ay = new Map<string, number>();
  for (const col of cols) {
    let y = 0;
    for (const id of col) { ay.set(id, y + h(id) * f); y += h(id) + gap; }
  }
  const sweep = (towards: 'preds' | 'succs', order: string[][]) => {
    for (const col of order) {
      const want = (id: string) =>
        mean((g[towards].get(id) ?? []).map((o) => ay.get(o)!)) ?? ay.get(id)!;
      for (const [id, top] of place(col, want, h, gap, f)) ay.set(id, top + h(id) * f);
    }
  };
  sweep('preds', cols);
  sweep('succs', [...cols].reverse());
  sweep('preds', cols);
  return ay;
}

/** Top to bottom: the same flow across on cards turned a quarter, turned back. Each layer is a row, `COL_GAP`
 *  below the one before; cards in a layer stand side by side `GAP` apart, lefts lined up (or centres). Under
 *  `match` every card takes the widest card's width, as in a column. Cells read as drawn: column left to right,
 *  row top to bottom. */
function down(input: ModeInput): ModeOutput {
  const { nodes, sizes } = input;
  const widest = input.widths === 'match' ? Math.max(0, ...nodes.map((n) => sizes.get(n.id)!.w)) : undefined;
  const turned = new Map(nodes.map((n) => { const s = sizes.get(n.id)!; return [n.id, { w: s.h, h: widest ?? s.w }]; }));
  const out = across({ ...input, sizes: turned, widths: 'own', rowGap: GAP }, true);
  const pos = new Map<string, Box>();
  for (const [id, b] of out.pos) pos.set(id, { x: b.y, y: b.x, w: b.h, h: b.w });
  const cells = new Map<string, Cell>();
  for (const [id, c] of out.cells!) cells.set(id, { column: c.row, row: c.column });
  return { pos, cells, down: true };
}
