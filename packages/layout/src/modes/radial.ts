import type { ViewNode } from '../../../format/src/view.ts';
import type { Box, ModeFn } from '../types.ts';
import { GAP } from '../types.ts';
import { normalise } from '../geometry.ts';

/** Builds outward from a centre: each node gets a wedge sized by the leaves beneath it. */
export const radial: ModeFn = ({ region, nodes, links, sizes }) => {
  const ids = new Set(nodes.map((n) => n.id));
  const adj = new Map(nodes.map((n) => [n.id, [] as string[]]));
  for (const l of links) {
    if (l.from === l.to || !ids.has(l.from) || !ids.has(l.to)) continue;
    adj.get(l.from)!.push(l.to);
    adj.get(l.to)!.push(l.from);
  }
  const root = pickCentre(region.center, nodes, adj);
  const children = spanningTree(root, nodes, adj);
  const depth = new Map<string, number>([[root, 0]]);
  const leaves = new Map<string, number>();
  const count = (id: string, d: number): number => {
    depth.set(id, d);
    const kids = children.get(id)!;
    const v = kids.length ? kids.reduce((s, k) => s + count(k, d + 1), 0) : 1;
    leaves.set(id, v);
    return v;
  };
  count(root, 0);

  const maxW = Math.max(...nodes.map((n) => sizes.get(n.id)!.w));
  const maxH = Math.max(...nodes.map((n) => sizes.get(n.id)!.h));
  // A card's reach from its centre is at most half its diagonal in any direction, so centres a
  // diagonal + GAP apart can never overlap: rings are that far apart, and each ring is wide
  // enough that its two closest neighbours (the narrowest wedge) are that far apart too.
  const clear = Math.hypot(maxW, maxH) + GAP;
  const total = leaves.get(root)!;
  const perRing = new Map<number, { count: number; minSpan: number }>();
  for (const [id, d] of depth) {
    const span = (2 * Math.PI * leaves.get(id)!) / total;
    const ring = perRing.get(d) ?? { count: 0, minSpan: Infinity };
    perRing.set(d, { count: ring.count + 1, minSpan: Math.min(ring.minSpan, span) });
  }
  const radius: number[] = [0];
  for (let d = 1; perRing.has(d); d++) {
    const { count, minSpan } = perRing.get(d)!;
    const fit = count > 1 ? clear / (2 * Math.sin(Math.min(minSpan, Math.PI) / 2)) : 0;
    radius[d] = Math.max(radius[d - 1]! + clear, fit);
  }

  const pos = new Map<string, Box>();
  const assign = (id: string, a0: number, a1: number) => {
    const s = sizes.get(id)!;
    const a = (a0 + a1) / 2;
    const r = radius[depth.get(id)!]!;
    pos.set(id, { x: r * Math.cos(a) - s.w / 2, y: r * Math.sin(a) - s.h / 2, ...s });
    let at = a0;
    for (const k of children.get(id)!) {
      const span = ((a1 - a0) * leaves.get(k)!) / leaves.get(id)!;
      assign(k, at, at + span);
      at += span;
    }
  };
  assign(root, -Math.PI / 2, (3 * Math.PI) / 2);
  return { pos: normalise(pos) };
};

function pickCentre(hint: string | undefined, nodes: ViewNode[], adj: Map<string, string[]>) {
  if (hint && adj.has(hint)) return hint;
  let best = nodes[0]!.id;
  for (const n of nodes) if (adj.get(n.id)!.length > adj.get(best)!.length) best = n.id;
  return best;
}

/** Breadth-first tree from the centre; anything unreachable hangs off the centre. */
function spanningTree(root: string, nodes: ViewNode[], adj: Map<string, string[]>) {
  const children = new Map(nodes.map((n) => [n.id, [] as string[]]));
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const id = queue.shift()!;
    for (const o of adj.get(id)!) {
      if (seen.has(o)) continue;
      seen.add(o);
      children.get(id)!.push(o);
      queue.push(o);
    }
  }
  for (const n of nodes) if (!seen.has(n.id)) children.get(root)!.push(n.id);
  return children;
}
