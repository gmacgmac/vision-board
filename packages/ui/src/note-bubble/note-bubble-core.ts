// Note bubble pattern, layer 1 (core): where the bubble opens beside its card, and what it says
// in each state. No DOM, so it is unit-tested under plain Node. README picks 5 and 11-12, mockup
// 05 section 1 (`.ovl.note`), Architect `positionPop`: the right of the card, else the left, else
// below; never over the card, and it moves nothing.
import type { NoteKind } from '../../../format/src/index.ts';

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

/** The bubble beside `card` (its box on the stage) inside a stage of `stage` size. */
export function placeBubble(card: StageBox, bubble: StageSize, stage: StageSize): Placement {
  const right = card.x + card.w + BUBBLE_GAP;
  const left = card.x - BUBBLE_GAP - bubble.w;
  const fitsRight = right + bubble.w <= stage.w - BUBBLE_EDGE;
  const fitsLeft = left >= BUBBLE_EDGE;
  if (fitsRight || fitsLeft) {
    const y = clamp(card.y + BUBBLE_DROP, BUBBLE_EDGE, stage.h - BUBBLE_EDGE - bubble.h);
    // The arrow keeps pointing at the card's top part when the bubble is pushed up or down.
    const arrow = clamp(card.y + BUBBLE_DROP + BUBBLE_ARROW_AT - y, CORNER, bubble.h - CORNER);
    return { side: fitsRight ? 'right' : 'left', x: fitsRight ? right : left, y, arrow };
  }
  const x = clamp(card.x, BUBBLE_EDGE, stage.w - BUBBLE_EDGE - bubble.w);
  const arrow = clamp(card.x + card.w / 2 - x, CORNER, bubble.w - CORNER);
  return { side: 'below', x, y: card.y + card.h + BUBBLE_GAP, arrow };
}

/** `new`: no note yet (C or M on a card without one). `edit`: the card's note not yet sent.
 * `sent`: a sent note, which is history and only shown. */
export type BubbleMode = 'new' | 'edit' | 'sent';
/** `saving` while the act is on its way; `error` when the server refused it. */
export type BubblePhase = 'idle' | 'saving' | 'error';

/** What the page knows when it opens a bubble. `number` is the card's item number; `index` the
 * note's place among the card's notes (its pin number), for an existing note; `numbers` every
 * item of a note on a group of cards (3_FE_02 ruling 3). */
export interface BubbleInput {
  mode: BubbleMode;
  kind: NoteKind;
  number: number;
  index?: number;
  text?: string;
  numbers?: readonly number[];
}

/** Everything the bubble says; the element applies it. */
export interface BubbleView {
  mode: BubbleMode;
  /** The dialog's name, which is also its visible head: "Note on 42", "Edit note on 42". */
  heading: string;
  placeholder: string;
  /** The keyboard hint beside the buttons; empty for a sent note. */
  hint: string;
  /** The primary button: "Add note" or "Save"; absent for a sent note, which has Close only. */
  primary?: string;
  cancel: string;
  remove: boolean;
  text: string;
}

export const PLACEHOLDER: Record<NoteKind, string> = {
  comment: 'Your note for the agent',
  context: 'What is unclear? For example: explain it in plain terms',
};

/** "Note on 42", or "Note on 3 cards: 12, 14, 15" for a group; each mode words it its own way. */
function headingOf(b: BubbleInput): string {
  if (b.numbers) {
    const on = `on ${b.numbers.length} cards: ${b.numbers.join(', ')}`;
    return b.mode === 'new' ? `Note ${on}` : b.mode === 'edit' ? `Edit note ${on}` : `Note ${on}, sent`;
  }
  return b.mode === 'new' ? `Note on ${b.number}`
    : b.mode === 'edit' ? `Edit note on ${b.number}` : `Note ${b.index ?? 1} on ${b.number}, sent`;
}

export function bubbleView(b: BubbleInput): BubbleView {
  const heading = headingOf(b);
  return {
    mode: b.mode, heading, placeholder: PLACEHOLDER[b.kind],
    hint: b.mode === 'sent' ? '' : `Enter ${b.mode === 'new' ? 'add' : 'save'} · Esc cancel`,
    ...(b.mode !== 'sent' && { primary: b.mode === 'new' ? 'Add note' : 'Save' }),
    cancel: b.mode === 'sent' ? 'Close' : 'Cancel',
    remove: b.mode === 'edit',
    text: b.text ?? '',
  };
}

/** What Save does with the words typed: `skip` closes without writing (empty text never removes
 * a note, ruling 6, and a new comment needs words); `save` writes them. A new "more context" may
 * go without words, as the registry allows (`context` text optional). */
export function saveIntent(mode: BubbleMode, kind: NoteKind, text: string): 'save' | 'skip' {
  if (mode === 'sent') return 'skip';
  if (text.trim()) return 'save';
  return mode === 'new' && kind === 'context' ? 'save' : 'skip';
}
