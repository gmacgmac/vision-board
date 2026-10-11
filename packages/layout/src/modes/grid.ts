import type { Box, ModeFn } from '../types.ts';
import { GAP } from '../types.ts';

/** Cards in rows. Column widths from the widest card, row heights from the tallest. */
export const grid: ModeFn = ({ region, nodes, sizes }) => {
  const cols = Math.max(1, region.columns ?? Math.ceil(Math.sqrt(nodes.length)));
  const colW: number[] = [];
  const rowH: number[] = [];
  nodes.forEach((n, i) => {
    const s = sizes.get(n.id)!;
    colW[i % cols] = Math.max(colW[i % cols] ?? 0, s.w);
    rowH[Math.floor(i / cols)] = Math.max(rowH[Math.floor(i / cols)] ?? 0, s.h);
  });
  const xs = prefix(colW);
  const ys = prefix(rowH);
  const pos = new Map<string, Box>();
  nodes.forEach((n, i) => {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x: xs[i % cols]!, y: ys[Math.floor(i / cols)]!, ...s });
  });
  return { pos };
};

/** The cards in card order: by board number where both have one, else as given (api.md 129). */
const inCardOrder = <T extends { n?: number | undefined }>(nodes: readonly T[]): T[] =>
  [...nodes].sort((a, b) => (a.n !== undefined && b.n !== undefined ? a.n - b.n : 0));

/** One column, top to bottom in card order, GAP apart so the next card's tabs clear the one above
 * (api.md 129: `column`, the old `list`). */
export const column: ModeFn = ({ nodes, sizes }) => {
  const pos = new Map<string, Box>();
  let y = 0;
  for (const n of inCardOrder(nodes)) {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x: 0, y, ...s });
    y += s.h + GAP;
  }
  return { pos };
};

/** One row, left to right in card order, GAP apart, tops aligned; no links needed (api.md 129). */
export const row: ModeFn = ({ nodes, sizes }) => {
  const pos = new Map<string, Box>();
  let x = 0;
  for (const n of inCardOrder(nodes)) {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x, y: 0, ...s });
    x += s.w + GAP;
  }
  return { pos };
};

function prefix(sizes: number[]): number[] {
  const out: number[] = [];
  let at = 0;
  for (const s of sizes) {
    out.push(at);
    at += s + GAP;
  }
  return out;
}
