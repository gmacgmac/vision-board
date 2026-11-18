// Focus going back (FIX_03, points 338 and 442): when Esc or a click closes a menu, a box, a viewer or an app's stage,
// focus returns to what opened it, and the ring shows there only if the person was moving by the keyboard (Tab, or the
// keys that move focus as Tab does). A click and then Esc is not moving by the keyboard, so no ring: the browser alone
// would draw one, since a script's focus after a key matches :focus-visible. One rule for every place focus returns
// (`returnFocus`), so no call site decides it. Unbound (a gallery with no page round it), the ring shows as before.
// Nothing here touches the DOM at import.

/** The mark the board's CSS already draws no ring on (base/a11y.css; the page's pointer-focus.ts sets it too). */
const NO_RING = 'data-pointer-focus';
/** Where the ring says where typing goes: always kept. */
const TYPED = "textarea, [contenteditable], input:not([type='button'], [type='checkbox'], [type='radio'], [type='range'], [type='submit'], [type='file'])";
/** Keys that move focus as Tab does (a menu's arrows, Home and End, the board's J and K), heard outside a text field. */
const MOVES = /^(?:Arrow(?:Up|Down|Left|Right)|Home|End|[jkJK])$/;

/** How the person last moved: by the keyboard, by a pointer, or not heard yet (null: the ring shows). */
let moving: 'keys' | 'pointer' | null = null;

const typed = (t: EventTarget | null): boolean => (t as Element | null)?.matches?.(TYPED) === true;

/** Listen for how the person moves (a key that moves focus, a pointer press); returns the stop. The page binds it once. */
export function bindFocusMoves(doc: Document = document): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Tab' || (MOVES.test(e.key) && !e.altKey && !e.metaKey && !e.ctrlKey && !typed(e.target))) moving = 'keys';
  };
  const onPointer = (): void => { moving = 'pointer'; };
  // Capture: a handler that stops the event further down must not hide it from here.
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('pointerdown', onPointer, true);
  return () => {
    doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('pointerdown', onPointer, true);
    moving = null;
  };
}

/** Whether a focus that returns now shows its ring: the person was moving by the keyboard, or nothing was heard. */
export const ringOnReturn = (): boolean => moving !== 'pointer';

/** Give focus back to `el` (what opened a closing layer), without scrolling; the ring shows only when `ringOnReturn`.
 *  Without it, `el` carries the no-ring mark until focus leaves it, so a key that moves no focus (Z, Space) lights
 *  nothing either. False when `el` is gone. */
export function returnFocus(el: HTMLElement | null | undefined): boolean {
  if (!el?.isConnected) return false;
  const ring = ringOnReturn();
  // focusVisible where the browser takes it; the mark is the fallback, and what the board's CSS reads.
  el.focus({ preventScroll: true, ...(moving !== null && { focusVisible: ring }) } as FocusOptions);
  if (!ring && !el.matches(TYPED) && el.ownerDocument.activeElement === el) {
    el.setAttribute(NO_RING, '');
    el.addEventListener('focusout', () => el.removeAttribute(NO_RING), { once: true });
  }
  return true;
}
