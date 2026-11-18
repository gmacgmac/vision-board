# FIX_03_focus-pan-ask-mode: Rings After Esc, Panning Over Apps, Ask Now as a Mode

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's use of the merged board (2026-11-18, points 442, 443, 446).

## Rulings (maintainer)

1. **No ring after Esc or a click (442)**: focus rings show only after the person pressed Tab (point 338). When Esc
   or a click closes something and focus returns to what opened it (the image viewer back to the image, the
   conversation box back to the notes mark, any menu or box), no ring shows unless the person was moving by Tab.
   Fix it once, at the pattern that returns focus (e.g. a shared "return focus" helper that records whether the
   person's last move was Tab, or `focus({ focusVisible: false })` where supported with a fallback), not per call
   site. Find every place the grey ring shows this way (image viewer, notes mark, menus, boxes, app window) and test
   each.
2. **Pan over an app (443)**: hovering or scrolling over an app node pans and zooms the board like any node. The app
   takes the pointer and wheel only after the person clicks into it (it is then "active" until they click outside or
   press Esc), and always on stage (full screen). The sandbox is never loosened. Test: wheel and drag over an idle
   app pan the board; after a click the app gets them; Esc or a click outside gives them back.
3. **Add note and Ask now are two modes (446)**: the active mode's button is pink (the primary style); Return does the
   active mode. Clicking a button does that action and makes it the active mode. The mode stays until changed (page
   memory for the board, like zoom; Add note by default). The field's placeholder and the buttons' names say which is
   active; screen readers hear it (`aria-pressed` or the pattern's equivalent). With no agent listening, Ask now still
   keeps the words as a note and says so.

## Where

Own worktree `.claude/worktrees/fix-03` (branch `feat/fix-03`), `VB_TEST_PORT=7550`. FIX_02 runs at the same time in
`app-window` on zoom (`viewport.ts`, `mark-place.ts`, `node-edges.css`, `node-box.css` sizing, a new zoom-rules
module): stay out of those; list needs in REQUESTS.

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`; page specs for each
fix plus `conversation-box`, `chat-ask`, `app-window`, `app-*`, `card-images`, `focus-ring`; a look in a browser, dark
and light. Words in words files.

## On Completion

Fill Implementation Notes. Do not edit TASK-STATUS.md or cortex/LOG.md (separate branch): give the orchestrator the
LOG line and row note.

## Implementation Notes

**Status**: Completed (run 1, 2026-11-18)

**Ruling 1, no ring after Esc or a click (442).** One helper at the pattern: `packages/ui/src/base/focus-return.ts`
`returnFocus(el)` and `bindFocusMoves()` (bound once by the page's `bindPointerFocus`). It records how the person last
moved: Tab, or the arrows, Home, End, J and K outside a text field, is "keys"; a pointer press is "pointer". Focus given
back shows its ring only when moving by keys; else it passes `focusVisible: false` and marks the element
`data-pointer-focus` until focus leaves it (the mark the board's CSS already honours). Unbound (a gallery) the ring
shows as before. Every place focus is given back now uses it: `base/menu.ts` (`openMenu`), `mark-menus.ts`,
`mark-boxes.ts`, `notes.ts` (conversation box back to the notes mark or node), `app-drawer.ts`, `vb-image-view.ts`,
`vb-app-frame.ts` (`toCard`: the stage's Esc and Back), `app-cards.ts` (the panel's Esc), `size.ts`, `update-flow.ts`,
`proposal-flow.ts`, `node-popover.ts`, `region-row.ts` (layout and cog), `region-note.ts`, `selection-pill.ts`,
`GoToCard.svelte`. The image viewer gave focus back on the dialog's `close` event, a task after the dialog's own focus
restore, so one frame could show the ring: it now gives it back in the same task (`close`). `image-view.css`'s ring on
the picture now honours `data-pointer-focus`.

**Ruling 2, pan over an app (443).** `packages/ui/src/app-frame/app-frame-active.ts` `bindClickIn`, wired by
`AppFrameWiring.clickIn` (app-cards.ts: an app window, `data-window`). Idle (`data-click-in` without `data-active`)
the frame has `pointer-events: none` (app-frame.css), so hover, the wheel and a drag over it are the board's;
`pointer.ts` `IDLE_APP` makes a drag there a pan, held still the card's click. A click (under 4px of travel) makes it
active (`data-active`, focus into the panel) until a press outside (`dismissable`) or Esc (the board's, or the panel's
`ui/notifications/escape`, then focus on the window). On stage it always takes them; unstage, freeze and unload end
it. The sandbox attribute is never touched (the test reads it before and after). Old app cards (no window) keep the
panel live as before, so no existing app test changed.

**Ruling 3, Add note and Ask now as modes (446).** The view carries the mode: `BubbleInput.active`, `BoxView.active`
and `BoxView.modes` (each mode's placeholder and both tooltips; words in `packages/ui/src/words/note-bubble.ts`:
`noteAbout`, `askAbout`, `addNoteTip(active)`, `askNowTip(active)`). The template draws the active button as
`vb-nb-primary` with `aria-pressed="true"`, the other `false`; the field's placeholder and name say the mode. In the
element a press of Add note or Ask now (not a disabled Ask now) turns the mode at once (`mode`, no redraw, focus kept)
and the `vb-note` event carries `active`; Enter does the mode (`fieldKey(e, mode, active)`); Cmd or Ctrl Enter is
always Ask now and leaves the mode (the ruling names only a button press as changing it). The page keeps it per board
for the tab, as the zoom is: `controller/ask-now.ts` `mode`/`setMode`, key `view.box-mode:<board>` in the host's store
(sessionStorage on the standalone page); `note-box.ts` `choose` records it, then adds or asks, for the box and the app
drawer alike. With no agent listening Ask now still keeps the words as a note and says so (unchanged path, now
unit-tested through the mode). `show(..., true)` also keeps focus on a pressed box button through a redraw. Gallery:
"Ask now as the mode" sample.

**Coordinator's addition: a clear then Tick soon after cleared again.** Reproduced first: with a write that takes
700 ms (as on a long ledger) the second Tick read the drawn state, still ticked, and sent a second `reopen`, in both
skins (the default disc's picker and Command Lens's switch go through the one item act). Fix in `item-acts.ts`: per
card, the status the writes on their way leave (`ahead`) is what the next press reads, and that press is sent after
them, so order holds. Tests: `apps/board/tests/item-acts.test.ts` (fails before: two reopens) and
`tests/pages/command-lens.spec.ts` "Tick soon after clearing ticks again" (default and command-lens; failed before
with `['ack','reopen','reopen']`). Left: the test hook's `idle` may return in the gap between a write landing and
the one queued behind it starting (the page polls the ledger instead).

**Checks.** `npm run check` clean; `npm run gen -- --check` current; `npm test` 2656/2656 and timing 14/14;
`npm run test:plugin` 116 passed; `npm run verify` fails only on `docs/specification/modules.md` (orchestrator's
`npm run map`). Page specs (answer-model, app-*, card-history, card-image*, card-updates, chat-ask, command-lens,
container-polish, conversation*, focus-return, focus-ring, go-to-card, group-note, hover-tip, key-bubble,
layout-control*, node-boxes, node-edges*, note-*, notes, proposals*, selection-pill): 349 passed, 18 failed, all 18
gallery `toHaveScreenshot` diffs at ratio 0.01-0.02 (anti-aliasing at edges; the known sub-pixel class FIX_01
recorded), none in a section this task draws; no baseline rewritten. Looked at in Chromium, light and dark:
`temp/fix03/` (ask-mode, modes, esc-no-ring, tab-ring, app-idle, app-active).

**Budgets (raised to what was measured, never blocking):** page start 210 -> 211 KB (measured 210.7;
`scripts/verify-weight.mjs` `PAGE`, `performance.md`); plugin `view/board.js` 202,200 -> 203,700 (measured 203,608;
`apps/board/tests/plugin-build.test.ts` `BUDGET`); CSS within 27,600.

**For the orchestrator.** FIX_02 also edits `mark-boxes.ts`, `notes.ts` and `components.md`: mine are one-line
`returnFocus` swaps and two paragraphs (§ conversation box, § focus ring), so a merge should be mechanical.
An active app has no look of its own beyond the node's selection: a maintainer call whether it wants one.
