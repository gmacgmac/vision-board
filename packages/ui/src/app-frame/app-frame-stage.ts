// App frame pattern, the stage (FE_08): what holds a loaded panel on the whole page. The host, the app window that
// holds the frame (its bar and drawer come along), goes into the top layer
// as a manual popover, so no ancestor's pan or zoom reaches it and nothing in the page moves: the frame is never taken
// out of the page, so the panel never reloads. While it is there, focus is held inside it (a focus that lands outside,
// by Tab or a click, comes back in, at its start, or its end after Shift+Tab), Esc anywhere goes back, and a change of
// the frame's size is told to the panel. Release undoes all of it; where focus goes then is the frame's call.
// Browser only.

export interface StageHold {
  readonly host: HTMLElement;
  release(): void;
}

/** What can take focus inside `host`, in order: shown buttons, fields, links, frames and tab stops. */
const TABBABLE = 'button, textarea, input, select, a[href], iframe, [tabindex]';
function tabbable(host: HTMLElement): HTMLElement[] {
  const all = [host, ...host.querySelectorAll<HTMLElement>(TABBABLE)];
  return all.filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.checkVisibility({ visibilityProperty: true }));
}

/** Put `host` on the stage around `frame`: `escape` is Esc anywhere, `resized` a change of the frame's size. */
export function holdStage(host: HTMLElement, frame: HTMLElement, escape: () => void, resized: () => void): StageHold {
  host.setAttribute('popover', 'manual');
  host.toggleAttribute('data-stage', true);
  host.showPopover();
  let back = false;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Tab') back = e.shiftKey;
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    escape();
  };
  const onFocus = (e: FocusEvent): void => {
    if (host.contains(e.target as Node)) return;
    const stops = tabbable(host);
    (back ? stops.at(-1) : stops[0])?.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', onFocus, true);
  const watch = new ResizeObserver(() => resized());
  watch.observe(frame);
  return {
    host,
    release() {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      watch.disconnect();
      try { host.hidePopover(); } catch { /* not shown */ }
      host.removeAttribute('popover');
      host.removeAttribute('data-stage');
    },
  };
}
