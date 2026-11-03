// The container in use (railOnHover flag; read-only follow-ups FE_03, PLAN decision 9): the frame the
// pointer is over, or whose card or control holds focus, carries data-use, which region-rail.css reads to
// show its rail icons. The cards are a layer of their own above the frames, so a frame's :hover and
// :focus-within do not see its cards; this reads the frames' boxes on screen instead. At most one frame
// is hovered (the smallest box under the pointer) and one holds focus; they may differ. The rail itself
// sits inside its frame, so CSS covers a pointer or focus on the rail with no help from here.
import type { VbRegionElement } from '#ui';

/** Listens on `stage`; returns the function that stops listening. `regionOf`: the region a card is in. */
export function bindRegionUse(stage: HTMLElement, frames: () => ReadonlyMap<string, VbRegionElement>, regionOf: (card: string) => string | undefined): () => void {
  let pointer: { x: number; y: number } | null = null;
  let focused: string | null = null;
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
  const apply = () => {
    frame = 0;
    const over = hovered();
    for (const [id, el] of frames()) el.toggleAttribute('data-use', id === over || id === focused);
  };
  const soon = () => { if (!frame) frame = requestAnimationFrame(apply); };
  const move = (e: PointerEvent) => { pointer = e.pointerType === 'mouse' || e.pointerType === 'pen' ? { x: e.clientX, y: e.clientY } : null; soon(); };
  const leave = () => { pointer = null; soon(); };
  const focusIn = (e: FocusEvent) => {
    const t = e.target as Element | null;
    const card = t?.closest<HTMLElement>('vb-node');
    focused = card ? regionOf(card.dataset.id ?? '') ?? null : t?.closest<HTMLElement>('vb-region')?.dataset.region ?? null;
    soon();
  };
  const focusOut = () => { focused = null; soon(); };
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('wheel', soon, { passive: true }); // the board moved under a still pointer
  stage.addEventListener('focusin', focusIn);
  stage.addEventListener('focusout', focusOut);
  return () => {
    cancelAnimationFrame(frame);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerleave', leave);
    stage.removeEventListener('wheel', soon);
    stage.removeEventListener('focusin', focusIn);
    stage.removeEventListener('focusout', focusOut);
  };
}
