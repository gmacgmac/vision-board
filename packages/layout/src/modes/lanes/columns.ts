// Lanes' columns (field-report batch 3 ruling 1): layered by link depth, each lane packed left.
// A card's column is the leftmost its links allow:
// - a link inside a lane moves on at least one column, and so does any card that follows an earlier
//   card of its own lane by any path, so each lane reads left to right in order;
// - a handoff to another lane moves on HANDOFF columns;
// - nothing else moves a card right: a lane's cards wait only for what they depend on, and a card
//   with no predecessor starts at the left (it is not pulled towards its successor, as flow does);
// - a card with no links fills its lane's leftmost free column (or shortest stack) in the columns
//   used, in card order, so it never widens the container.
// Cycles are broken first (`acyclic`, deterministic). Pure.
import type { Link, ViewNode } from '../../../../format/src/index.ts';
import type { Graph } from '../../layers.ts';
import { acyclic, graphOf } from '../../layers.ts';

/** How many columns a handoff to another lane moves on. 1 is layering by link depth (ruling 1).
 *  0 would let a handoff drop straight down into the same column (more compact, but a drop into a
 *  stack has to go round the cards above it): a reading for the maintainer, not used. */
const HANDOFF = 1;

export interface LaneColumns {
  /** Node id -> column, from 0, no empty column. */
  cols: Map<string, number>;
  /** The graph the columns came from, without the links that closed a cycle. */
  dag: Graph;
}

export function laneColumns(nodes: ViewNode[], links: Link[], lane: Map<string, number>, lanes: number): LaneColumns {
  const g = graphOf(nodes, links);
  const dag = acyclic(nodes, g);
  const col = new Map<string, number>();
  // Per card, per lane: the rightmost column of that lane among the card and everything before it.
  const before = new Map<string, number[]>();
  for (const id of topological(nodes, dag)) {
    const own = lane.get(id)!;
    const reach = new Array<number>(lanes).fill(-1);
    let c = 0;
    for (const p of dag.preds.get(id)!) {
      const r = before.get(p)!;
      for (let k = 0; k < lanes; k++) if (r[k]! > reach[k]!) reach[k] = r[k]!;
      if (lane.get(p) !== own) c = Math.max(c, col.get(p)! + HANDOFF);
    }
    c = Math.max(c, reach[own]! + 1);
    reach[own] = c;
    col.set(id, c);
    before.set(id, reach);
  }
  fillUnlinked(nodes, g, lane, col);
  return { cols: dense(col), dag };
}

/** Kahn's order, ready cards taken in node order. */
function topological(nodes: ViewNode[], dag: Graph): string[] {
  const left = new Map(nodes.map((n) => [n.id, dag.preds.get(n.id)!.length]));
  const order = nodes.filter((n) => left.get(n.id) === 0).map((n) => n.id);
  for (let i = 0; i < order.length; i++) {
    for (const s of dag.succs.get(order[i]!)!) {
      const k = left.get(s)! - 1;
      left.set(s, k);
      if (k === 0) order.push(s);
    }
  }
  return order;
}

/** Cards with no link in the container go, in card order, to their lane's leftmost free column
 *  among the columns the linked cards use, else onto its shortest stack there (leftmost on a tie),
 *  so they never make the container wider. With no links at all, each lane is a row. */
function fillUnlinked(nodes: ViewNode[], g: Graph, lane: Map<string, number>, col: Map<string, number>): void {
  const linked = (id: string) => g.preds.get(id)!.length > 0 || g.succs.get(id)!.length > 0;
  const width = 1 + Math.max(-1, ...nodes.filter((n) => linked(n.id)).map((n) => col.get(n.id)!));
  const count = new Map<number, number[]>();
  const countOf = (l: number) => count.get(l) ?? count.set(l, []).get(l)!;
  for (const n of nodes) if (linked(n.id)) { const c = countOf(lane.get(n.id)!); c[col.get(n.id)!] = (c[col.get(n.id)!] ?? 0) + 1; }
  for (const n of nodes) {
    if (linked(n.id)) continue;
    const c = countOf(lane.get(n.id)!);
    let at = 0;
    if (width === 0) while (c[at]) at++;
    else for (let k = 1; k < width; k++) if ((c[k] ?? 0) < (c[at] ?? 0)) at = k;
    c[at] = (c[at] ?? 0) + 1;
    col.set(n.id, at);
  }
}

/** Renumber so the columns used are 0, 1, 2, ... in order. */
function dense(col: Map<string, number>): Map<string, number> {
  const used = [...new Set(col.values())].sort((a, b) => a - b);
  const at = new Map(used.map((c, i) => [c, i]));
  return new Map([...col].map(([id, c]) => [id, at.get(c)!]));
}
