import type { Box, Cell, ModeFn } from '../types.ts';
import { GAP } from '../types.ts';

/** Cards in rows. Column widths from the widest card, row heights from the tallest. Under `match`
 *  a card takes its column's width (ruling 5); `center` centres a card in its cell both ways. */
export const grid: ModeFn = ({ region, nodes, sizes, align, widths }) => {
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
  const cells = new Map<string, Cell>();
  const mid = align === 'center' ? 0.5 : 0;
  nodes.forEach((n, i) => {
    const [c, r] = [i % cols, Math.floor(i / cols)];
    const s = sizes.get(n.id)!;
    const w = widths === 'match' ? colW[c]! : s.w;
    pos.set(n.id, { x: xs[c]! + (colW[c]! - w) * mid, y: ys[r]! + (rowH[r]! - s.h) * mid, w, h: s.h });
    cells.set(n.id, { column: c + 1, row: r + 1 });
  });
  return { pos, cells };
};

/** The cards in card order: by board number where both have one, else as given (api.md 129). */
const inCardOrder = <T extends { n?: number | undefined }>(nodes: readonly T[]): T[] =>
  [...nodes].sort((a, b) => (a.n !== undefined && b.n !== undefined ? a.n - b.n : 0));

/** One column, top to bottom in card order, GAP apart so the next card's tabs clear the one above
 * (api.md 129: `column`, the old `list`). Left-aligned, or centred; `match`: one width for all. */
export const column: ModeFn = ({ nodes, sizes, align, widths }) => {
  const pos = new Map<string, Box>();
  const cells = new Map<string, Cell>();
  const widest = Math.max(0, ...nodes.map((n) => sizes.get(n.id)!.w));
  const mid = align === 'center' ? 0.5 : 0;
  let y = 0;
  inCardOrder(nodes).forEach((n, i) => {
    const s = sizes.get(n.id)!;
    const w = widths === 'match' ? widest : s.w;
    pos.set(n.id, { x: (widest - w) * mid, y, w, h: s.h });
    cells.set(n.id, { column: 1, row: i + 1 });
    y += s.h + GAP;
  });
  return { pos, cells };
};

/** One row, left to right in card order, GAP apart, tops aligned (or centred); no links needed
 * (api.md 129). Each card is its own column, so `match` changes nothing. */
export const row: ModeFn = ({ nodes, sizes, align }) => {
  const pos = new Map<string, Box>();
  const cells = new Map<string, Cell>();
  const tallest = Math.max(0, ...nodes.map((n) => sizes.get(n.id)!.h));
  const mid = align === 'center' ? 0.5 : 0;
  let x = 0;
  inCardOrder(nodes).forEach((n, i) => {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x, y: (tallest - s.h) * mid, ...s });
    cells.set(n.id, { column: i + 1, row: 1 });
    x += s.w + GAP;
  });
  return { pos, cells };
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
