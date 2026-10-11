// Lanes' last ordering step (ruling 1, "order within each layer to cut crossings"): barycentres
// see only where neighbours sit, not where the connectors will run, so swaps are tried against the
// real router: two neighbours in a stack trade places whenever the container's connectors then
// cross at fewer points. Bounded (containers with few links, short stacks, a fixed number of tries)
// so a large or dense board stays inside the layout budget (rule 15). Deterministic.
import type { Link } from '../../../../format/src/index.ts';
import type { Box } from '../../types.ts';
import { crossingPoints } from '../../route/crossings.ts';
import { routeLines } from '../../route/route.ts';

const MAX_LINKS = 30;
const MAX_STACK = 8;
const PASSES = 2;
/** Swaps tried at most, each one routing the container again. */
const TRIES = 40;

/** `stacks[lane][column]`, sorted in place; `draw` places the cards for the stacks as they are. */
export function untangle(stacks: string[][][], draw: () => Map<string, Box>, links: readonly Link[]): void {
  if (!links.length || links.length > MAX_LINKS) return;
  if (!stacks.some((cols) => cols.some((s) => s && s.length > 1 && s.length <= MAX_STACK))) return;
  const first = draw();
  const groups = new Map([...first.keys()].map((id) => [id, 'lanes']));
  const cost = (pos: Map<string, Box>) => crossingPoints(routeLines([...links], pos, groups).map((r) => r.pts));
  let best = cost(first);
  let tries = TRIES;
  for (let pass = 0; pass < PASSES && best > 0; pass++) {
    let better = false;
    for (const cols of stacks) {
      for (const stack of cols) {
        if (!stack || stack.length < 2 || stack.length > MAX_STACK) continue;
        for (let i = 0; i + 1 < stack.length && best > 0 && tries-- > 0; i++) {
          [stack[i], stack[i + 1]] = [stack[i + 1]!, stack[i]!];
          const c = cost(draw());
          if (c < best) { best = c; better = true; continue; }
          [stack[i], stack[i + 1]] = [stack[i + 1]!, stack[i]!];
        }
      }
    }
    if (!better) break;
  }
}
