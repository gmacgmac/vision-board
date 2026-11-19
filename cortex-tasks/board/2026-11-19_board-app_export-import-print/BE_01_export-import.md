---
skills: [cortex-architecture]
---
# BE_01_export-import: Export and Import on the Server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The export read and the `import` mode of `write_board` (PLAN.md decisions 1-7), on T_01's contract.

## Steps

1. Export (`apps/board/server/`, beside the reads in `engine/reads.ts`): the board's current state, or one
   container's, as write items with keys (regions, nodes with their current text, kind, tone, icon, timeline, size,
   links), the person's current answers, and, when asked, the notes and their conversations. Pins: the person's moved
   cards keep their places (a `pin` per moved card in `items` if the write items carry one; else say so).
2. Import (`write-board.ts`): `upgradeExport`, `conditionExport`, then the items through the normal write path
   into a new board (titled from the file) or the current one; then the answers as the person's acts only when the
   request comes from the page as the person; from an agent, answers are dropped and named (decision 7). The reply
   lists what was dropped.
3. Tests (`apps/board/tests/`): a round trip (export then import into a new board gives the same cards, links,
   answers, places); a container export; import into the current board; an agent's import drops answers; an unknown
   field dropped and named; an older `v` upgraded (with a test-only step).

## Where

Own worktree `files-be-01`, port 8510.

## Validation

`npm run check`, `npm test`, `npm run verify`.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Pending
