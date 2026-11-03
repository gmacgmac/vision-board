---
task_name: Bot Quality Follow-ups
created: 2026-11-03
status: in-progress
categories: [board-agent]
tracker: cortex-tasks/tracker.md#M48
---

# Bot Quality Follow-ups - Task Status

> **Plan**: [PLAN.md](./PLAN.md)

## Instructions for Agents

1. Read PLAN.md first, and D-083 in `docs/decisions.md`.
2. Touch only the files you own (File Ownership); anything else goes in `REQUESTS`.
3. If you need to deviate, STOP and report DEVIATION.
4. Update your row and add notes to your task file. No commits.

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|----|------|-------|---------|------|--------|-------|
| 1 | ANSWER_01 | 1 | standard | API designer for agent tools — a read carries the fact and its address, never a copy of what the address already holds. | [ANSWER_01_answered-no-words.md](./ANSWER_01_answered-no-words.md) | completed | 22/22 eval checks, 4 runs, $0.33 |
| 2 | SEAM_01 | 1 | standard | — | [SEAM_01_flags-out-of-seam.md](./SEAM_01_flags-out-of-seam.md) | completed | New hash fde5eb97...; orchestrator sets `SEAM_TYPES` |
| 3 | WT_01 | 1 | standard | — | [WT_01_worktree-script.md](./WT_01_worktree-script.md) | planned | |

## File Ownership

| Owner | Files |
|---|---|
| ANSWER_01 | `packages/actions/src/note-answer.ts` and its tests, `apps/board/server/engine/caller-marks.ts`, `packages/format/schema/**` (noteAnswer), `openapi.json`, generated API files, `docs/specification/api.md`, `skills/vision-board/SKILL.md`, `apps/board/plugin/words/*`, `apps/board/tests/bot-tool-rules.test.ts` |
| SEAM_01 | `apps/board/bin/plugin-types.ts`, `apps/board/tests/plugin-types.test.ts`, `docs/specification/plugin.md`, flag types where they cross the seam |
| WT_01 | `scripts/worktree.mjs` (new) and its test, `package.json` (the one `worktree` script line) |
| orchestrator | `apps/board/plugin/seam.ts` (`SEAM_TYPES`), `cortex/LOG.md`, `docs/decisions.md`, commits |

## Implementation Notes

(each task's notes are in its own file)
