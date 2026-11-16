// The person's bookmark (ruling 3, assumption A, api.md 128, 182; D-099 2): a private mark on any card, kept in the
// ledger and folded for the page only. No agent read looks at `bookmarks`, and the fold keeps a bookmark out of
// everything an agent reads (fold.ts `applyEvent`: no head, no seen, no answer). Pure.
import type { ActEvent } from '#format';
import { nodesOf } from '#format';
import type { LedgerState } from './fold.ts';

/** Fold one `bookmark` or `unbookmark`. A bookmark stays through a redraw: it names no version. */
export function foldBookmark(s: LedgerState, e: ActEvent): void {
  if (e.action === 'bookmark') s.bookmarks.set(e.id!, e.seq);
  else s.bookmarks.delete(e.id!);
}

/** The bookmarked cards on `board` now, by identity, in card order; a retired card has left. */
export const bookmarksOn = (s: LedgerState, board: string): number[] =>
  nodesOf(s, board).filter((x) => s.bookmarks.has(x.id)).map((x) => x.id);
