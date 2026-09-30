import type { Box, ModeFn } from '../types.ts';
import { GAP } from '../types.ts';
import { columnX, graphOf, layersOf, mean, place } from '../layers.ts';
import { normalise } from '../geometry.ts';

/** Left to right with branches: layered, then three barycentre sweeps to cut crossings. */
export const flow: ModeFn = ({ nodes, links, sizes }) => {
  const g = graphOf(nodes, links);
  const layers = layersOf(nodes, g);
  const cols: string[][] = [];
  for (const n of nodes) (cols[layers.get(n.id)!] ??= []).push(n.id);
  const h = (id: string) => sizes.get(id)!.h;

  const cy = new Map<string, number>();
  for (const col of cols) {
    let y = 0;
    for (const id of col) { cy.set(id, y + h(id) / 2); y += h(id) + GAP; }
  }
  const sweep = (towards: 'preds' | 'succs', order: string[][]) => {
    for (const col of order) {
      const want = (id: string) =>
        mean((g[towards].get(id) ?? []).map((o) => cy.get(o)!)) ?? cy.get(id)!;
      for (const [id, top] of place(col, want, h, GAP)) cy.set(id, top + h(id) / 2);
    }
  };
  sweep('preds', cols);
  sweep('succs', [...cols].reverse());
  sweep('preds', cols);

  const xs = columnX(layers, sizes);
  const pos = new Map<string, Box>();
  for (const n of nodes) {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x: xs[layers.get(n.id)!]!, y: cy.get(n.id)! - s.h / 2, ...s });
  }
  return { pos: normalise(pos) };
};
