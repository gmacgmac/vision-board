// App frame pattern, the click in (FIX_03 ruling 2, point 443): an app window's panel is part of the board until the
// person clicks into it. Idle, its frame takes no pointer (app-frame.css: `data-click-in` without `data-active`), so
// hovering, a wheel and a drag over it pan and zoom the board as over any node. A click (a press that does not travel)
// makes it active: `data-active`, focus in the panel, and from then on the panel has the pointer and the wheel, until a
// press outside it or Esc (the board's, or the panel's own `ui/notifications/escape`). On stage it always has them.
// Only CSS pointer-events change: the sandbox is never touched. Browser only.
import type { ScreenPoint } from '../base/layer-core.ts';
import { isClick } from '../base/layer-core.ts';
import { dismissable } from '../base/layer.ts';

/** A press that travels this far or more is a pan or a drag, never the click that makes the panel active. */
const CLICK_PX = 4;

export interface ClickIn {
  readonly active: boolean;
  /** Back to idle: the board has the pointer and the wheel again. */
  off(): void;
  destroy(): void;
}

/** Listen on `host` (a `<vb-app-frame>`) for the click into it; `usable`: whether it may become active now (a panel
 *  shown, not frozen, not on stage); `on`: it did (the frame focuses its panel). */
export function bindClickIn(host: HTMLElement, o: { usable(): boolean; on(): void }): ClickIn {
  host.toggleAttribute('data-click-in', true);
  let down: ScreenPoint | null = null;
  let stop: (() => void) | null = null;
  const off = (): void => {
    stop?.();
    stop = null;
    host.removeAttribute('data-active');
  };
  const onDown = (e: PointerEvent): void => { down = e.button === 0 && !stop ? { x: e.clientX, y: e.clientY } : null; };
  const onClick = (e: MouseEvent): void => {
    const at = down;
    down = null;
    if (!at || stop || !o.usable() || !isClick(at, { x: e.clientX, y: e.clientY }, CLICK_PX)) return;
    if ((e.target as Element).closest('.vb-af-bar')) return; // the stage's own bar
    host.toggleAttribute('data-active', true);
    stop = dismissable({ within: (t) => host.contains(t), dismiss: off, escape: host });
    o.on();
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('click', onClick);
  return {
    get active() { return stop !== null; },
    off,
    destroy() {
      off();
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('click', onClick);
      host.removeAttribute('data-click-in');
    },
  };
}
