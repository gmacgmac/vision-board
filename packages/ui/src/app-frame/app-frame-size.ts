// App frame pattern, layer 1 (core): the panel's size (apps.md § Panel size). The agent's `w` and `h`
// held to `APP_SIZE` (`panelSize`), and the height a panel tells with MCP Apps'
// `ui/notifications/size-changed`, held to `APP_SIZE.h.min` and `APP_LIMITS.toldHeight` (`panelHeight`,
// the appFit flag; taller than the agent may ask, as it is never stored). No DOM;
// the bridge (app-frame-core.ts) and the element (vb-app-frame.ts) read it, and the core re-exports it.
import type { AppRef, AppSize } from '#format';
import { APP_LIMITS, APP_SIZE, appSize } from '#format';

/** The panel's size in px: the agent's, else the manifest's, else the default (`appSize`), held to
 * `APP_SIZE` (ruling 3). The card and the frame both read it, so they never disagree. */
export function panelSize(ref: AppRef, manifest?: AppSize): AppSize {
  const s = appSize(ref, manifest);
  const fit = (v: number, side: 'w' | 'h'): number => {
    const { min, max, default: d } = APP_SIZE[side];
    return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
  };
  return { w: fit(s.w, 'w'), h: fit(s.h, 'h') };
}

/** The height a panel told in `ui/notifications/size-changed` (`{ height }`), rounded and held to
 * `APP_SIZE.h.min` to `APP_LIMITS.toldHeight`; undefined when the params carry no finite number. A
 * `width` is never read: the agent's `w` stays. */
export function panelHeight(params: unknown): number | undefined {
  const h = typeof params === 'object' && params !== null && !Array.isArray(params) ? (params as { height?: unknown }).height : undefined;
  if (typeof h !== 'number' || !Number.isFinite(h)) return undefined;
  return Math.min(APP_LIMITS.toldHeight, Math.max(APP_SIZE.h.min, Math.round(h)));
}

/** The event (bubbling) the frame fires when its height changed by itself: the panel told a new one,
 * or the frame went and the height is the agent's again. The page measures the card again. */
export const APP_FRAME_RESIZE_EVENT = 'vb-app-frame-resize';
