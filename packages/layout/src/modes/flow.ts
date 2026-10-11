import type { Box, Cell, ModeFn } from '../types.ts';
import { GAP } from '../types.ts';
import { columnX, graphOf, layersOf, matched, mean, place } from '../layers.ts';
import { normalise } from '../geometry.ts';

/** Left to right with branches: layered, then three barycentre sweeps to cut crossings. Cards line
 *  up by their tops (align `start`, ruling 4) or their centres (`center`). */
export const flow: ModeFn = ({ nodes, links, sizes: own, align, widths }) => {
  const g = graphOf(nodes, links);
  const layers = layersOf(nodes, g);
  const sizes = matched(layers, own, widths);
  const cols: string[][] = [];
  for (const n of nodes) (cols[layers.get(n.id)!] ??= []).push(n.id);
  const h = (id: string) => sizes.get(id)!.h;
  // The anchor: the point that lines up across a row, f of the way down a card.
  const f = align === 'center' ? 0.5 : 0;

  const ay = new Map<string, number>();
  for (const col of cols) {
    let y = 0;
    for (const id of col) { ay.set(id, y + h(id) * f); y += h(id) + GAP; }
  }
  const sweep = (towards: 'preds' | 'succs', order: string[][]) => {
    for (const col of order) {
      const want = (id: string) =>
        mean((g[towards].get(id) ?? []).map((o) => ay.get(o)!)) ?? ay.get(id)!;
      for (const [id, top] of place(col, want, h, GAP, f)) ay.set(id, top + h(id) * f);
    }
  };
  sweep('preds', cols);
  sweep('succs', [...cols].reverse());
  sweep('preds', cols);

  const xs = columnX(layers, sizes);
  const pos = new Map<string, Box>();
  for (const n of nodes) {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x: xs[layers.get(n.id)!]!, y: ay.get(n.id)! - s.h * f, ...s });
  }
  const cells = new Map<string, Cell>();
  cols.forEach((col, c) => [...col].sort((a, b) => pos.get(a)!.y - pos.get(b)!.y)
    .forEach((id, r) => cells.set(id, { column: c + 1, row: r + 1 })));
  return { pos: normalise(pos), cells };
};
