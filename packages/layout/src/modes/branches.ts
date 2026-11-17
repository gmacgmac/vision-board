// Branches on their own rows (BE_01, flowBranches flag; PLAN decision 19): a flow drawn as chains, each on one row
// from its first card to its last, so a fork continues as parallel rows and its links run in the gaps between
// columns, never round a card. The main line is the chain that follows each card's first successor in card order;
// a branch takes the nearest row to the card it forks from (below first, then above) that is free over its whole
// run, and a branch that rejoins keeps that row up to the column before the card it rejoins, so it comes back with
// one link. A run that skips columns keeps its row empty in them, so the long link runs straight along it. Cards
// not linked to each other are separate bands of rows. flow.ts keeps these rows unless their links, routed, cross
// more than the stacked flow's. Pure and deterministic.
import type { Link, ViewNode } from '#format';
import type { Graph } from '../layers.ts';
import { inCardOrder } from '../layers.ts';

/** Whether a container's links are no more than a chain in card order: each joins two cards next to each other
 *  in card order (either way), so a `row` or `column` draws every one of them between neighbours. */
export function plainChain(nodes: ViewNode[], links: Link[]): boolean {
  const at = new Map(inCardOrder(nodes).map((n, i) => [n.id, i]));
  return links.every((l) => {
    const [a, b] = [at.get(l.from), at.get(l.to)];
    return a === undefined || b === undefined || Math.abs(a - b) <= 1;
  });
}

/** Each card's row (from 0): its chain's. `layers` is each card's column (`layersOf`); only links to a later
 *  column count, so a link that closes a cycle starts no chain. Cards joined by no link to each other sit in
 *  separate bands of rows, one band under the other in card order, so one flow's links never cross another's. */
export function branchRows(nodes: ViewNode[], g: Graph, layers: Map<string, number>): Map<string, number> {
  const order = inCardOrder(nodes);
  const rank = new Map(order.map((n, i) => [n.id, i]));
  const col = (id: string) => layers.get(id)!;
  const byRank = (ids: string[]) => [...ids].sort((a, b) => rank.get(a)! - rank.get(b)!);
  const succs = (id: string) => byRank((g.succs.get(id) ?? []).filter((s) => col(s) > col(id)));
  const preds = (id: string) => byRank((g.preds.get(id) ?? []).filter((p) => col(p) < col(id)));
  const row = new Map<string, number>();
  let top = 0;
  for (const band of bandsOf(order, g)) {
    const rows = bandRows(band, col, succs, preds);
    const used = [...new Set(rows.values())].sort((a, b) => a - b);
    for (const [id, r] of rows) row.set(id, top + used.indexOf(r));
    top += used.length;
  }
  return row;
}

/** The cards joined by links, each group in card order, the groups in the order of their first card. */
function bandsOf(order: ViewNode[], g: Graph): string[][] {
  const band = new Map<string, number>();
  const bands: string[][] = [];
  for (const { id } of order) {
    if (band.has(id)) continue;
    const members: string[] = [];
    const todo = [id];
    band.set(id, bands.length);
    while (todo.length) {
      const at = todo.pop()!;
      members.push(at);
      for (const o of [...(g.succs.get(at) ?? []), ...(g.preds.get(at) ?? [])]) if (!band.has(o)) { band.set(o, bands.length); todo.push(o); }
    }
    bands.push(members);
  }
  return bands;
}

/** One band's rows, any whole numbers (the caller numbers them from 0). Every card of an earlier column is placed
 *  before one of a later column, so a chain's first card finds the card it forks from already on its row. */
function bandRows(
  ids: string[], col: (id: string) => number, succs: (id: string) => string[], preds: (id: string) => string[],
): Map<string, number> {
  const row = new Map<string, number>();
  const busy = new Map<number, Set<number>>();
  const free = (r: number, lo: number, hi: number) => {
    for (let c = lo; c <= hi; c++) if (busy.get(r)?.has(c)) return false;
    return true;
  };
  const next = (at: string) => succs(at).find((s) => !row.has(s));
  for (const id of [...ids].sort((a, b) => col(a) - col(b))) {
    if (row.has(id)) continue;
    const chain = [id];
    for (let at = next(id); at !== undefined; at = next(at)) chain.push(at);
    const last = chain[chain.length - 1]!;
    const from = preds(id).find((p) => row.has(p));
    const into = succs(last).find((s) => row.has(s));
    const lo = from !== undefined ? col(from) + 1 : col(id);
    const hi = into !== undefined ? Math.max(col(last), col(into) - 1) : col(last);
    // The nearest row free over the whole run to the card it forks from (or rejoins): below it first, then above.
    const anchor = from !== undefined ? row.get(from)! : into !== undefined ? row.get(into)! : -1;
    const near = (k: number) => (k % 2 ? anchor + (k + 1) / 2 : anchor - k / 2);
    let k = 1;
    while (!free(near(k), lo, hi)) k++;
    const r = near(k);
    for (let c = lo; c <= hi; c++) (busy.get(r) ?? busy.set(r, new Set()).get(r)!).add(c);
    for (const c of chain) row.set(c, r);
  }
  return row;
}
