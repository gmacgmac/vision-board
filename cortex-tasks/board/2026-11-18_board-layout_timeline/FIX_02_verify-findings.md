# FIX_02_verify-findings: VERIFY_01's Must and Should Fixes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Fix what VERIFY_01 found that needs no new ruling, before the maintainer tries `?flags=timeline`
(VERIFY_01_testing.md § Implementation Notes has the evidence).

## Steps (each fix starts with a test that fails before it)

1. **Docs behind D-106 (M1, blocking)**: `docs/specification/api.md` (the timeline item: `side` is `above`, `below`,
   `left`, `right`; the layout fills the block now) and `packages/format/schema/api/show-layout-response.schema.json`
   `$defs.timeline` descriptions (run down: the line runs down the middle, cards alternate left and right, the first
   left); `npm run gen`. Grep the docs and the skill's built references for "beside", "down the left", "until then".
2. **The date in the accessible name (S3)**: a dated card's accessible name carries its full date (the same full form
   `timelineLabel` gives, from the words file), e.g. "Item 6, Action, 13 October 2026: Pricing page live, Open".
   `packages/ui` `nodeLabel` and its words; unit test and the timeline page spec's axe/name check.
3. **No text selection from a drag on a dated card (S4)**: a press-and-drag on a dated card's top edge (or anywhere a
   drag would start on an undated card) selects no text across cards and copies nothing; text inside a card stays
   selectable as on any card. Fix where the drag is refused (`apps/board/src/board/input/pointer.ts` `DATED`) or in the
   node CSS, whichever matches how an undated card's drag prevents selection. Page test.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8210`. Page specs with
`--config tests/pages/playwright.config.ts`. Files: those named above, their tests, words files.

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`, `npm run test:plugin`, `timeline.spec.ts` and
the specs that cover node names (`node-edges`, `command-lens`, `gallery`).

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report measured numbers.
Never git-add a snapshot.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_02_verify-findings.md]]`

## Implementation Notes

**Status**: Pending
