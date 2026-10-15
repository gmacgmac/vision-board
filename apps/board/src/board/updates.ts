// Changed cards on the page (cardUpdates flag, FE_02, D-018): how many versions of a card the person
// has not seen, the versions its stepper steps through, worded from the ledger, and the card seen
// lines a selection sends. Which items are unseen is the conditions table's answer (`item.unseen`,
// `pageConditions`), never worked out here; the tab shows only past version 1, so a count starts at
// `max(seen, 1)` (the row's trueWhen). A card is named by its number on `board`, as drawn; the held
// state is by identity (card-numbers.ts). Plain data in, plain data out; update-flow.ts sends the lines.
import { latest } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { clearsOnSelect, unseenAnswer, versionChanges } from '../../../../packages/actions/src/index.ts';
import type { CardStep } from '../../../../packages/ui/src/index.ts';
import { idOf } from './card-numbers.ts';

/** Card `n` on `board`'s versions past the one the person last saw, and past version 1. */
const unseenVersions = (s: LedgerState, board: string, n: number) => {
  const id = idOf(s, board, n) ?? 0;
  const from = Math.max(s.seen.get(id) ?? 0, 1);
  return (s.nodes.get(id)?.versions ?? []).filter((v) => v.ver > from);
};

/** The agent's reply that cleared card `n` (D-045, answer-model ruling 7) while the person has not
 *  looked at it since: an update with no version of its own. None when a newer version cleared it. */
function answerOf(s: LedgerState, board: string, n: number) {
  const id = idOf(s, board, n) ?? 0;
  const seq = unseenAnswer(s, id) ? s.clears.get(id)?.seq : undefined;
  // A reply to a note on a group of cards is filed under the card it names: look in every card's.
  return seq === undefined ? undefined : [...s.replies.values()].flat().find((r) => r.seq === seq);
}

/** How many updates card `n`'s tab counts: 0 for none, or for a card still at version 1 that no
 *  reply of the agent's cleared. */
export const unseenCount = (s: LedgerState, board: string, n: number): number =>
  unseenVersions(s, board, n).length + (answerOf(s, board, n) ? 1 : 0);

/** The steps for card `n`'s stepper, oldest first: each unseen version, when and by whom, and what
 *  changed from the version before; and the reply that cleared the card, as one step at its latest
 *  version. `time` writes a line's time in the person's clock. */
export function unseenSteps(s: LedgerState, board: string, n: number, time: (at: string) => string): CardStep[] {
  const node = s.nodes.get(idOf(s, board, n) ?? 0);
  const versions = node?.versions ?? [];
  const at = (x: { at: string }, agentId?: string) => {
    const agent = agentId === undefined ? undefined : s.agents.get(agentId);
    return { when: time(x.at), ...(agent && { agent }) };
  };
  const steps: (CardStep & { on: string })[] = unseenVersions(s, board, n)
    .map((v) => ({ ver: v.ver, ...at(v, v.agent), changes: versionChanges(versions[versions.indexOf(v) - 1], v), on: v.at }));
  const r = answerOf(s, board, n);
  if (r && node) steps.push({ ver: latest(node).ver, ...at(r, r.agent), changes: [], reply: r.text, on: r.at });
  return steps.sort((a, b) => a.on.localeCompare(b.on)).map(({ on: _, ...step }) => step);
}

/** Whether a card seen line for card `n` at `ver` would change anything: a version not yet seen, or
 *  the agent's answer the person has not looked at (D-045). */
export const seenDue = (s: LedgerState, board: string, n: number, ver: number): boolean =>
  seenVer(s, board, n) < ver || unseenAnswer(s, idOf(s, board, n) ?? 0);

/** The items a selection marks seen: for each card condition the page shows, those it holds for when
 *  the row's `clearedBy` names select (`clearsOnSelect`, never a list of kinds here). */
export const seenOnSelect = (c: { fresh: ReadonlySet<number>; unseen: ReadonlySet<number> }): Set<number> =>
  new Set([...(clearsOnSelect('item.new') ? c.fresh : []), ...(clearsOnSelect('item.unseen') ? c.unseen : [])]);

/** A card seen line's fields: version `ver` of card `n` (its board number). */
export interface SeenMark { n: number; ver: number }

/** The card seen lines for selected cards `ids` on `board`, in order: each `held` item's latest version. */
export const seenMarks = (s: LedgerState, board: string, held: ReadonlySet<number>, ids: readonly string[]): SeenMark[] =>
  ids.map(Number).flatMap((n) => {
    const node = held.has(n) ? s.nodes.get(idOf(s, board, n) ?? 0) : undefined;
    return node ? [{ n, ver: latest(node).ver }] : [];
  });

/** The version of card `n` on `board` the person last saw (0 for none). */
export const seenVer = (s: LedgerState, board: string, n: number): number => s.seen.get(idOf(s, board, n) ?? 0) ?? 0;
