// Link labels (field-report batch 3 ruling 3): a label sits on its line near the source end when
// it fits that stretch of line without covering a card or an earlier label; otherwise the page
// draws a small marker on the line near the source, and the label floats on hover or focus. Layout
// stays pure, so a label's size is worked out from its length (`labelSize`), not measured: the
// page draws the label no wider than this. Deterministic: labels are placed in link order.
import type { Box, LabelPlace, Point, Size } from '../types.ts';
import { overlaps } from '../geometry.ts';
import { along, lengthOf } from './path.ts';

/** A label's text width per character, its side padding and its height, px. */
export const LABEL_CHAR = 6.5;
export const LABEL_PAD = 6;
export const LABEL_H = 18;
/** How far a label or marker keeps from the source's port, px. */
const FROM_PORT = 14;

export const labelSize = (text: string): Size => ({ w: Math.ceil(text.length * LABEL_CHAR) + 2 * LABEL_PAD, h: LABEL_H });

/** The label's place on the polyline `pts` (source first). `cards`: every card's box; `taken`:
 *  the labels placed so far, added to when this one fits. */
export function placeLabel(pts: Point[], text: string, cards: readonly Box[], taken: Box[]): LabelPlace {
  const { w, h } = labelSize(text);
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const flat = a.y === b.y;
    const room = flat ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
    const need = (flat ? w : h) + 2 * FROM_PORT;
    if (room < need) continue;
    const step = FROM_PORT + (flat ? w : h) / 2;
    const at = flat ? { x: a.x + Math.sign(b.x - a.x) * step, y: a.y } : { x: a.x, y: a.y + Math.sign(b.y - a.y) * step };
    const box = { x: at.x - w / 2, y: at.y - h / 2, w, h };
    if (cards.some((c) => overlaps(box, c)) || taken.some((t) => overlaps(box, t))) continue;
    taken.push(box);
    return { ...at, fits: true };
  }
  return { ...along(pts, Math.min(FROM_PORT + 4, lengthOf(pts) / 2)), fits: false };
}
