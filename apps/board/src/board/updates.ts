// Changed cards on the page (cardUpdates flag, FE_02, D-018): how many versions of a card the person
// has not seen, the versions its stepper steps through, worded from the ledger, and the card seen
// lines a selection sends. Which items are unseen is the conditions table's answer (`item.unseen`,
// `pageConditions`), never worked out here; the tab shows only past version 1, so a count starts at
// `max(seen, 1)` (the row's trueWhen). Plain data in, plain data out; update-flow.ts sends the lines.
import { latest } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { clearsOnSelect, versionChanges } from '../../../../packages/actions/src/index.ts';
import type { CardStep } from '../../../../packages/ui/src/index.ts';

/** Card `n`'s versions past the one the person last saw, and past version 1. */
const unseenVersions = (s: LedgerState, n: number) => {
  const from = Math.max(s.seen.get(n) ?? 0, 1);
  return (s.nodes.get(n)?.versions ?? []).filter((v) => v.ver > from);
};

/** How many updates card `n`'s tab counts: 0 for none, or for a card still at version 1. */
export const unseenCount = (s: LedgerState, n: number): number => unseenVersions(s, n).length;

/** The steps for card `n`'s stepper, oldest first: each unseen version, when and by whom, and what
 *  changed from the version before. `time` writes a line's time in the person's clock. */
export function unseenSteps(s: LedgerState, n: number, time: (at: string) => string): CardStep[] {
  const versions = s.nodes.get(n)?.versions ?? [];
  return unseenVersions(s, n).map((v) => {
    const agent = v.agent === undefined ? undefined : s.agents.get(v.agent);
    const prev = versions[versions.indexOf(v) - 1];
    return { ver: v.ver, when: time(v.at), ...(agent && { agent }), changes: versionChanges(prev, v) };
  });
}

/** The items a selection marks seen: for each card condition the page shows, those it holds for when
 *  the row's `clearedBy` names select (`clearsOnSelect`, never a list of kinds here). */
export const seenOnSelect = (c: { fresh: ReadonlySet<number>; unseen: ReadonlySet<number> }): Set<number> =>
  new Set([...(clearsOnSelect('item.new') ? c.fresh : []), ...(clearsOnSelect('item.unseen') ? c.unseen : [])]);

/** A card seen line's fields: version `ver` of card `n`. */
export interface SeenMark { n: number; ver: number }

/** The card seen lines for selected cards `ids`, in order: each `held` item's latest version. */
export const seenMarks = (s: LedgerState, held: ReadonlySet<number>, ids: readonly string[]): SeenMark[] =>
  ids.map(Number).flatMap((n) => {
    const node = held.has(n) ? s.nodes.get(n) : undefined;
    return node ? [{ n, ver: latest(node).ver }] : [];
  });
