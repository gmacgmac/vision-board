// The person's flag (ruling 3, assumption A, api.md 128): a private mark on any card, kept in the
// ledger and folded for the page only. No agent read looks at `flags`, and the fold keeps a flag
// out of everything an agent reads (fold.ts `applyEvent`: no head, no seen, no answer). Pure.
import type { ActEvent } from '#format';
import { nodesOf } from '#format';
import type { LedgerState } from './fold.ts';

/** Fold one `flag` or `unflag`. A flag stays through a redraw: it names no version. */
export function foldFlag(s: LedgerState, e: ActEvent): void {
  if (e.action === 'flag') s.flags.set(e.id!, e.seq);
  else s.flags.delete(e.id!);
}

/** The flagged cards on `board` now, by identity, in card order; a retired card has left. */
export const flagsOn = (s: LedgerState, board: string): number[] =>
  nodesOf(s, board).filter((x) => s.flags.has(x.id)).map((x) => x.id);
