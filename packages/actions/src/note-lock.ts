// When a note is history (popovers-larger-thread ruling 5): the person may edit or remove a note
// only before whichever comes first, a Send on its board after it, or the agent answering it (a
// `reply` naming it in `to`, or a newer version of one of its cards, such as an `append`: what
// answers an ask, api.md 36). This is the one derived state: the server's check (act.ts
// `changeProblems`) and every read (`sentNotes`, which the page's `notes.ts` reads as `locked`) ask
// `lockOf`, so they can't disagree. Pure.
import type { LedgerReply, LedgerState } from './fold.ts';
import type { Ask, ItemNote } from './notes.ts';
import { askVer, cardsOf } from './notes.ts';

/** Whether a Send on `board` carried the act `seq` (fold.ts `sentHead`: its answers were read past it): its note is history. */
export const sentAfter = (s: LedgerState, board: string, seq: number): boolean => (s.sentHead.get(board) ?? 0) >= seq;

/** Whether a `reply` names the ask `seq` in `to`: one on any card it is on (a note on a group,
 * api.md 64), or, for a note on a whole container, which is on no card, one on any node, since a
 * `seq` names one act (api.md 73). */
export const replied = (s: LedgerState, seq: number, cards: number[]): boolean => replyTo(s, seq, cards) !== undefined;

/** The first `reply` naming the ask `seq` in `to`, where `replied` looks (note-answer.ts names it). */
export function replyTo(s: LedgerState, seq: number, cards: number[]): LedgerReply | undefined {
  const on = cards.length ? cards.map((id) => s.replies.get(id) ?? []) : [...s.replies.values()];
  return on.flat().filter((r) => r.to === seq).sort((a, b) => a.seq - b.seq)[0];
}

/** Why note `a` on `board` is history: `sent` (a Send came after it), `answered` (a reply names it,
 * or one of its cards has a newer version than when it was made), else undefined: its writer may
 * still change it. */
export function lockOf(s: LedgerState, board: string, a: Ask): 'sent' | 'answered' | undefined {
  if (sentAfter(s, board, a.seq)) return 'sent';
  const cards = cardsOf(a);
  if (replied(s, a.seq, cards)) return 'answered';
  const newer = cards.some((id) => (s.nodes.get(id)?.versions.at(-1)?.ver ?? 0) > askVer(a, id));
  return newer ? 'answered' : undefined;
}

/** An item's or a container's notes as the reads show them: `sent` on each one a Send came after,
 * `locked` on each one that is history for either reason (`lockOf`). */
export function sentNotes(s: LedgerState, board: string, notes: readonly ItemNote[]): ItemNote[] {
  return notes.map((x) => {
    const a = s.asks.get(x.seq);
    const lock = a ? lockOf(s, board, a) : sentAfter(s, board, x.seq) ? 'sent' : undefined;
    return { ...x, ...(lock === 'sent' && { sent: true as const }), ...(lock && { locked: true as const }) };
  });
}
