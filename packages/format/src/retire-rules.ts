// The ledger's rule for a `retire` line (api.md 126), beside the other context rules in
// ledger-index.ts, which call it.
import type { RetireEvent } from './ledger.ts';
import { LATER_REGION } from './ledger.ts';
import type { CardName, LedgerIndex } from './ledger-index.ts';

/** A `retire` (api.md 126): its cards are on its board and still there; a container is one of
 * the board's (never Later) and still there. Which cards a container holds is the server's to fill
 * in (the person's moves count, packages/actions); whether any of them is still owed an answer is
 * the action layer's rule (`retireProblem`). */
export function retireContext(ix: LedgerIndex, e: RetireEvent, p: string[], name: CardName): void {
  const regions = ix.boards.get(e.board);
  if (!regions) return void p.push(`board: unknown "${e.board}"`);
  if (e.region === LATER_REGION) p.push(`region: "${LATER_REGION}" is the board's built-in Later, not a container to retire`);
  else if (e.region !== undefined && !regions.has(e.region)) p.push(`region: unknown "${e.region}" on board "${e.board}"`);
  for (const id of e.cards) {
    const x = ix.nodes.get(id);
    if (!x) p.push(`cards: unknown node ${id}`);
    else if (x.board !== e.board) p.push(`cards: card ${name(id)} is on board "${x.board}", not "${e.board}"`);
    else if (ix.retired.has(id)) p.push(`cards: card ${name(id)} is already retired`);
  }
}
