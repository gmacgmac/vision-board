// Note bubble pattern, layer 1 (core): where the bubble opens beside its card, and what it says
// in each state. No DOM, so it is unit-tested under plain Node. README picks 5 and 11-12, mockup
// 05 section 1 (`.ovl.note`), Architect `positionPop`: the right of the card, else the left, else
// below; never over the card, and it moves nothing.
import type { NoteKind } from '#format';
import type { NotesEntry, ReplyEntry } from '../node/node-core.ts';

export interface StageBox { x: number; y: number; w: number; h: number }
export interface StageSize { w: number; h: number }

export type BubbleSide = 'right' | 'left' | 'below';

/** Where the bubble goes, in stage pixels, and where its arrow meets the bubble's edge: `arrow`
 * is the distance down the side edge (right, left) or along the top edge (below). */
export interface Placement { side: BubbleSide; x: number; y: number; arrow: number }

/** Space between card and bubble (05 `calc(100% + 18px)`); the bubble's top sits `BUBBLE_DROP`
 * below the card's (05 `--oy: 14px`); the arrow points `BUBBLE_ARROW_AT` down (05 `--ay: 22px`). */
export const BUBBLE_GAP = 18;
export const BUBBLE_DROP = 14;
export const BUBBLE_ARROW_AT = 22;
/** How close the bubble may come to the stage's edge, and the arrow to the bubble's corner. */
export const BUBBLE_EDGE = 8;
const CORNER = 16;

/** `v` within [lo, hi]; `lo` when the range is empty (a bubble taller than the stage). */
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Whether two stage boxes overlap. */
const meets = (a: StageBox, b: StageBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The bubble at `x` on one side of `card`: at its usual height when that is clear of `avoid`, else
 *  the nearest height above or below a strip in the way that is clear, inside the stage, with the
 *  arrow still on the card's top part; undefined when there is none. */
function clearAt(x: number, card: StageBox, bubble: StageSize, stage: StageSize, avoid: readonly StageBox[]): number | undefined {
  const at = card.y + BUBBLE_DROP + BUBBLE_ARROW_AT;
  const y0 = clamp(card.y + BUBBLE_DROP, BUBBLE_EDGE, stage.h - BUBBLE_EDGE - bubble.h);
  const clear = (y: number) => !avoid.some((a) => meets({ x, y, ...bubble }, a));
  if (clear(y0)) return y0;
  const fits = (y: number) => y >= BUBBLE_EDGE && y + bubble.h <= stage.h - BUBBLE_EDGE && at - y >= CORNER && at - y <= bubble.h - CORNER;
  const tries = avoid.flatMap((a) => [a.y - BUBBLE_EDGE - bubble.h, a.y + a.h + BUBBLE_EDGE]).filter((y) => fits(y) && clear(y));
  return tries.sort((a, b) => Math.abs(a - y0) - Math.abs(b - y0))[0];
}

/** The bubble beside `card` (its box on the stage) inside a stage of `stage` size. `avoid`: strips it
 *  should leave clear, such as a neighbouring card's footer buttons (field report batch 3): it moves
 *  up or down its side, then tries the other side, then below the card, and covers them only when
 *  none is clear. */
export function placeBubble(card: StageBox, bubble: StageSize, stage: StageSize, avoid: readonly StageBox[] = []): Placement {
  const right = card.x + card.w + BUBBLE_GAP;
  const left = card.x - BUBBLE_GAP - bubble.w;
  const sides = ([['right', right], ['left', left]] as const)
    .filter(([side, x]) => (side === 'right' ? x + bubble.w <= stage.w - BUBBLE_EDGE : x >= BUBBLE_EDGE));
  if (sides.length) {
    const arrowAt = (y: number) => clamp(card.y + BUBBLE_DROP + BUBBLE_ARROW_AT - y, CORNER, bubble.h - CORNER);
    for (const [side, x] of sides) {
      const y = clearAt(x, card, bubble, stage, avoid);
      if (y !== undefined) return { side, x, y, arrow: arrowAt(y) };
    }
    // Neither side clear: below the card, when that is clear and inside the stage.
    const under = below(card, bubble, stage);
    if (avoid.length && under.y + bubble.h <= stage.h - BUBBLE_EDGE && !avoid.some((a) => meets({ x: under.x, y: under.y, ...bubble }, a))) return under;
    // Covered every way: the first side, at its usual height. The arrow keeps pointing at the
    // card's top part when the bubble is pushed up or down.
    const [side, x] = sides[0]!;
    const y = clamp(card.y + BUBBLE_DROP, BUBBLE_EDGE, stage.h - BUBBLE_EDGE - bubble.h);
    return { side, x, y, arrow: arrowAt(y) };
  }
  return below(card, bubble, stage);
}

/** Under the card, the arrow under its middle. */
function below(card: StageBox, bubble: StageSize, stage: StageSize): Placement {
  const x = clamp(card.x, BUBBLE_EDGE, stage.w - BUBBLE_EDGE - bubble.w);
  const arrow = clamp(card.x + card.w / 2 - x, CORNER, bubble.w - CORNER);
  return { side: 'below', x, y: card.y + card.h + BUBBLE_GAP, arrow };
}

/**
 * The box to place a bubble from when it is about a container's title line (3_FE_04 ruling 3),
 * not a card: `placeBubble(titleAnchor(line), ...)` opens it beside the line with the arrow on the
 * line's middle, or below the line when neither side fits (never over the cards). The box is the
 * line's span, shifted up so the bubble's drop and arrow offset land on the line's middle, and
 * ending at the line's bottom.
 */
export function titleAnchor(line: StageBox): StageBox {
  const y = line.y + line.h / 2 - BUBBLE_DROP - BUBBLE_ARROW_AT;
  return { x: line.x, y, w: line.w, h: line.y + line.h - y };
}

/**
 * The box to place a bubble from when it opens from one part of a card, such as a note or a reply
 * on it (popovers-larger-thread ruling 2): beside the card, with the arrow on the middle of `at`
 * (that part's box). Below, when neither side fits, is still under the card.
 */
export function partAnchor(card: StageBox, at: StageBox): StageBox {
  const y = at.y + at.h / 2 - BUBBLE_DROP - BUBBLE_ARROW_AT;
  return { x: card.x, y, w: card.w, h: Math.max(card.y + card.h - y, at.y + at.h - y) };
}

/** `new`: no note yet (C or M on a card without one). `edit`: the card's note, not yet history.
 * `sent`: a note that is history (sent, or answered by the agent: ruling 5), only shown, with its
 * replies (the pin on it). `thread`: the conversation, every note and reply on the card or the
 * container, oldest first (review polish ruling 6: a click, Enter or Space on a note or a reply). */
export type BubbleMode = 'new' | 'edit' | 'sent' | 'thread';

/** Whether a bubble only shows: a sent note and the conversation are never typed in. They close with
 *  an × in the top corner, Esc or a click outside, and have no bottom row (review polish ruling 7). */
export const readOnlyMode = (mode: BubbleMode): boolean => mode === 'sent' || mode === 'thread';
/** `saving` while the act is on its way; `error` when the server refused it. */
export type BubblePhase = 'idle' | 'saving' | 'error';

/** What the page knows when it opens a bubble. `number` is the card's item number; `index` the
 * note's place among the card's notes (its pin number), for an existing note; `numbers` every
 * item of a note on a group of cards (3_FE_02 ruling 3); `container` the title of the container
 * a note on a whole container is on (3_FE_04 ruling 3), in place of `number`. */
export interface BubbleInput {
  mode: BubbleMode;
  kind: NoteKind;
  number?: number;
  index?: number;
  text?: string;
  numbers?: readonly number[];
  container?: string;
  /** The agent's replies to the note, oldest first, as the card shows them (`replyEntry`). */
  replies?: readonly ReplyEntry[];
  /** In `thread` mode: the whole conversation as `conversation` (`notesView`) lists it, never sorted again. */
  entries?: readonly NotesEntry[];
  /** In `sent` mode: the note is history because the agent answered it, not because of a Send
   *  (popovers-larger-thread ruling 5), so its head says "answered". */
  answered?: boolean;
}

/** Everything the bubble says; the element applies it. */
export interface BubbleView {
  mode: BubbleMode;
  /** The dialog's name, which is also its visible head: "Note on 42", "Edit note on 42". */
  heading: string;
  placeholder: string;
  /** The keyboard hint beside the buttons; empty when read-only. */
  hint: string;
  /** The primary button: "Add note" or "Save"; absent when read-only, which has the × only. */
  primary?: string;
  /** Cancel, or "Close": the name of the × when read-only. */
  cancel: string;
  remove: boolean;
  text: string;
  /** The replies under the note, read-only (popovers-larger-thread ruling 2); empty for none. */
  replies: readonly ReplyEntry[];
  /** The name of the read-only part (the sent note and the replies, or the conversation), which scrolls as one. */
  thread: string;
  /** In `thread` mode, the conversation, oldest first; empty otherwise. */
  entries: readonly NotesEntry[];
}

/** An old More context is a note like any other (D-045), so it reads the same. */
export const PLACEHOLDER: Record<NoteKind, string> = { comment: 'Your note for the agent', context: 'Your note for the agent' };

/** "Note on 42", "Note on 3 cards: 12, 14, 15" for a group, or "Note on container Review" for a
 * whole container; each mode words it its own way. The conversation is the card's or container's. */
function headingOf(b: BubbleInput): string {
  if (b.mode === 'thread') return `Conversation on ${b.container === undefined ? b.number : `container ${b.container}`}`;
  const past = b.answered ? 'answered' : 'sent';
  if (b.container !== undefined) {
    const on = `on container ${b.container}`;
    return b.mode === 'new' ? `Note ${on}` : b.mode === 'edit' ? `Edit note ${on}` : `Note ${b.index ?? 1} ${on}, ${past}`;
  }
  if (b.numbers) {
    const on = `on ${b.numbers.length} cards: ${b.numbers.join(', ')}`;
    return b.mode === 'new' ? `Note ${on}` : b.mode === 'edit' ? `Edit note ${on}` : `Note ${on}, ${past}`;
  }
  return b.mode === 'new' ? `Note on ${b.number}`
    : b.mode === 'edit' ? `Edit note on ${b.number}` : `Note ${b.index ?? 1} on ${b.number}, ${past}`;
}

/** What the read-only part is called: the conversation, the sent note, its replies, or both. */
function threadOf(mode: BubbleMode, replies: number): string {
  if (mode === 'thread') return 'Notes and replies';
  if (mode !== 'sent') return 'Replies';
  return replies ? 'Note and replies' : 'Note';
}

export function bubbleView(b: BubbleInput): BubbleView {
  const heading = headingOf(b);
  const shown = readOnlyMode(b.mode);
  const replies = b.replies ?? [];
  return {
    mode: b.mode, heading, placeholder: PLACEHOLDER[b.kind],
    hint: shown ? '' : `Enter ${b.mode === 'new' ? 'add' : 'save'} · Esc cancel`,
    ...(!shown && { primary: b.mode === 'new' ? 'Add note' : 'Save' }),
    cancel: shown ? 'Close' : 'Cancel',
    remove: b.mode === 'edit',
    text: b.mode === 'thread' ? '' : b.text ?? '',
    replies, thread: threadOf(b.mode, replies.length),
    entries: b.mode === 'thread' ? b.entries ?? [] : [],
  };
}

/** What Save does with the words typed: `skip` closes without writing (empty text never removes
 * a note, ruling 6, and a new note needs words: the page writes no More context, D-045); `save`
 * writes them. */
export function saveIntent(mode: BubbleMode, _kind: NoteKind, text: string): 'save' | 'skip' {
  return !readOnlyMode(mode) && text.trim() ? 'save' : 'skip';
}

/** Whether the words typed differ from the words the bubble opened with (3_FE_04 step 4G ruling
 * 4). Line endings and the whitespace around the text do not count: losing them loses nothing. */
export function isDirty(opened: string, now: string): boolean {
  const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();
  return norm(opened) !== norm(now);
}

/** What Esc or Cancel does: `close` (as before) or `ask` (the text changed: the page confirms
 * "Discard your changes?" first). A sent note or the conversation is never typed in, so it always closes. */
export function cancelIntent(mode: BubbleMode, dirty: boolean): 'close' | 'ask' {
  return !readOnlyMode(mode) && dirty ? 'ask' : 'close';
}

/** `vb-note-discard` (bubbles): Esc or Cancel with changed text. The bubble stays open; the page
 * asks through its confirm dialog and then closes it (OK) or puts focus back in it (Cancel). */
export const NOTE_DISCARD_EVENT = 'vb-note-discard';
export interface NoteDiscardDetail { text: string }
