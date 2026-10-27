// Node pattern, layer 1 (core), split out of node-core.ts (which re-exports it): a card's notes and
// the agent's replies to them as one conversation, and what the card's note pin and note thread
// show, put away or not (card-polish FE_02); and the one pin of a note on a group of cards and where it
// sits (groupNoteOnce flag, group-note-once task). No DOM; unit-tested under plain Node.
import type { ViewNode } from '#format';
import type { ItemNote } from '#actions';

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

/** What a pin says: open a note not yet history to edit it, else show it. `on` names the cards. */
function pinLabel(index: number, on: string, made: ItemNote): string {
  const sent = made.locked === true || made.sent === true;
  return sent ? `Note ${index} on ${on}, ${made.sent ? 'sent' : 'answered'}. Show it` : `Note ${index} on ${on}. Edit it`;
}

/** The pin and thread for an item's notes and the replies to them; undefined with neither. `hiddenAt`
 * is the `seq` of the person's `notes-hide` while the thread is put away (`BoardState.notesHidden`):
 * a reply after it is new to them, so the head counts it and no reply is missed. `apart` (the
 * groupNoteOnce flag): a note on a group of cards and the replies to it are left out, since the
 * group's own pin shows them once (`groupMarkers`). */
export function notesView(
  n: ViewNode, all: readonly ItemNote[], allReplies: readonly CardReply[] = [], hiddenAt?: number, apart = false,
): NotesView | undefined {
  const groups = new Set(apart ? all.filter((x) => x.nodes).map((x) => x.seq) : []);
  const notes = apart ? all.filter((x) => !x.nodes) : all;
  const replies = allReplies.filter((r) => r.to === undefined || !groups.has(r.to));
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
  return { ...out, pin: { seq: made.seq, index: notes.length, sent, label: pinLabel(notes.length, on, made) } };
}

/** One pin for the notes on one group of cards (groupNoteOnce flag, group-note-once task): `key` the
 * group's board numbers in order, joined with commas; `cards` the same numbers; the pin opens the
 * latest note (`seq`), numbered by its place among the group's notes (`index`), read-only once it is
 * history (`sent`), as a card's pin does. */
export interface GroupMarker { key: string; cards: number[]; seq: number; index: number; sent: boolean; label: string }

/** The group pins, from every card's folded notes (each card of a group holds the same note): one per
 * group of cards with notes on it, in the order of its lowest card, then of its latest note. */
export function groupMarkers(items: Iterable<{ notes: readonly ItemNote[] }>): GroupMarker[] {
  const groups = new Map<string, Map<number, ItemNote>>();
  for (const item of items) {
    for (const x of item.notes) {
      if (!x.nodes) continue;
      const key = [...x.nodes].sort((a, b) => a - b).join(',');
      if (!groups.has(key)) groups.set(key, new Map());
      groups.get(key)!.set(x.seq, x);
    }
  }
  return [...groups].map(([key, bySeq]): GroupMarker => {
    const notes = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
    const made = notes.at(-1)!;
    const cards = key.split(',').map(Number);
    return {
      key, cards, seq: made.seq, index: notes.length, sent: made.locked === true || made.sent === true,
      label: pinLabel(notes.length, `items ${cards.join(', ')}`, made),
    };
  }).sort((a, b) => a.cards[0]! - b.cards[0]! || a.seq - b.seq);
}

/** Which drawn card each group's pin sits on, and its slot there (`groupPinAt`): the group's
 * lowest-numbered card drawn, or, when an earlier group's pin already sits there, its next card drawn
 * that has none, so groups sharing a card spread over their own cards; only when every one of its
 * cards has a pin does it stack on the lowest. A group with no card drawn has no place. */
export function groupAnchors(markers: readonly GroupMarker[], drawn: (n: number) => boolean): ({ card: number; slot: number } | undefined)[] {
  const taken = new Map<number, number>();
  return markers.map((m) => {
    const cards = m.cards.filter(drawn);
    const card = cards.find((n) => !taken.has(n)) ?? cards[0];
    if (card === undefined) return undefined;
    const slot = taken.get(card) ?? 0;
    taken.set(card, slot + 1);
    return { card, slot };
  });
}

/** The group pin's size and the space between two pins on one card, in board pixels (the card's own
 * pin is the same 26px drop, node.css `.vb-note-pin`), and the height kept clear at the card's foot
 * for its footer buttons (node.css `.vb-node-foot`, 38px, and its border). */
export const GROUP_PIN = { size: 26, gap: 4, foot: 40 } as const;

/** Where a group's pin sits, its top-left corner in board pixels: on the right edge of the card `box`
 * (the group's lowest-numbered card drawn), in the column of the card's own pin and just under it, so
 * the two never meet; the top edge's own tabs and size control stay clear. `slot`: a card's further
 * group pins stack downward while they stay clear of its footer, then start a column further out. */
export function groupPinAt(box: { x: number; y: number; w: number; h: number }, slot: number): { x: number; y: number } {
  const step = GROUP_PIN.size + GROUP_PIN.gap;
  // The card's pin hangs 12px out from the top-right corner (node.css): left = right + 12 - size.
  const [left, top] = [box.x + box.w + 12 - GROUP_PIN.size, box.y - 12 + step];
  const rows = Math.max(1, Math.floor((box.y + box.h - GROUP_PIN.foot - top - GROUP_PIN.size) / step) + 1);
  return { x: left + step * Math.floor(slot / rows), y: top + step * (slot % rows) };
}
