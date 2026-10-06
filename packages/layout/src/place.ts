// Container places (3_FE_04 ruling 6, api.md 74): the person's container pins, applied to the
// packed frames by collide.ts (`applyPins`, `makeRoom`), the same pass cards use inside a frame.
// A pinned frame sits exactly at its pin. Where two pinned frames would overlap, the one pinned
// later (later in the pins Map, i.e. higher seq) stays and the earlier is pushed right or down;
// then every unpinned frame a pinned one covers moves right or down. Pinned frames never move for
// an unpinned one. Pure and deterministic: frames in board order, pins in pin order.
import type { Box, Point } from './types.ts';
import { REGION_GAP } from './types.ts';
import { applyPins, makeRoom } from './collide.ts';

const ROOM = { gap: REGION_GAP, rightOrDown: true };

/** `frames`: each container's frame (board coordinates) as packing put it, in board order. Changed
 * in place. Pins naming a container that is not in `frames` are ignored. */
export function placeContainers(frames: Map<string, Box>, pins?: Map<string, Point>): void {
  const pinned = applyPins(frames, pins);
  if (!pinned.size) return;
  // Last pinned first: each pinned frame yields only to the pinned frames after it.
  const order = [...pins!.keys()].filter((id) => pinned.has(id)).reverse();
  const fixed = new Map<string, Box>();
  for (const id of order) {
    const one = new Map(fixed).set(id, frames.get(id)!);
    makeRoom(one, new Set(fixed.keys()), [], ROOM);
    fixed.set(id, one.get(id)!);
    frames.set(id, one.get(id)!);
  }
  makeRoom(frames, pinned, [], ROOM);
}
