// The dismissable layer's rules, pure: a menu, a popover or a tip that floats over the page closes
// on Esc or a press outside it, and only Esc gives focus back to what opened it (a press outside
// gave focus to what was pressed). Some layers close only on a click outside, so a press that
// travels (a pan, a lasso) leaves them open. The browser side is layer.ts.

/** Why a layer closed: Esc, or a press (or click) outside it. */
export type DismissReason = 'escape' | 'outside';

export interface ScreenPoint { readonly x: number; readonly y: number }

/** Whether focus goes back to the layer's opener after a dismiss: Esc yes, a press outside no. */
export const focusBackOn = (reason: DismissReason): boolean => reason === 'escape';

/** A press from `down` lifted at `up` is a click (not a pan or a lasso) when it travelled less than
 * `threshold` px. */
export const isClick = (down: ScreenPoint, up: ScreenPoint, threshold: number): boolean =>
  Math.hypot(up.x - down.x, up.y - down.y) < threshold;
