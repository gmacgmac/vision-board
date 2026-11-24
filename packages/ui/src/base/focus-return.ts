// The focus ring's one switch (focus-after-Tab, maintainer 2026-11-24: "disable that accessibility thing everywhere
// unless a user presses tab"; it replaces the pointer-focus mark, cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md).
// The page's root and every board root (`.vb-board`: a host's stylesheet check accepts no `:root[…]` rule) carry
// `data-vb-keys` from the person's Tab (or Shift+Tab) until their next pointer press, or a
// click into a frame of another origin (the window's blur with no key down); every other key leaves it as it is, so
// a click and then Shift, Alt, Cmd, Ctrl or Z lights nothing, and the arrows and Enter after a Tab keep the ring.
// base/a11y.css turns it into the ring (`--vb-ring-style`); a text box always shows where typing goes. Focus going back
// when Esc or a click closes a menu, a box, a viewer or an app's stage (FIX_03) needs no rule of its own: the ring
// shows there exactly when it shows anywhere. Unbound (a gallery with no page round it), no ring shows but the
// gallery's drawn looks (data-look). Nothing here touches the DOM at import.

/** The root's mark while the person is moving by the keyboard. */
export const KEYS_ATTR = 'data-vb-keys';

/** Whether the person is moving by the keyboard now: a ring shows on what has focus. */
export const keysOn = (doc: Document = document): boolean => doc.documentElement.hasAttribute(KEYS_ATTR);

/** Listen for the Tab that turns the ring on and the press that turns it off; returns the stop. The page binds it once. */
export function bindFocusMoves(doc: Document = document): () => void {
  const win = doc.defaultView;
  let keyDown = false;
  const set = (on: boolean): void => {
    for (const el of [doc.documentElement, ...doc.querySelectorAll('.vb-board')]) el.toggleAttribute(KEYS_ATTR, on);
  };
  const onKey = (e: KeyboardEvent): void => {
    keyDown = true;
    if (e.key === 'Tab') set(true);
  };
  const onKeyUp = (): void => { keyDown = false; };
  const onPointer = (): void => { keyDown = false; set(false); };
  // Focus left for a frame of another origin, whose presses this page never hears: by a click unless a key was down.
  const onBlur = (e: FocusEvent): void => { if (e.target === win && !keyDown) set(false); };
  // Capture: a handler that stops the event further down must not hide it from here.
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('keyup', onKeyUp, true);
  doc.addEventListener('pointerdown', onPointer, true);
  win?.addEventListener('blur', onBlur);
  return () => {
    doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('keyup', onKeyUp, true);
    doc.removeEventListener('pointerdown', onPointer, true);
    win?.removeEventListener('blur', onBlur);
    set(false);
  };
}

/** Give focus back to `el` (what opened a closing layer), without scrolling; whether its ring shows is the switch's
 *  (`keysOn`), as everywhere. False when `el` is gone. */
export function returnFocus(el: HTMLElement | null | undefined): boolean {
  if (!el?.isConnected) return false;
  el.focus({ preventScroll: true });
  return true;
}
