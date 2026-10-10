// The order the agent reads the person's responses in (every-node PLAN ruling 7, api.md 120). Each
// batch, the acts up to a Send, is sorted by card number: an act on cards goes in at its lowest card
// (a note on a group at the lowest of its cards); a note on, a place for or the layout of a whole
// container at the lowest card in it now, or first when it holds none; an answer to a grant
// request or a revoke, which is on no card, after the cards. A Send ends its batch. Acts at one
// place stay in the order made. The ledger keeps the order of the clicks. Pure.
import type { ActEvent } from '../../format/src/index.ts';
import { isContainerAct, nodesOf } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { responsesAfter } from './pending.ts';
import { placeOf, scopeOf } from './references.ts';

/** Where act `e` goes in its batch: a card number, -Infinity for first, Infinity for last. */
function placeIn(s: LedgerState, e: ActEvent): number {
  const { board, container, cards } = scopeOf(s, e);
  if (cards.length) return Math.min(...cards);
  if (!(isContainerAct(e) || e.action === 'mode') || board === undefined) return Infinity;
  const inside = nodesOf(s, board).filter((x) => placeOf(s, x.n)?.region === container).map((x) => x.n);
  return inside.length ? Math.min(...inside) : -Infinity;
}

/** `acts`, in ledger order, as the agent reads them: each batch in card order (a stable sort). */
export function inCardOrder(s: LedgerState, acts: readonly ActEvent[]): ActEvent[] {
  const out: ActEvent[] = [];
  let batch: { e: ActEvent; at: number }[] = [];
  const flush = () => {
    out.push(...batch.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? -1 : 1)).map((x) => x.e));
    batch = [];
  };
  for (const e of acts) {
    if (e.action !== 'send') batch.push({ e, at: placeIn(s, e) });
    else {
      flush();
      out.push(e);
    }
  }
  flush();
  return out;
}

/** `check_responses` (api.md 31, 120): at most `limit` of the person's acts on `board` after
 * `after`, cut in ledger order, then put in card order. `more` when the cut left some out: the next
 * page is after the highest `seq` in `responses` (`head` is the ledger's latest line, past them). */
export function responsesPage(s: LedgerState, board: string, after: number, limit: number, agent?: string): { responses: ActEvent[]; more?: true } {
  const all = responsesAfter(s, board, after, agent);
  return { responses: inCardOrder(s, all.slice(0, limit)), ...(all.length > limit && { more: true as const }) };
}
