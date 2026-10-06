// Region pattern: when the container note's preview popover is open (3_FE_04 step 4G ruling 2,
// WCAG 1.4.13). No DOM, so the rules are unit-tested under plain Node; region-note.ts feeds it
// the pointer, focus and key events and draws the result. The popover is hoverable (it stays
// while the pointer is on the Comment button or on it), persistent (it stays while focus is on
// either) and dismissible without moving anything (Esc). Touch has no hover: a tap on Comment
// opens it, a tap outside closes it.

/** What keeps the popover open. `dismissed`: Esc (or opening the bubble) closed it while focus
 * stays on Comment; a fresh pointer arrival, tap or focus opens it again. */
export interface PreviewState {
  button: boolean;
  popover: boolean;
  focus: boolean;
  tapped: boolean;
  dismissed: boolean;
}

export const PREVIEW_CLOSED: PreviewState = { button: false, popover: false, focus: false, tapped: false, dismissed: false };

/** `focus-in` / `focus-out`: focus arrived on, or left, Comment and the popover together.
 * `outside`: a pointer press outside both. `close`: the page's bubble opened (a click on Comment
 * or on Edit), so the preview gives way. */
export type PreviewEvent =
  | 'button-enter' | 'button-leave' | 'popover-enter' | 'popover-leave'
  | 'focus-in' | 'focus-out' | 'tap' | 'outside' | 'escape' | 'close';

export function previewStep(s: PreviewState, e: PreviewEvent): PreviewState {
  switch (e) {
    case 'button-enter': return { ...s, button: true, dismissed: false };
    case 'button-leave': return { ...s, button: false };
    case 'popover-enter': return { ...s, popover: true, dismissed: false };
    case 'popover-leave': return { ...s, popover: false };
    case 'focus-in': return { ...s, focus: true, dismissed: s.focus && s.dismissed };
    case 'focus-out': return { ...s, focus: false, dismissed: false };
    case 'tap': return { ...s, tapped: true, dismissed: false };
    case 'outside': return { ...s, tapped: false };
    // The pointer flags are cleared too: a pointer still resting there must leave and come back
    // to reopen it (pointer events do not fire again while it rests). Focus stays where it is,
    // so `dismissed` holds the popover shut until focus leaves.
    case 'escape': case 'close': return { button: false, popover: false, tapped: false, focus: s.focus, dismissed: s.focus };
  }
}

/** Whether the popover shows: only with a note, and only while something keeps it open. */
export function previewShown(s: PreviewState, hasNote: boolean): boolean {
  return hasNote && !s.dismissed && (s.button || s.popover || s.focus || s.tapped);
}
