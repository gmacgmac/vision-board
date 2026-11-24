// The person's bookmark on the page (cardBookmark flag; D-099 2, api.md 128; called the flag before ledger format
// 20): a click on a node's number, B on a focused card, its number's menu and right-click set or clear it. The
// toolbar's "N bookmarked" chip lists the bookmarked cards (`cards`, drawn by chrome/BookmarkedChip.svelte); choosing one
// goes to it as Go to card does. A bookmark is the person's private mark: one act, `bookmark` or `unbookmark`, naming
// the card by its board number and no version, so it stays through a redraw; nothing here reaches an agent (the server
// keeps it out of every agent read, and the Send message reads no bookmark). Which cards are bookmarked is
// `BoardState.bookmarks`, as the page reads the board. Nothing acts while a past version shows (versions.ts `guard`,
// sender.ts).
import type { View } from '#format';
import type { BoardState, OpenCard } from '#actions';
import type { ActFields } from '../io.ts';
import * as cardsWords from '../words/cards.ts';

/** The act that turns card `id`'s bookmark over: `bookmark` when it has none, `unbookmark` when it has one. */
export const bookmarkAct = (id: string, bookmarked: boolean): ActFields => ({ action: bookmarked ? 'unbookmark' : 'bookmark', n: Number(id) });

/** The bookmarked cards on the board, in number order (reading order for cards with a number): the chip's list rows. */
export const bookmarkedCards = (view: View, bookmarks: ReadonlySet<string>): OpenCard[] =>
  view.nodes.filter((n) => n.n !== undefined && bookmarks.has(n.id)).sort((a, b) => a.n! - b.n!).map((n) => ({ n: n.n!, id: n.id, title: n.title }));

export interface BookmarkDeps {
  /** The cardBookmark flag: off, no button, no key, no chip. */
  on: boolean;
  view(): View | null;
  state(): BoardState | null;
  record(fields: ActFields): Promise<boolean>;
  toast(text: string): void;
}

export interface BookmarkFlow {
  /** The button, B or the number on card `id`: bookmark it, or take its bookmark off. True once written. */
  toggle(id: string): Promise<boolean>;
  /** The bookmarked cards on the board, in number order: the chip counts and lists them. */
  cards(): OpenCard[];
}

export function createBookmarkFlow(d: BookmarkDeps): BookmarkFlow {
  return {
    async toggle(id) {
      const state = d.state();
      if (!d.on || !state || !d.view()?.nodes.some((n) => n.id === id && n.n !== undefined)) return false;
      const bookmarked = state.bookmarks.has(id);
      if (!(await d.record(bookmarkAct(id, bookmarked)))) return false;
      d.toast(`${id} ${bookmarked ? cardsWords.bookmarkRemoved : cardsWords.bookmarkedWord}`);
      return true;
    },
    cards() {
      const [view, state] = [d.view(), d.state()];
      return d.on && view && state ? bookmarkedCards(view, state.bookmarks) : [];
    },
  };
}
