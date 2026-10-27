// Board numbers in (D-041 proposed, api.md 125): every request names a card by its number on the
// board the operation names; the ledger and the fold know it by its identity. This is the one place
// a number coming in becomes an identity, on the path's board; a number that board has not given is
// refused `invalid` at its pointer. Out, packages/actions gives board numbers (numbers.ts).
import type { LedgerState } from '#actions';
import { cardFields, cardId } from '#format';
import type { PointerError } from './problem.ts';
import { problem } from './problem.ts';

type Rec = Record<string, unknown>;

/** Why card `n` names nothing on `board`. */
export const noCard = (board: string, n: unknown): string => `board ${board} has no card ${String(n)}`;

/** The identity of card `n` on `board`, retired or not; undefined for a number the board has not
 * given (or anything not a number). */
export const cardOn = (s: LedgerState, board: string, n: unknown): number | undefined =>
  typeof n === 'number' ? cardId(s.index, board, n) : undefined;

/** `body` (what is sent to make a line of `type`) with its card fields, as the card-reference table
 * lists them (`n`, `nodes`, `cards`), turned from board numbers on `board` into identities, as the
 * ledger line holds them; an `invalid` problem naming every unknown number. */
export function cardsIn(s: LedgerState, board: string, body: Rec, type: string): Rec {
  const errors: PointerError[] = [];
  const id = (n: unknown, pointer: string) => {
    const x = cardOn(s, board, n);
    if (x === undefined) errors.push({ pointer, detail: noCard(board, n) });
    return x;
  };
  const out: Rec = { ...body };
  for (const f of cardFields(type)) {
    const value = f.in === undefined ? body[f.field] : undefined; // a request names no card inside another field
    if (value === undefined) continue;
    if (!f.list) out[f.field] = id(value, `/${f.field}`);
    else if (Array.isArray(value)) out[f.field] = value.map((n, i) => id(n, `/${f.field}/${i}`));
  }
  if (errors.length) throw problem('invalid', `The request names a card board "${board}" does not have. Name each card by its number on this board (get_board lists them).`, { errors });
  return out;
}
