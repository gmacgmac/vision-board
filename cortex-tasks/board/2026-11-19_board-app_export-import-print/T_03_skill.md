---
skills: [cortex-architecture]
---
# T_03_skill: The Agent Learns Export and Import

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

PLAN.md decision 7: an agent exports through `get_board`/`show_container` with `export: true` and imports through
`write_board`'s `import` mode. The skill says so in the fewest words, in a reference read at the point of use (the
plugin skill stays within its 8,192-byte cap; nothing in core unless a bullet fits).

## Steps

1. `skills/vision-board/source/references/` (a new `files.md`, or a section of an existing reference: choose the
   smaller), built into both builds (`npm run build:skill`); core points at it only if bytes allow.
2. Eval scenarios (`tests/evals/bot/scenarios/`): "copy this board into a new one" (export then import, no ✓/✗ sent),
   "bring this exported file into the board" (import mode, reply's drops relayed).
3. Dry evals in both hosts; live Haiku once per host within the default caps (approved pattern: timeline T_02).

## Where

`.claude/worktrees/app-window` after wave 2 merges. Port 8910. `npm run eval:bot` passes before merge.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Report the eval spend.

## On Completion

Fill Implementation Notes, update your row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_03: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/T_03_skill.md]]`

## Implementation Notes

**Status**: Pending
