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

**Status**: Pending
