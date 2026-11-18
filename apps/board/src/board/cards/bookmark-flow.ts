// The person's bookmark on the page (cardBookmark flag; D-099 2, api.md 128; called the flag before ledger format
// 20): a click on a node's number, B on a focused card, its number's menu and right-click set or clear it, and the toolbar's "N bookmarked" chip steps through the bookmarked cards, one card after
// another in number order, from the focused one (or, since pressing the chip takes focus off the card, from the one it
// went to last), wrapping. A bookmark is the person's private mark: one act, `bookmark` or `unbookmark`, naming the
// card by its board number and no version, so it stays through a redraw; nothing here reaches an agent (the server
// keeps it out of every agent read, and the Send message reads no bookmark). Which cards are bookmarked is
// `BoardState.bookmarks`, as the page reads the board. Nothing acts while a past version shows (versions.ts `guard`,
// sender.ts).
import type { View } from '#format';
import type { BoardState } from '#actions';
import type { ActFields } from '../io.ts';
import * as cardsWords from '../words/cards.ts';

/** The act that turns card `id`'s bookmark over: `bookmark` when it has none, `unbookmark` when it has one. */
export const bookmarkAct = (id: string, bookmarked: boolean): ActFields => ({ action: bookmarked ? 'unbookmark' : 'bookmark', n: Number(id) });

/** The bookmarked cards on the board, in number order (reading order for cards with a number). */
export const bookmarkedIds = (view: View, bookmarks: ReadonlySet<string>): string[] =>
  view.nodes.filter((n) => n.n !== undefined && bookmarks.has(n.id)).sort((a, b) => a.n! - b.n!).map((n) => n.id);

/** The bookmarked card after `from` (a card id, or none), wrapping; undefined with none bookmarked. When
 * `from` is not bookmarked, the first bookmarked card numbered after it. */
export function nextBookmarked(ids: readonly string[], from: string | null): string | undefined {
  if (!ids.length) return undefined;
  const at = from === null ? -1 : ids.indexOf(from);
  if (at >= 0) return ids[(at + 1) % ids.length];
  return ids.find((id) => from !== null && Number(id) > Number(from)) ?? ids[0];
}

/** The chip's words: "3 bookmarked", and what a press does. */
export const bookmarkedWords = (k: number) => ({ count: String(k), word: cardsWords.bookmarkedWord, title: cardsWords.bookmarkedGoToTheNext(k) });

export interface BookmarkDeps {
  /** The cardBookmark flag: off, no button, no key, no chip. */
  on: boolean;
  view(): View | null;
  state(): BoardState | null;
  record(fields: ActFields): Promise<boolean>;
  /** The card that has focus, if any (focus.ts). */
  focused(): string | null;
  /** Whether card `id` is drawn now ("Hide answered" can hide a bookmarked card). */
  drawn(id: string): boolean;
  /** Focus card `id`; focus.ts pans it into view. */
  focusCard(id: string): void;
  toast(text: string): void;
}

export interface BookmarkFlow {
  /** The button, B or the number on card `id`: bookmark it, or take its bookmark off. True once written. */
  toggle(id: string): Promise<boolean>;
  /** The bookmarked cards on the board as drawn, in number order (the chip counts them). */
  ids(): string[];
  /** The chip: focus the next bookmarked card that is drawn. */
  next(): void;
}

export function createBookmarkFlow(d: BookmarkDeps): BookmarkFlow {
  /** The card the chip went to last: a press on the chip moves focus off it. */
  let last: string | null = null;
  const ids = (): string[] => {
    const [view, state] = [d.view(), d.state()];
    return d.on && view && state ? bookmarkedIds(view, state.bookmarks) : [];
  };
  return {
    async toggle(id) {
      const state = d.state();
      if (!d.on || !state || !d.view()?.nodes.some((n) => n.id === id && n.n !== undefined)) return false;
      const bookmarked = state.bookmarks.has(id);
      if (!(await d.record(bookmarkAct(id, bookmarked)))) return false;
      d.toast(`${id} ${bookmarked ? cardsWords.bookmarkRemoved : cardsWords.bookmarkedWord}`);
      return true;
    },
    ids,
    next() {
      const shown = ids().filter((id) => d.drawn(id));
      const to = nextBookmarked(shown, d.focused() ?? last);
      last = to ?? null;
      if (to) d.focusCard(to);
      else if (ids().length) d.toast(cardsWords.theBookmarkedCardsAreHidden);
    },
  };
}
