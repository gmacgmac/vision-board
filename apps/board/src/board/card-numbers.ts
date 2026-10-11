// Board numbers and identities on the page (D-041 proposed, api.md 125). The page holds the ledger
// folded by identity (io.ts `readLedger` reads every line with `fromLine`), while everything it
// draws and sends names a card by its number on its board: the View's node ids, the DOM's
// `data-id`, every act body. These turn one into the other, on the page's side, so a module that
// indexes the folded state with a number it drew goes through here. Pure.
import type { LedgerEvent, LedgerLine } from '../../../../packages/format/src/index.ts';
import { boardNumber, cardId, fromLine } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';

type Held = Pick<LedgerState, 'index'>;

/** The identity of card `n` on `board`, or undefined for a number the board has not given. */
export const idOf = (s: Held, board: string, n: number): number | undefined => cardId(s.index, board, n);

/** Card `id`'s number on its board, or undefined for an unknown card. */
export const numOf = (s: Held, id: number): number | undefined => boardNumber(s.index, id);

/** The stored line an act or a card seen answered with (board numbers on `board`, the board it was
 * sent to) as the event the fold reads: each card back to its identity. */
export function answerEvent(s: Held, board: string, line: LedgerLine): LedgerEvent {
  const id = (n: unknown) => (typeof n === 'number' ? idOf(s, board, n) ?? n : n);
  const out: LedgerLine = { ...line };
  if (out.n !== undefined) out.n = id(out.n);
  if (Array.isArray(out.nodes)) out.nodes = out.nodes.map(id);
  return fromLine(out);
}
