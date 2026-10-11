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

/** `new`: no note yet (C or M on a card without one). `edit`: the card's note not yet sent.
 * `sent`: a sent note, which is history and only shown. */
export type BubbleMode = 'new' | 'edit' | 'sent';
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

/** "Note on 42", "Note on 3 cards: 12, 14, 15" for a group, or "Note on container Review" for a
 * whole container; each mode words it its own way. */
function headingOf(b: BubbleInput): string {
  if (b.container !== undefined) {
    const on = `on container ${b.container}`;
    return b.mode === 'new' ? `Note ${on}` : b.mode === 'edit' ? `Edit note ${on}` : `Note ${b.index ?? 1} ${on}, sent`;
  }
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

/** Whether the words typed differ from the words the bubble opened with (3_FE_04 step 4G ruling
 * 4). Line endings and the whitespace around the text do not count: losing them loses nothing. */
export function isDirty(opened: string, now: string): boolean {
  const norm = (s: string) => s.replace(/\r\n?/g, '\n').trim();
  return norm(opened) !== norm(now);
}

/** What Esc or Cancel does: `close` (as before) or `ask` (the text changed: the page confirms
 * "Discard your changes?" first). A sent note is never typed in, so it always closes. */
export function cancelIntent(mode: BubbleMode, dirty: boolean): 'close' | 'ask' {
  return mode !== 'sent' && dirty ? 'ask' : 'close';
}

/** `vb-note-discard` (bubbles): Esc or Cancel with changed text. The bubble stays open; the page
 * asks through its confirm dialog and then closes it (OK) or puts focus back in it (Cancel). */
export const NOTE_DISCARD_EVENT = 'vb-note-discard';
export interface NoteDiscardDetail { text: string }
