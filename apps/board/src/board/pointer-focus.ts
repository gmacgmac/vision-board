// How focus came to a card (cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md): a card
// a pointer press focused carries data-pointer-focus, and node.css draws no focus ring on it, so a
// key that moves no focus (Z, Esc, Space...) does not light one up when the browser starts matching
// :focus-visible. Focus moved by the keyboard (Tab, J, a command that focuses another card) never
// carries it, so a card the keyboard focused always shows its ring (WCAG 2.4.7). One definition for
// every key and command: the last input before the focus moved decides.
const ATTR = 'data-pointer-focus';

/** Listens on the document and on `stage`; returns the function that stops listening. */
export function bindPointerFocus(stage: HTMLElement): () => void {
  let pointer = false;
  /** The card `e` is on itself (not a control inside it); null for anything else. */
  const cardOf = (e: Event) => ((e.target as HTMLElement).localName === 'vb-node' ? e.target as HTMLElement : null);
  const onPointer = (e: PointerEvent) => {
    pointer = true;
    // A press on the card that already has focus moves none, so no focusin follows: mark it here.
    const card = (e.target as HTMLElement).closest?.('vb-node');
    if (card && card === document.activeElement) card.setAttribute(ATTR, '');
  };
  const onKey = () => { pointer = false; };
  const onFocusIn = (e: FocusEvent) => cardOf(e)?.toggleAttribute(ATTR, pointer);
  const onFocusOut = (e: FocusEvent) => cardOf(e)?.removeAttribute(ATTR);
  // Capture: a handler that stops the event further down must not hide it from here.
  document.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('keydown', onKey, true);
  stage.addEventListener('focusin', onFocusIn);
  stage.addEventListener('focusout', onFocusOut);
  return () => {
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey, true);
    stage.removeEventListener('focusin', onFocusIn);
    stage.removeEventListener('focusout', onFocusOut);
  };
}
