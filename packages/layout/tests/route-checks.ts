// Shared checks for the router tests (field-report batch 3 ruling 2): a line under a card, two
// lines sharing a stretch (a trunk), and runs that are not right angles. Polylines as routeLines
// gives them, source first.
import type { Box, Point } from '../src/index.ts';

/** Whether any run of `pts` passes over the inside of `b`. */
export function under(pts: readonly Point[], b: Box): boolean {
  for (let i = 1; i < pts.length; i++) {
    const [p, q] = [pts[i - 1]!, pts[i]!];
    if (Math.max(p.x, q.x) > b.x && Math.min(p.x, q.x) < b.x + b.w && Math.max(p.y, q.y) > b.y && Math.min(p.y, q.y) < b.y + b.h) return true;
  }
  return false;
}

/** Whether two lines run along the same line for more than 1 px. */
export function shareStretch(p: readonly Point[], q: readonly Point[]): boolean {
  const over = (a0: number, a1: number, b0: number, b1: number) =>
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1)) > 1;
  for (let i = 1; i < p.length; i++)
    for (let j = 1; j < q.length; j++) {
      const [s0, s1, t0, t1] = [p[i - 1]!, p[i]!, q[j - 1]!, q[j]!];
      if (s0.x === s1.x && t0.x === t1.x && Math.abs(s0.x - t0.x) < 1 && over(s0.y, s1.y, t0.y, t1.y)) return true;
      if (s0.y === s1.y && t0.y === t1.y && Math.abs(s0.y - t0.y) < 1 && over(s0.x, s1.x, t0.x, t1.x)) return true;
    }
  return false;
}

/** Whether every run is horizontal or vertical. */
export const rightAngled = (pts: readonly Point[]): boolean =>
  pts.every((p, i) => i === 0 || p.x === pts[i - 1]!.x || p.y === pts[i - 1]!.y);
