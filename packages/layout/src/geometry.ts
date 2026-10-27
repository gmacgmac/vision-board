// Layout's own geometry: what only the placing and routing code needs. The box types and the
// primitives (`overlaps`, `boundsOf`, `clamp`) are format's (geometry.ts); layout's files and its
// front door reach them here.
import type { Box, Point } from '#format';
import { boundsOf } from '#format';

export { boundsOf, overlaps } from '#format';

/** Shift boxes so the top-left of their bounds is (0, 0). */
export function normalise(pos: Map<string, Box>): Map<string, Box> {
  const b = boundsOf(pos.values());
  for (const [id, p] of pos) pos.set(id, { ...p, x: p.x - b.x, y: p.y - b.y });
  return pos;
}

export const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export const round = (v: number): number => Math.round(v * 10) / 10;
