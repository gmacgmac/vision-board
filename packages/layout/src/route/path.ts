// Polylines into SVG paths: right angles with rounded corners. Plus the plain elbow (used between
// containers, in radial, and where no route through free space exists) and points along a line.
import type { Point } from '../types.ts';
import { round } from '../geometry.ts';
import type { Side } from './ports.ts';

const RADIUS = 10;

/** One bend halfway between the ends: the connector as it was before obstacle routing. */
export function elbow(p: Point, q: Point, side: Side): Point[] {
  if (side === 'l' || side === 'r') {
    const mx = (p.x + q.x) / 2;
    return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
  }
  const my = (p.y + q.y) / 2;
  return [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
}

/** The same line without zero-length steps or points in the middle of a straight run. */
export function simplify(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && dist(last, p) < 0.01) continue;
    const prev = out[out.length - 2];
    if (last && prev && ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))) out.pop();
    out.push(p);
  }
  return out;
}

/** The point `at` px along the line from its start (its end when the line is shorter). */
export function along(pts: Point[], at: number): Point {
  let left = at;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const l = dist(a, b);
    if (l >= left) return toward(a, b, left);
    left -= l;
  }
  return pts[pts.length - 1]!;
}

export const lengthOf = (pts: Point[]): number => pts.reduce((s, p, i) => (i ? s + dist(pts[i - 1]!, p) : 0), 0);

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
