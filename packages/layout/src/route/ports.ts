// Which side of each card a connector leaves and enters, and where on that side: ports spread along
// the side in the order of the far ends, so fan-outs don't start from one point. A side's only port
// leans towards the far end, the source's further than the target's, so two links between two
// pairs of cards side by side cross cleanly instead of running along one line. Pure.
import type { Link } from '../../../format/src/index.ts';
import type { Box, Point } from '../types.ts';
import { centre } from '../geometry.ts';

export type Side = 'l' | 'r' | 't' | 'b';
export interface Plan { link: Link; a: Box; b: Box; sa: Side; sb: Side; pa?: Point; pb?: Point }

/** How far apart two cards must be side by side before a connector runs sideways between them. */
const CLEAR = 20;
/** How far a side's only port leans towards the far end, as a share of the side: source, target. */
const LEAN = { a: 0.12, b: 0.06 };

export function sidesFor(a: Box, b: Box): { sa: Side; sb: Side } {
  if (b.x >= a.x + a.w + CLEAR) return { sa: 'r', sb: 'l' };
  if (a.x >= b.x + b.w + CLEAR) return { sa: 'l', sb: 'r' };
  return b.y > a.y ? { sa: 'b', sb: 't' } : { sa: 't', sb: 'b' };
}

export function assignPorts(plans: Plan[]): void {
  const slots = new Map<string, { plan: Plan; end: 'a' | 'b'; key: number }[]>();
  for (const plan of plans) {
    for (const end of ['a', 'b'] as const) {
      const side = end === 'a' ? plan.sa : plan.sb;
      const far = centre(end === 'a' ? plan.b : plan.a);
      const id = `${end === 'a' ? plan.link.from : plan.link.to}:${side}`;
      const key = side === 'l' || side === 'r' ? far.y : far.x;
      (slots.get(id) ?? slots.set(id, []).get(id)!).push({ plan, end, key });
    }
  }
  for (const group of slots.values()) {
    group.sort((x, y) => x.key - y.key);
    group.forEach((g, i) => {
      const box = g.end === 'a' ? g.plan.a : g.plan.b;
      const side = g.end === 'a' ? g.plan.sa : g.plan.sb;
      const own = centre(box);
      const lean = Math.sign(g.key - (side === 'l' || side === 'r' ? own.y : own.x)) * LEAN[g.end];
      const f = group.length === 1 ? 0.5 + lean : 0.5 + (i - (group.length - 1) / 2) * Math.min(0.2, 0.7 / group.length);
      g.plan[g.end === 'a' ? 'pa' : 'pb'] = portPoint(box, side, f);
    });
  }
}

function portPoint(b: Box, side: Side, f: number): Point {
  if (side === 'r') return { x: b.x + b.w, y: b.y + b.h * f };
  if (side === 'l') return { x: b.x, y: b.y + b.h * f };
  if (side === 't') return { x: b.x + b.w * f, y: b.y };
  return { x: b.x + b.w * f, y: b.y + b.h };
}
