// Where the note bubble is placed from (split out of notes.ts): a container's title line, or the
// cards it is on, and beside the part it opened from (a note or a reply), its arrow on that part
// (popovers-larger-thread ruling 2, review polish ruling 6). Read from the layout, so a bubble
// follows its card through every pan, zoom and relayout.
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { StageBox, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { boxAround, partAnchor, titleAnchor } from '../../../../packages/ui/src/index.ts';
import type { Open } from './note-views.ts';
import type { Viewport } from './viewport.ts';

export interface AnchorDeps {
  vp: Viewport;
  layout(): BoardLayout | null;
  card(id: string): HTMLElement | undefined;
  frame(id: string): VbRegionElement | undefined;
}

/** The part `o.at` of `el` (a note or a reply it opened from), when it is drawn: its box. */
const partOf = (o: Open, el?: HTMLElement) => {
  const r = o.at ? el?.querySelector(o.at)?.getBoundingClientRect() : undefined;
  return r?.height ? r : undefined;
};

/** The stage box the bubble is placed from: the title line of a container, or the cards, and
 *  beside the part it opened from (a note or a reply), its arrow on that part. Both come from
 *  the layout (where the frame or cards are going), not from a box mid-transition. */
export function anchorBox(d: AnchorDeps, o: Open): StageBox | undefined {
  const layout = d.layout();
  const { k, x, y } = d.vp;
  if (o.region) {
    const r = layout?.regions.find((g) => g.id === o.region);
    const el = d.frame(o.region);
    if (!r || !el?.isConnected) return undefined;
    // The line's (or the part's) offset inside its frame (both share the world's transform),
    // added to where the layout puts the frame.
    const [f, l] = [el.getBoundingClientRect(), el.titleLine().getBoundingClientRect()];
    const p = partOf(o, el) ?? l;
    return titleAnchor({ x: r.box.x * k + x + (l.left - f.left), y: r.box.y * k + y + (p.top - f.top), w: l.width, h: p.height });
  }
  const boxes = o.anchor.map((id) => layout?.nodes.get(id)).filter((b) => b !== undefined);
  if (!boxes.length) return undefined;
  const b = boxAround(boxes)!;
  const box = { x: b.x * k + x, y: b.y * k + y, w: b.w * k, h: b.h * k };
  const el = d.card(o.anchor[0]!);
  const p = partOf(o, el);
  return p && el ? partAnchor(box, { x: box.x, y: box.y + (p.top - el.getBoundingClientRect().top), w: box.w, h: p.height }) : box;
}
