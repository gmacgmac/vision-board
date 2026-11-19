# FIX_03_date-order-and-one-date: Tab in Date Order, the Date Said Once

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's result review (PLAN.md § Design review, 2026-11-19, points 601 and 602).

## Steps (each starts with a test that fails before it)

1. **Tab in date order inside a timeline (601)**: within a container that has a timeline, Tab and Shift Tab move
   through the dated cards in the order the line draws them (`#format` `sortByTimeline`, or the layout's `timeline`
   order the page already has), then on to the container's other cards in today's order; boards and containers with
   no timeline keep card-number order (`card-numbers.ts` `readingOrder`) exactly. Find the one place the reading order
   is decided and extend it; no per-card listeners. Page test (both forms) and unit test.
2. **The date said once (602)**: remove the visually hidden full date from a dated card's content (FE_01's accessible
   form); the card's accessible name already carries it (FIX_02, `dateInName`). Copying a dated card's text gives the
   date once; `<time datetime>` stays. Unit test on the markup, page test on the copied text and the name.
3. Docs: `components.md` § The timeline (focus order, the date's accessible form); PLAN.md call 10 is superseded by
   point 602 (say so in your notes; the orchestrator records it).

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8210` (a try-out board runs on 6611: leave
it). Page specs with `--config tests/pages/playwright.config.ts`. Never git-add anything.

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`, `npm run test:plugin`; page specs `timeline`,
`focus-ring`, `focus-return`, `keyboard*` or whichever cover Tab order, `node-edges`, `command-lens`, `gallery`.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_03: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_03_date-order-and-one-date.md]]`

## Implementation Notes

**Status**: Pending
