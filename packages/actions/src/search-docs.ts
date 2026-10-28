// The board's cards as search documents (tracker M7, SEARCH_01): what the search box (`#search`)
// looks through. One document per card on the view shown, its id the card's number (`String(n)`,
// as the View names it), with the parts a person may remember a card by: its title, its text, its
// container, the person's notes on it and the agents' replies. Pure.
import type { View } from '#format';
import { cardId } from '#format';
import type { SearchDoc } from '#search';
import type { LedgerState } from './fold.ts';

/** Each part of a card search reads, and how much a match there counts: the title most, then the
 * text, then the rest. The names are what a hit's `fields` say matched. */
export const SEARCH_FIELDS = { title: 3, body: 2, container: 1, note: 1, reply: 1 } as const;
export type SearchFieldName = keyof typeof SEARCH_FIELDS;

const field = (name: SearchFieldName, text: string | undefined) =>
  (text?.trim() ? [{ name, text, weight: SEARCH_FIELDS[name] }] : []);

/** One search document per card of `view` on `board`, in the view's order. `view` is the one the
 * person sees: a past version when one is showing, with the person's moves applied (`placedView`),
 * so a card's container is the one it sits in. Notes are the person's own, sent or not, one field
 * each (a note on a group of cards is on each of them); replies are the agents', one field each. */
export function boardSearchDocs(s: LedgerState, board: string, view: View): SearchDoc[] {
  const containers = new Map(view.regions.map((r) => [r.id, r.title]));
  return view.nodes.map((node) => {
    const id = cardId(s.index, board, node.n ?? Number(node.id));
    const notes = id === undefined ? [] : s.items.get(id)?.notes ?? [];
    const replies = id === undefined ? [] : s.replies.get(id) ?? [];
    return {
      id: node.id,
      fields: [
        ...field('title', node.title), ...field('body', node.body), ...field('container', containers.get(node.region)),
        ...notes.flatMap((n) => field('note', n.text)), ...replies.flatMap((r) => field('reply', r.text)),
      ],
    };
  });
}
