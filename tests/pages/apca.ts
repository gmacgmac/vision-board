// APCA in the page tests (rule 3): a CSS colour as the pixel the browser draws, a colour expression
// resolved in the page, and the APCA-W3 0.0.98G-4g lightness contrast of a text and a background
// pixel. Shared by review-colours.spec.ts and container-title.spec.ts.
import type { Page } from '@playwright/test';

export type Rgb = [number, number, number];

/** Any CSS colour as the pixel the browser would draw (so rgb(), color(srgb …) and mixes compare). */
export const pixel = (page: Page, css: string): Promise<Rgb> => page.evaluate((c) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)] as Rgb;
}, css);

/** What `css` resolves to when used as a colour on a probe element in the page (custom properties and all). */
export const resolved = (page: Page, css: string): Promise<string> => page.evaluate((c) => {
  const probe = document.createElement('i');
  probe.style.color = c;
  document.body.append(probe);
  const out = getComputedStyle(probe).color;
  probe.remove();
  return out;
}, css);

/** APCA-W3 0.0.98G-4g, the arithmetic of the repo's helper (temp/apca-2b.mjs `lc`); magnitude. */
export function lc(text: Rgb, back: Rgb): number {
  const Y = ([r, g, b]: Rgb) => {
    const [R, G, B] = [r, g, b].map((c) => (c / 255) ** 2.4) as Rgb;
    const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
  };
  const [t, b] = [Y(text), Y(back)];
  if (Math.abs(b - t) < 0.0005) return 0;
  if (b > t) { const s = (b ** 0.56 - t ** 0.57) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
  const s = (b ** 0.65 - t ** 0.62) * 1.14;
  return s > -0.1 ? 0 : -(s + 0.027) * 100;
}
