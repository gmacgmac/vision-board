// Region pattern, layer 1 (core): what a region's frame shows for the person's current state.
// No DOM, so every rule here is unit-tested under plain Node; the element only applies the
// result. Geometry (position, size) is the page's job and is not here.
import type { Mode, Region, View } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { BoardState, ItemNote } from '../../../actions/src/index.ts';
import { isDecided, statusOf } from '../../../actions/src/index.ts';
import type { CardReply, ReplyEntry } from '../node/node-core.ts';
import { isItem, replyEntry } from '../node/node-core.ts';

/** Each layout's name: the mode row's icon labels and the popover's tile names. Typed on `Mode`,
 * so a new mode fails to compile here. */
export const MODE_LABEL: Record<Mode, string> = {
  grid: 'Grid', flow: 'Flow', lanes: 'Lanes', radial: 'Radial', list: 'List',
};

/**
 * What each layout is for, in one line (README pick 2, mockup 05 section 3): the popover's tiles
 * show it. The one place this text lives, so the agent skill can read the same words (tracker U4).
 */
export const MODE_HINT: Record<Mode, string> = {
  grid: 'A numbered set to work through in order',
  flow: 'Connected steps and where they branch',
  lanes: 'Several flows side by side, one per lane',
  radial: 'One subject, everything related around it',
  list: 'Dense reading, one row each',
};

/** The popover's foot: the layout the agent drew the container in (the view's mode, not the
 * person's pick). */
export const agentChoiceText = (mode: Mode): string => `The agent chose ${MODE_LABEL[mode]} for this container.`;

/** Under a disabled "Reset places" in the settings menu: why there is nothing to reset. */
export const RESET_NONE_HINT = 'No cards moved';

/** Under a disabled "Put container back": the container has no place of its own (3_FE_04
 * ruling 7). */
export const PUT_BACK_NONE_HINT = 'Not moved';

/**
 * The colour a region's frame is drawn in, as a CSS value: the element sets it as `--region` and
 * `region.css` mixes the frame line, the title and the count from it. Every region takes the
 * neutral default for now; a region colour later is this one function (and one property).
 */
export const REGION_COLOUR_DEFAULT = 'var(--vb-line-strong)';
export function regionColour(_r: Pick<Region, 'id'>): string {
  return REGION_COLOUR_DEFAULT;
}

/** One agent that holds the region (D-027), as its top line shows it. `removable` is false for
 * the agent that created the region, which the person cannot remove (api.md 23). */
export interface RegionHolder { agent: string; label: string; removable: boolean }

/** Where the container's latest note stands (3_FE_04 step 4G ruling 1): `unsent` (editable until
 * Send), `sent` (sent, the agent still owes an answer), `answered` (sent, and the agent answered:
 * history). */
export type RegionNoteStage = 'unsent' | 'sent' | 'answered';

/** The Comment button's badge "1": bright while unsent, quiet while sent and waiting, gone once
 * answered or with no note. */
export type RegionBadge = 'none' | 'unsent' | 'sent';

/** The state line of the preview and the note block, per stage. */
export const NOTE_STAGE_TEXT: Record<RegionNoteStage, string> = {
  unsent: 'Unsent', sent: 'Sent, waiting for the agent', answered: 'Sent, answered',
};

/** A container's latest note as Comment's badge, its preview and its note block show it. */
export interface RegionNoteState {
  /** The note's ledger seq (what `note-edit` / `note-remove` name). */
  seq: number;
  stage: RegionNoteStage;
  badge: RegionBadge;
  /** The state line: `NOTE_STAGE_TEXT[stage]`. */
  stateText: string;
  /** The note's words: the preview and the block show 3 lines, the block then "Show all". */
  text: string;
  /** Edit and Remove in the note block: only while unsent; a sent note is read-only. */
  editable: boolean;
  /** In place of Edit and Remove once sent: why the block is read-only. */
  readOnlyText: string;
  /** The agent's replies that name this note, oldest first (the cardReplies flag, FE_03); none left out. */
  replies?: ReplyEntry[];
}

/** The stage of a container's latest note. `owed`: the agent still owes an answer on it (the
 * container is in `pendingItems`); only a sent note can be answered. */
export function noteStage(note: Pick<ItemNote, 'sent'>, owed: boolean): RegionNoteStage {
  if (note.sent !== true) return 'unsent';
  return owed ? 'sent' : 'answered';
}

/** The badge a note stage gives Comment; `none` with no note. */
export const noteBadge = (stage: RegionNoteStage | undefined): RegionBadge =>
  stage === 'unsent' ? 'unsent' : stage === 'sent' ? 'sent' : 'none';

/** The latest of a container's notes, as `RegionNoteState`; undefined when it has none. */
export function regionNote(notes: readonly ItemNote[] | undefined, owed = true, replies: readonly CardReply[] = []): RegionNoteState | undefined {
  const note = notes?.at(-1);
  if (!note) return undefined;
  const stage = noteStage(note, owed);
  const answers = replies.filter((r) => r.to === note.seq).map(replyEntry);
  return {
    seq: note.seq, stage, badge: noteBadge(stage), stateText: NOTE_STAGE_TEXT[stage], text: note.text ?? '',
    editable: stage === 'unsent',
    readOnlyText: stage === 'sent' ? 'Read-only until the agent answers' : stage === 'answered' ? 'Read-only' : '',
    ...(answers.length && { replies: answers }),
  };
}

/** Comment's accessible name: the container, then what its badge says. */
export function commentLabel(title: string, badge: RegionBadge): string {
  const base = `Comment on container ${title}`;
  if (badge === 'unsent') return `${base}, 1 unsent note`;
  return badge === 'sent' ? `${base}, 1 sent note waiting for the agent` : base;
}

/** What the person asked of the container's note, from the preview or the note block. The
 * element only reports it; the page acts (edit opens the bubble, remove writes `note-remove`,
 * show and hide set `noteShown`). */
export type RegionNoteAction = 'edit' | 'remove' | 'show' | 'hide';

/** `vb-region-note` (bubbles): one press in the preview or the note block. */
export const REGION_NOTE_EVENT = 'vb-region-note';
export interface RegionNoteEventDetail { region: string; action: RegionNoteAction; seq: number }

/** `vb-region-note-resize` (bubbles): the shown note block's height changed, in the frame's own
 * (unscaled) pixels, its gap to the cards included; 0 once hidden. The page feeds it to layout as
 * the container's extra top inset (step 4G2). */
export const REGION_NOTE_RESIZE_EVENT = 'vb-region-note-resize';
export interface RegionNoteResizeDetail { region: string; height: number }

/** Everything a region's frame shows for the current state; `update()` applies it. */
export interface RegionState {
  /** The layout mode in force (the engine's choice, after the person's pick). */
  mode: Mode;
  /** "<decided> of <items> decided"; empty when the region has no items. */
  countText: string;
  /** Whether "Reset places" in the settings menu is enabled: at least one node of the region is
   * pinned. Otherwise it shows disabled, with `RESET_NONE_HINT`. */
  canReset: boolean;
  /** Whether "Put container back" is enabled: the container itself has a place (a region pin).
   * Otherwise it shows disabled, with `PUT_BACK_NONE_HINT`. */
  canPutBack: boolean;
  /** The container's latest note, for Comment's badge, its preview and the note block; left out
   * when the container has none. */
  note?: RegionNoteState;
  /** Comment's accessible name, which says the badge's state (`commentLabel`). */
  commentLabel: string;
  /** Whether the "Everything here is decided." message shows: the layout drew none of its nodes. */
  showEmpty: boolean;
  /** The agents that hold the region, after the count; left out when none is given (the
   * agentAccess flag off, or a region nobody holds). */
  holders?: RegionHolder[];
}

/** The holders as the frame shows them: every one by label, creator first, and only the others
 * with a Remove access control. `creator` is true for the agent that made the region. */
export function regionHolders(list: readonly { agent: string; label: string; creator?: boolean }[]): RegionHolder[] {
  return [...list]
    .sort((a, b) => Number(b.creator ?? false) - Number(a.creator ?? false))
    .map((h) => ({ agent: h.agent, label: h.label, removable: !h.creator }));
}

/**
 * `placed` is the set of node ids the layout drew (hidden nodes are absent), so the core never
 * imports `layout`. `r` is the region as the layout resolved it: its id and its mode. `holders`
 * (agentAccess flag) are the region's holders from `get_board`. The container's own place and
 * notes come from `s.regionPins` and `s.regionNotes` (3_FE_04); its title, for Comment's name,
 * from `r` or else the view. `owed` is the set of container ids the agent still owes an answer on
 * (the `region` of each container entry in `pendingItems`): a sent note whose container is not in
 * it was answered and loses its badge. Left out, every sent note counts as waiting. `replies`: the
 * agent's replies on the page (the cardReplies flag); those naming the latest note show under it.
 */
export function regionState(
  r: Pick<Region, 'id' | 'mode'> & Partial<Pick<Region, 'title'>>, view: View, s: BoardState, placed: ReadonlySet<string>,
  holders?: readonly { agent: string; label: string; creator?: boolean }[], owed?: ReadonlySet<string>,
  replies?: readonly CardReply[],
): RegionState {
  const nodes = view.nodes.filter((n) => n.region === r.id);
  // Only cards that need an answer count (every-node ruling 6): a numbered plain card never does.
  const items = nodes.filter((n) => isItem(n) && NODE_TYPES[n.kind].answer);
  const decided = items.filter((n) => isDecided(n.kind, statusOf(s, n.id))).length;
  const title = r.title ?? view.regions.find((g) => g.id === r.id)?.title ?? r.id;
  const note = regionNote(s.regionNotes.get(r.id), owed?.has(r.id) ?? true, replies);
  return {
    mode: r.mode,
    countText: items.length ? `${decided} of ${items.length} decided` : '',
    canReset: nodes.some((n) => s.pins.has(n.id)),
    canPutBack: s.regionPins.has(r.id),
    ...(note && { note }),
    commentLabel: commentLabel(title, note?.badge ?? 'none'),
    showEmpty: !nodes.some((n) => placed.has(n.id)),
    ...(holders !== undefined && holders.length > 0 && { holders: regionHolders(holders) }),
  };
}
