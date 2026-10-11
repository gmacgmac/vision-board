// Tracks (field-report batch 3 ruling 2): runs that would share one line in a gutter or band (a
// shared trunk) each get their own track. Runs closer than TRACK whose lengths overlap form a
// cluster; a cluster is spread TRACK apart (closer when its free stretch is narrow) around where
// it was, inside the stretch every run in it may use, in the order that crosses least. Moving a
// run inside its own free stretch keeps it and the runs joining it clear of cards (free.ts). A few
// passes, as spreading one cluster can bring it next to another. Deterministic. Pure.
import type { Point } from '../types.ts';
import type { RunEnds } from './crossings.ts';
import { lowerCost, runOf } from './crossings.ts';
import { CLEAR_CARD } from './free.ts';

/** Space between two tracks, px. */
export const TRACK = 10;
/** The closest two tracks may be when a free stretch is narrow, px. */
const MIN_TRACK = 2;
const PASSES = 3;
/** Clusters this small are put in the order that crosses least, trying every order. */
const EXACT = 6;

/** Run `seg` of `pts` runs along a gutter (`axis` is the coordinate it sits at) and may move
 *  anywhere in [lo, hi]. */
export interface BoardChannel { seg: number; axis: 'x' | 'y'; lo: number; hi: number }
export interface Line { pts: Point[]; chans: BoardChannel[] }

interface Run extends RunEnds { line: Line; ch: BoardChannel; at: number; k: number }

export function spreadTracks(lines: Line[]): void {
  for (const axis of ['x', 'y'] as const) {
    const runs = runsOf(lines, axis);
    for (let pass = 0; pass < PASSES && spread(runs); pass++);
    for (const r of runs) {
      r.line.pts[r.ch.seg]![axis] = r.at;
      r.line.pts[r.ch.seg + 1]![axis] = r.at;
    }
  }
}

function runsOf(lines: Line[], axis: 'x' | 'y'): Run[] {
  const runs: Run[] = [];
  for (const line of lines)
    for (const ch of line.chans)
      if (ch.axis === axis) runs.push({ ...runOf(line.pts, ch.seg, axis), line, ch, at: line.pts[ch.seg]![axis], k: runs.length });
  return runs;
}

/** One pass: cluster and spread. True when any cluster was found. */
function spread(runs: Run[]): boolean {
  const sorted = [...runs].sort((p, q) => p.at - q.at || p.k - q.k);
  const root = sorted.map((_, i) => i);
  const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i]!)));
  let any = false;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j]!.at - sorted[i]!.at < TRACK - 0.01; j++) {
      const [s, t] = [sorted[i]!, sorted[j]!];
      const along = Math.min(s.e1, t.e1) - Math.max(s.e0, t.e0) > -2;
      const room = Math.min(s.ch.hi, t.ch.hi) > Math.max(s.ch.lo, t.ch.lo);
      if (along && room) { root[find(j)] = find(i); any = true; }
    }
  }
  if (!any) return false;
  const clusters = new Map<number, Run[]>();
  sorted.forEach((r, i) => (clusters.get(find(i)) ?? clusters.set(find(i), []).get(find(i))!).push(r));
  for (const c of clusters.values()) if (c.length > 1) lay(c);
  return true;
}

/** Spread one cluster around its mean place, inside the stretch all its runs may use. A crowded
 *  stretch lends its runs half the clearance from cards (free.ts), so they stay apart. */
function lay(c: Run[]): void {
  c.sort((s, t) => lowerCost(s, t) - lowerCost(t, s) || s.at - t.at || s.k - t.k);
  if (c.length <= EXACT) best(c);
  const n = c.length;
  const room = Math.min(...c.map((r) => r.ch.hi)) - Math.max(...c.map((r) => r.ch.lo));
  const lend = room < TRACK * (n - 1) ? CLEAR_CARD / 2 : 0;
  const lo = Math.max(...c.map((r) => r.ch.lo)) - lend;
  const hi = Math.min(...c.map((r) => r.ch.hi)) + lend;
  const step = Math.max(MIN_TRACK, Math.min(TRACK, (hi - lo) / (n - 1)));
  const mean = c.reduce((s, r) => s + r.at, 0) / n;
  const span = step * (n - 1);
  const start = Math.min(Math.max(mean - span / 2, lo), Math.max(lo, hi - span));
  // A cluster joins runs pairwise, so its common stretch can be too small: a run never leaves its
  // own free stretch, so it never goes under a card, even if it then meets another.
  c.forEach((r, i) => { r.at = Math.min(Math.max(start + i * step, r.ch.lo - lend), r.ch.hi + lend); });
}

/** Reorder `c` in place to the order with the fewest crossings (the first such, from its order). */
function best(c: Run[]): void {
  const n = c.length;
  const cost = c.map((s) => c.map((t) => lowerCost(s, t)));
  let bestCost = Infinity;
  let bestOrder: number[] = [];
  const order: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const walk = (sum: number) => {
    if (sum >= bestCost) return;
    if (order.length === n) { bestCost = sum; bestOrder = [...order]; return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      let add = 0;
      for (const j of order) add += cost[j]![i]!;
      used[i] = true; order.push(i);
      walk(sum + add);
      order.pop(); used[i] = false;
    }
  };
  walk(0);
  const was = [...c];
  bestOrder.forEach((i, k) => { c[k] = was[i]!; });
}
