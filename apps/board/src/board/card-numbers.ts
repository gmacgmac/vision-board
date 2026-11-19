// Board numbers and identities on the page (D-041 proposed, api.md 125). The page holds the ledger
// folded by identity (io.ts `readLedger` reads every line with `fromLine`), while everything it
// draws and sends names a card by its number on its board: the View's node ids, the DOM's
// `data-id`, every act body. These turn one into the other, on the page's side, so a module that
// indexes the folded state with a number it drew goes through here. Pure.
import type { LedgerEvent, LedgerLine, View, ViewNode } from '#format';
import { boardNumber, cardFields, cardId, fromLine, sortByTimeline } from '#format';
import type { LedgerState } from '#actions';

type Held = Pick<LedgerState, 'index'>;

/** Cards in number order, those with none last: DOM order is tab order is reading order, and every list on the
 * stage follows it. A container with a timeline (D-105; FIX_03, point 601) is read the way the line draws it: at its
 * first card's place, its dated cards in timeline order (`sortByTimeline`, the layout's), then its other cards in
 * number order. Every other card keeps its place, so a board with no date reads exactly by number. */
export function readingOrder(view: View): ViewNode[] {
  const byNumber = view.nodes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (a.n.n ?? Infinity) - (b.n.n ?? Infinity) || a.i - b.i)
    .map((x) => x.n);
  const lines = new Map<string, ViewNode[]>();
  for (const n of byNumber) if (n.timeline !== undefined) (lines.get(n.region) ?? lines.set(n.region, []).get(n.region)!).push(n);
  if (!lines.size) return byNumber;
  const started = new Set<string>();
  return byNumber.flatMap((n) => {
    const line = lines.get(n.region);
    if (!line) return [n];
    const first = started.has(n.region) ? [] : (started.add(n.region), sortByTimeline(line));
    return n.timeline === undefined ? [...first, n] : first;
  });
}

/** The identity of card `n` on `board`, or undefined for a number the board has not given. */
export const idOf = (s: Held, board: string, n: number): number | undefined => cardId(s.index, board, n);

/** Card `id`'s number on its board, or undefined for an unknown card. */
export const numOf = (s: Held, id: number): number | undefined => boardNumber(s.index, id);

/** The stored line an act, a card seen or a retire answered with (board numbers on `board`, the board
 * it was sent to) as the event the fold reads: each card back to its identity. */
export function answerEvent(s: Held, board: string, line: LedgerLine): LedgerEvent {
  const id = (n: unknown) => (typeof n === 'number' ? idOf(s, board, n) ?? n : n);
  const out: LedgerLine = { ...line };
  // The card-reference table, read back: each card field from its board number to its identity.
  for (const f of cardFields(line.type)) {
    const value = f.in === undefined ? out[f.field] : undefined; // these lines name no card inside another field
    if (value === undefined) continue;
    out[f.field] = f.list ? (Array.isArray(value) ? value.map(id) : value) : id(value);
  }
  return fromLine(out);
}
