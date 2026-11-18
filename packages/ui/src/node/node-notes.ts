// Node pattern, layer 1 (core), split out of node-core.ts (which re-exports it): a card's notes and
// the agent's replies to them as one conversation, which the conversation box and a container's note
// read (FE_03). No DOM; unit-tested under plain Node.
import type { ItemNote } from '#actions';
import * as uiCommonWords from '../words/ui-common.ts';
import * as nodeNotesWords from '../words/node-notes.ts';

/** One of the agent's replies under a note, read-only (FE_03 ruling 3). `who` is "Agent reply · label";
 *  `at` its line's time (ISO), which the card shows on hover (card-polish FE_02). `unseen`: written after
 *  the person last looked at its card, while the card is still unseen (D-054): its edge is the bright
 *  amber, muted once seen (updateSignals flag, node-parking.css). */
export interface ReplyEntry { seq: number; who: string; text: string; at: string; unseen?: true }

/** One of the person's notes in a conversation, with the agent's replies to it, oldest first. `index` is its
 * number: its place among the card's notes, in the order they were made. `at` is when it was made (ISO). */
export interface NoteEntry { seq: number; index: number; who: string; text: string; sent: boolean; at: string; replies?: ReplyEntry[] }

/** A reply that names no note of the card: it takes its place by time (`seq`) among the notes
 * (review-polish decision 8), read-only like any reply. */
export interface OrphanEntry extends ReplyEntry { orphan: true }

/** One entry of a card's conversation: a note with its replies under it, or an orphan reply. */
export type NotesEntry = NoteEntry | OrphanEntry;

export const isNoteEntry = (e: NotesEntry): e is NoteEntry => !('orphan' in e);

/** An agent's reply as the page passes it in (cardReplies flag): its `seq`, `to` (the `seq` of the
 * note it answers, if it names one), the agent's label, its words and `at`, the line's time (ISO);
 * `unseen`, written after the person last looked at the card it is passed in for (`LedgerState.looked`). */
export interface CardReply { seq: number; to?: number; agent?: string; text: string; at: string; unseen?: true }

/** An old More context reads as a note everywhere (D-045). */
const KIND_WORD: Record<ItemNote['kind'], string> = { comment: uiCommonWords.yourNote, context: uiCommonWords.yourNote };

export const replyEntry = (r: CardReply): ReplyEntry =>
  ({ seq: r.seq, who: nodeNotesWords.agentReply(r.agent ? ` · ${r.agent}` : ''), text: r.text, at: r.at, ...(r.unseen && { unseen: true as const }) });

/** `replies` as a card passes them on: `unseen` only while the card itself is unseen (NEW or an
 * "N updates" tab, D-054), so a reply never reads as new on a card the person has seen. */
export const litReplies = (replies: readonly CardReply[] | undefined, cardUnseen: boolean): readonly CardReply[] | undefined =>
  cardUnseen || !replies?.some((r) => r.unseen) ? replies : replies.map(({ unseen: _, ...r }) => r);

/** A list of notes and the agent's replies as one conversation, oldest first, top to bottom
 * (review-polish ruling 8 and decision 8): each note then its replies by `seq`, a reply naming none
 * of the notes (an orphan) by its `seq` among them. The conversation box reads it for a node, a note for a
 * whole container (ruling 6). `asked`: the notes Ask now
 * sent (the conversation box, FE_03), which read "· Asked now" in place of "· Sent". */
export function conversation(notes: readonly ItemNote[], replies: readonly CardReply[], asked?: ReadonlySet<number>): NotesEntry[] {
  const mine = new Set(notes.map((x) => x.seq));
  const byTime = [...replies].sort((a, b) => a.seq - b.seq);
  const orphans = byTime.filter((r) => r.to === undefined || !mine.has(r.to)).map((r): OrphanEntry => ({ ...replyEntry(r), orphan: true }));
  const entries: NotesEntry[] = [];
  let o = 0;
  notes.forEach((x, i) => {
    for (; o < orphans.length && orphans[o]!.seq < x.seq; o += 1) entries.push(orphans[o]!);
    const answers = byTime.filter((r) => r.to === x.seq).map(replyEntry);
    // History once sent or answered (`locked`, popovers-larger-thread ruling 5): grey and read-only.
    const past = asked?.has(x.seq) ? nodeNotesWords.askedNow : x.sent ? ' · Sent' : x.locked ? ' · Answered' : '';
    entries.push({
      seq: x.seq, index: i + 1, sent: x.locked === true || x.sent === true, text: x.text, at: x.at,
      who: `${KIND_WORD[x.kind]} ${i + 1}${x.nodes ? nodeNotesWords.cards(x.nodes.length) : ''}${past}`,
      ...(answers.length && { replies: answers }),
    });
  });
  entries.push(...orphans.slice(o));
  return entries;
}
