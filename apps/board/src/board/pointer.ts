// Pointer input (3_FE_01 rulings 1 and 4-7). On a card: a click selects it (Shift, Cmd or Ctrl
// adds or removes it), a drag on its kind tab moves it (the drop becomes a pin), and a drag on its
// content selects text and never pans. On the board's or a container's background (its top line
// outside its controls included): a drag pans and a click clears the selection; Shift+drag is
// reserved for the lasso (3_FE_02) and does nothing yet. The middle button pans anywhere. While a
// pan or a move runs, nothing on the page gets text-selected (U5). Scroll pans, Ctrl/Cmd + scroll
// zooms. Keyboard equivalents live in keys.ts (project rule 5).
import type { Box } from '../../../../packages/layout/src/index.ts';
import type { Viewport } from './viewport.ts';

export interface PointerHandlers {
  box(id: string): Box | undefined;
  dragMove(id: string, box: Box): void;
  dragEnd(id: string, box: Box): void;
  /** A click on a card, not on one of its controls: alone, or `add` (Shift, Cmd or Ctrl held). */
  pick(id: string, add: boolean): void;
  /** A click on the board's or a container's background. */
  clear(): void;
}

/** Nothing inside these starts a gesture: they are controls with their own click (a container's
 * tools, the note bubble the person types in, a note on a card that opens it). */
const INTERACTIVE = 'button, select, a, input, textarea, .vb-region-tools, vb-note-bubble, .vb-node-note';
/** Where the middle button keeps its own meaning (a link opens in a new tab; a field pastes). */
const OWN_MIDDLE = 'a, input, textarea, select, vb-note-bubble';
/** The one place a card is moved from (ruling 4): the kind tab with its grip dots. */
const HANDLE = '.vb-node-kind';
const DRAG_THRESHOLD = 4;

interface Start { sx: number; sy: number; moved: boolean }
type Gesture =
  | Start & { kind: 'move'; id: string; el: HTMLElement; box0: Box; box: Box; add: boolean }
  | Start & { kind: 'pan'; x0: number; y0: number; middle: boolean }
  /** On a card's content: the browser selects text on a drag; a click picks the card. */
  | Start & { kind: 'press'; id: string; el: HTMLElement; add: boolean }
  /** Shift on a background: the lasso's gesture, free until 3_FE_02. */
  | Start & { kind: 'reserved' };

export function bindPointer(stage: HTMLElement, vp: Viewport, h: PointerHandlers): void {
  let g: Gesture | null = null;
  /** The mousedown after this pointerdown must not do its default (focus, text selection). */
  let stopMouse = false;

  const start = (e: PointerEvent): Start => ({ sx: e.clientX, sy: e.clientY, moved: false });
  function capture(e: PointerEvent) {
    stage.setPointerCapture(e.pointerId);
  }
  function pan(e: PointerEvent) {
    g = { kind: 'pan', ...start(e), x0: vp.x, y0: vp.y, middle: e.button === 1 };
    stage.classList.add('panning');
    capture(e);
  }

  stage.addEventListener('pointerdown', (e) => {
    g = null;
    stopMouse = false;
    const t = e.target as HTMLElement;
    if (e.button === 1) {
      if (t.closest(OWN_MIDDLE)) return;
      stopMouse = true; // no autoscroll, no paste
      return pan(e);
    }
    if (e.button !== 0 || t.closest(INTERACTIVE)) return;
    const card = t.closest<HTMLElement>('vb-node');
    const add = e.shiftKey || e.metaKey || e.ctrlKey;
    if (card) {
      const id = card.dataset.id!;
      const box0 = t.closest(HANDLE) ? h.box(id) : undefined;
      if (box0) {
        g = { kind: 'move', ...start(e), id, el: card, box0, box: box0, add };
        return capture(e);
      }
      g = { kind: 'press', ...start(e), id, el: card, add };
      // A modified click adds or removes the card: it must not extend a text selection.
      stopMouse = add;
      return;
    }
    // A background: what was selected as text goes, as a press on a page's background does.
    document.getSelection()?.removeAllRanges();
    if (e.shiftKey) {
      g = { kind: 'reserved', ...start(e) };
      stopMouse = true;
      return;
    }
    pan(e);
  });
  stage.addEventListener('mousedown', (e) => {
    if (stopMouse) e.preventDefault();
  });
  // While a pan or a move runs, no text anywhere is selected (U5); a press on a card's content
  // is the one gesture that selects text.
  stage.addEventListener('selectstart', (e) => {
    if (g && g.kind !== 'press') e.preventDefault();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!g) return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < DRAG_THRESHOLD) return;
    g.moved = true;
    if (g.kind === 'pan') {
      vp.x = g.x0 + e.clientX - g.sx;
      vp.y = g.y0 + e.clientY - g.sy;
      vp.apply();
    } else if (g.kind === 'move') {
      const dx = (e.clientX - g.sx) / vp.k;
      const dy = (e.clientY - g.sy) / vp.k;
      g.el.classList.add('dragging');
      g.box = { ...g.box0, x: Math.round(g.box0.x + dx), y: Math.round(g.box0.y + dy) };
      g.el.style.transform = `translate(${g.box.x}px, ${g.box.y}px)`;
      h.dragMove(g.id, g.box);
    }
  });

  const end = (e: PointerEvent) => {
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    stage.classList.remove('panning');
    const d = g;
    g = null;
    if (!d) return;
    const click = !d.moved && e.type === 'pointerup';
    if (d.kind === 'move') {
      if (d.moved) {
        d.el.classList.remove('dragging');
        h.dragEnd(d.id, d.box);
      } else if (click) h.pick(d.id, d.add);
      d.el.focus({ preventScroll: true });
    } else if (d.kind === 'press' && click) {
      // A plain click focused the card itself; a modified one was kept from doing so.
      if (d.add) d.el.focus({ preventScroll: true });
      h.pick(d.id, d.add);
    } else if (click && !(d.kind === 'pan' && d.middle)) h.clear();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  stage.addEventListener('wheel', (e) => {
    // Scrolling inside the note bubble scrolls its text, not the board.
    if ((e.target as HTMLElement).closest('vb-note-bubble')) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) vp.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    else vp.panBy(-e.deltaX, -e.deltaY);
  }, { passive: false });
}
