// How focus came to a card (cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md): a card
// a pointer press focused carries data-pointer-focus, and node.css draws no focus ring on it, so a
// key that moves no focus (Z, Esc, Space...) does not light one up when the browser starts matching
// :focus-visible. Focus moved by the keyboard (Tab, J, a command that focuses another card) never
// carries it, so a card the keyboard focused always shows its ring (WCAG 2.4.7). A container's title line, which a
// click inside the container focuses (Z on a container), is marked the same way. One definition for
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

/** Listens on the document, the window and `stage`; returns the function that stops listening. */
export function bindPointerFocus(stage: HTMLElement): () => void {
  /** The card `e` is on itself (not a control inside it), or a container's title line (which a click
   *  inside the container focuses, so Z zooms to it); null for anything else. */
  const cardOf = (e: Event) => {
    const t = e.target as HTMLElement;
    return t.localName === 'vb-node' || t.matches?.('.vb-region-head h2') ? t : null;
  };
  const onPointer = (e: PointerEvent) => {
    last = 'pointer';
    away = false;
    keyDown = false;
    // A press on the card that already has focus moves none, so no focusin follows: mark it here.
    const card = (e.target as HTMLElement).closest?.('vb-node');
    if (card && card === document.activeElement) card.setAttribute(ATTR, '');
  };
  const onKey = () => { last = 'key'; away = false; keyDown = true; };
  const onKeyUp = () => { keyDown = false; };
  const onFocus = (e: FocusEvent) => { if (e.target === window) keyDown = false; };
  const onBlur = (e: FocusEvent) => { if (e.target === window) { away = true; leftBy = keyDown ? 'key' : 'pointer'; } };
  const onFocusIn = (e: FocusEvent) => cardOf(e)?.toggleAttribute(ATTR, last === 'pointer');
  const onFocusOut = (e: FocusEvent) => cardOf(e)?.removeAttribute(ATTR);
  // Capture: a handler that stops the event further down must not hide it from here.
  document.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  stage.addEventListener('focusin', onFocusIn);
  stage.addEventListener('focusout', onFocusOut);
  return () => {
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    stage.removeEventListener('focusin', onFocusIn);
    stage.removeEventListener('focusout', onFocusOut);
  };
}
