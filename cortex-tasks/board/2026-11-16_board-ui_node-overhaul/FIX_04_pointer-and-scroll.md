# FIX_04_pointer-and-scroll: A Fixed Pointer, and Scroll Before Pan

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's use of the merged board (2026-11-18, points 459, 460). Replaces FIX_02's ruling 4 where it differs.

## Rulings (maintainer)

1. **The pointer on a box beside a node is fixed (459)**: on the box's left edge at one set distance from the box's
   top (level with the node's upper part while the box is top aligned), and it never moves when the box moves to
   stay on screen. A box below the node keeps its pointer at the middle of its top edge, the box centred on the node.
2. **Scroll first, then pan (460)**: over anything that can scroll in the wheel's direction (the conversation box's
   thread, the history list, a node's body, a menu or list that scrolls), the wheel scrolls it and the board does not
   move. A flick that carries the content to its end stops there: the rest of that gesture does not pan. Only a new
   gesture that starts at the end pans the board. Pinch or Ctrl/Cmd wheel always zooms the board. Tracker M4 (a
   scroll that reaches a card's end pans the board) is settled by this.

## Steps

1. One place for it: the board's wheel handling (`apps/board/src/board/input/` wiring or `canvas/viewport.ts`'s wheel
   entry) asks the target's scroll chain whether it can scroll that way (one helper, e.g. `canScroll(el, dx, dy)`), and
   keeps a short gesture memory (the wheel events of one gesture: no gap over about 150 to 250 ms) so a gesture that
   began as a scroll never turns into a pan. Reuse what exists; no per-component listeners.
2. Ruling 1 in `apps/board/src/board/cards/mark-place.ts` `placeBeside` and `packages/ui/src/node/node-box.css`; update
   `mark-place.test.ts` and `node-boxes.spec.ts`; the zoom registry (`#ui` `ZOOM_RULES`) if a number lives there.
3. Tests that fail before: a page spec with a long conversation (wheel scrolls the thread, the board's transform does
   not change; a flick to the end does not pan; the next gesture pans), the same for a long node body and the history
   list; trackpad-style small deltas and mouse-style line deltas; pinch zooms.
4. Docs: `components.md` (the box's pointer; scroll before pan); PLAN.md design rulings (points 459-460).

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`; page specs above plus
`zoom-groups`, `zoom-and-lasso`, `node-boxes`, `conversation-box`, `app-window` (an idle app still pans; an active one
keeps its wheel). A look in a browser, dark.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_04: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_04_pointer-and-scroll.md]]`

## Implementation Notes

**Status**: Completed (run 1, 2026-11-18)

**Ruling 1, a fixed pointer (459).** `apps/board/src/board/cards/mark-place.ts` `placeBeside`: beside the node the
pointer is `BOX_ARROW` (22px, the note bubble's own `--vb-arrow` default) down the box's left edge, whatever the box's
`y`; below or above it is `size.w / 2`, the box centred on the node. FIX_02's aim at the node's centre and its
`ARROW_CORNER` clamp are gone. The callers write it as before (`mark-boxes.ts` in stage pixels; `notes.ts` divides by the
conversation box's scale), so nothing in `node-box.css` changed, and no zoom number moved (`ZOOM_RULES` untouched).
Tests first: `apps/board/tests/mark-place.test.ts` (failed: no `BOX_ARROW`; and the arrow values), `node-boxes.spec.ts`
`besideTheNode` and "a node near the window's bottom" (the pointer does not move with the box). Looked at, dark:
`temp/fix04/beside-dark.png`, `moved-up-dark.png`.

**Ruling 2, scroll first, then pan (460; settles tracker M4).** The board already had one place for it
(`input/wheel-latch.ts`, the `wheelChaining` flag, on by default since 2026-11-05): `canScroll` on the event's path,
one target per gesture. Headless Chromium passed every real-wheel case I wrote for the conversation box's thread, the
history list and a code block in a node (`tests/pages/scroll-before-pan.spec.ts`, trackpad-style and mouse-style), so
the maintainer's pans come from what a real trackpad and mouse send that Playwright's wheel does not. Three causes,
each with a test that failed before:
- A gesture was decided by its first wheel event even when that event did not move (a trackpad can open a gesture with
  a zero-delta wheel): nothing could scroll by 0, so the whole gesture latched to a pan and the board swept away
  under a flick over the thread. Now the first event that moves decides (`createWheelLatch`); `wheel-latch.test.ts`
  and the page test "a gesture that opens with an event of no movement".
- A wheel that counts in lines (`deltaMode` 1, many mice outside Chromium and some within) panned 3px a notch; now 16px
  a line, a stage's height a page, for pan and zoom (`pointer.ts` `WHEEL_LINE`); page test "counts in lines".
- The gap that ends a gesture went from 150 to 200 ms (the task's 150-250 range), so momentum that follows the fingers
  stays in the gesture; `wheel-latch.test.ts`.
And a scroller at its end hands the rest of the gesture to no one: `.vb-stage * { overscroll-behavior: contain }`
(board.css), so neither the page nor a host's page scrolls instead. Pinch and Ctrl/Cmd wheel zoom (page test). The flag's
description says 200 ms and "first wheel event that moves". Not established: which of these the maintainer's own
trackpad hits; a look on his machine closes it.

**Docs.** `components.md` (§ the box beside a node: the fixed pointer; § Pointer, the wheel: scroll first, then pan);
PLAN.md design rulings (points 459, 460; FIX_02's pointer entry marked superseded) and § Temporary size budgets.

**Budgets.** Page start 211 → 211.2 KB (measured 211.1; `scripts/verify-weight.mjs`, `performance.md`, PLAN.md). Plugin
JS and CSS within 204,200 and 27,600.

**Checks.** `npm run check` clean, `npm run gen -- --check` current, `npm run verify` clean, `npm test` 2662/2662 and
timing 14/14, `npm run test:plugin` 116 passed. The whole page suite ran once (5 workers, port 7450,
9.3 min): 1,087 passed, 64 failed, every one a gallery or section `toHaveScreenshot` test (the known sub-pixel class;
none in scroll-before-pan, wheel-chaining, node-boxes, zoom-groups, zoom-and-lasso, conversation-box, app-window,
app-pan-key, focus-return); no baseline rewritten. An idle app still pans and an active one keeps its wheel
(`app-window.spec.ts`).

**Open.** Tracker M4 is settled by this (orchestrator's file). `docs/specification/modules.md` needs no new module.
