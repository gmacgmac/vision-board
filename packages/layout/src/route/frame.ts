// The router works in one direction only: from a port on the source's right side to a port on the
// target's left side, the target further right. A frame turns every other case into that one
// (a mirror, or a quarter turn) and back again, so the search is written once. Pure.
import type { Box, Point } from '../types.ts';
import type { Side } from './ports.ts';

export interface Frame {
  to(p: Point): Point;
  back(p: Point): Point;
  box(b: Box): Box;
}

const FRAMES: Record<Side, Frame> = {
  // Source's right side: as it is.
  r: { to: (p) => p, back: (p) => p, box: (b) => b },
  // Source's left side: mirrored left to right.
  l: {
    to: (p) => ({ x: -p.x, y: p.y }),
    back: (p) => ({ x: -p.x, y: p.y }),
    box: (b) => ({ x: -(b.x + b.w), y: b.y, w: b.w, h: b.h }),
  },
  // Source's bottom side: x and y swapped, so going down becomes going right.
  b: {
    to: (p) => ({ x: p.y, y: p.x }),
    back: (p) => ({ x: p.y, y: p.x }),
    box: (b) => ({ x: b.y, y: b.x, w: b.h, h: b.w }),
  },
  // Source's top side: a quarter turn, so going up becomes going right.
  t: {
    to: (p) => ({ x: -p.y, y: p.x }),
    back: (p) => ({ x: p.y, y: -p.x }),
    box: (b) => ({ x: -(b.y + b.h), y: b.x, w: b.h, h: b.w }),
  },
};

export const frameFor = (side: Side): Frame => FRAMES[side];
