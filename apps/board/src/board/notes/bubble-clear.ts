// What a note bubble keeps clear of (field report batch 3, BE_02's hand-off to FE_01): beside a card
// the bubble covers its neighbour, and in a row lined up by its tops (ruling 4) the neighbour's
// footer buttons sat under the bubble's edge. This lists the footer strip of every card within the
// bubble's reach, in stage pixels, for `placeBubble`'s `avoid`. Only those cards are read, and each
// strip is placed from where the layout puts its card, not from a card mid-transition.
import type { BoardLayout } from '#layout';
import { overlaps } from '#layout';
import type { StageBox, StageSize } from '#ui';
import { BUBBLE_GAP } from '#ui';

/** `at`: the box the bubble is placed from; `skip`: the cards the note is on. */
export function footersNear(
  layout: BoardLayout | null, card: (id: string) => HTMLElement | undefined, vp: { k: number; x: number; y: number },
  at: StageBox, bubble: StageSize, skip: readonly string[],
): StageBox[] {
  if (!layout) return [];
  const { k, x, y } = vp;
  // Anywhere the bubble can go: either side of `at`, its height above, and below it.
  const reach = { x: at.x - BUBBLE_GAP - bubble.w, y: at.y - bubble.h, w: at.w + 2 * (BUBBLE_GAP + bubble.w), h: at.h + 2 * bubble.h + BUBBLE_GAP };
  const strips: StageBox[] = [];
  for (const [id, b] of layout.nodes) {
    const box = { x: b.x * k + x, y: b.y * k + y, w: b.w * k, h: b.h * k };
    if (skip.includes(id) || !overlaps(box, reach)) continue;
    const el = card(id);
    const foot = el?.querySelector('.vb-node-foot');
    if (!el || !foot) continue;
    const [c, f] = [el.getBoundingClientRect(), foot.getBoundingClientRect()];
    strips.push({ x: box.x, y: box.y + (f.top - c.top), w: box.w, h: f.height });
  }
  return strips;
}
