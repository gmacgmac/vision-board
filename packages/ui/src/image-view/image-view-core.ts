// Image view pattern, layer 1 (core): the zoomed view's sizes and motion, with no DOM (D-048 ruling 22,
// app-cards FE_03). An image opens over the board with its longer side at ZOOM_SHARE of the screen in
// that direction (small images scaled up to it), never past the screen in the other; it moves there
// from its place on the card and back (`flipFrom`), for MOTION_SHARE of the board's motion token, so
// reduced motion, which sets the token to 0ms (tokens.css), means no motion at all.
import * as uiCommonWords from '../words/ui-common.ts';

export interface Size { w: number; h: number }
export interface Rect extends Size { x: number; y: number }

/** How much of the screen an image's longer side takes in the zoomed view (ruling 22). */
export const ZOOM_SHARE = 0.7;
/** The open and close motion's share of `--vb-motion` (360ms): about 220 ms (ruling 22). */
export const MOTION_SHARE = 0.6;

/** The zoomed size of an image of `natural` size on a `screen`: a wide image takes 70% of the width,
 * a tall one 70% of the height, a square 70% of the shorter side; the other side is held to the
 * screen. Nothing to fit is no size. */
export function fitImage(natural: Size, screen: Size): Size {
  const { w, h } = natural;
  if (!(w > 0 && h > 0 && screen.w > 0 && screen.h > 0)) return { w: 0, h: 0 };
  const byW = (ZOOM_SHARE * screen.w) / w;
  const byH = (ZOOM_SHARE * screen.h) / h;
  const k = Math.min(w > h ? byW : h > w ? byH : Math.min(byW, byH), screen.w / w, screen.h / h);
  return { w: w * k, h: h * k };
}

/** `size` in the middle of `screen`. */
export const centred = (size: Size, screen: Size): Rect => ({ x: (screen.w - size.w) / 2, y: (screen.h - size.h) / 2, ...size });

/** The transform that draws the zoomed box `to` over `from` (the image on its card), with its origin
 * at the box's top left: the animation's far end. */
export const flipFrom = (from: Rect, to: Rect): string =>
  `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.w / to.w}, ${from.h / to.h})`;

/** A CSS time (`360ms`, `0.36s`) in milliseconds; anything else is 0. */
export function msOf(time: string): number {
  const m = /^\s*([\d.]+)(ms|s)\s*$/.exec(time);
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : 0;
}

/** How long the open and close motion runs for the board's motion token `time` (`--vb-motion`). */
export const motionMs = (time: string): number => msOf(time) * MOTION_SHARE;

/** The view's words (plain, fewest: the maintainer's standing instruction). */
export const IMAGE_VIEW_WORDS = {
  /** The ×'s name, and its tip with the key that does the same. */
  close: uiCommonWords.close,
  closeTip: 'Close · Esc',
} as const;
