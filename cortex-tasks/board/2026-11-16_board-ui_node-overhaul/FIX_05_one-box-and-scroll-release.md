# FIX_05_one-box-and-scroll-release: One Box Behaviour, and Letting Go of a Scroll

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's use after FIX_04 (2026-11-18, points 484, 485). Run after T_04.

## Rulings (maintainer)

1. **One box, one behaviour (484)**: the history box and the proposal box behave exactly as the conversation box: the
   same fixed pointer (`placeBeside` `BOX_ARROW` beside, the middle of the top edge below) and the same zoom rule
   (clamp(k, 0.8, 1.2), one row in `#ui` `ZOOM_RULES` for all three). This replaces the part of D-101 that kept history
   at one size: the orchestrator appends the decision entry (draft below) with the maintainer's yes, already given.
2. **Letting go of a scroll (485)**: on macOS a flick's momentum keeps sending wheel events for one to two seconds, so
   the board, waiting for the gesture to end, keeps the scroller and won't pan; at the end an elastic bounce shows.
   Once the scroller has reached its end, the rest of that momentum is swallowed quietly (no bounce, no pan), and a
   fresh push of the fingers is a new gesture at once and pans. Detect momentum from the wheel stream itself (a
   decaying run of deltas after the fingers lift; a fresh push breaks the decay with a rise) rather than a long gap,
   and never wait for the momentum to die out. No elastic bounce on board scrollers (`overscroll-behavior: none` where
   it applies).

## Steps

1. Ruling 1 at the one box pattern (`mark-place.ts`, `mark-boxes.ts`, `node-box.css`, `ZOOM_RULES`); tests that fail
   before (`mark-place.test.ts`, `node-boxes.spec.ts`, `zoom-groups.spec.ts`, `zoom-rules.test.ts`).
2. Ruling 2 in `input/wheel-latch.ts` (`createWheelLatch`): tests with recorded-style streams (fingers then a decaying
   momentum tail; a fresh push during the tail; a mouse notch), unit and page (`scroll-before-pan.spec.ts`).
3. Docs: `components.md`; PLAN.md design rulings (points 484, 485).

## Decision entry to append (orchestrator, with the maintainer's yes)

```
## D-104 Every box beside a node behaves the same (replaces D-101's "history keeps one size")
- **Date**: 2026-11-18 · **Status**: Accepted (maintainer, point 484) · **From**: the maintainer's use of the merged board
- **Decision**: The conversation, history and proposal boxes share one placement and one zoom rule: beside the node with a fixed pointer near the box's top, or below it centred with the pointer at the middle of its top edge; and they scale with the board between 80% and 120% zoom, holding one size outside that range. This replaces D-101's listing of history among the parts that keep one size; menus, the answer picker, the right-click list, the selection bar and the toolbar still keep one size.
- **Why**: one box should behave one way, whatever it holds.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_05_one-box-and-scroll-release.md
```

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`; the page specs above
plus `conversation-box`, `card-history`, `proposals`, `app-window`. A look in a browser, dark.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_05: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_05_one-box-and-scroll-release.md]]`

## Implementation Notes

**Status**: Pending
