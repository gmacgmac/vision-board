# FE_05_board-stays-put: The board stays put

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Focus never moves the board (only the keyboard reaching an off-screen card may pan), Z fits the
selection to about 75% of the screen, and ⌘ + drag pans from anywhere.

## Context

PLAN.md rulings 11, 12 and 13, and "Decisions inside the rulings" 1-5. The bug the maintainer hit:
on a card taller than the screen, pressing ✓ focuses the button, `focusin` reaches `focus.ts` `set`,
`Viewport.reveal` pans because the card never fits, and the click lands on whatever moved under the
pointer (PLAN.md § Current State).

## Inputs

- **Files to modify**: `apps/board/src/board/focus.ts` (`createFocus`: `set`, the `focusin`,
  `focusout` and `POPOVER_OPEN` listeners), `apps/board/src/board/viewport.ts` (`Viewport.reveal`,
  `Viewport.fit`), `apps/board/src/board/pointer-focus.ts` (`bindPointerFocus`: expose the last
  input, pointer or key, as one reader, rather than a second tracker in `focus.ts`),
  `apps/board/src/board/selection-flow.ts` (`command`, case `'zoom-selection'`),
  `apps/board/src/board/pointer.ts` (`bindPointer`, `INTERACTIVE`, `Gesture`).
- **Files to reference**: `apps/board/src/board/keys.ts` (Tab, J), `chat-bridge.ts` (`zoomTo` runs
  Z), `finder.ts` (`zoomToContainer`, unchanged), `places.ts` (`setMode`, unchanged),
  `apps/board/src/board/commands.ts` (`'zoom-selection'`).
- **Tests to extend**: `apps/board/tests/viewport-zoom.test.ts`, `selection.test.ts`;
  `tests/pages/focus-ring.spec.ts`, `zoom-and-lasso.spec.ts`, `select.spec.ts`.

## Steps

1. [x] **Failing tests first** (ruling 11), page, on a board with a card taller than the stage and a
   card partly off screen: a click on the tall card's ✓ ticks it and the board's transform does not
   change; a click on a card, its note, its size control or its footer does not change it; blur the
   window and focus it again: unchanged; Tab or J to a card wholly off screen pans it in; to the
   tall card when none of it shows: pans to its top-left corner (48px margin), never fits it.
   Unit tests for `reveal`'s new rule in `viewport-zoom.test.ts`.
2. [x] Build ruling 11: `set` pans only when the last input before the focus was a key (read from
   `pointer-focus.ts`) and the card is off screen (PLAN decision 1); a pointer focus never pans; a
   `focusout` to nowhere while the window loses focus does not clear `focus`, so the return is not a
   new focus; `POPOVER_OPEN` reveals only when opened by a key (PLAN decision 2).
3. [x] **Z (ruling 12)**, tests first: one card and several cards fill about 75% of the stage's
   width or height (whichever binds), centred, above 110% where they are small (up to `MAX_K`); Fit,
   zoom-area and `zoomToContainer` keep today's numbers. Build: `fit` takes Z's fill and cap as
   options (or one `fitSelection` beside it), and only the `'zoom-selection'` case passes them.
4. [x] **⌘ + drag (ruling 13)**, tests first (page): ⌘+drag (and Ctrl+drag) pans when started over
   card text, a card's kind tab, a note, a reply, a button, an open hover tip, the open note bubble
   and the card popover; no text gets selected and no click follows the drag; a still ⌘ click keeps
   today's meaning (adds or removes a card; a link opens in a new tab); Shift+⌘+drag on the
   background is still the additive lasso; `input` and `textarea` keep their own press. Build in
   `bindPointer`: a ⌘/Ctrl press becomes a pending pan that captures the pointer only past
   `DRAG_THRESHOLD`, then swallows the click that follows.
5. [x] Docs: `docs/specification/components.md` (§ Selecting and moving: ⌘ + drag; § The lasso,
   the selection bar and view commands: Z; focus never pans), key help if it names Z's behaviour.

## Validation

- [x] Every test in steps 1, 3 and 4 failed before its change and passes now.
- [x] Keyboard: Tab, J and the focus ring as before (`focus-ring.spec.ts`), axe light and dark.
- [x] The five gates exit 0, one after another.

## Constraints

- One definition of "last input" (`pointer-focus.ts`): import it; don't add another listener set.
- Accessibility (rule 5): every card stays keyboard reachable and comes into view by keyboard.
- Leave `viewport.ts` free of FE_02's zoom property (FE_02 adds it in wave 2); write the names of any
  new `fit` options and the last-input export in TASK-STATUS.md § Shared Foundations.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-16)

**Ruling 11, focus never moves the board.** `pointer-focus.ts` now exports the one reading of the last
input: `lastInput(): 'pointer' | 'key' | null` (type `Input`), set by the listeners `bindPointerFocus`
already bound (plus a `blur` on the window); null when no input came since the page opened or the window
last lost focus, so the window's return is no key. The focus ring reads the same value, unchanged.
`focus.ts` `set` pans only when `lastInput() === 'key'` and the card is not the one focus just left
(a note bubble or popover closing gives focus back to its card: not a move to another card); the
`focusout` to nowhere clears focus only while `document.hasFocus()`, so the window losing focus keeps
it; `POPOVER_OPEN` reveals only for a key (decision 2). The pan itself is one exported pure function,
`viewport.ts` `revealPan(box, view, stage) → { dx, dy }` (decision 1: a card that fits comes fully
into view when any part is outside, as before; a card bigger than the stage, on either axis, pans only
when none of it shows, and then that axis puts its start at the 48px margin, never fitting it), which
`Viewport.reveal` applies. The go-to-card task can call `vp.reveal(box)` (or `revealPan`).
`places.ts` `setMode` still reveals the frame (decision 3, unchanged).

**Ruling 12, Z.** `Viewport.fit(b, animate = true, o?: FitOptions)`, `FitOptions = { fill, cap }`;
`SELECTION_FIT = { fill: 0.75, cap: MAX_K }` is passed only by `selection-flow.ts` `'zoom-selection'`
(so the chat's zoomTo follows, decision 4). A fit waiting for room keeps its options. Fit, zoom-area
and `finder.ts` `zoomToContainer` pass none: 32px a side, at most 110%, as before.

**Ruling 13, Cmd or Ctrl + drag.** `pointer.ts`: today's press logic moved into `begin`; a left press
with Cmd or Ctrl (no Shift, not in `input, textarea, select, [contenteditable]`) wraps whatever `begin`
started (or null over a control) in a pending pan (`Gesture` `pan` with `still`), stops the mousedown
default (no focus, no text selection), captures the pointer only past `DRAG_THRESHOLD`, then swallows
the click its release makes (a capture `click` listener on the window). Held still it ends as the
wrapped gesture (Cmd click on a card adds or removes it, the kind tab and grip as before) or lets the
control's own click through (a button presses, a link opens in a new tab). Starting on the kind tab or
a container's grip, Cmd + drag now pans rather than moves (ruling: "from anywhere").

**Tests, failing first.** Unit (`viewport-zoom.test.ts`, 8 new): `revealPan` (fits / partly out /
bigger and partly showing / bigger and none showing, both axes), `Viewport.reveal`, `fit` default and
with `SELECTION_FIT`, a waiting fit keeps its options; they failed (no exports) before. Page:
`focus-ring.spec.ts` (6 new, own boards): a press on ✓ on a card bigger than the screen ticks it and
does not pan (before: it panned and the click missed, so the card was never ticked); a click on a
card partly off screen, its footer, its size control or its note pans nothing; the window's return
(synthetic blur/focusout/focus/focusin with `document.hasFocus` false, since headless has no other
window) pans nothing; focus coming back to the card it left (Esc closing its note) pans nothing; J or
Tab to a card wholly off screen pans it fully in, and Tab among one card's controls moves nothing (a
guard: passed before and after); K to a card bigger than the stage, wholly off screen, puts its top at
the 48px margin with the zoom unchanged, and pans nothing once some of it shows. `zoom-and-lasso.spec.ts`:
Z on one card goes to 250% centred, on a container's three cards fills 75% of the binding side centred,
F is unchanged (failed before: 110% cap). `select.spec.ts` (3 new, own boards): Cmd and Ctrl + drag pan
by exactly the drag from a card's title, body, kind tab, note, reply and ✓ with no text selected and no
click (nothing selected, no bubble, ✓ not pressed, card not moved); from an open hover tip, the open
note bubble and the handover popover, which stay open; held still, Cmd click adds the card, its click
reaches a link with its default kept, presses ✓, and Cmd + drag in the note's text field does not pan
(a guard: passed before and after). Every new behaviour test failed on the HEAD sources (checked by
putting the five HEAD files back in place for a run, then restoring).

**Outside the listed files (report).** `tests/pages/perf.spec.ts`: six steps relied on a programmatic
`el.focus()` with no input panning a far card into view, which ruling 11 removes; they now press Shift
first (helper `bringIn`: "as the keyboard does"), no assertion changed. `selection.test.ts` was not
extended: it tests `selection.ts`, which nothing here changed; Z's numbers are unit-tested in
`viewport-zoom.test.ts`. The key help (`key-help.ts`) does not name Z's behaviour, so it is unchanged;
it lists "Pan: Drag the background" and could add Cmd + drag later (screenshot change, not done here).

**Docs.** `docs/specification/components.md`: § Selecting and moving item 3 (Cmd or Ctrl + drag) and
item 5 (focus never moves the board, `lastInput`, `revealPan`); § The lasso, the selection bar and view
commands item 5 (Z, `SELECTION_FIT`).

**Screenshots.** None changed by this task (no baseline updated).

**Gates** (one after another, all exit 0): `npm run check`, `npm test` (1257 + 7 timing pass), `npm run
verify`, `npm run gen` (no generated file changed), `npm run test:pages` (449 passed). A first full run
had 6 failures: five in `perf.spec.ts` (the programmatic focus above, fixed) and one trace-file ENOENT
in `board.spec.ts`, caused by my starting a second Playwright run by mistake while the first ran (it
cleared the shared output folder); the second full run was clean.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-app] FE_05: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_05_board-stays-put.md]]`
