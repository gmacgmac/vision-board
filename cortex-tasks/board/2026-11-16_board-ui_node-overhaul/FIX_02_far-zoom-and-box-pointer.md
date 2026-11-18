# FIX_02_far-zoom-and-box-pointer: Far Zoom and the Box's Pointer

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's first use of the merged board (2026-11-18, points 430 to 438). Replaces FIX_01's rulings on small
marks and far-out crowding where they differ.

## Rulings (maintainer)

1. **One breakpoint, the far one** (today's `CROWD_GROW`, about 37%): above it, edge marks keep their minimum size
   (grow in place) as now. **Below it nothing grows**: the number, the disc, the notes mark, the badges, the kind tab
   and grip all scale down with the node. Only container titles (and their rail) keep their size, as before.
2. **Nothing jumps or disappears at the breakpoint**: the notes mark stays bottom right; kind tabs and grips never
   hide; the number never moves into the node or over the title. Remove FIX_01's crowded mode
   (`data-marks-crowded`: marks giving way, number and disc growing down, notes mark to bottom left).
3. **Marks work down to that breakpoint** (replaces FIX_01's 86% rule, `TARGET_MIN`/`marksPressable`): the disc, the
   notes mark, the number and every mark take presses at any zoom above the far breakpoint, with the hand cursor.
   Below it a press on a mark selects the node only (so the person can zoom to it), with no hand cursor. Keyboard
   unchanged. axe `target-size` is excused below 100% only where a mark draws under 24 px (record the reason: the
   keyboard path, and the person's ruling).
4. **The box's pointer points at the node's centre** (the conversation, proposal and history boxes, `placeBeside`):
   beside the node, the pointer sits on the box's left edge at the node's vertical centre; below the node, the box is
   centred on the node's width and the pointer sits at the middle of the box's top edge, pointing up. When the box had
   to move to stay on screen, the pointer still aims at the node's centre (clamped inside the box's edge).

## Steps

1. Implement 1 to 4 in the existing patterns (`viewport.ts` `markGrow`, `node-edges.css`, `mark-place.ts`
   `placeBeside`, `node-box.css`, `pointer.ts`/`wiring.ts`/`mark-flow.ts`/`mark-tips.ts`); remove what they replace.
2. Update the tests that held the old rules (`small-marks.spec.ts`, `zoom-groups.spec.ts`, `zoom-groups.test.ts`,
   `mark-place.test.ts`, `node-boxes.spec.ts`) to the new ones; each ruling has a test that fails before.
3. Update `docs/specification/components.md` (zoom groups, box placement) and PLAN.md's design rulings (one line
   each, "point 430-438").
4. Look in a browser at 20, 30, 37, 45, 83, 100 and 200%, both skins, dark: no jump at the breakpoint, marks
   clickable at 45% and 83%, boxes beside and below with the pointer at the node's centre. Screenshots `temp/fix02/`.

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`, and the page specs
above plus `command-lens`, `node-edges-board`, `conversation-box`, `app-window`.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_02: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_02_far-zoom-and-box-pointer.md]]`

## Implementation Notes

**Status**: Pending
