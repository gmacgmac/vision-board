// The words of the person's Remove card and Remove container (N24 rulings 1 and 3, api.md 141): the
// confirm names what goes ("Remove card 4 'Venue lead time'?", "Remove container 'Notes' and its 3
// cards?"), lists the cards when there are several, and warns of every card or container note still
// owed an answer (the action layer's `owedNotice`: "Card 4 still has an unanswered comment."). The
// toast after says what went. Pure: the held state in, words out.
import type { LedgerState } from '#actions';
import { owedNotice, retireCards } from '#actions';
import { latest } from '#format';
import { idOf, numOf } from './card-numbers.ts';

/** One card the confirm lists: its number and title (the shell's `ConfirmItem`). */
export interface RemoveItem { ref: string; text: string }

/** The confirm step's words, the cards it lists, and the toast once it is done. */
export interface RemoveWords { heading: string; body: string; confirm: string; list?: { items: RemoveItem[] }; done: string }

const ONE = 'It leaves the board and stays in the board\'s history; its number isn\'t given again.';
const SEVERAL = 'They leave the board and stay in the board\'s history; their numbers aren\'t given again.';
const CONTAINER = 'It leaves the board with its cards and stays in the board\'s history.';
const EMPTY = 'It leaves the board and stays in the board\'s history.';

/** The words after what goes: the warnings, each its own sentence. */
const said = (lead: string, warnings: readonly string[]) => [lead, ...warnings].join(' ');

/** Card `id` as the confirm lists it: its number and title. */
const item = (s: LedgerState, id: number): RemoveItem => ({ ref: String(numOf(s, id)), text: latest(s.nodes.get(id)!).title });

/** Remove card: the cards `numbers` (board numbers on `board`, in the order shown). */
export function cardsWords(s: LedgerState, board: string, numbers: readonly number[]): RemoveWords {
  const ids = [...numbers].sort((a, b) => a - b).map((n) => idOf(s, board, n)!);
  const warnings = owedNotice(s, { board, id: ids[0]! }, ids);
  if (ids.length === 1) {
    const one = item(s, ids[0]!);
    return { heading: `Remove card ${one.ref} '${one.text}'?`, body: said(ONE, warnings), confirm: 'Remove card', done: `Removed card ${one.ref}` };
  }
  return {
    heading: `Remove ${ids.length} cards?`, body: said(SEVERAL, warnings), confirm: 'Remove cards',
    list: { items: ids.map((id) => item(s, id)) }, done: `Removed ${ids.length} cards`,
  };
}

/** Remove container: `region` on `board`, titled `title`, with every card in it now (the person's
 * moves count, `retireCards`). */
export function containerWords(s: LedgerState, board: string, region: string, title: string): RemoveWords {
  const ids = retireCards(s, { board, region });
  const warnings = owedNotice(s, { board, region }, ids, title);
  const cards = ids.length === 0 ? '' : ids.length === 1 ? ' and its card' : ` and its ${ids.length} cards`;
  return {
    heading: `Remove container '${title}'${cards}?`, body: said(ids.length ? CONTAINER : EMPTY, warnings), confirm: 'Remove container',
    ...(ids.length > 0 && { list: { items: ids.map((id) => item(s, id)) } }), done: `Removed container '${title}'`,
  };
}
