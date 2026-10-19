// The person's hidden notes (api.md 156): a private mark on any card, the flag's twin. The latest of
// a card's `notes-hide` and `notes-show` decides whether its note thread is put away. Kept in the
// ledger and folded for the page only: no agent read looks at `notesHidden`, and the fold keeps the
// mark out of everything an agent reads (fold.ts `applyEvent`: no head, no seen, no answer). Pure.
import type { ActEvent } from '../../format/src/index.ts';
import { nodesOf } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';

/** Fold one `notes-hide` or `notes-show`. It stays through a redraw: it names no version. */
export function foldNotesHidden(s: LedgerState, e: ActEvent): void {
  if (e.action === 'notes-hide') s.notesHidden.set(e.id!, e.seq);
  else s.notesHidden.delete(e.id!);
}

/** The cards whose notes are hidden on `board` now, by identity, in card order; a retired card has left. */
export const notesHiddenOn = (s: LedgerState, board: string): number[] =>
  nodesOf(s, board).filter((x) => s.notesHidden.has(x.id)).map((x) => x.id);
