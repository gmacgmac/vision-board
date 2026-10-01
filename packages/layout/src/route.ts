// Connectors: right angles with rounded corners, fixed sides, ports spread along each side in
// the order of the far end, so fan-outs don't start from one point.
import type { Link } from '../../format/src/index.ts';
import type { Box, Point, Route } from './types.ts';
import { centre, round } from './geometry.ts';

type Side = 'l' | 'r' | 't' | 'b';
interface Plan { link: Link; a: Box; b: Box; sa: Side; sb: Side; pa?: Point; pb?: Point }

const RADIUS = 10;
const CLEAR = 20;

export function routeLinks(links: Link[], boxes: Map<string, Box>): Route[] {
  const plans: Plan[] = [];
  for (const link of links) {
    const a = boxes.get(link.from);
    const b = boxes.get(link.to);
    if (a && b && link.from !== link.to) plans.push({ link, a, b, ...sidesFor(a, b) });
  }
  assignPorts(plans);
  return plans.map((p) => {
    const pts = elbow(p.pa!, p.pb!, p.sa);
    const [m0, m1] = [pts[1]!, pts[2]!];
    return {
      from: p.link.from, to: p.link.to, label: p.link.label,
      d: roundedPath(pts), mid: { x: round((m0.x + m1.x) / 2), y: round((m0.y + m1.y) / 2) },
    };
  });
}

function sidesFor(a: Box, b: Box): { sa: Side; sb: Side } {
  if (b.x >= a.x + a.w + CLEAR) return { sa: 'r', sb: 'l' };
  if (a.x >= b.x + b.w + CLEAR) return { sa: 'l', sb: 'r' };
  return b.y > a.y ? { sa: 'b', sb: 't' } : { sa: 't', sb: 'b' };
}

function assignPorts(plans: Plan[]) {
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
      const f = 0.5 + (i - (group.length - 1) / 2) * Math.min(0.2, 0.7 / group.length);
      const box = g.end === 'a' ? g.plan.a : g.plan.b;
      const side = g.end === 'a' ? g.plan.sa : g.plan.sb;
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

function elbow(p: Point, q: Point, side: Side): Point[] {
  if (side === 'l' || side === 'r') {
    const mx = (p.x + q.x) / 2;
    return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
  }
  const my = (p.y + q.y) / 2;
  return [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
}

/** SVG path through the points, each corner rounded by a quadratic curve. */
export function roundedPath(pts: Point[]): string {
  const f = (p: Point) => `${round(p.x)} ${round(p.y)}`;
  let d = `M ${f(pts[0]!)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, c, b] = [pts[i - 1]!, pts[i]!, pts[i + 1]!];
    const r = Math.min(RADIUS, dist(a, c) / 2, dist(c, b) / 2);
    if (r < 0.5) { d += ` L ${f(c)}`; continue; }
    d += ` L ${f(toward(c, a, r))} Q ${f(c)} ${f(toward(c, b, r))}`;
  }
  return `${d} L ${f(pts[pts.length - 1]!)}`;
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const toward = (from: Point, to: Point, r: number): Point => {
  const l = dist(from, to) || 1;
  return { x: from.x + ((to.x - from.x) * r) / l, y: from.y + ((to.y - from.y) * r) / l };
};
