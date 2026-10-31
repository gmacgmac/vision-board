// The note flow's surface (notes.ts `createNoteFlow`): what it is made with and what it gives the
// board. Split out of notes.ts so its whole public surface reads in one place.
import type { NoteKind } from '#format';
import type { BoardState } from '#actions';
import type { MarkdownOptions } from '#ui';
import type { ActFields } from '../io.ts';
import type { Selection } from '../selection/index.ts';
import type { AskDiscard } from './note-discard.ts';
import type { AnchorDeps } from './note-anchor.ts';
import type { ViewDeps } from './note-views.ts';

/** `frame`: a container on the board (3_FE_04): the bubble sits beside its title line (note-anchor.ts). */
export interface NoteDeps extends ViewDeps, AnchorDeps {
  stage: HTMLElement;
  state(): BoardState;
  /** The version the person was looking at, for a new note's act. */
  ver(id: string): number | undefined;
  /** Send one act; null when it was recorded, else what went wrong. */
  attempt(fields: ActFields): Promise<string | null>;
  /** After a recorded change: lay the board out again. */
  relayout(): void;
  toast(text: string): void;
  /** The bubble opened or closed (the selection bar hides while it is open, 3_FE_02 ruling 2). */
  changed(): void;
  /** How the bubble's Markdown renders (the board's flags and image route). */
  markdown?: MarkdownOptions;
  /** "Discard your changes?" (step 4G ruling 4); true to discard. */
  discard: AskDiscard;
  /** Hears each turn of the flow's `unsaved` (M11: the board's status tells its host). */
  unsaved?(on: boolean): void;
  /** Why the board can't change now (a locked board, lock-flow.ts): no bubble opens, the toast says why. */
  paused?(): string | null;
  /** The world, where the group pins draw in their own layer (groupNoteOnce flag, group-pins.ts). */
  world: HTMLElement;
  /** A press on a group pin selects the group's cards. */
  selection: Pick<Selection, 'select'>;
}

/** What an act takes away: a card by id, a container by id. */
export interface NoteGone { card?(id: string): boolean; region?(id: string): boolean }

export interface NoteFlow {
  /** C on a card: edit its note not yet sent, or start a new one. */
  press(id: string, kind: NoteKind): void;
  /** Comment on two or more selected cards (3_FE_02 ruling 3): one note on the group, beside the
   *  selection's box; the group's own note not yet sent, if it has one, opens to edit. */
  group(ids: readonly string[]): void;
  /** The pin: open that note (read-only once sent) with the agent's replies to it. A note in the
   *  "Your note" block (`fromNote`): the card's conversation, beside it and scrolled to it. */
  show(id: string, seq: number, fromNote?: boolean): void;
  /** An agent's reply on the card: the card's conversation, beside the reply and scrolled to it. */
  reply(id: string, seq: number): void;
  /** Comment on a container's title line (3_FE_04): edit its note not yet sent, or start one
   *  (`kind` sets what it asks for; default: the note's own, else a comment). */
  container(region: string, kind?: NoteKind): void;
  /** Edit (or Open) in the container's note preview or block: its latest note, read-only once sent,
   *  with its replies; `part` ('note', or a reply's seq): the block's note or a reply, the
   *  container's conversation beside that and scrolled to it. */
  showContainer(region: string, part?: 'note' | number): void;
  /** Follow the card after a pan, a zoom or a relayout (ruling 6: the controller calls it on
   * every one); close if the card is gone. */
  place(): void;
  /** Close without saving (with changed words, after asking); focus goes back to the card. */
  close(): void;
  /** Whether the bubble is open (Esc closes it before it clears the selection, 3_FE_01). */
  readonly open: boolean;
  /** Whether the open bubble holds changed words not yet saved (host.ts `BoardView.unsaved`). */
  readonly unsaved: boolean;
  /** The host's question before the board goes (host.ts `BoardView.leave`; `mayLeave`, once at a time). */
  leave(): Promise<boolean>;
  /** Before the person's own act that would take cards or a container away (Hide answered, Remove,
   *  Archive; point 309): when that takes the open bubble's card (every card of a group's) or its
   *  container, and its words are unsaved, `leave()`; else true at once. True: go ahead. */
  leaveIf(gone: NoteGone): Promise<boolean>;
  destroy(): void;
}
