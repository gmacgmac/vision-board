# FIX_01_anyof-refusal-wording: A Refusal Names What Was Wrong (tracker M84)

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Rolled into this set by the maintainer (2026-11-18, design gate). `apps/board/server/schema.ts` `plain` words every
failed `anyOf` as a card reference, so `write_board` refuses `tone: "pink"` or `icon: "rocket"` with "must be a node
number or { key }". A refusal must name what the field accepts (a tone's names or hue, an icon's name rule, a card
reference only where the field is one).

## Steps

1. Test first: in the test file that covers `schema.ts`'s refusal wording (find it; else a new
   `apps/board/tests/schema-refusals.test.ts`), a `write_board` item with `tone: "pink"`, one with `icon: "rocket"`, and
   one with a bad card reference in a link: the first two fail today with the card-reference words.
2. Fix at `plain`: word an `anyOf` failure by the branch the value fits best (its type, then its keyword failures),
   reusing the words already in `packages/format/src/words/` (`toneOneOf` and its neighbours); a new sentence goes in
   its words file. No change to any schema.
3. Run the refusal tests, `api-*.test.ts`, `npm run check`, `npm test`.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps` (wave 2's other tasks are in their own worktrees).
`VB_TEST_PORT=8410`. Files: `apps/board/server/schema.ts`, its test, a words file under
`packages/format/src/words/` only if a sentence is new.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report the measured
number.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row (only your row and notes), append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-format] FIX_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_01_anyof-refusal-wording.md]]`

## Implementation Notes

**Status**: Pending
