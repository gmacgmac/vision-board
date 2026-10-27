// Unsaved words in a note bubble are never lost silently (3_FE_04 step 4G ruling 4, cards and
// containers alike): Esc or Cancel with changed text makes the bubble ask (`vb-note-discard`), and
// so does opening another bubble or closing it from the board. The page asks through the shell's
// confirm dialog; OK discards, Cancel puts focus back in the text. Unchanged text never asks.
import type { VbNoteBubbleElement } from '#ui';
import { NOTE_DISCARD_EVENT } from '#ui';

/** The confirm dialog's words, as `askConfirm(heading, body, confirm)` takes them. */
export const DISCARD_ASK = ['Discard your changes?', 'Changes will be lost.', 'Discard'] as const;

/** Asks the person; true to discard. */
export type AskDiscard = () => Promise<boolean>;

/** Whether the open bubble may close or give way to another: at once when its words are
 *  unchanged, else the person's answer (Cancel puts focus back in the text). */
export async function mayLeave(bubble: VbNoteBubbleElement, ask: AskDiscard): Promise<boolean> {
  if (bubble.hidden || !bubble.dirty) return true;
  if (await ask()) return true;
  bubble.focusText();
  return false;
}

/** The bubble's own ask (Esc or Cancel with changed text): `discard` closes it on OK. `current`
 *  names what is open; nothing happens if it changed while the dialog was up. */
export function bindDiscard(bubble: VbNoteBubbleElement, ask: AskDiscard, discard: () => void, current: () => unknown): void {
  bubble.addEventListener(NOTE_DISCARD_EVENT, () => {
    const at = current();
    void ask().then((ok) => {
      if (current() !== at) return;
      if (ok) discard();
      else bubble.focusText();
    });
  });
}
