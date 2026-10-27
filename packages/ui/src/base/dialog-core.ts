// The modal dialog's rules, pure. A dialog is the native <dialog> shown modal: the browser keeps
// focus inside it and makes the rest of the page inert (the focus trap), Esc cancels it, and when it
// closes the browser gives focus back to what had it before (the focus return). What is ours: the
// dialog follows one piece of state (open while there is a request, shut when there is none); a
// click on the backdrop closes it like Cancel; and the close event, which the browser queues after
// the dialog shut, is taken only while it is still shut (a request that opened it again in between
// is not the one closed). The browser side is dialog.ts.

export interface DialogBox { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }

/** What a dialog that is `open` does when its state `wants` it open: show it, close it, or nothing. */
export function modalStep(open: boolean, wants: boolean): 'show' | 'close' | null {
  if (wants && !open) return 'show';
  if (!wants && open) return 'close';
  return null;
}

/** A click at (`x`, `y`) on the dialog element itself falls on its backdrop when it is outside the
 * dialog's box. Enter on a button fires a click at (0, 0) on that button, never on the dialog, so a
 * caller checks the target first. */
export const onBackdrop = (box: DialogBox, x: number, y: number): boolean =>
  x < box.left || x > box.right || y < box.top || y > box.bottom;
