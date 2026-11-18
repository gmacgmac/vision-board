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

**Status**: Pending
