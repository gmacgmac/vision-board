// The person's choice of which way a flow runs (D-100 5, api.md 189): one container's, or with no `region` the whole
// board's; `auto` clears it at that level, giving back what is below it (format `directionOf`: the container's, then
// the board's, then the agent's on the container, then `across`). Arranging the board, not an answer: it lights no
// Send. Pure.
import type { ActEvent, DirectionChoices } from '#format';
import type { LedgerState } from './fold.ts';

/** Fold one `direction` act. */
export function foldDirection(s: LedgerState, e: ActEvent): void {
  const choices: DirectionChoices = s.directions.get(e.board!) ?? { regions: new Map() };
  s.directions.set(e.board!, choices);
  const chosen = e.direction === 'auto' ? undefined : e.direction;
  if (e.region !== undefined) {
    if (chosen === undefined) choices.regions.delete(e.region);
    else choices.regions.set(e.region, chosen);
  } else if (chosen === undefined) delete choices.board;
  else choices.board = chosen;
}
