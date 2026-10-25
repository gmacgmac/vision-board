// What the note bubble says for the note that is open (split out of notes.ts): its head, mode and
// text from `bubbleView`, the edge it wears, and the agent's replies to the note under it, oldest
// first, as the card shows them. The conversation (`thread` mode, review polish ruling 6) lists every
// note and reply on the card or the container, in `conversation`'s order (the card's own). Facts
// only: notes.ts opens, places and closes.
import type { NoteKind, Region, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardState, ItemNote } from '../../../../packages/actions/src/index.ts';
import type { BubbleMode, BubbleView, CardReply, VbNoteBubbleElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, conversation, regionColour, replyEntry } from '../../../../packages/ui/src/index.ts';

/** `id`: the card a note's acts name (`n`); `anchor`: the cards the bubble sits beside; `group`:
 *  every card of a note on a group. A note on a container (`region`) names the region in place of a
 *  card (`id` is the region too, `anchor` empty), and `back` is where focus returns on close.
 *  `part`: in the conversation, the `seq` of the note or reply it opened at (scrolled to and
 *  focused). `at`: the part of the card or frame it opened from (a note or a reply, a selector
 *  inside it), which its arrow points at. */
export interface Open {
  id: string; anchor: readonly string[]; mode: BubbleMode; kind: NoteKind; note?: ItemNote; group?: readonly string[];
  region?: string; back?: HTMLElement; part?: number; at?: string;
}

export interface ViewDeps {
  node(id: string): ViewNode | undefined;
  state(): BoardState;
  region(id: string): Region | undefined;
  /** The agent's replies on card `id`, oldest first (parking.ts; none with the cardReplies flag off). */
  replies(id: string): readonly CardReply[];
  /** The agent's replies to notes on whole containers, oldest first. */
  regionReplies(): readonly CardReply[];
  /** The groupNoteOnce flag: a card's conversation leaves out notes on a group of cards, which the
   *  group's own pin and bubble show once (group-pins.ts). */
  groups?: boolean;
}

/** What `show` takes: the view, and the edge and chip the bubble wears. */
export interface Shown { v: BubbleView; on: Parameters<VbNoteBubbleElement['show']>[1] }

/** The replies the bubble shows under the open note (none in the conversation, which lists its own). */
const repliesOf = (o: Open, all: readonly CardReply[]) =>
  (o.note && o.mode !== 'thread' ? all.filter((r) => r.to === o.note!.seq) : []).map(replyEntry);

/** The conversation's entries, in the thread mode only: the notes with the replies to them. */
const entriesOf = (o: Open, notes: readonly ItemNote[], replies: readonly CardReply[]) =>
  (o.mode === 'thread' ? { entries: conversation(notes, replies) } : {});

/** History because the agent answered it, not because of a Send (ruling 5): its head says so. */
const answered = (o: Open): boolean => o.note?.locked === true && o.note.sent !== true;

/** What the bubble says about a card or a group of cards, and the edge it wears. */
export function cardView(d: ViewDeps, o: Open): Shown | null {
  const n = d.node(o.id);
  if (!n || n.n === undefined) return null;
  const all = d.state().items.get(o.id)?.notes ?? [];
  const notes = d.groups && !o.group ? all.filter((x) => !x.nodes) : all;
  const index = o.note ? notes.findIndex((x) => x.seq === o.note!.seq) + 1 : undefined;
  const numbers = o.group?.map(Number);
  const replies = repliesOf(o, d.replies(o.id));
  const v = bubbleView({ mode: o.mode, kind: o.kind, number: n.n, index, text: o.note?.text, replies, answered: answered(o),
    ...(numbers && { numbers }), ...entriesOf(o, notes, d.replies(o.id)) });
  // A group's cards have their own colours: its bubble keeps the neutral edge and no number chip.
  return { v, on: numbers ? {} : { kind: n.kind, number: n.n } };
}

/** The same for a note on a whole container: its title, and its frame's line colour. The pin
 *  number is the note's place among the container's notes, as its title line shows it. */
export function containerView(d: ViewDeps, o: Open): Shown | null {
  const r = d.region(o.region!);
  if (!r) return null;
  const notes = d.state().regionNotes.get(r.id) ?? [];
  const index = o.note ? notes.findIndex((x) => x.seq === o.note!.seq) + 1 : undefined;
  // Only the replies to this container's notes: the others answer other containers.
  const mine = d.regionReplies().filter((x) => notes.some((y) => y.seq === x.to));
  const v = bubbleView({ mode: o.mode, kind: o.kind, container: r.title ?? r.id, index, text: o.note?.text, replies: repliesOf(o, mine),
    answered: answered(o), ...entriesOf(o, notes, mine) });
  return { v, on: { line: regionColour(r) } };
}
