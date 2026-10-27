// Unsaved words in a note bubble are never lost silently (3_FE_04 step 4G ruling 4, cards and
// containers alike): Esc or Cancel with changed text makes the bubble ask (`vb-note-discard`), and
// so does opening another bubble or closing it from the board. The page asks through the shell's
// confirm dialog; OK discards, Cancel puts focus back in the text. Unchanged text never asks.
// The host's own Close asks the same way, through the same `mayLeave` (`createLeave`, M11).
import type { VbNoteBubbleElement } from '#ui';
import { NOTE_DISCARD_EVENT } from '#ui';
import * as confirmWords from '../words/confirm.ts';

/** The confirm dialog's words, as `askConfirm(heading, body, confirm)` takes them. */
export const DISCARD_ASK = [confirmWords.discardYourChanges, confirmWords.changesWillBeLost, confirmWords.discard] as const;

/** Asks the person; true to discard. */
export type AskDiscard = () => Promise<boolean>;

/** Whether the bubble holds words not yet saved: it is open, and its words changed. */
export const unsavedIn = (bubble: VbNoteBubbleElement): boolean => !bubble.hidden && bubble.dirty;

/** Whether the open bubble may close or give way to another: at once when its words are
 *  unchanged, else the person's answer (Cancel puts focus back in the text). */
export async function mayLeave(bubble: VbNoteBubbleElement, ask: AskDiscard): Promise<boolean> {
  if (!unsavedIn(bubble)) return true;
  if (await ask()) return true;
  bubble.focusText();
  return false;
}

/** What a host reads before the board goes (host.ts `BoardView.unsaved`, `leave`; M11). */
export interface Leave {
  /** Whether the bubble holds words not yet saved (`unsavedIn`). */
  readonly unsaved: boolean;
  /** `mayLeave` with the board's ask, one question at a time: a call while it asks gets the same
   *  answer. OK discards: `discard` closes the bubble, so nothing is left unsaved. */
  leave(): Promise<boolean>;
  /** Tells `report` when `unsaved` turned: the flow calls it as the bubble opens or closes; each
   *  input in the bubble calls it too. */
  check(): void;
}

/** The leave guard on the flow's one bubble; `report` hears each turn of `unsaved`; `discard` closes
 *  the bubble once the person chose to lose its words. */
export function createLeave(bubble: VbNoteBubbleElement, ask: AskDiscard, report: (on: boolean) => void = () => {}, discard: () => void = () => {}): Leave {
  let told = false;
  let asking: Promise<boolean> | null = null;
  const check = () => {
    const on = unsavedIn(bubble);
    if (on !== told) report(told = on);
  };
  bubble.addEventListener('input', check);
  const askToLeave = async () => {
    const had = unsavedIn(bubble);
    const ok = await mayLeave(bubble, ask);
    if (ok && had) discard();
    return ok;
  };
  return {
    get unsaved() { return unsavedIn(bubble); },
    leave: () => (asking ??= askToLeave().finally(() => { asking = null; })),
    check,
  };
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
