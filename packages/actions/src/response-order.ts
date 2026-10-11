// The order the agent reads the person's responses in (every-node PLAN ruling 7, api.md 120). Each
// batch, the acts up to a Send, is sorted by card number: an act on cards goes in at its lowest card
// (a note on a group at the lowest of its cards); a note on, a place for or the layout of a whole
// container at the lowest card in it now, or first when it holds none; an answer to a grant
// request or a revoke, which is on no card, after the cards. A Send ends its batch. Acts at one
// place stay in the order made. The ledger keeps the order of the clicks. Pure.
import type { ActEvent } from '../../format/src/index.ts';
import { isContainerAct, latest, nodesOf } from '../../format/src/index.ts';
import type { Meaning } from './action-words.ts';
import { meaningOf } from './action-words.ts';
import type { LedgerState } from './fold.ts';
import { eventOut } from './numbers.ts';
import { responsesAfter } from './pending.ts';
import { placeOf, scopeOf } from './references.ts';

/** Where act `e` goes in its batch: a card number, -Infinity for first, Infinity for last. */
function placeIn(s: LedgerState, e: ActEvent): number {
  const { board, container, cards } = scopeOf(s, e);
  if (cards.length) return Math.min(...cards);
  if (!(isContainerAct(e) || e.action === 'mode') || board === undefined) return Infinity;
  const inside = nodesOf(s, board).filter((x) => placeOf(s, x.id)?.region === container).map((x) => x.id);
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

/** An act as `check_responses` reports it, cards by board number (`n`, `nodes`, api.md 125): with
 * `means`, the word ✓ or ✗ says on its card's kind. */
export type ReportedAct = Omit<ActEvent, 'id'> & { n?: number; means?: Meaning };

/** What an ✓ or ✗ means on its card's kind now (action-words.ts, panel-send ruling 4): "yes" or "no"
 * on a question, "done" for ✓ on an action; nothing elsewhere. */
function reported(s: LedgerState, e: ActEvent): ReportedAct {
  const node = (e.action === 'ack' || e.action === 'drop') && e.id !== undefined ? s.nodes.get(e.id) : undefined;
  const means = node && meaningOf(e.action, latest(node).kind);
  return eventOut(s, means ? { ...e, means } : e) as unknown as ReportedAct;
}

/** `check_responses` (api.md 31, 120, 121): at most `limit` of the person's acts on `board` after
 * `after`, cut in ledger order, then put in card order, each ✓ or ✗ with what it `means`. `more` when the cut left some out: the next
 * page is after the highest `seq` in `responses` (`head` is the ledger's latest line, past them). */
export function responsesPage(s: LedgerState, board: string, after: number, limit: number, agent?: string): { responses: ReportedAct[]; more?: true } {
  const all = responsesAfter(s, board, after, agent);
  const responses = inCardOrder(s, all.slice(0, limit)).map((e) => reported(s, e));
  return { responses, ...(all.length > limit && { more: true as const }) };
}
