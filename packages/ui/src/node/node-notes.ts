// Node pattern, layer 1 (core), split out of node-core.ts (which re-exports it): a card's notes and
// the agent's replies to them as one conversation, and what the card's note pin and note thread
// show, put away or not (card-polish FE_02). No DOM; unit-tested under plain Node.
import type { ViewNode } from '../../../format/src/index.ts';
import type { ItemNote } from '../../../actions/src/index.ts';

/** One of the agent's replies under a note, read-only (FE_03 ruling 3). `who` is "Agent reply · label";
 *  `at` its line's time (ISO), which the card shows on hover (card-polish FE_02). */
export interface ReplyEntry { seq: number; who: string; text: string; at: string }

/** One of the person's notes in the card's "Your note" block (2e_FE_01 ruling 7), with the agent's
 * replies to it, oldest first. `index` is its pin number: its place among the card's notes, in the
 * order they were made. `at` is when it was made (ISO). */
export interface NoteEntry { seq: number; index: number; who: string; text: string; sent: boolean; at: string; replies?: ReplyEntry[] }

/** A reply that names no note of the card: it takes its place by time (`seq`) among the notes
 * (review-polish decision 8), read-only like any reply. */
export interface OrphanEntry extends ReplyEntry { orphan: true }

/** One entry of a card's conversation: a note with its replies under it, or an orphan reply. */
export type NotesEntry = NoteEntry | OrphanEntry;

export const isNoteEntry = (e: NotesEntry): e is NoteEntry => !('orphan' in e);

/** The card's notes: the numbered pin on its top-right corner (the latest note, the one a press
 * of C or M or a click opens) and the thread in its body, under its head: `count` ("1 note",
 * "3 notes"; "2 replies" on a card with only the agent's replies) and Hide, whose name is `toggle`
 * (card-polish FE_02), the toggle on the right. `entries` is the card's whole conversation in chat order, oldest first, top to
 * bottom (review-polish ruling 8): each note then its replies oldest first, an orphan reply by its
 * `seq` among the notes, so a new note is last. Every reader lists it as it is and never sorts again.
 * With only orphans the thread shows and there is no pin. A note with no reply carries no `replies`.
 * `hidden`: the person put the thread away (`notes-hide`); only its head draws, the count reading
 * `hidden`, the count and then any replies that came since ("3 notes · 1 new reply"), and the toggle,
 * now Show, is named by `toggle`. */
export interface NotesView {
  count: string;
  toggle: string;
  hidden?: string;
  entries: NotesEntry[];
  pin?: { seq: number; index: number; sent: boolean; label: string };
}

/** An agent's reply as the page passes it in (cardReplies flag): its `seq`, `to` (the `seq` of the
 * note it answers, if it names one), the agent's label, its words and `at`, the line's time (ISO). */
export interface CardReply { seq: number; to?: number; agent?: string; text: string; at: string }

/** An old More context reads as a note everywhere (D-045). */
const KIND_WORD: Record<ItemNote['kind'], string> = { comment: 'Your note', context: 'Your note' };

export const replyEntry = (r: CardReply): ReplyEntry => ({ seq: r.seq, who: `Agent reply${r.agent ? ` · ${r.agent}` : ''}`, text: r.text, at: r.at });

/** A list of notes and the agent's replies as one conversation, oldest first, top to bottom
 * (review-polish ruling 8 and decision 8): each note then its replies by `seq`, a reply naming none
 * of the notes (an orphan) by its `seq` among them. The card's block and pin read it through
 * `notesView`; the conversation window reads it for a card or a whole container (ruling 6). */
export function conversation(notes: readonly ItemNote[], replies: readonly CardReply[]): NotesEntry[] {
  const mine = new Set(notes.map((x) => x.seq));
  const byTime = [...replies].sort((a, b) => a.seq - b.seq);
  const orphans = byTime.filter((r) => r.to === undefined || !mine.has(r.to)).map((r): OrphanEntry => ({ ...replyEntry(r), orphan: true }));
  const entries: NotesEntry[] = [];
  let o = 0;
  notes.forEach((x, i) => {
    for (; o < orphans.length && orphans[o]!.seq < x.seq; o += 1) entries.push(orphans[o]!);
    const answers = byTime.filter((r) => r.to === x.seq).map(replyEntry);
    // History once sent or answered (`locked`, popovers-larger-thread ruling 5): grey and read-only.
    const past = x.sent ? ' · Sent' : x.locked ? ' · Answered' : '';
    entries.push({
      seq: x.seq, index: i + 1, sent: x.locked === true || x.sent === true, text: x.text, at: x.at,
      who: `${KIND_WORD[x.kind]} ${i + 1}${x.nodes ? ` · ${x.nodes.length} cards` : ''}${past}`,
      ...(answers.length && { replies: answers }),
    });
  });
  entries.push(...orphans.slice(o));
  return entries;
}

const count = (k: number, one: string, many: string): string => `${k} ${k === 1 ? one : many}`;

/** The pin and thread for an item's notes and the replies to them; undefined with neither. `hiddenAt`
 * is the `seq` of the person's `notes-hide` while the thread is put away (`BoardState.notesHidden`):
 * a reply after it is new to them, so the head counts it and no reply is missed. */
export function notesView(n: ViewNode, notes: readonly ItemNote[], replies: readonly CardReply[] = [], hiddenAt?: number): NotesView | undefined {
  const entries = conversation(notes, replies);
  if (!entries.length) return undefined;
  const words = notes.length ? count(notes.length, 'note', 'notes') : count(replies.length, 'reply', 'replies');
  const fresh = hiddenAt === undefined ? 0 : replies.filter((r) => r.seq > hiddenAt).length;
  const hidden = hiddenAt === undefined ? undefined : `${words}${fresh ? ` · ${count(fresh, 'new reply', 'new replies')}` : ''}`;
  const out: NotesView = {
    count: words, toggle: hidden === undefined ? `Hide notes on item ${n.n}` : `Show ${hidden} on item ${n.n}`,
    ...(hidden !== undefined && { hidden }), entries,
  };
  const made = notes.at(-1);
  if (!made) return out;
  // The pin is the latest note (ruling 8); a note on a group of cards (3_FE_02) names every item it is on.
  const sent = made.locked === true || made.sent === true;
  const on = made.nodes ? `items ${made.nodes.join(', ')}` : `item ${n.n}`;
  const label = sent ? `Note ${notes.length} on ${on}, ${made.sent ? 'sent' : 'answered'}. Show it` : `Note ${notes.length} on ${on}. Edit it`;
  return { ...out, pin: { seq: made.seq, index: notes.length, sent, label } };
}
