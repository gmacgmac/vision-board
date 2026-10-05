// The collision pass (2d_BE_01): after the person's pins land, every unpinned card a pin covers
// moves to the nearest free spot. Pinned cards never move, even when the person stacked them.
// Pure and deterministic: cards are handled in the mode's own order (the order of `pos`).
import type { Box, Point } from './types.ts';
import { GAP } from './types.ts';
import { boundsOf, overlaps } from './geometry.ts';

/** Float slack in the clearance test, so a spot exactly GAP away counts as clear. */
const EPS = 1e-6;

/** Put each pinned card at its pin (region-local). Returns the ids actually pinned here. */
export function applyPins(pos: Map<string, Box>, pins?: Map<string, Point>): Set<string> {
  const pinned = new Set<string>();
  for (const [id, pin] of pins ?? []) {
    const at = pos.get(id);
    if (!at) continue;
    pos.set(id, { ...at, x: pin.x, y: pin.y });
    pinned.add(id);
  }
  return pinned;
}

/**
 * Each unpinned card that overlaps a pinned one moves to the closest spot (straight-line distance)
 * that is GAP clear of every other card and of `keepOut` (lane gutters), never above or left of
 * the content's top-left, so the frame's origin (and every pin on screen) stays where it was.
 */
export function makeRoom(pos: Map<string, Box>, pinned: Set<string>, keepOut: Box[] = []): void {
  if (!pinned.size) return;
  const pins = [...pinned].map((id) => pos.get(id)!);
  const floor = boundsOf([...pos.values(), ...keepOut]);
  for (const [id, box] of pos) {
    if (pinned.has(id) || !pins.some((p) => overlaps(box, p))) continue;
    const others = [...keepOut];
    for (const [o, b] of pos) if (o !== id) others.push(b);
    pos.set(id, { ...box, ...nearestFree(box, others, floor) });
  }
}

/**
 * The free top-left closest to `box`'s own. The closest free spot always has each coordinate
 * either unchanged or flush (GAP away) with an obstacle's side, so only those are tried, nearest
 * first, stopping as soon as nothing left can beat the best found.
 */
function nearestFree(box: Box, obstacles: Box[], floor: Point): Point {
  const xs = axis(box.x, floor.x, obstacles.flatMap((o) => [o.x - box.w - GAP, o.x + o.w + GAP]));
  const ys = axis(box.y, floor.y, obstacles.flatMap((o) => [o.y - box.h - GAP, o.y + o.h + GAP]));
  let best: Point = { x: box.x, y: box.y };
  let dBest = Infinity;
  for (const x of xs) {
    const dx = Math.abs(x - box.x);
    if (dx >= dBest) break;
    for (const y of ys) {
      const d = Math.hypot(dx, y - box.y);
      if (d >= dBest) break;
      if (obstacles.some((o) => overlaps({ ...box, x, y }, o, GAP - EPS))) continue;
      best = { x, y };
      dBest = d;
      break;
    }
  }
  return best;
}

/** Candidates on one axis at or past `min`, nearest to `at` first (ties: the smaller value). */
const axis = (at: number, min: number, cands: number[]): number[] =>
  [...new Set([at, ...cands])]
    .filter((v) => v >= min)
    .sort((a, b) => Math.abs(a - at) - Math.abs(b - at) || a - b);
