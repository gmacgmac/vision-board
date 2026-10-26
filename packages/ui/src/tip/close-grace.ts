// The close grace every hover tip shares (hover-tip-reachable, WCAG 1.4.13 hoverable): the pointer
// leaving a tip's anchor or the tip itself does not close it at once; it closes after a short wait,
// and the pointer coming back to either within it cancels the close. Opening stays immediate, and
// so does every other way to close (Esc, a press outside, focus leaving, `close()`). The open rules
// stay pure (`previewStep`, region/region-preview.ts); this is the one browser-side timer, used by
// both callers of the rules: `bindHoverTip` (tip/hover-tip.ts) and the container note preview
// (region/region-note.ts).
import type { PreviewEvent } from '../region/region-preview.ts';

/** How long a tip holds after the pointer leaves, in ms (a pointer crossing a gap takes far less). */
export const CLOSE_GRACE_MS = 300;

/** The events that wait: the pointer leaving the anchor or the tip. */
export const isPointerLeave = (e: PreviewEvent) => e === 'button-leave' || e === 'popover-leave';

export interface CloseGrace {
  /** The open state after `event`: `on` is what the rules now say, `shown` whether the tip shows now.
   * A tip that shows and loses only its pointer waits, then `apply(false)`; anything else applies now. */
  set(event: PreviewEvent, shown: boolean, on: boolean, apply: (on: boolean) => void): void;
  /** Forget a close that is waiting (the pattern was rebuilt). */
  cancel(): void;
}

export function closeGrace(ms: number = CLOSE_GRACE_MS): CloseGrace {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    set(event, shown, on, apply) {
      if (on || !shown || !isPointerLeave(event)) {
        cancel();
        apply(on);
      } else if (timer === undefined) {
        timer = setTimeout(() => {
          timer = undefined;
          apply(false);
        }, ms);
      }
    },
    cancel,
  };
}
