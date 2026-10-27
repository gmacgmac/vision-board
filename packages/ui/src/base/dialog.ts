// The modal dialog (browser side of dialog-core.ts), for any framework: a native <dialog> with the
// class vb-dialog (base/dialog.css), opened and closed by `syncModal` from the state that says
// whether it is wanted, closed by a backdrop click through `backdropClick`, and told it shut through
// `whenShut`. Nothing here touches the DOM at import.
import { modalStep, onBackdrop } from './dialog-core.ts';

/** The part of a <dialog> these use (a test passes a stand-in). */
export interface ModalElement {
  readonly open: boolean;
  showModal(): void;
  close(): void;
}

/** Show `dlg` modal when `wants` and it is shut, then `opened()` (reset its fields, focus where the
 * person starts); close it when not `wants` and it is open. Call it whenever the state changes. */
export function syncModal(dlg: ModalElement, wants: boolean, opened?: () => void): void {
  const step = modalStep(dlg.open, wants);
  if (step === 'show') {
    dlg.showModal();
    opened?.();
  } else if (step === 'close') dlg.close();
}

/** A click handler for the dialog: a click on its backdrop calls `close` (the caller decides whether
 * it may close now, e.g. not while a request is on its way). */
export function backdropClick(close: () => void): (e: MouseEvent) => void {
  return (e) => {
    const dlg = e.currentTarget as HTMLElement;
    // A click inside, or Enter's click on a button (which has no position).
    if (e.target !== dlg) return;
    if (onBackdrop(dlg.getBoundingClientRect(), e.clientX, e.clientY)) close();
  };
}

/** A close-event handler: `shut()` runs only while the dialog is still shut, so a close event queued
 * before a new request opened it again closes nothing. */
export function whenShut(shut: () => void): (e: Event) => void {
  return (e) => {
    if (!(e.currentTarget as unknown as ModalElement).open) shut();
  };
}
