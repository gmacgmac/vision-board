// Free space for connectors (field-report batch 3 ruling 2): the stretches of a line that no card
// covers. Obstacles are cards grown by CLEAR_CARD on every side, so a line in a free stretch keeps
// at least that far from every card. Pure.
import type { Box } from '../types.ts';

/** How far a connector keeps from a card it does not start or end at. */
export const CLEAR_CARD = 6;

/** [from, to], from < to. */
export type Span = readonly [number, number];

export const grow = (b: Box, by = CLEAR_CARD): Box => ({ x: b.x - by, y: b.y - by, w: b.w + 2 * by, h: b.h + 2 * by });

/** The free stretches of [lo, hi] along x for a vertical line from y0 to y1, left to right. */
export function freeX(obs: readonly Box[], y0: number, y1: number, lo: number, hi: number): Span[] {
  const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
  const blocked: Span[] = [];
  for (const o of obs) if (o.y < b && o.y + o.h > a && o.x < hi && o.x + o.w > lo) blocked.push([o.x, o.x + o.w]);
  return gaps(blocked, lo, hi);
}

/** The free stretches of [lo, hi] along y for a horizontal line from x0 to x1, top to bottom. */
export function freeY(obs: readonly Box[], x0: number, x1: number, lo: number, hi: number): Span[] {
  const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
  const blocked: Span[] = [];
  for (const o of obs) if (o.x < b && o.x + o.w > a && o.y < hi && o.y + o.h > lo) blocked.push([o.y, o.y + o.h]);
  return gaps(blocked, lo, hi);
}

/** Whether the horizontal segment at `y` from x0 to x1 touches no obstacle but `skip`. */
export function clearH(obs: readonly Box[], y: number, x0: number, x1: number, ...skip: Box[]): boolean {
  const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
  for (const o of obs) if (o.y < y && o.y + o.h > y && o.x < b && o.x + o.w > a && !skip.includes(o)) return false;
  return true;
}

/** [lo, hi] less the blocked stretches. */
function gaps(blocked: Span[], lo: number, hi: number): Span[] {
  blocked.sort((p, q) => p[0] - q[0]);
  const out: Span[] = [];
  let at = lo;
  for (const [s, e] of blocked) {
    if (s > at) out.push([at, s]);
    at = Math.max(at, e);
  }
  if (hi > at) out.push([at, hi]);
  return out;
}
