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

/** A single column, in the agent's order. */
export const list: ModeFn = ({ nodes, sizes }) => {
  const pos = new Map<string, Box>();
  let y = 0;
  for (const n of nodes) {
    const s = sizes.get(n.id)!;
    pos.set(n.id, { x: 0, y, ...s });
    y += s.h + GAP / 2;
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
