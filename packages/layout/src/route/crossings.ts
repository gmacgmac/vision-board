// How many connectors cross another (show_layout's `crossing`, api.md 133; the layout tests): a
// count of lines, not of crossing points. Two runs cross when they meet inside both, not at an end.
// Also what two runs on one line will cost once tracks part them (`partingCost`), which the
// router counts when it chooses a route and tracks.ts uses to choose their order.
import type { Point } from '../types.ts';

const EPS = 0.5;

/** A run along one line: its extent along the line and where the runs before and after it leave,
 *  to which side (`dir` -1 or 1 across the line). */
export interface RunEnds { e0: number; e1: number; ends: { e: number; dir: number }[] }

/** Run i of `pts` (pts[i] to pts[i + 1]), which sits at `axis` (x for an up-and-down run). */
export function runOf(pts: readonly Point[], i: number, axis: 'x' | 'y'): RunEnds {
  const other = axis === 'x' ? 'y' : 'x';
  const [p, q] = [pts[i]!, pts[i + 1]!];
  const ends: RunEnds['ends'] = [];
  const [prev, next] = [pts[i - 1], pts[i + 2]];
  if (prev) ends.push({ e: p[other], dir: Math.sign(prev[axis] - p[axis]) });
  if (next) ends.push({ e: q[other], dir: Math.sign(next[axis] - q[axis]) });
  return { e0: Math.min(p[other], q[other]), e1: Math.max(p[other], q[other]), ends };
}

/** How many times `s` crosses `t` with `s` on the lower side of their line: the runs leaving `s`
 *  towards `t` (and `t` towards `s`) cross the other where they leave within its length. Leaving
 *  at the very end of the other counts too: there the two would share a stretch of line. */
export function lowerCost(s: RunEnds, t: RunEnds): number {
  const within = (e: number, r: RunEnds) => e > r.e0 - EPS && e < r.e1 + EPS;
  return s.ends.filter((x) => x.dir > 0 && within(x.e, t)).length
    + t.ends.filter((x) => x.dir < 0 && within(x.e, s)).length;
}

/** Two runs on one line, overlapping: the crossings parting them costs in the better order. */
export const partingCost = (s: RunEnds, t: RunEnds): number => Math.min(lowerCost(s, t), lowerCost(t, s));

export function crossingLines(lines: readonly Point[][]): number {
  const crossed = new Set<number>();
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++)
      if (linesCross(lines[i]!, lines[j]!)) { crossed.add(i); crossed.add(j); }
  return crossed.size;
}

export function linesCross(p: readonly Point[], q: readonly Point[]): boolean {
  return crossingsOf(p, q, true) > 0;
}

/** How many times two lines cross, counting runs that share a stretch as the crossings parting
 *  them will cost. A first or last run is fixed to its port, so tracks cannot part it: sharing a
 *  stretch with one counts as a crossing. */
export function conflictsBetween(p: readonly Point[], q: readonly Point[]): number {
  let n = crossingsOf(p, q, false);
  const fixed = (pts: readonly Point[], i: number) => i === 0 || i === pts.length - 2;
  for (let i = 0; i + 1 < p.length; i++)
    for (let j = 0; j + 1 < q.length; j++) {
      const axis = shared(p[i]!, p[i + 1]!, q[j]!, q[j + 1]!);
      if (!axis) continue;
      n += fixed(p, i) || fixed(q, j) ? 1 : partingCost(runOf(p, i, axis), runOf(q, j, axis));
    }
  return n;
}

/** The axis two runs share a stretch of line on (x: both up and down at one x), or null. */
function shared(a: Point, b: Point, c: Point, d: Point): 'x' | 'y' | null {
  const over = (a0: number, a1: number, b0: number, b1: number) =>
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1)) > EPS;
  if (a.x === b.x && c.x === d.x && Math.abs(a.x - c.x) < EPS && over(a.y, b.y, c.y, d.y)) return 'x';
  if (a.y === b.y && c.y === d.y && Math.abs(a.y - c.y) < EPS && over(a.x, b.x, c.x, d.x)) return 'y';
  return null;
}

/** Every crossing point between the lines (the finer count the lanes untangling minimises). */
export function crossingPoints(lines: readonly Point[][]): number {
  let n = 0;
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) n += crossingsOf(lines[i]!, lines[j]!, false);
  return n;
}

function crossingsOf(p: readonly Point[], q: readonly Point[], first: boolean): number {
  let n = 0;
  for (let i = 1; i < p.length; i++)
    for (let j = 1; j < q.length; j++)
      if (segmentsCross(p[i - 1]!, p[i]!, q[j - 1]!, q[j]!)) {
        n += 1;
        if (first) return n;
      }
  return n;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < 1e-9) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  const [la, lc] = [Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(d.x - c.x, d.y - c.y)];
  // Inside both by more than EPS px: lines that only touch at a corner or an end don't count.
  return t * la > EPS && (1 - t) * la > EPS && u * lc > EPS && (1 - u) * lc > EPS;
}
