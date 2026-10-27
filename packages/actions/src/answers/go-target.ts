// What a card number names on a board (go-to-card, goToCard flag; the page's go-to-card.ts keeps the
// box and its timer): a card drawn with it, nothing, a card on the board but not drawn (hidden with
// the answered cards), or a retired card with the board version that last showed it, as the
// container's retired marker does (`lastShown`, ruling 4). Pure.
import { cardId } from '#format';
import type { LedgerState } from '../fold.ts';
import { lastShown } from './retired.ts';

/** What a number names on the board: a card drawn with it, nothing, a card on the board but not
 *  drawn (hidden with the answered cards), or a retired card with the version that last showed it. */
export type GoTarget =
  | { to: 'card'; id: string }
  | { to: 'none' }
  | { to: 'hidden' }
  | { to: 'retired'; version?: number; until?: number };

/** Card `n` on `board` in state `s` (none before the ledger is read). `drawn`: whether the layout drew a card id (the View's ids are
 *  board numbers). `versions`: past versions can show (the versionView flag). */
export function goTarget(s: LedgerState | null, board: string, n: number, drawn: (id: string) => boolean, versions = true): GoTarget {
  const id = String(n);
  if (drawn(id)) return { to: 'card', id };
  if (!s) return { to: 'none' };
  const x = cardId(s.index, board, n);
  const card = x === undefined ? undefined : s.nodes.get(x);
  if (!card) return { to: 'none' };
  if (card.retired === undefined) return { to: 'hidden' };
  return { to: 'retired', ...(versions && lastShown(s, board, card.retired)) };
}
