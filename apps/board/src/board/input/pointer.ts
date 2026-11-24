// Pointer input (3_FE_01 rulings 1 and 4-7, 3_FE_02 ruling 1, 3_FE_03 rulings 3-4). On a card: a
// click selects it (Shift, Cmd or Ctrl adds or removes it), a drag on its kind tab moves it, with
// the rest of the selection when it is selected (the drop is judged by moves.ts: another
// container, its own, or nowhere), and a drag on its content selects text and never pans. On the
// board's or a container's background (its top line outside its label and tools): a drag pans
// and a click clears the selection; Shift+drag draws the lasso (Shift+Cmd/Ctrl+drag adds). The
// middle button pans anywhere, and so does a Cmd or Ctrl + drag (review-polish ruling 13): over
// text, a card, a control, a hover box or a popover; held still, that press keeps its own meaning
// (a Cmd click adds or removes a card, opens a link in a new tab, presses a button). While that key
// is held over the board the pointer is a hand, a closed one during the pan (review polish round 2
// ruling 6; text fields keep their cursor, board.css). A drag on a container's label (its grip, title
// or count, not its other buttons) moves the container (3_FE_04 ruling 5; open list and container
// title FE_02, container-drag.ts); held still, a press on the title is the background's click. Over an app window's panel
// not clicked into, a drag pans, and held still it is the card's click (FIX_03 ruling 2). While a pan, a move or a lasso runs, nothing on
// the page gets text-selected (U5). Scroll pans (wheelChaining: once what is under the pointer can scroll
// no further, and only in a gesture that did not start scrolling it, wheel-latch.ts), Ctrl/Cmd + scroll zooms.
// Keyboard equivalents live in keys.ts (project rule 5).
import type { Box, Point } from '#layout';
import type { Viewport } from '../canvas/index.ts';
import { smallMark, ZOOM_RULES } from '../canvas/index.ts';
import { createWheelLatch, scrollerIn } from './wheel-latch.ts';

export interface PointerHandlers {
  box(id: string): Box | undefined;
  /** The cards a drag on `id`'s kind tab carries: the selection when `id` is in it, else `id`
   *  alone (3_FE_03 ruling 4); none when no card may move (a past version, navigation FE_01). */
  carried(id: string): string[];
  /** The drag passed its threshold: the cards start moving (Later shows as a drop target). */
  dragStart(ids: readonly string[]): void;
  /** The carried cards' boxes now, and the pointer in client pixels. */
  dragMove(boxes: ReadonlyMap<string, Box>, at: Point): void;
  /** The drop: the carried cards' boxes and the pointer, or null when the pointer was lost (the
   *  cards go back). */
  dragEnd(boxes: ReadonlyMap<string, Box>, at: Point | null): void;
  /** A click on a card, not on one of its controls: alone, or `add` (Shift, Cmd or Ctrl held). */
  pick(id: string, add: boolean): void;
  /** A click on the board's or a container's background (`target`: what was clicked). */
  clear(target?: Element): void;
  /** A Shift+drag on a background (3_FE_02 ruling 1), in client pixels: drawn as it moves, then
   *  ended (`add`: Cmd or Ctrl held too), or dropped when the pointer is lost. */
  lassoMove(from: Point, to: Point): void;
  lassoEnd(from: Point, to: Point, add: boolean): void;
  lassoCancel(): void;
  /** A drag on a container's label (3_FE_04 ruling 5, FE_02): it starts, moves by `d` board units
   *  since the press, and ends (null: the pointer was lost). A click on the label calls none of them. */
  frameStart(region: string): void;
  frameMove(d: Point): void;
  frameEnd(d: Point | null): void;
}

/** Nothing inside these starts a gesture: they are controls with their own click (a container's
 * tools, the note bubble the person types in, a container's note block, the selection bar, a card's popover box). */
const INTERACTIVE = 'button, select, a, input, textarea, .vb-region-tools, vb-note-bubble, .vb-region-note-block, vb-selection-bar, .vb-card-pop';
/** Where the middle button keeps its own meaning (a link opens in a new tab; a field pastes). */
const OWN_MIDDLE = 'a, input, textarea, select, vb-note-bubble';
/** Where a card is moved from (ruling 4): the kind tab with its grip dots, or, on a node with an icon, the grip in the
 *  middle of its top line (decision 12), or the plate along the top where a skin's row puts one (FE_04; its
 *  buttons keep their own press, INTERACTIVE). */
const HANDLE = '.vb-node-kind, .vb-node-grip, .vb-node-plate';
/** A dated node (D-105 4, `#ui` `data-timeline`): its place is its date, so no drag starts anywhere on it, its plate
 *  included; a press on it is a click, as on its content. Where an undated card's drag would start (its plate, its top
 *  edge) and on the content's own box (its padding and gaps), the press selects no text (FIX_02 S4): the text inside
 *  stays selectable. */
const DATED = 'vb-node[data-timeline]';
/** A card's content box: a press on the box itself, not on an element inside it, is on no text. */
const CONTENT = '.vb-node-content';
/** The container's keyboard handle (3_FE_04 ruling 5), the start of its label; a drag on it, or on the
 *  rest of the label but its own buttons and its tip (FE_02), moves the container. */
const GRIP = '.vb-region-grip';
const LABEL = '.vb-region-label';
/** An app window's panel not clicked into (FIX_03 ruling 2, `#ui` app-frame-active.ts): the board's, so a drag pans. */
const IDLE_APP = 'vb-app-frame[data-click-in]:not([data-active])';
/** Where a Cmd or Ctrl press keeps the field's own press (a caret, a selection): never a pan. */
const OWN_PRESS = 'input, textarea, select, [contenteditable]';
export const DRAG_THRESHOLD = 4;
/** Pixels in a wheel's line (`deltaMode` lines, as some mice and browsers count), as browsers scroll one. */
const WHEEL_LINE = 16;
/** The key a drag pans with from anywhere (review-polish ruling 13): Cmd, or Ctrl on other systems, as
 *  Ctrl/Cmd + scroll zooms. The one place it is named (Option may replace it later, round 2 ruling 6). */
export const panKey = (e: { metaKey: boolean; ctrlKey: boolean }): boolean => e.metaKey || e.ctrlKey;

/** Where a press began, and what it pressed (`on`: the stage captures the pointer, so a release's target is the stage). */
interface Start { sx: number; sy: number; moved: boolean; on: Element }
/** One card a move carries: its element and its box when the drag began. */
interface Carried { id: string; el: HTMLElement; box0: Box }
type Gesture =
  | Start & { kind: 'move'; id: string; el: HTMLElement; cards: Carried[]; boxes: Map<string, Box>; add: boolean }
  /** `still`: a Cmd or Ctrl press, which pans only once it moves; held still it ends as the
   *  gesture the press alone would have started (null: none, the control's own click). */
  | Start & { kind: 'pan'; x0: number; y0: number; middle: boolean; still?: Gesture | null }
  /** On a card's content: the browser selects text on a drag; a click picks the card. `bare`: a dated card pressed on
   *  no text (DATED), which selects none. */
  | Start & { kind: 'press'; id: string; el: HTMLElement; add: boolean; bare?: true }
  /** Shift on a background: the lasso; `add` when Cmd or Ctrl is held too. */
  | Start & { kind: 'lasso'; add: boolean }
  /** On a container's label: the frame and its cards move (container-drag.ts). `el`: its grip, which
   *  takes focus after a move; `grip`: the press was on the grip itself, so a click focuses it too. */
  | Start & { kind: 'frame'; region: string; el: HTMLElement; grip: boolean };

/** Listens on the stage and the window; returns the function that stops listening on the window
 * (the stage's own listeners go with it). */
export function bindPointer(stage: HTMLElement, vp: Viewport, h: PointerHandlers, wheelChaining = false): () => void {
  let g: Gesture | null = null;
  /** The mousedown after this pointerdown must not do its default (focus, text selection). */
  let stopMouse = false;
  /** A Cmd or Ctrl drag panned: the click its release makes reaches nothing. */
  let swallow = false;

  const start = (e: PointerEvent): Start => ({ sx: e.clientX, sy: e.clientY, moved: false, on: e.target as Element });
  /** The cards a drag on `id` carries, each with its element and box; `id` first. */
  function carriedFrom(id: string): Carried[] {
    const out: Carried[] = [];
    const ids = h.carried(id);
    if (!ids.length) return out;
    for (const c of [id, ...ids.filter((x) => x !== id)]) {
      const el = stage.querySelector<HTMLElement>(`vb-node[data-id="${CSS.escape(c)}"]`);
      const box0 = h.box(c);
      if (el && box0) out.push({ id: c, el, box0 });
    }
    return out;
  }
  function capture(e: PointerEvent) {
    stage.setPointerCapture(e.pointerId);
  }
  function pan(e: PointerEvent) {
    g = { kind: 'pan', ...start(e), x0: vp.x, y0: vp.y, middle: e.button === 1 };
    stage.classList.add('panning');
    capture(e);
  }

  /** The gesture a left press starts, Cmd and Ctrl aside (a Cmd or Ctrl press wraps it). */
  function begin(e: PointerEvent, t: HTMLElement): void {
    // The label moves its container, never pans (unless Cmd or Ctrl drags it). The grip is a button
    // (it takes focus for Alt+arrows), so the label is looked for before the other controls.
    const frame = e.button === 0 && !e.shiftKey ? frameAt(t) : null;
    if (frame) {
      g = { kind: 'frame', ...start(e), ...frame };
      // The grip's press: no text selection, focus is given on release. The title's keeps a
      // background press's default, so a click there does what it did (3_FE_01 ruling 6).
      stopMouse = frame.grip;
      if (!frame.grip) document.getSelection()?.removeAllRanges();
      return capture(e);
    }
    // A node's mark too small to press at this zoom is the node's body (viewport.ts `smallMark`).
    if (e.button !== 0 || (t.closest(INTERACTIVE) && !smallMark(t))) return;
    const card = t.closest<HTMLElement>('vb-node');
    const add = e.shiftKey || e.metaKey || e.ctrlKey;
    if (card) {
      const id = card.dataset.id!;
      const cards = t.closest(HANDLE) && !card.matches(DATED) && h.box(id) ? carriedFrom(id) : [];
      if (cards.length) {
        g = { kind: 'move', ...start(e), id, el: card, cards, boxes: new Map(cards.map((c) => [c.id, c.box0])), add };
        return capture(e);
      }
      const bare = card.matches(DATED) && (!!t.closest(HANDLE) || t.matches(CONTENT) || !t.closest(CONTENT));
      g = { kind: 'press', ...start(e), id, el: card, add, ...(bare && { bare: true as const }) };
      if (bare) document.getSelection()?.removeAllRanges();
      // A modified click adds or removes the card: it must not extend a text selection.
      stopMouse = add;
      return;
    }
    // A background: what was selected as text goes, as a press on a page's background does.
    document.getSelection()?.removeAllRanges();
    if (e.shiftKey) {
      g = { kind: 'lasso', ...start(e), add: e.metaKey || e.ctrlKey };
      stopMouse = true;
      return capture(e);
    }
    pan(e);
  }

  stage.addEventListener('pointerdown', (e) => {
    g = null;
    stopMouse = false;
    swallow = false;
    const t = e.target as HTMLElement;
    if (e.button === 1) {
      if (t.closest(OWN_MIDDLE)) return;
      stopMouse = true; // no autoscroll, no paste
      return pan(e);
    }
    begin(e, t);
    const own = g as Gesture | null; // what `begin` started
    // Over an idle app a drag pans as over the board; held still, it is the card's click (which makes the app active).
    if (own?.kind === 'press' && !panKey(e) && t.closest(IDLE_APP)) {
      g = { kind: 'pan', ...start(e), x0: vp.x, y0: vp.y, middle: false, still: own };
      return;
    }
    // Cmd or Ctrl (Shift too is the additive lasso): a pan once it moves, from anywhere but a field.
    // No focus and no text selection on the press; a still click still reaches its target.
    if (e.button !== 0 || !panKey(e) || e.shiftKey || own?.kind === 'pan' || t.closest(OWN_PRESS)) return;
    g = { kind: 'pan', ...start(e), x0: vp.x, y0: vp.y, middle: false, still: own };
    stopMouse = true;
  });
  stage.addEventListener('mousedown', (e) => {
    if (stopMouse) e.preventDefault();
  });
  // While a pan or a move runs, no text anywhere is selected (U5); a press on a card's content
  // is the one gesture that selects text, but on a dated card's plate, edge or content box (`bare`).
  stage.addEventListener('selectstart', (e) => {
    if (g && (g.kind !== 'press' || g.bare)) e.preventDefault();
  });

  const unbindPanKey = bindPanKey(stage);
  stage.addEventListener('pointermove', (e) => {
    if (!g) return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < DRAG_THRESHOLD) return;
    const first = !g.moved;
    g.moved = true;
    if (g.kind === 'pan' && first && g.still !== undefined) {
      // The Cmd or Ctrl press became a pan: it holds the pointer now, and no click follows it.
      capture(e);
      stage.classList.add('panning');
      document.getSelection()?.removeAllRanges();
      swallow = true;
    }
    if (g.kind === 'pan') {
      vp.x = g.x0 + e.clientX - g.sx;
      vp.y = g.y0 + e.clientY - g.sy;
      vp.apply();
    } else if (g.kind === 'move') {
      if (first) h.dragStart(g.cards.map((c) => c.id));
      const dx = (e.clientX - g.sx) / vp.k;
      const dy = (e.clientY - g.sy) / vp.k;
      // Every carried card keeps its offset from the others (3_FE_03 ruling 4).
      for (const c of g.cards) {
        const box = { ...c.box0, x: Math.round(c.box0.x + dx), y: Math.round(c.box0.y + dy) };
        g.boxes.set(c.id, box);
        c.el.classList.add('dragging');
        c.el.style.transform = `translate(${box.x}px, ${box.y}px)`;
      }
      h.dragMove(g.boxes, { x: e.clientX, y: e.clientY });
    } else if (g.kind === 'frame') {
      if (first) h.frameStart(g.region);
      h.frameMove({ x: (e.clientX - g.sx) / vp.k, y: (e.clientY - g.sy) / vp.k });
    } else if (g.kind === 'lasso') h.lassoMove({ x: g.sx, y: g.sy }, { x: e.clientX, y: e.clientY });
  });

  const end = (e: PointerEvent) => {
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    stage.classList.remove('panning');
    const d = g;
    g = null;
    // A Cmd or Ctrl press held still ends as the gesture it wrapped.
    finish(d?.kind === 'pan' && d.still !== undefined && !d.moved ? d.still : d, e);
    // The click a drag's release makes comes straight after it, or not at all.
    if (swallow) setTimeout(() => { swallow = false; });
  };
  function finish(d: Gesture | null, e: PointerEvent) {
    if (!d) return;
    const click = !d.moved && e.type === 'pointerup';
    if (d.kind === 'move') {
      if (d.moved) {
        for (const c of d.cards) c.el.classList.remove('dragging');
        h.dragEnd(d.boxes, e.type === 'pointerup' ? { x: e.clientX, y: e.clientY } : null);
      } else if (click) h.pick(d.id, d.add);
      d.el.focus({ preventScroll: true });
    } else if (d.kind === 'frame') {
      if (d.moved) h.frameEnd(e.type === 'pointerup' ? { x: (e.clientX - d.sx) / vp.k, y: (e.clientY - d.sy) / vp.k } : null);
      if (d.moved || d.grip) d.el.focus({ preventScroll: true });
      else if (click) h.clear(d.el);
    } else if (d.kind === 'press' && click) {
      // A plain click focused the card itself; a modified one was kept from doing so.
      if (d.add) d.el.focus({ preventScroll: true });
      h.pick(d.id, d.add);
    } else if (d.kind === 'lasso' && d.moved) {
      if (e.type === 'pointerup') h.lassoEnd({ x: d.sx, y: d.sy }, { x: e.clientX, y: e.clientY }, d.add);
      else h.lassoCancel();
    } else if (click && !(d.kind === 'pan' && d.middle)) h.clear(d.on);
  }
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  // Ahead of every other listener (the stage's controls, a link's default): a pan's click is no click.
  const onClick = (e: MouseEvent) => {
    if (!swallow) return;
    swallow = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener('click', onClick, true);

  // A gesture that starts with Ctrl/Cmd zooms, wherever it is; one that starts scrolling a box stays that box's.
  const scroller = scrollerIn(stage);
  const latch = wheelChaining ? createWheelLatch((e: WheelEvent) => (e.ctrlKey || e.metaKey ? null : scroller(e))) : null;
  stage.addEventListener('wheel', (e) => {
    const zoom = e.ctrlKey || e.metaKey;
    // wheelChaining: what is under the pointer scrolls while it can, one target a gesture (wheel-latch.ts): past its
    // end the rest of the gesture neither pans nor zooms (Ctrl/Cmd pressed mid-gesture zooms neither board nor page).
    // Off: inside the note bubble or a hover tip the wheel is always its own.
    if (latch ? latch.target(e) : (e.target as HTMLElement).closest('vb-note-bubble, .vb-tip')) {
      if (latch && zoom) e.preventDefault();
      return;
    }
    e.preventDefault();
    // A mouse that counts in lines or pages (deltaMode) moves the board as far as one that counts in pixels would.
    const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? stage.clientHeight : 1;
    if (zoom) vp.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * ZOOM_RULES.steps.numbers.wheel));
    else vp.panBy(-e.deltaX * unit, -e.deltaY * unit);
  }, { passive: false });
  return () => {
    window.removeEventListener('click', onClick, true);
    unbindPanKey();
  };
}

/** The container a press on `t` moves, with its grip: on the grip, or on the rest of its label but the
 *  label's own buttons and its tip. On a past version (read-only) only the grip, which is hidden there:
 *  nothing moves, so the title is the frame's background again and pans. */
function frameAt(t: HTMLElement): { region: string; el: HTMLElement; grip: boolean } | null {
  const grip = t.closest(GRIP) !== null;
  const label = grip || !t.closest(`${INTERACTIVE}, .vb-tip, [data-readonly]`) ? t.closest(LABEL) : null;
  const f = label?.closest<HTMLElement>('vb-region');
  const el = f?.querySelector<HTMLElement>(GRIP);
  return f?.dataset.region && el ? { region: f.dataset.region, el, grip } : null;
}

/** The hand that says a drag will pan (round 2 ruling 6): `data-pan-key` on the stage while the pan
 *  key is held, read by board.css; kept true to every key press and release and to the pointer
 *  coming over the board, and dropped when the window loses focus (the key's release goes elsewhere). */
function bindPanKey(stage: HTMLElement): () => void {
  const held = (on: boolean) => { if (stage.hasAttribute('data-pan-key') !== on) stage.toggleAttribute('data-pan-key', on); };
  const onKey = (e: KeyboardEvent) => held(panKey(e));
  const onPointer = (e: MouseEvent) => held(panKey(e));
  const onBlur = () => held(false);
  for (const type of ['keydown', 'keyup'] as const) window.addEventListener(type, onKey, true);
  // A press or a wheel carries the keys as they are. A pointerover only turns the mark on (the key
  // went down while another window had focus): the browser also fires one when the board moves under
  // a still pointer (after a zoom), with no keys, which would hand an app's panel the pointer back
  // mid-gesture (app-pan-key.spec.ts).
  stage.addEventListener('pointerover', (e) => { if (panKey(e)) held(true); });
  stage.addEventListener('pointerdown', onPointer, true);
  stage.addEventListener('wheel', onPointer, { capture: true, passive: true });
  window.addEventListener('blur', onBlur);
  return () => {
    for (const type of ['keydown', 'keyup'] as const) window.removeEventListener(type, onKey, true);
    window.removeEventListener('blur', onBlur);
  };
}
