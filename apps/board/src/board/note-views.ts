// What the note bubble says for the note that is open (split out of notes.ts): its head, mode and
// text from `bubbleView`, the edge it wears, and the agent's replies to the note under it, oldest
// first, as the card shows them (the exchange, popovers-larger-thread ruling 2). A reply that names
// no note of the card opens on its own (`reply` mode). Facts only: notes.ts opens, places and closes.
import type { NoteKind, Region, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardState, ItemNote } from '../../../../packages/actions/src/index.ts';
import type { BubbleMode, BubbleView, CardReply, VbNoteBubbleElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, regionColour, replyEntry } from '../../../../packages/ui/src/index.ts';

/** `id`: the card a note's acts name (`n`); `anchor`: the cards the bubble sits beside; `group`:
 *  every card of a note on a group. A note on a container (`region`) names the region in place of a
 *  card (`id` is the region too, `anchor` empty), and `back` is where focus returns on close.
 *  `reply`: the reply shown on its own (`reply` mode). `at`: the part of the card or frame it
 *  opened from (a note or a reply, a selector inside it), which its arrow points at. */
export interface Open {
  id: string; anchor: readonly string[]; mode: BubbleMode; kind: NoteKind; note?: ItemNote; group?: readonly string[];
  region?: string; back?: HTMLElement; reply?: number; at?: string;
}

export interface ViewDeps {
  node(id: string): ViewNode | undefined;
  state(): BoardState;
  region(id: string): Region | undefined;
  /** The agent's replies on card `id`, oldest first (parking.ts; none with the cardReplies flag off). */
  replies(id: string): readonly CardReply[];
  /** The agent's replies to notes on whole containers, oldest first. */
  regionReplies(): readonly CardReply[];
}

/** What `show` takes: the view, and the edge and chip the bubble wears. */
export interface Shown { v: BubbleView; on: Parameters<VbNoteBubbleElement['show']>[1] }

/** The replies the bubble shows: those to the open note, or the one reply opened on its own. */
function repliesOf(o: Open, all: readonly CardReply[]) {
  const mine = o.reply !== undefined ? all.filter((r) => r.seq === o.reply) : o.note ? all.filter((r) => r.to === o.note!.seq) : [];
  return mine.map(replyEntry);
}

/** History because the agent answered it, not because of a Send (ruling 5): its head says so. */
const answered = (o: Open): boolean => o.note?.locked === true && o.note.sent !== true;

/** What the bubble says about a card or a group of cards, and the edge it wears. */
export function cardView(d: ViewDeps, o: Open): Shown | null {
  const n = d.node(o.id);
  if (!n || n.n === undefined) return null;
  const notes = d.state().items.get(o.id)?.notes ?? [];
  const index = o.note ? notes.findIndex((x) => x.seq === o.note!.seq) + 1 : undefined;
  const numbers = o.group?.map(Number);
  const replies = repliesOf(o, d.replies(o.id));
  const v = bubbleView({ mode: o.mode, kind: o.kind, number: n.n, index, text: o.note?.text, replies, answered: answered(o), ...(numbers && { numbers }) });
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
  const replies = repliesOf(o, d.regionReplies());
  const v = bubbleView({ mode: o.mode, kind: o.kind, container: r.title ?? r.id, index, text: o.note?.text, replies, answered: answered(o) });
  return { v, on: { line: regionColour(r) } };
}
