// The container in use (railOnHover flag; read-only follow-ups FE_03, PLAN decision 9): the frame the
// pointer is over, or whose card or control holds focus, carries data-use, which region-rail.css reads to
// show its rail icons. The cards are a layer of their own above the frames, so a frame's :hover and
// :focus-within do not see its cards; this reads the frames' boxes on screen instead. At most one frame
// is hovered (the smallest box under the pointer) and one holds focus; they may differ. The rail itself
// sits inside its frame, so CSS covers a pointer or focus on the rail with no help from here.
import type { VbRegionElement } from '#ui';

export interface RegionUse {
  /** Read the pointer and the focus again and mark the frames (a draw can move a focused card to another frame). */
  apply(): void;
  /** Stop listening. */
  stop(): void;
}

/** Listens on `stage`. `regionOf`: the region a card is in. Focus is read live, never kept, so a card
 *  that moved frame or lost focus leaves no mark behind; a pointer move is applied on the next frame. */
export function bindRegionUse(stage: HTMLElement, frames: () => ReadonlyMap<string, VbRegionElement>, regionOf: (card: string) => string | undefined): RegionUse {
  let pointer: { x: number; y: number } | null = null;
  let frame = 0;
  const hovered = (): string | null => {
    if (!pointer) return null;
    let best: string | null = null;
    let area = Infinity;
    for (const [id, el] of frames()) {
      const r = el.getBoundingClientRect();
      if (pointer.x < r.left || pointer.x > r.right || pointer.y < r.top || pointer.y > r.bottom) continue;
      if (r.width * r.height < area) { best = id; area = r.width * r.height; }
    }
    return best;
  };
  /** The frame holding focus: the focused card's, or the frame's own (its rail, its title). */
  const focused = (): string | null => {
    const t = stage.contains(document.activeElement) ? document.activeElement : null;
    const card = t?.closest<HTMLElement>('vb-node');
    return card ? regionOf(card.dataset.id ?? '') ?? null : t?.closest<HTMLElement>('vb-region')?.dataset.region ?? null;
  };
  const apply = () => {
    frame = 0;
    const [over, held] = [hovered(), focused()];
    for (const [id, el] of frames()) el.toggleAttribute('data-use', id === over || id === held);
  };
  const soon = () => { if (!frame) frame = requestAnimationFrame(apply); };
  const move = (e: PointerEvent) => { pointer = e.pointerType === 'mouse' || e.pointerType === 'pen' ? { x: e.clientX, y: e.clientY } : null; soon(); };
  const leave = () => { pointer = null; soon(); };
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('wheel', soon, { passive: true }); // the board moved under a still pointer
  stage.addEventListener('focusin', apply);
  const out = () => queueMicrotask(apply);
  stage.addEventListener('focusout', out); // activeElement is the body until the next focus lands
  return { apply, stop: () => {
    cancelAnimationFrame(frame);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerleave', leave);
    stage.removeEventListener('wheel', soon);
    stage.removeEventListener('focusin', apply);
    stage.removeEventListener('focusout', out);
  } };
}
