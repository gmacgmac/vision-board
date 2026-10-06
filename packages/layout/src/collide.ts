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

export interface RoomOptions {
  /** Clearance kept around a moved box. Cards: GAP. Containers: REGION_GAP. */
  gap?: number;
  /** Containers (3_FE_04 ruling 6): a moved box goes only right or down of where it was, not
   *  merely inside the content's top-left. */
  rightOrDown?: boolean;
}

/**
 * Each unpinned box that overlaps a pinned one moves to the closest spot (straight-line distance)
 * that is `gap` clear of every other box and of `keepOut` (lane gutters), never above or left of
 * the content's top-left, so the frame's origin (and every pin on screen) stays where it was.
 * With `rightOrDown`, never above or left of the box's own place either.
 */
export function makeRoom(pos: Map<string, Box>, pinned: Set<string>, keepOut: Box[] = [], opts: RoomOptions = {}): void {
  if (!pinned.size) return;
  const gap = opts.gap ?? GAP;
  const pins = [...pinned].map((id) => pos.get(id)!);
  const floor = boundsOf([...pos.values(), ...keepOut]);
  for (const [id, box] of pos) {
    if (pinned.has(id) || !pins.some((p) => overlaps(box, p))) continue;
    const others = [...keepOut];
    for (const [o, b] of pos) if (o !== id) others.push(b);
    pos.set(id, { ...box, ...nearestFree(box, others, opts.rightOrDown ? box : floor, gap) });
  }
}

/**
 * The free top-left closest to `box`'s own. The closest free spot always has each coordinate
 * either unchanged or flush (`gap` away) with an obstacle's side, so only those are tried, nearest
 * first, stopping as soon as nothing left can beat the best found.
 */
function nearestFree(box: Box, obstacles: Box[], floor: Point, gap: number): Point {
  const xs = axis(box.x, floor.x, obstacles.flatMap((o) => [o.x - box.w - gap, o.x + o.w + gap]));
  const ys = axis(box.y, floor.y, obstacles.flatMap((o) => [o.y - box.h - gap, o.y + o.h + gap]));
  let best: Point = { x: box.x, y: box.y };
  let dBest = Infinity;
  for (const x of xs) {
    const dx = Math.abs(x - box.x);
    if (dx >= dBest) break;
    for (const y of ys) {
      const d = Math.hypot(dx, y - box.y);
      if (d >= dBest) break;
      if (obstacles.some((o) => overlaps({ ...box, x, y }, o, gap - EPS))) continue;
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
