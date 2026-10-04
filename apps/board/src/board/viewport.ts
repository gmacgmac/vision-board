// Pan and zoom: one transform on the world layer. Screen <-> world conversion lives here only.
import type { Box, Point } from '../../../../packages/layout/src/index.ts';

const MIN_K = 0.2;
const MAX_K = 2.5;
/** The zoom below which the stage is "far" (data-zoom="far"). */
const FAR_K = 0.75;

export class Viewport {
  x = 0;
  y = 0;
  k = 1;
  stage: HTMLElement;
  world: HTMLElement;

  constructor(stage: HTMLElement, world: HTMLElement) {
    this.stage = stage;
    this.world = world;
  }

  apply(): void {
    this.world.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    // Below FAR_K the cards' buttons would draw under the 24px target size, so node.css hides them (N8).
    if (this.k < FAR_K) this.stage.dataset.zoom = 'far';
    else delete this.stage.dataset.zoom;
  }

  toWorld(clientX: number, clientY: number): Point {
    const r = this.stage.getBoundingClientRect();
    return { x: (clientX - r.left - this.x) / this.k, y: (clientY - r.top - this.y) / this.k };
  }

  panBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.apply();
  }

  zoomAt(clientX: number, clientY: number, factor: number): void {
    const r = this.stage.getBoundingClientRect();
    const p = this.toWorld(clientX, clientY);
    this.k = Math.min(MAX_K, Math.max(MIN_K, this.k * factor));
    this.x = clientX - r.left - p.x * this.k;
    this.y = clientY - r.top - p.y * this.k;
    this.apply();
  }

  zoomCentre(factor: number): void {
    const r = this.stage.getBoundingClientRect();
    this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  fit(b: Box, animate = true): void {
    const r = this.stage.getBoundingClientRect();
    if (!b.w || !b.h) return;
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
