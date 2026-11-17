// Which side of each card a connector leaves and enters, and where on that side: ports spread along
// the side in the order of the far ends, so fan-outs don't start from one point. A side's only port
// leans towards the far end, the source's further than the target's, so two links between two
// pairs of cards side by side cross cleanly instead of running along one line. Pure.
import type { Link } from '#format';
import type { Box, Point } from '../types.ts';
import { centre } from '../geometry.ts';

export type Side = 'l' | 'r' | 't' | 'b';
/** `down`: the link is inside a flow running down (sidesFor). */
export interface Plan { link: Link; a: Box; b: Box; sa: Side; sb: Side; down?: boolean; pa?: Point; pb?: Point }

/** How far apart two cards must be side by side before a connector runs sideways between them. */
const CLEAR = 20;
/** How far a side's only port leans towards the far end, as a share of the side: source, target. */
const LEAN = { a: 0.12, b: 0.06 };

/** `down`: the two cards are in a flow running down (ModeOutput.down), so a link leaves by the bottom or top
 *  whenever the cards are that far apart up and down, as across it leaves by the right or left. */
export function sidesFor(a: Box, b: Box, down = false): { sa: Side; sb: Side } {
  if (down) {
    if (b.y >= a.y + a.h + CLEAR) return { sa: 'b', sb: 't' };
    if (a.y >= b.y + b.h + CLEAR) return { sa: 't', sb: 'b' };
  }
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
      g.plan[g.end === 'a' ? 'pa' : 'pb'] = portPoint(box, side, g.plan.down && (side === 't' || side === 'b') ? offCentre(f) : f);
    });
  }
}

/** In a flow running down, a port on a card's top or bottom keeps out of the middle of the side, where the node's kind
 *  tab (its drag handle) sits on the top border and would hide the arrowhead: the middle fifth of a side is skipped,
 *  the rest keeps its order (a lone straight link: just right of the middle, so a chain still runs straight). */
const offCentre = (f: number): number => (f < 0.5 ? 0.1 + f * 0.56 : 0.62 + (f - 0.5) * 0.56);

function portPoint(b: Box, side: Side, f: number): Point {
  if (side === 'r') return { x: b.x + b.w, y: b.y + b.h * f };
  if (side === 'l') return { x: b.x, y: b.y + b.h * f };
  if (side === 't') return { x: b.x + b.w * f, y: b.y };
  return { x: b.x + b.w * f, y: b.y + b.h };
}
