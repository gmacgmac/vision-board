// The ledger's rule for a `retire` line (api.md 126), beside the other context rules in
// ledger-index.ts, which call it.
import type { RetireEvent } from './ledger.ts';
import { LATER_REGION } from './ledger.ts';
import type { CardName, LedgerIndex } from './ledger-index.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

/** A `retire` (api.md 126): its cards are on its board and still there; a container is one of
 * the board's (never Later) and still there. Which cards a container holds is the server's to fill
 * in (the person's moves count, packages/actions); whether any of them is still owed an answer is
 * the action layer's rule (`retireProblem`). */
export function retireContext(ix: LedgerIndex, e: RetireEvent, p: string[], name: CardName): void {
  const regions = ix.boards.get(e.board);
  if (!regions) return void p.push(formatLedgerWords.boardUnknown(e.board));
  if (e.region === LATER_REGION) p.push(formatLedgerWords.regionIsTheBoardS(LATER_REGION));
  else if (e.region !== undefined && !regions.has(e.region)) p.push(formatLedgerWords.regionUnknownOnBoard(e.region, e.board));
  for (const id of e.cards) {
    const x = ix.nodes.get(id);
    if (!x) p.push(formatLedgerWords.cardsUnknownNode(id));
    else if (x.board !== e.board) p.push(formatLedgerWords.cardsCardIsOnBoard(name(id), x.board, e.board));
    else if (ix.retired.has(id)) p.push(formatLedgerWords.cardsCardIsAlreadyRetired(name(id)));
  }
}
