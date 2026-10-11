// Routes for one connector through free space (field-report batch 3 ruling 2), in the router's one
// direction (frame.ts): from p on the source's right side to q on the target's left side, further
// right. Two shapes, every run in free space (free.ts), never under a card:
// - three runs: out to a gutter, along it, in to the target (`threeRuns`, nearest the target first;
//   in a wide stretch, one near each end);
// - five runs: out to a gutter beside the source, along it to a free band between rows or lanes,
//   across, down a gutter beside the target, and in (`fiveRuns`).
// Each candidate carries its cost (length plus corners); route.ts adds what it crosses and picks.
// Each run in a gutter or band records that free stretch as its channel, so tracks.ts can give
// parallel runs their own tracks. Deterministic: candidates come in a fixed order. Pure.
import type { Box, Point } from '../types.ts';
import type { Span } from './free.ts';
import { CLEAR_CARD, clearH, freeX, freeY } from './free.ts';

/** Run `seg` (pts[seg] to pts[seg + 1]) lies in the free stretch [lo, hi] across it. */
export interface Channel { seg: number; lo: number; hi: number }
export interface Found { pts: Point[]; chans: Channel[]; cost: number }

/** What a corner costs against length, in px. */
const BEND = 40;
/** In a wide free stretch, how far a run keeps from the side it is drawn towards. */
const EDGE = 30;
/** How many free bands the five-run search tries, nearest the target first. */
const BANDS = 4;

/** A place in [lo, hi]: the middle of a narrow stretch, else EDGE in from the side `toward` is on. */
const pick = ([lo, hi]: Span, toward: number): number =>
  hi - lo <= 2 * EDGE ? (lo + hi) / 2 : Math.min(Math.max(toward, lo + EDGE), hi - EDGE);

/** `obs`: every card in the container, grown (free.ts), `a` and `b` among them. */
export function threeRuns(p: Point, q: Point, obs: readonly Box[], a: Box, b: Box): Found[] {
  if (q.x - p.x < 2 * CLEAR_CARD) return [];
  const length = q.x - p.x + Math.abs(q.y - p.y);
  // Level within half a pixel: one straight run, its end moved onto the source's height.
  if (Math.abs(p.y - q.y) < 0.5 && clearH(obs, p.y, p.x, q.x, a, b)) return [{ pts: [p, { x: q.x, y: p.y }], chans: [], cost: length }];
  const out: Found[] = [];
  const spans = freeX(obs, p.y, q.y, p.x, q.x);
  for (let i = spans.length - 1; i >= 0; i--) {
    const span = spans[i]!;
    // A wide stretch offers a run near the target and one near the source.
    for (const x of new Set([pick(span, q.x), pick(span, p.x)])) {
      if (!clearH(obs, p.y, p.x, x, a) || !clearH(obs, q.y, x, q.x, b)) continue;
      out.push({ pts: [p, { x, y: p.y }, { x, y: q.y }, q], chans: [{ seg: 1, lo: span[0], hi: span[1] }], cost: length + 2 * BEND });
    }
  }
  return out;
}

/** `area`: where runs may go outside the cards. */
export function fiveRuns(p: Point, q: Point, obs: readonly Box[], a: Box, b: Box, area: Box): Found[] {
  const [x0, x1] = [p.x + CLEAR_CARD, q.x - CLEAR_CARD];
  if (x1 <= x0) return [];
  const off = ([lo, hi]: Span) => (q.y < lo ? lo - q.y : q.y > hi ? q.y - hi : 0);
  const bands = freeY(obs, x0, x1, area.y, area.y + area.h)
    .map((s, i) => ({ s, i }))
    .sort((m, n) => off(m.s) - off(n.s) || m.i - n.i)
    .slice(0, BANDS);
  const out: Found[] = [];
  for (const { s: band } of bands) {
    const y = pick(band, q.y);
    const first = freeX(obs, p.y, y, p.x, q.x).find((s) => clearH(obs, p.y, p.x, pick(s, p.x), a));
    if (!first) continue;
    const c1 = pick(first, p.x);
    const last = freeX(obs, y, q.y, c1, q.x).reverse().find((s) => clearH(obs, q.y, pick(s, q.x), q.x, b));
    if (!last) continue;
    const c2 = pick(last, q.x);
    out.push({
      pts: [p, { x: c1, y: p.y }, { x: c1, y }, { x: c2, y }, { x: c2, y: q.y }, q],
      chans: [{ seg: 1, lo: first[0], hi: first[1] }, { seg: 2, lo: band[0], hi: band[1] }, { seg: 3, lo: last[0], hi: last[1] }],
      cost: (q.x - p.x) + Math.abs(y - p.y) + Math.abs(q.y - y) + 4 * BEND,
    });
  }
  return out;
}
