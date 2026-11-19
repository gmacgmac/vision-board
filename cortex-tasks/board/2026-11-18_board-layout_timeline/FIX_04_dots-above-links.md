# FIX_04_dots-above-links: A Timeline's Dots Draw Above Links

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's look (2026-11-19): a link crossing a timeline draws over the line and over the dots. The dots (and
their rings) draw above every link; the line and the stems stay beneath links, as now.

## Steps

1. Test first (`tests/pages/timeline.spec.ts` or a unit test on the wires layer's order): at a link crossing a dot, the
   dot is the topmost wire-layer element (e.g. `elementFromPoint` at the dot's centre is the dot, both skins).
2. Fix in the wires layer's paint order (`apps/board/src/board/links/timelines.ts`, `wires.ts`): the dots go in a group
   painted after the links, keeping their per-node groups and their glide (FE_02 run 2); no z-index on SVG.
3. Renew only the baselines this changes; say which.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8310`. Page specs with
`--config tests/pages/playwright.config.ts`. Never git-add anything. A try-out board runs on 6611: leave it.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_04: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_04_dots-above-links.md]]`

## Implementation Notes

**Status**: Pending
