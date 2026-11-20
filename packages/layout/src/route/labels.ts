// Link labels (field-report batch 3 ruling 3; point 646, PLAN folders-labels-print § Decisions 3): a label is a word on
// its line, read where it sits. It takes the first of these places that covers no card and no earlier label:
//  1. on a straight piece of its line, near the source end (`onPiece`, as before);
//  2. just above or below a level piece, inside the gap between its two cards, clear of every line and the arrowhead;
//  3. centred on an upright piece, inside that gap, clear of the other lines and the arrowhead;
//  4. just right or left of an upright piece (stacked cards), inside that gap, clear of every line and the arrowhead
//     (2 to 4: `inGap`).
// When none fits, a short tag (the first words and an ellipsis, `shortTag`) sits on the line near the source in a 24 px
// target; the page shows the whole label on its hover or focus, and whole in print, wrapped in the room `paperRoom`
// finds clear of the cards and the arrowhead. Never a bare dot; cards never move.
// Layout stays pure, so a label's size is worked out from its length (`labelSize`), not measured: the page draws the
// label no wider than this. Deterministic: labels are placed in link order.
import type { Box, LabelPlace, Point, Size } from '../types.ts';
import { overlaps } from '../geometry.ts';
import { along, lengthOf } from './path.ts';

/** A label's text width per character, its side padding and its height, px. */
export const LABEL_CHAR = 6.5;
export const LABEL_PAD = 6;
export const LABEL_H = 18;
/** How far a label or tag keeps from the source's port, px. */
const FROM_PORT = 14;
/** How far a label beside its line keeps from the line, and from a card, px. */
const BESIDE = 3;
const CLEAR = 4;
/** How far a label beside an upright piece keeps from it: clear of the arrowhead's half width (ARROW / 2), px. */
const BESIDE_UP = 7;
/** How far a label keeps from any line it does not sit on (its canvas-coloured tag would hide it), px. */
const LINE_CLEAR = 2;
/** The arrowhead's length and width at the line's end (7 × the wire's 1.6 px, rounded up), px. */
const ARROW = 12;
/** How far apart the places tried along a piece or a line are, px. */
const STEP = 4;

export const labelSize = (text: string): Size => ({ w: Math.ceil(text.length * LABEL_CHAR) + 2 * LABEL_PAD, h: LABEL_H });

/** What a label must keep clear of. `cards`: every card's box; `taken`: the labels and tags placed so far (added to
 *  when one is placed); `lines`: every link's polyline. */
export interface LabelRoom { cards: readonly Box[]; taken: Box[]; lines: readonly Point[][] }

/** The label's place for the polyline `pts` (source first) between the cards `ends` (source, target). */
export function placeLabel(pts: Point[], text: string, room: LabelRoom, ends: readonly [Box, Box]): LabelPlace {
  const size = labelSize(text);
  const at = onPiece(pts, size, room) ?? inGap(pts, size, room, ends);
  if (at) return { ...at, fits: true };
  const tag = shortTag(pts, text, room);
  return { ...tag, fits: false, room: paperRoom(pts, text, tag, room.cards) };
}

const boxAt = (p: Point, { w, h }: Size): Box => ({ x: p.x - w / 2, y: p.y - h / 2, w, h });
const clearOf = (box: Box, boxes: readonly Box[], gap = 0) => !boxes.some((b) => overlaps(box, b, gap));
const level = (a: Point, b: Point) => a.y === b.y;

/** 1. On a straight piece, FROM_PORT from its start: as before point 646. */
function onPiece(pts: Point[], size: Size, room: LabelRoom): Point | null {
  const { w, h } = size;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const flat = level(a, b);
    const length = flat ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
    if (length < (flat ? w : h) + 2 * FROM_PORT) continue;
    const step = FROM_PORT + (flat ? w : h) / 2;
    const at = flat ? { x: a.x + Math.sign(b.x - a.x) * step, y: a.y } : { x: a.x, y: a.y + Math.sign(b.y - a.y) * step };
    if (take(boxAt(at, size), room)) return at;
  }
  return null;
}

/** Keep `box` when it covers no card and no earlier label. */
function take(box: Box, room: LabelRoom, gap = 0): boolean {
  if (!clearOf(box, room.cards, gap) || !clearOf(box, room.taken)) return false;
  room.taken.push(box);
  return true;
}

/** Each piece of `pts` as a box with no thickness. */
const piecesOf = (pts: readonly Point[]): Box[] => pts.slice(1).map((b, i) => {
  const a = pts[i]!;
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
});

const inside = (box: Box, gap: Box) =>
  box.x >= gap.x && box.y >= gap.y && box.x + box.w <= gap.x + gap.w && box.y + box.h <= gap.y + gap.h;

/** 2, 3 and 4: beside a level piece, else centred on an upright one, else beside an upright one; each inside the gap
 *  between the two cards (the box round both), CLEAR from every card, and clear of the arrowhead and of the lines it
 *  does not sit on. */
function inGap(pts: Point[], size: Size, room: LabelRoom, ends: readonly [Box, Box]): Point | null {
  const [s, t] = ends;
  const gap = { x: Math.min(s.x, t.x), y: Math.min(s.y, t.y), w: 0, h: 0 };
  gap.w = Math.max(s.x + s.w, t.x + t.w) - gap.x;
  gap.h = Math.max(s.y + s.h, t.y + t.h) - gap.y;
  const arrow = arrowOf(pts);
  const others = room.lines.filter((l) => l !== pts).flatMap(piecesOf);
  const all = [...piecesOf(pts), ...others];
  const fits = (at: Point, lines: Box[]) => {
    const box = boxAt(at, size);
    return inside(box, gap) && !overlaps(box, arrow) && clearOf(box, lines, LINE_CLEAR) && take(box, room, CLEAR);
  };
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    if (!level(a, b)) continue;
    for (const side of [-1, 1]) {
      const y = a.y + side * (BESIDE + size.h / 2);
      for (const x of middleOut(a.x, b.x)) if (fits({ x, y }, all)) return { x, y };
    }
  }
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const at = { x: a.x, y: (a.y + b.y) / 2 };
    if (!level(a, b) && fits(at, others)) return at;
  }
  // 4. Just right, then just left, of an upright piece (orchestrator follow-up to point 646: stacked cards).
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    if (level(a, b)) continue;
    for (const side of [1, -1]) {
      const x = a.x + side * (BESIDE_UP + size.w / 2);
      for (const y of middleOut(a.y, b.y)) if (fits({ x, y }, all)) return { x, y };
    }
  }
  return null;
}

/** The arrowhead's room: the last ARROW px of the line, ARROW wide across it. */
function arrowOf(pts: Point[]): Box {
  const [a, end] = [pts[pts.length - 2]!, pts[pts.length - 1]!];
  const [half, back] = [ARROW / 2, (v: number, from: number) => (v > from ? v - ARROW : v)];
  return level(a, end)
    ? { x: back(end.x, a.x), y: end.y - half, w: ARROW, h: ARROW }
    : { x: end.x - half, y: back(end.y, a.y), w: ARROW, h: ARROW };
}

/** The places along a piece from v0 to v1 (x of a level piece, y of an upright one): its middle, then outwards STEP at
 *  a time, the source's side first. */
function middleOut(v0: number, v1: number): number[] {
  const [mid, half, toward] = [(v0 + v1) / 2, Math.abs(v1 - v0) / 2, Math.sign(v1 - v0) || 1];
  const out = [mid];
  for (let d = STEP; d <= half; d += STEP) out.push(mid - toward * d, mid + toward * d);
  return out;
}

/** A short tag's target: MARK tall and at least MARK wide (WCAG 2.5.8), px. */
const MARK = 24;
/** The longest first word a tag shows whole, characters. */
const WORD = 10;

/** A tag's target box size for its words. */
export const tagSize = (short: string): Size => ({ w: Math.max(MARK, labelSize(short).w), h: MARK });

/** The words a short tag may show, longest first: the first words of the label and an ellipsis, down to its first
 *  word (cut, with an ellipsis, past WORD characters). A one-word label is that word, cut when long. */
export function tagWords(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const lead = words[0]!.length > WORD ? `${words[0]!.slice(0, WORD - 1)}…` : null;
  if (words.length === 1) return [lead ?? words[0]!];
  const out: string[] = [];
  for (let k = words.length - 1; k > 1; k--) out.push(`${words.slice(0, k).join(' ')}…`);
  out.push(lead ?? `${words[0]}…`);
  return out;
}

/** 5. The short tag: the longest of `tagWords` whose target, somewhere on the first half of the line from near the
 *  source, covers no card, label or earlier tag (added to `taken`); with none, the shortest at the first point anyway
 *  (FE_01: two targets 18 px apart were one over another). */
function shortTag(pts: Point[], text: string, room: LabelRoom): Point & { short: string } {
  const half = lengthOf(pts) / 2;
  const first = Math.min(FROM_PORT + 4, half);
  const words = tagWords(text);
  for (const short of words) {
    const size = tagSize(short);
    for (let d = first; d <= half; d += STEP) {
      const p = along(pts, d);
      const box = boxAt(p, size);
      // 1 px spare for rounding.
      if (!clearOf(box, room.cards, 1) || !clearOf(box, room.taken, 1)) continue;
      room.taken.push(box);
      return { ...p, short };
    }
  }
  const short = words[words.length - 1]!;
  const p = along(pts, first);
  room.taken.push(boxAt(p, tagSize(short)));
  return { ...p, short };
}

/** The whole label on paper: at most this wide, px; its line height, px; and a character's width with a tenth to spare
 *  (LABEL_CHAR is the screen's estimate, and a wrap that runs a line longer than estimated must not run into a card). */
const PAPER_W = 160;
const PAPER_LINE = 14;
const PAPER_CHAR = LABEL_CHAR * 1.1;

/** How many lines `text` wraps to in `room` px of text width: whole words, a word wider than the room broken. */
export function linesIn(text: string, room: number): number {
  let [lines, used] = [1, 0];
  for (const word of text.trim().split(/\s+/)) {
    const w = word.length * PAPER_CHAR;
    const need = used ? used + PAPER_CHAR + w : w;
    if (need <= room) {
      used = need;
      continue;
    }
    const broken = Math.ceil(w / room) - 1;
    lines += (used ? 1 : 0) + broken;
    used = w - broken * room;
  }
  return lines;
}

/** Where the whole label goes on paper (VERIFY_01 fix): the widest room up to PAPER_W whose wrapped box, at the tag's
 *  height and centred as near the tag as it can be, covers no card (CLEAR) and not the arrowhead; with none, the tag's
 *  own width at the tag. */
function paperRoom(pts: Point[], text: string, at: Point & { short: string }, cards: readonly Box[]): { x: number; w: number } {
  const blocks = [...cards.map((c) => ({ x: c.x - CLEAR, y: c.y - CLEAR, w: c.w + 2 * CLEAR, h: c.h + 2 * CLEAR })), arrowOf(pts)];
  const least = tagSize(at.short).w;
  const whole = Math.ceil(text.trim().length * PAPER_CHAR) + 2 * LABEL_PAD;
  for (let w = Math.min(PAPER_W, whole); w >= least; w -= STEP) {
    const h = linesIn(text, w - 2 * LABEL_PAD) * PAPER_LINE + 4;
    const x = freeAt(at, w, h, blocks);
    if (x !== null) return { x, w };
  }
  return { x: at.x, w: least };
}

/** The centre nearest `at.x` for a box `w` by `h` centred at `at.y` between `blocks`; null when none leaves it room. */
function freeAt(at: Point, w: number, h: number, blocks: readonly Box[]): number | null {
  const [top, bottom] = [at.y - h / 2, at.y + h / 2];
  let [lo, hi] = [-Infinity, Infinity];
  for (const b of blocks) {
    if (b.y >= bottom || b.y + b.h <= top) continue;
    if (b.x + b.w <= at.x) lo = Math.max(lo, b.x + b.w);
    else if (b.x >= at.x) hi = Math.min(hi, b.x);
    else return null;
  }
  if (hi - lo < w) return null;
  return Math.min(Math.max(at.x, lo + w / 2), hi - w / 2);
}
