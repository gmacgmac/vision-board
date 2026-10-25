// New and updated cards at board scale (new-and-updated Design 3 and 5): each card the conditions
// table finds new (`item.new`) or updated (`item.unseen`, as its "N updates" tab shows it), with the
// container it is in now and the line of its newest change; and the containers they make fresh: one
// holding such a card whose newest change is after the person's latest engagement with any card in it
// (`LedgerState.looked`: their latest card seen or act naming it). Nothing is stored: engaging with
// one card of a container ends it for the whole container, and a click on the frame changes nothing.
// conditions.ts gives these their rows (`freshCards`, `container.fresh`). Pure.
import { latest, nodesOf } from '../../format/src/index.ts';
import type { LedgerNode } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { unseenReply } from './clears.ts';
import { numberOf } from './numbers.ts';
import { placeOf } from './references.ts';

/** One new or updated card as the toolbar's "N new" list and a container's pill count it: its
 * identity, board number, title, the container it is in now, whether it is updated (else new), and
 * the `seq` of its newest change (the agent's latest version or reply on it). */
export interface FreshCard { id: number; n: number; title: string; container: string; updated: boolean; seq: number }

/** Whether card `x` shows an "N updates" tab: a version past the one the person last saw and past
 * version 1, or an agent reply they have not looked at since (the page's tab count is above 0:
 * apps/board updates.ts `unseenCount`). A card at version 1 with nothing more carries no tab. */
export const showsUpdates = (s: LedgerState, x: LedgerNode): boolean =>
  latest(x).ver > Math.max(s.seen.get(x.id) ?? 0, 1) || unseenReply(s, x.id) !== undefined;

/** The `seq` of the agent's newest line on card `id`: a version drawn or a reply (card-times.ts). */
const changedAt = (s: LedgerState, id: number): number =>
  Math.max(0, ...(s.times.get(id) ?? []).filter((t) => t.kind === 'drawn' || t.kind === 'replied').map((t) => t.seq));

/** The cards of `board` in `isNew` (by identity, `item.new`) or in `isUnseen` (`item.unseen`) that
 * show their tab, in board order; a card in both is new only (NEW, never "N updates"). */
export function freshOf(s: LedgerState, board: string, isNew: ReadonlySet<number>, isUnseen: ReadonlySet<number>): FreshCard[] {
  return nodesOf(s, board).flatMap((x) => {
    const updated = !isNew.has(x.id);
    if (updated && !(isUnseen.has(x.id) && showsUpdates(s, x))) return [];
    const container = placeOf(s, x.id)?.region ?? latest(x).region;
    return [{ id: x.id, n: numberOf(s, x.id), title: latest(x).title, container, updated, seq: changedAt(s, x.id) }];
  }).sort((a, b) => a.n - b.n);
}

/** The fresh containers of `board` among `cards` (`freshOf`): container -> the `seq` of its newest
 * change, when that is after the person's latest card seen or act on any card in it now. */
export function freshContainers(s: LedgerState, board: string, cards: readonly FreshCard[]): Map<string, number> {
  const newest = new Map<string, number>();
  for (const c of cards) newest.set(c.container, Math.max(newest.get(c.container) ?? 0, c.seq));
  const looked = new Map<string, number>();
  for (const x of nodesOf(s, board)) {
    const at = s.looked.get(x.id);
    const where = at === undefined ? undefined : placeOf(s, x.id)?.region;
    if (where !== undefined && newest.has(where)) looked.set(where, Math.max(looked.get(where) ?? 0, at!));
  }
  return new Map([...newest].filter(([container, seq]) => seq > (looked.get(container) ?? 0)));
}
