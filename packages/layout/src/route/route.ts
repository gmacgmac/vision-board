// Connectors (field-report batch 3 rulings 2 and 3, tracker M2): right angles with rounded corners,
// fixed sides and spread ports (ports.ts). A link between two cards of one container (`groups`)
// runs through free space, in the gutters between columns and lanes and never under a card
// (search.ts): short links first, each taking the free route that is cheapest once every crossing
// with the lines already placed in its container costs CROSS px. Runs that would share a line then
// get their own tracks (tracks.ts). Links between containers, links in radial, and a link with no
// free route keep the plain elbow (path.ts). Each labelled link gets its label's place
// (labels.ts). Pure and deterministic.
import type { Link } from '#format';
import type { Box, Point, Route } from '../types.ts';
import { boundsOf, overlaps, round } from '../geometry.ts';
import { conflictsBetween } from './crossings.ts';
import { CLEAR_CARD, grow } from './free.ts';
import { frameFor } from './frame.ts';
import type { Frame } from './frame.ts';
import { placeLabel } from './labels.ts';
import { along, elbow, lengthOf, roundedPath, simplify } from './path.ts';
import type { Plan, Side } from './ports.ts';
import { assignPorts, sidesFor } from './ports.ts';
import type { Found } from './search.ts';
import { fiveRuns, threeRuns } from './search.ts';
import type { BoardChannel, Line } from './tracks.ts';
import { spreadTracks } from './tracks.ts';

/** How far outside a container's cards a connector may go round them, px (inside the frame). */
const OUTSIDE = 16;
/** What a crossing costs against length, px: a route may go this much further round to avoid one. */
const CROSS = 150;

/** One container's free space in one frame: its cards grown (free.ts), and where runs may go. */
interface Space { obs: Box[]; byId: Map<string, Box>; area: Box }
type Spaces = (group: string, side: Side) => Space;
/** The lines placed so far in each container, with their bounds (to skip the far ones quickly). */
type Done = { pts: Point[]; box: Box }[];
type Placed = Map<string, Done>;

/** A connector's polyline, source first, before it becomes a path. */
export interface Routed { link: Link; pts: Point[] }

/** `groups`: node id -> container, for the cards whose links route around cards (BoardLayout's
 *  `groups`). Without it every link is a plain elbow. */
export function routeLines(links: Link[], boxes: Map<string, Box>, groups?: ReadonlyMap<string, string>): Routed[] {
  const plans: Plan[] = [];
  for (const link of links) {
    const a = boxes.get(link.from);
    const b = boxes.get(link.to);
    if (a && b && link.from !== link.to) plans.push({ link, a, b, ...sidesFor(a, b) });
  }
  assignPorts(plans);
  const spaces = groups ? spacesOf(boxes, groups) : null;
  const lines: Line[] = [];
  const placed: Placed = new Map();
  const reach = (p: Plan) => Math.abs(p.pa!.x - p.pb!.x) + Math.abs(p.pa!.y - p.pb!.y);
  const order = plans.map((_, i) => i).sort((i, j) => reach(plans[i]!) - reach(plans[j]!) || i - j);
  for (const i of order) lines[i] = lineFor(plans[i]!, spaces, placed, groups);
  spreadTracks(lines);
  return plans.map((plan, i) => ({ link: plan.link, pts: simplify(lines[i]!.pts) }));
}

export function routeLinks(links: Link[], boxes: Map<string, Box>, groups?: ReadonlyMap<string, string>): Route[] {
  const cards = [...boxes.values()];
  const taken: Box[] = [];
  return routeLines(links, boxes, groups).map(({ link, pts }) => {
    const mid = along(pts, lengthOf(pts) / 2);
    const route: Route = { from: link.from, to: link.to, label: link.label, d: roundedPath(pts), mid: { x: round(mid.x), y: round(mid.y) } };
    if (link.label) {
      const at = placeLabel(pts, link.label, cards, taken);
      route.labelAt = { x: round(at.x), y: round(at.y), fits: at.fits };
    }
    return route;
  });
}

function lineFor(plan: Plan, spaces: Spaces | null, placed: Placed, groups?: ReadonlyMap<string, string>): Line {
  const { link, pa, pb, sa } = plan;
  const group = groups?.get(link.from);
  if (spaces && group !== undefined && group === groups!.get(link.to)) {
    const space = spaces(group, sa);
    const f = frameFor(sa);
    const [p, q, a, b] = [f.to(pa!), f.to(pb!), space.byId.get(link.from)!, space.byId.get(link.to)!];
    const done = placed.get(group) ?? placed.set(group, []).get(group)!;
    let best = cheapest(threeRuns(p, q, space.obs, a, b), f, done);
    // Five runs are dearer by two corners: only worth working out to avoid a crossing.
    if (!best || best.crosses > 0) best = cheapest(fiveRuns(p, q, space.obs, a, b, space.area), f, done, best);
    if (best) {
      done.push({ pts: best.line.pts, box: boundsOf(best.line.pts.map((pt) => ({ ...pt, w: 0, h: 0 }))) });
      return best.line;
    }
  }
  return { pts: elbow(pa!, pb!, sa), chans: [] };
}

interface Choice { line: Line; crosses: number; score: number }

/** The cheapest of `found` (on the board) and `best` once crossings with `done` are counted. */
function cheapest(found: Found[], f: Frame, done: Done, best: Choice | null = null): Choice | null {
  for (const c of found) {
    const line = onBoard(c, f);
    const crosses = crossingsWith(line.pts, done);
    const score = c.cost + CROSS * crosses;
    if (!best || score < best.score) best = { line, crosses, score };
  }
  return best;
}

/** How many times `pts` crosses the lines already placed. */
function crossingsWith(pts: Point[], done: Done): number {
  const box = boundsOf(pts.map((pt) => ({ ...pt, w: 0, h: 0 })));
  let n = 0;
  // A pixel of slack: lines that only touch still share a stretch.
  for (const d of done) if (overlaps(box, d.box, 1)) n += conflictsBetween(pts, d.pts);
  return n;
}

/** A found route back on the board, its channels as board coordinates. */
function onBoard(found: Found, f: Frame): Line {
  const pts = found.pts.map((p) => f.back(p));
  const chans: BoardChannel[] = [];
  for (const c of found.chans) {
    const [p, q] = [found.pts[c.seg]!, found.pts[c.seg + 1]!];
    const [a, b] = [pts[c.seg]!, pts[c.seg + 1]!];
    if (a.x === b.x && a.y === b.y) continue;
    const ends = p.x === q.x
      ? [f.back({ x: c.lo, y: p.y }), f.back({ x: c.hi, y: p.y })]
      : [f.back({ x: p.x, y: c.lo }), f.back({ x: p.x, y: c.hi })];
    const axis = a.x === b.x ? 'x' : 'y';
    const [e0, e1] = [ends[0]![axis], ends[1]![axis]];
    chans.push({ seg: c.seg, axis, lo: Math.min(e0, e1), hi: Math.max(e0, e1) });
  }
  return { pts, chans };
}

/** Each container's free space, worked out once per frame it is asked for. */
function spacesOf(boxes: Map<string, Box>, groups: ReadonlyMap<string, string>): Spaces {
  const members = new Map<string, string[]>();
  for (const [id, g] of groups) if (boxes.has(id)) (members.get(g) ?? members.set(g, []).get(g)!).push(id);
  const kept = new Map<string, Space>();
  return (group, side) => {
    const key = `${side} ${group}`;
    const had = kept.get(key);
    if (had) return had;
    const f = frameFor(side);
    const ids = members.get(group)!;
    const byId = new Map(ids.map((id) => [id, f.box(grow(boxes.get(id)!))]));
    const area = f.box(grow(boundsOf(ids.map((id) => boxes.get(id)!)), OUTSIDE + CLEAR_CARD));
    const space = { obs: [...byId.values()], byId, area };
    kept.set(key, space);
    return space;
  };
}
