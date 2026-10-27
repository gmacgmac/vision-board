// Pan and zoom: one transform on the world layer. Screen <-> world conversion lives here only.
import type { Box, Point } from '#layout';

const MIN_K = 0.2;
const MAX_K = 2.5;
/** The zoom below which the stage is "far" (data-zoom="far"), the one place it is set, and so the level
 *  below which the cards' and the containers' controls hide (hideControlsZoomedOut flag). The toolbar
 *  shows the zoom as a percentage (`zoomPercent`). 55%, the maintainer's pick after trying it (review
 *  polish round 2 ruling 2, tracker N13 closed; it was 75%). */
export const FAR_K = 0.55;

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
export const SELECTION_FIT: FitOptions = { fill: 0.75, cap: MAX_K };
/** Z on exactly one app card (card-polish FE_01): its longer side fills 95% of the stage, so the app
 *  is big enough to use, up to the top zoom. */
export const APP_FIT: FitOptions = { fill: 0.95, cap: MAX_K };

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
  /** Whether the stage turns "far" below FAR_K: the hideControlsZoomedOut flag (on by default). */
  hideFar: boolean;
  /** Called after every change of pan or zoom, so overlays can follow their card. */
  onApply: (() => void) | null = null;
  /** A fit asked for while the stage had no room (a hidden pane or tab), done once it has room. */
  private waiting: { b: Box; o?: FitOptions } | null = null;
  /** The zoom last written as `--vb-zoom`, so a pan writes nothing. */
  private zoomWritten = Number.NaN;

  constructor(stage: HTMLElement, world: HTMLElement, hideFar = false) {
    this.stage = stage;
    this.world = world;
    this.hideFar = hideFar;
  }

  apply(): void {
    this.world.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    // A container's top line keeps one on-screen size (review-polish ruling 2): region.css counter-scales
    // it from this one value on the world, written only when the zoom changed; never per container.
    if (this.k !== this.zoomWritten) {
      this.zoomWritten = this.k;
      this.world.style.setProperty('--vb-zoom', String(this.k));
    }
    // Below FAR_K the cards' buttons would draw under the 24px target size (N8), so the stage is "far"
    // and they hide (tracker N13). With the flag off they stay visible at every zoom: never "far".
    if (this.hideFar && isFar(this.k)) this.stage.dataset.zoom = 'far';
    else delete this.stage.dataset.zoom;
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
    const k = o ? Math.min(r.width * o.fill / b.w, r.height * o.fill / b.h) : Math.min((r.width - 64) / b.w, (r.height - 64) / b.h);
    this.k = Math.min(o?.cap ?? 1.1, Math.max(MIN_K, k));
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
