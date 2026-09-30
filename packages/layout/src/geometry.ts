import type { Box, Point } from './types.ts';

export function boundsOf(boxes: Iterable<Box>): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Shift boxes so the top-left of their bounds is (0, 0). */
export function normalise(pos: Map<string, Box>): Map<string, Box> {
  const b = boundsOf(pos.values());
  for (const [id, p] of pos) pos.set(id, { ...p, x: p.x - b.x, y: p.y - b.y });
  return pos;
}

export const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export const overlaps = (a: Box, b: Box, gap = 0): boolean =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

export const round = (v: number): number => Math.round(v * 10) / 10;
