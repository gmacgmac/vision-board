// How the person last moved, for the board: whether a focus may pan the board (focus.ts, review-polish ruling 11: only
// a key's may). The focus ring is not decided here: binding this binds `#ui` `bindFocusMoves`, the ring's one switch
// (base/focus-return.ts: a ring only after Tab, until the next pointer press; base/a11y.css draws it).
import { bindFocusMoves } from '#ui';

/** The kind of input that came last: a pointer press or a key press. */
export type Input = 'pointer' | 'key';
let last: Input = 'key';
/** The window lost focus and no input came since: its return is no input of the person's. */
let away = true;

/** The last input before now, as `bindPointerFocus` heard it; null when none came since the page
 *  opened or the window last lost focus (the window getting focus back is not a key). */
export const lastInput = (): Input | null => (away ? null : last);

/** Listens on the document and the window; returns the function that stops listening. */
export function bindPointerFocus(): () => void {
  const onPointer = () => { last = 'pointer'; away = false; };
  const onKey = () => { last = 'key'; away = false; };
  const onBlur = (e: FocusEvent) => { if (e.target === window) away = true; };
  // Capture: a handler that stops the event further down must not hide it from here.
  document.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', onBlur);
  const unbindMoves = bindFocusMoves();
  return () => {
    unbindMoves();
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('blur', onBlur);
  };
}
