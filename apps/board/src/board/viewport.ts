// Pan and zoom: one transform on the world layer. Screen <-> world conversion lives here only.
import type { Box, Point } from '../../../../packages/layout/src/index.ts';

const MIN_K = 0.2;
const MAX_K = 2.5;
/** The zoom below which the stage is "far" (data-zoom="far"), the one place it is set, and so the level
 *  below which the cards' controls hide (hideControlsZoomedOut flag, tracker N13). The toolbar shows the
 *  zoom as a percentage (`zoomPercent`); read it there, then change this one number to move the level. */
export const FAR_K = 0.75;

/** A zoom as the whole percentage the toolbar shows (0.75 is 75). It rounds down, so the number is never
 *  higher than the zoom: "75%" means the board is at 0.75 or more, which is where the controls show. */
export const zoomPercent = (k: number): number => Math.floor(k * 100 + 1e-6);

/** Where the view is: the pan (`x`, `y`, screen px) and the zoom (`k`). */
export interface ViewSnapshot { x: number; y: number; k: number }

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
  private waiting: Box | null = null;

  constructor(stage: HTMLElement, world: HTMLElement, hideFar = false) {
    this.stage = stage;
    this.world = world;
    this.hideFar = hideFar;
  }

  apply(): void {
    this.world.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    // Below FAR_K the cards' buttons would draw under the 24px target size (N8), so the stage is "far"
    // and they hide (tracker N13). With the flag off they stay visible at every zoom: never "far".
    if (this.hideFar && zoomPercent(this.k) < zoomPercent(FAR_K)) this.stage.dataset.zoom = 'far';
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
    if (this.waiting && this.sized) this.fit(this.waiting, false);
    else this.apply();
  }

  fit(b: Box, animate = true): void {
    const r = this.stage.getBoundingClientRect();
    if (!b.w || !b.h) return;
    this.waiting = this.sized ? null : b;
    if (this.waiting) return;
    this.k = Math.min(1.1, Math.max(MIN_K, Math.min((r.width - 64) / b.w, (r.height - 64) / b.h)));
    this.x = (r.width - b.w * this.k) / 2 - b.x * this.k;
    this.y = (r.height - b.h * this.k) / 2 - b.y * this.k;
    this.glide(animate);
  }

  /** Pan just enough to bring a box fully into view. */
  reveal(b: Box): void {
    const r = this.stage.getBoundingClientRect();
    const m = 48;
    const sx = b.x * this.k + this.x;
    const sy = b.y * this.k + this.y;
    const sw = b.w * this.k;
    const sh = b.h * this.k;
    let dx = 0;
    let dy = 0;
    if (sx < m) dx = m - sx;
    else if (sx + sw > r.width - m) dx = r.width - m - sx - sw;
    if (sy < m) dy = m - sy;
    else if (sy + sh > r.height - m) dy = r.height - m - sy - sh;
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
