// Pan and zoom: one transform on the world layer. Screen <-> world conversion lives here only.
import type { Box, Point } from '#layout';
import { ZOOM_RULES } from '#ui';

// Every zoom number is a row of zoom-rules.ts; this file reads them and writes what the CSS reads.
const MIN_K = ZOOM_RULES.range.numbers.min;
const MAX_K = ZOOM_RULES.range.numbers.max;
/** The zoom below which the stage is "far" (data-zoom="far"), the one place it is set, and so the level
 *  below which the cards' and the containers' controls hide (hideControlsZoomedOut flag). The toolbar
 *  shows the zoom as a percentage (`zoomPercent`). 55%, the maintainer's pick after trying it (review
 *  polish round 2 ruling 2, tracker N13 closed; it was 75%). */
export const FAR_K = ZOOM_RULES.farControls.numbers.below;

/** A node's edge marks never draw under `MARK_MIN` px tall on screen (nodeEdges, D-101): below the zoom where a mark of
 *  `MARK_H` px would, they grow in place by `markGrow(k)`. The two are tokens.css's `--vb-mark-min` and `--vb-mark-h`
 *  (zoom-groups.test.ts holds them equal). The growth goes in steps of `GROW_STEP` (never under what is needed, so a
 *  mark is 14 to 17px), because changing it restyles every card: a zoom between two steps writes nothing. */
export const MARK_MIN = ZOOM_RULES.marks.numbers.minPx;
export const MARK_H = ZOOM_RULES.marks.numbers.heightPx;
const GROW_STEP = ZOOM_RULES.marks.numbers.step;
/** The far breakpoint (FIX_02, the maintainer's points 430 to 438): the zoom where a mark needs three steps of growth to
 *  keep its minimum, about 37%. Below it nothing grows any more: the growth stays what it is there (`FAR_GROW`), so every
 *  mark scales down with its node from there, with no jump, nothing moving or hiding; and a press on a mark is its
 *  node's (`smallMark`). Above it the marks keep their minimum and take their presses. */
const FAR_STEPS = ZOOM_RULES.marks.numbers.farSteps;
export const FAR_GROW = Math.round(GROW_STEP ** FAR_STEPS * 1000) / 1000;
export const MARK_FAR_K = MARK_MIN / (MARK_H * FAR_GROW);
export function markGrow(k: number): number {
  if (k <= MARK_FAR_K) return FAR_GROW;
  const need = MARK_MIN / (MARK_H * k);
  return need <= 1 ? 1 : Math.round(GROW_STEP ** Math.ceil(Math.log(need) / Math.log(GROW_STEP) - 1e-9) * 1000) / 1000;
}

/** Whether the marks take their pointer press at zoom `k`: above the far breakpoint (FIX_02). Below it the stage carries
 *  data-marks="small", a press on a mark selects its node only (so the person can zoom to it), with no hand cursor; the
 *  keyboard reaches and presses every mark as ever. */
export const marksPressable = (k: number): boolean => k > MARK_FAR_K;
/** Whether `t` is in a node's mark while the marks take no pointer press (the stage's data-marks="small"). */
export const smallMark = (t: Element): boolean => t.closest('[data-marks="small"] vb-node[data-edges] [data-mark]') !== null;

/** The conversation box scales with the board only between two zooms (points 444, 445): one size below 80% (its text
 *  stays readable), with the board to 120%, one size above (it never swamps the board). */
export const BOX_MIN_K = ZOOM_RULES.conversationBox.numbers.min;
export const BOX_MAX_K = ZOOM_RULES.conversationBox.numbers.max;
export const boxScale = (k: number): number => Math.min(BOX_MAX_K, Math.max(k, BOX_MIN_K));

/** A zoom as the whole percentage the toolbar shows (0.55 is 55). It rounds down, so the number is never
 *  higher than the zoom: "55%" means the board is at 0.55 or more, which is where the controls show. */
export const zoomPercent = (k: number): number => Math.floor(k * 100 + 1e-6);

/** Whether zoom `k` is below FAR_K, as the toolbar's percentage reads it: the stage is "far" there,
 *  and app cards show their placeholder, not their panel (app-cards ruling 14). */
export const isFar = (k: number): boolean => zoomPercent(k) < zoomPercent(FAR_K);

/** Where the view is: the pan (`x`, `y`, screen px) and the zoom (`k`). */
export interface ViewSnapshot { x: number; y: number; k: number }

/** How a fit sizes its box: the share of the stage's width or height it fills, whichever binds, and
 *  the zoom it never goes past. Without options a fit leaves 32px a side and stops at 110%. */
export interface FitOptions { fill: number; cap: number }
/** Z, zoom to the selection (review-polish ruling 12): 75% of the stage, up to the top zoom. */
export const SELECTION_FIT: FitOptions = { fill: ZOOM_RULES.selectionFit.numbers.fill, cap: MAX_K };
/** Z on exactly one app card (card-polish FE_01): its longer side fills 95% of the stage, so the app
 *  is big enough to use, up to the top zoom. */
export const APP_FIT: FitOptions = { fill: ZOOM_RULES.appFit.numbers.fill, cap: MAX_K };

/** The margin a reveal leaves between a card and the stage's edge, in screen pixels. */
const REVEAL_MARGIN = 48;

/** One axis of a reveal: the shift that brings [p, p + len) in, or for a card longer than the
 *  stage on this axis, its start to the margin only when none of it shows on this axis. */
function revealAxis(p: number, len: number, size: number, big: boolean): number {
  const m = REVEAL_MARGIN;
  if (big) return p + len > 0 && p < size ? 0 : m - p;
  if (p < m) return m - p;
  return p + len > size - m ? size - m - p - len : 0;
}

/** Where the keyboard reaching a card pans the board (review-polish ruling 11, decision 1), in
 *  screen pixels: a card that fits comes fully into view whenever any of it is outside the stage;
 *  a card bigger than the stage pans only when none of it shows, and then only to bring its
 *  top-left corner in, never to fit it. Focus.ts runs it for a key's focus and a key's popover;
 *  any later "bring this card into view" reuses it through `Viewport.reveal`. */
export function revealPan(b: Box, v: ViewSnapshot, stage: { width: number; height: number }): { dx: number; dy: number } {
  const s = { x: b.x * v.k + v.x, y: b.y * v.k + v.y, w: b.w * v.k, h: b.h * v.k };
  const bigX = s.w > stage.width - 2 * REVEAL_MARGIN;
  const bigY = s.h > stage.height - 2 * REVEAL_MARGIN;
  const shows = s.x + s.w > 0 && s.x < stage.width && s.y + s.h > 0 && s.y < stage.height;
  if ((bigX || bigY) && shows) return { dx: 0, dy: 0 };
  return { dx: revealAxis(s.x, s.w, stage.width, bigX), dy: revealAxis(s.y, s.h, stage.height, bigY) };
}

export class Viewport {
  x = 0;
  y = 0;
  k = 1;
  stage: HTMLElement;
  world: HTMLElement;
  /** Where the zoom is written as `--vb-zoom` (the regions layer), for the frames inside it to counter-scale by. */
  zoomOn: HTMLElement;
  /** Where the marks' growth is written as `--vb-mark-grow` (the cards layer; nodeEdges only), else null. */
  markOn: HTMLElement | null;
  /** Whether the stage turns "far" below FAR_K: the hideControlsZoomedOut flag (on by default). */
  hideFar: boolean;
  /** Called after every change of pan or zoom, so overlays can follow their card. */
  onApply: (() => void) | null = null;
  /** A fit asked for while the stage had no room (a hidden pane or tab), done once it has room. */
  private waiting: { b: Box; o?: FitOptions } | null = null;
  /** The zoom last written as `--vb-zoom`, so a pan writes nothing. */
  private zoomWritten = Number.NaN;
  /** The growth last written as `--vb-mark-grow`: it is 1 from `MARK_MIN / MARK_H` up, so a zoom there restyles no card. */
  private growWritten = 1;

  constructor(stage: HTMLElement, world: HTMLElement, hideFar = false, zoomOn: HTMLElement = world, markOn: HTMLElement | null = null) {
    this.stage = stage;
    this.world = world;
    this.zoomOn = zoomOn;
    this.hideFar = hideFar;
    this.markOn = markOn;
  }

  apply(): void {
    this.world.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    // A container's top line and rail keep one on-screen size (review-polish ruling 2): region.css counter-scales
    // them from this one value on the regions layer, written only when the zoom changed; never per container.
    if (this.k !== this.zoomWritten) {
      this.zoomWritten = this.k;
      this.zoomOn.style.setProperty('--vb-zoom', String(this.k));
    }
    // The edge marks keep a minimum on-screen size (D-101): one value, written only when it changes (never above it).
    const grow = this.markOn ? markGrow(this.k) : 1;
    if (this.markOn && grow !== this.growWritten) {
      this.growWritten = grow;
      this.markOn.style.setProperty('--vb-mark-grow', String(grow));
    }
    // Below FAR_K the cards' buttons would draw under the 24px target size (N8), so the stage is "far"
    // and they hide (tracker N13). With the flag off they stay visible at every zoom: never "far".
    if (this.hideFar && isFar(this.k)) this.stage.dataset.zoom = 'far';
    else delete this.stage.dataset.zoom;
    if (this.markOn && !marksPressable(this.k)) this.stage.dataset.marks = 'small';
    else delete this.stage.dataset.marks;
    this.onApply?.();
  }

  toWorld(clientX: number, clientY: number): Point {
    const r = this.stage.getBoundingClientRect();
    return { x: (clientX - r.left - this.x) / this.k, y: (clientY - r.top - this.y) / this.k };
  }

  panBy(dx: number, dy: number): void {
    this.waiting = null;
    this.x += dx;
    this.y += dy;
    this.apply();
  }

  zoomAt(clientX: number, clientY: number, factor: number): void {
    this.waiting = null;
    const r = this.stage.getBoundingClientRect();
    const p = this.toWorld(clientX, clientY);
    this.k = Math.min(MAX_K, Math.max(MIN_K, this.k * factor));
    this.x = clientX - r.left - p.x * this.k;
    this.y = clientY - r.top - p.y * this.k;
    this.apply();
  }

  snapshot(): ViewSnapshot {
    return { x: this.x, y: this.y, k: this.k };
  }

  /** Go back to a view `snapshot` returned; the zoom is clamped to what the board allows. */
  restore(v: ViewSnapshot): void {
    this.waiting = null;
    this.k = Math.min(MAX_K, Math.max(MIN_K, v.k));
    this.x = v.x;
    this.y = v.y;
    this.apply();
  }

  zoomCentre(factor: number): void {
    const r = this.stage.getBoundingClientRect();
    this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  /** Whether the stage has room to show a board; a view worked out without room is meaningless. */
  get sized(): boolean {
    const r = this.stage.getBoundingClientRect();
    return r.width > 64 && r.height > 64;
  }

  /** The stage changed size: do a fit that was waiting for room, else just redraw. */
  resized(): void {
    if (this.waiting && this.sized) this.fit(this.waiting.b, false, this.waiting.o);
    else this.apply();
  }

  /** Centre a box: Fit, zoom-area and a container's zoom as they are (32px a side, at most 110%),
   *  or by `o` (Z passes SELECTION_FIT, or APP_FIT for one app card). */
  fit(b: Box, animate = true, o?: FitOptions): void {
    const r = this.stage.getBoundingClientRect();
    if (!b.w || !b.h) return;
    this.waiting = this.sized ? null : { b, o };
    if (this.waiting) return;
    const k = o ? Math.min(r.width * o.fill / b.w, r.height * o.fill / b.h) : Math.min((r.width - 2 * ZOOM_RULES.fit.numbers.marginPx) / b.w, (r.height - 2 * ZOOM_RULES.fit.numbers.marginPx) / b.h);
    this.k = Math.min(o?.cap ?? ZOOM_RULES.fit.numbers.cap, Math.max(MIN_K, k));
    this.x = (r.width - b.w * this.k) / 2 - b.x * this.k;
    this.y = (r.height - b.h * this.k) / 2 - b.y * this.k;
    this.glide(animate);
  }

  /** Pan to bring a box into view by `revealPan`'s rule. */
  reveal(b: Box): void {
    const { dx, dy } = revealPan(b, this.snapshot(), this.stage.getBoundingClientRect());
    if (!dx && !dy) return;
    this.x += dx;
    this.y += dy;
    this.glide(true);
  }

  private glide(animate: boolean): void {
    if (animate) {
      this.world.classList.add('gliding');
      setTimeout(() => this.world.classList.remove('gliding'), 400);
    }
    this.apply();
  }
}
