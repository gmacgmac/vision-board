// How focus came to anything the board draws (cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md;
// maintainer, 2026-10-31, widened from cards to every control): what a pointer press focused carries
// data-pointer-focus, and base/a11y.css draws no focus ring on it, so a key that moves no focus (a modifier, Z,
// Esc, Space...) does not light one up when the browser starts matching :focus-visible. Focus moved by the
// keyboard (Tab, J, an arrow in a menu) never carries it, so what the keyboard focused always shows its
// ring (WCAG 2.4.7). A text box is left alone: there the ring says where typing goes. One definition for
// every key and command: the last input before the focus moved decides. The same reading decides
// whether a focus may pan the board (focus.ts, review-polish ruling 11): only a key's may.
const ATTR = 'data-pointer-focus';

/** The kind of input that came last: a pointer press or a key press. */
export type Input = 'pointer' | 'key';
let last: Input = 'key';
/** The window lost focus and no input came since: its return is no input of the person's. */
let away = true;

/** A key is down in the page: from its keydown to its keyup, a pointer press or the window getting focus back. */
let keyDown = false;
/** How focus last left the page's document: a key was down (Tab into a frame) or not (a click in it). */
let leftBy: Input = 'key';

/** How focus last went into a frame of another origin (the window's blur): such a frame hears no
 *  key or press here, so what the page heard before the blur says. A frame the page cannot read
 *  (an app's panel, packages/ui/src/app-frame) asks this for its focus ring. */
export const focusCame = (): Input => leftBy;

/** The last input before now, as `bindPointerFocus` heard it; null when none came since the page
 *  opened or the window last lost focus (the window getting focus back is not a key). */
export const lastInput = (): Input | null => (away ? null : last);

/** What the board draws, here or in a host's page: a host's own elements are never marked. */
const OURS = "[class*='vb-'], vb-node, vb-region, vb-note-bubble, .chat-panel, chat-feed, chat-approval, chat-composer, chat-header, chat-message";
/** Where the ring says where typing goes. */
const TYPED = "textarea, [contenteditable], input:not([type='button'], [type='checkbox'], [type='radio'], [type='range'], [type='submit'], [type='file'])";

/** Listens on the document and the window; returns the function that stops listening. */
export function bindPointerFocus(): () => void {
  const marked = (t: EventTarget | Element | null): HTMLElement | null => {
    const e = t as HTMLElement | null;
    return e?.matches && !e.matches(TYPED) && e.closest(OURS) ? e : null;
  };
  const onPointer = (e: PointerEvent) => {
    last = 'pointer';
    away = false;
    keyDown = false;
    // A press on what already has focus moves none, so no focusin follows: mark it here.
    const now = marked(document.activeElement);
    if (now?.contains(e.target as Node)) now.setAttribute(ATTR, '');
  };
  const onKey = () => { last = 'key'; away = false; keyDown = true; };
  const onKeyUp = () => { keyDown = false; };
  const onFocus = (e: FocusEvent) => { if (e.target === window) keyDown = false; };
  const onBlur = (e: FocusEvent) => { if (e.target === window) { away = true; leftBy = keyDown ? 'key' : 'pointer'; } };
  const onFocusIn = (e: FocusEvent) => marked(e.target)?.toggleAttribute(ATTR, last === 'pointer');
  const onFocusOut = (e: FocusEvent) => marked(e.target)?.removeAttribute(ATTR);
  // Capture: a handler that stops the event further down must not hide it from here.
  document.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  return () => {
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
  };
}
