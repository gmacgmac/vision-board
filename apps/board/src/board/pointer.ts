// Pointer input: drag a card to move it (becomes a pin), drag empty space to pan, scroll to
// pan, Ctrl/Cmd + scroll to zoom. Keyboard equivalents live in keys.ts (project rule 5).
import type { Box } from '../../../../packages/layout/src/index.ts';
import type { Viewport } from './viewport.ts';

export interface PointerHandlers {
  box(id: string): Box | undefined;
  dragMove(id: string, box: Box): void;
  dragEnd(id: string, box: Box): void;
}

const INTERACTIVE = 'button, select, a, input, textarea, .vb-region-head';
const DRAG_THRESHOLD = 4;

export function bindPointer(stage: HTMLElement, vp: Viewport, h: PointerHandlers): void {
  let drag: { id: string; el: HTMLElement; sx: number; sy: number; box0: Box; box: Box; moved: boolean } | null = null;
  let pan: { sx: number; sy: number; x0: number; y0: number } | null = null;

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    const card = target.closest<HTMLElement>('vb-node');
    const box0 = card ? h.box(card.dataset.id!) : undefined;
    if (card && box0 && e.button === 0 && !e.altKey) {
      drag = { id: card.dataset.id!, el: card, sx: e.clientX, sy: e.clientY, box0, box: box0, moved: false };
    } else {
      pan = { sx: e.clientX, sy: e.clientY, x0: vp.x, y0: vp.y };
      stage.classList.add('panning');
    }
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (pan) {
      vp.x = pan.x0 + e.clientX - pan.sx;
      vp.y = pan.y0 + e.clientY - pan.sy;
      vp.apply();
      return;
    }
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / vp.k;
    const dy = (e.clientY - drag.sy) / vp.k;
    if (!drag.moved && Math.hypot(dx, dy) * vp.k < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.el.classList.add('dragging');
    drag.box = { ...drag.box0, x: Math.round(drag.box0.x + dx), y: Math.round(drag.box0.y + dy) };
    drag.el.style.transform = `translate(${drag.box.x}px, ${drag.box.y}px)`;
    h.dragMove(drag.id, drag.box);
  });

  const end = (e: PointerEvent) => {
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    stage.classList.remove('panning');
    pan = null;
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.moved) {
      d.el.classList.remove('dragging');
      h.dragEnd(d.id, d.box);
    }
    d.el.focus({ preventScroll: true });
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) vp.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    else vp.panBy(-e.deltaX, -e.deltaY);
  }, { passive: false });
}
