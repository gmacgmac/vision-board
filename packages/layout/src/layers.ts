// Shared by flow and lanes: longest-path layering and barycentre ordering (from Architect's
// `layout`, generalised: column widths come from the widest node, not a constant).
import type { Link, ViewNode } from '../../format/src/view.ts';
import type { Size } from './types.ts';
import { COL_GAP } from './types.ts';

export interface Graph { preds: Map<string, string[]>; succs: Map<string, string[]> }

export function graphOf(nodes: ViewNode[], links: Link[]): Graph {
  const preds = new Map(nodes.map((n) => [n.id, [] as string[]]));
  const succs = new Map(nodes.map((n) => [n.id, [] as string[]]));
  for (const l of links) {
    if (l.from === l.to || !preds.has(l.to) || !succs.has(l.from)) continue;
    succs.get(l.from)!.push(l.to);
    preds.get(l.to)!.push(l.from);
  }
  return { preds, succs };
}

/** Layer index per node: longest path from a source; cycles are broken at the back edge. */
export function layersOf(nodes: ViewNode[], g: Graph): Map<string, number> {
  const memo = new Map<string, number>();
  const stack = new Set<string>();
  const visit = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    const ps = g.preds.get(id) ?? [];
    const l = ps.length ? Math.max(...ps.map(visit)) + 1 : 0;
    stack.delete(id);
    memo.set(id, l);
    return l;
  };
  nodes.forEach((n) => visit(n.id));
  // Pull a source up next to its first successor, so late inputs don't sit in column 0.
  for (const n of nodes) {
    const ss = g.succs.get(n.id) ?? [];
    if ((g.preds.get(n.id) ?? []).length === 0 && ss.length)
      memo.set(n.id, Math.max(0, Math.min(...ss.map((s) => memo.get(s)!)) - 1));
  }
  // Dense indices: no empty columns.
  const used = [...new Set(memo.values())].sort((a, b) => a - b);
  for (const [id, l] of memo) memo.set(id, used.indexOf(l));
  return memo;
}

/** x of each layer's left edge, from the widest node in that layer. */
export function columnX(layers: Map<string, number>, sizes: Map<string, Size>, x0 = 0): number[] {
  const widths: number[] = [];
  for (const [id, l] of layers) widths[l] = Math.max(widths[l] ?? 0, sizes.get(id)?.w ?? 0);
  const xs: number[] = [];
  let x = x0;
  for (let l = 0; l < widths.length; l++) {
    xs[l] = x;
    x += (widths[l] ?? 0) + COL_GAP;
  }
  return xs;
}

/** Order ids by desired centre, pack top-down without overlap, recentre on the wishes. */
export function place(
  ids: string[], want: (id: string) => number, h: (id: string) => number, gap: number,
): Map<string, number> {
  const order = ids.map((id, i) => ({ id, i, c: want(id) }));
  order.sort((a, b) => a.c - b.c || a.i - b.i);
  const top = new Map<string, number>();
  let cursor = -Infinity;
  let drift = 0;
  for (const o of order) {
    const t = Math.max(o.c - h(o.id) / 2, cursor);
    top.set(o.id, t);
    cursor = t + h(o.id) + gap;
    drift += t + h(o.id) / 2 - o.c;
  }
  const shift = order.length ? drift / order.length : 0;
  for (const [id, t] of top) top.set(id, t - shift);
  return top;
}

export const mean = (xs: number[]): number | undefined =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
