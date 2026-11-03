---
task_name: Bot Quality
created: 2026-11-03
completed:
status: in-progress
categories: [board-agent]
tracker: cortex-tasks/tracker.md#M48
---

# Bot Quality - Task Status

> **Plan**: [PLAN.md](./PLAN.md)
> **Created**: 2026-11-03

## Instructions for Agents

1. Read PLAN.md first, then the notes of completed tasks.
2. Respect the Wave column. Touch only the files you own (File Ownership); anything else goes in `REQUESTS`.
3. If you need to deviate, STOP and report DEVIATION.
4. Update your row and add notes to your task file. No commits.

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|----|------|-------|---------|------|--------|-------|
| 1 | EVAL_01 | 1 | strong | Evaluation engineer for LLM agents — a score is only worth having if it is computed the same way every time, from what the agent did, never from what it said it did; and an eval that can run away is not an eval. | [EVAL_01_bot-eval.md](./EVAL_01_bot-eval.md) | completed | `npm run eval:bot`, 8 scenarios, 40 checks; baseline 35/40, 8 runs, $0.55; stream-json conversation, not `--resume` (deviation 1) |
| 2 | TOOLS_01 | 1 | strong | API designer for agent tools — a rule an agent must not break is a missing field or a refusal, never a sentence it might skip; a read gives the agent the fact it needs, so it never has to guess. | [TOOLS_01_tools-enforce.md](./TOOLS_01_tools-enforce.md) | completed | `botToolRules`: no `wait` for a host's bot (refused), instructions per host, `owed`/`held` marks, helpful key conflicts; openapi 1.39.0; SEAM 1 (for review); D-083 draft |
| 3 | KEY_01 | 1 | standard | Accessibility engineer — a keyboard user acts on the card the focus is on; anything else is a trap they can't see. | [KEY_01_note-key-target.md](./KEY_01_note-key-target.md) | completed | Cause: a focus steal after the ✓/✗ write, not the selection; `focusLeads` flag; seam hash reset by the orchestrator (SEAM 1) |
| 4 | SKILL_01 | 2 | strong | Prompt engineer who treats instructions as code — every line earns its place by a scenario it fixes, and a change that helps one case and breaks another is reverted. | [SKILL_01_skill-wording.md](./SKILL_01_skill-wording.md) | planned | |

## Shared Foundations

| What | Where | Made by | Used by |
|---|---|---|---|
| The flag for host-bot tool rules | `packages/format/src/flags.ts` (name chosen by TOOLS_01) | TOOLS_01 | EVAL_01 (reads it in the report), SKILL_01 |
| The eval harness and scenarios | `tests/evals/bot/` (`npm run eval:bot`) | EVAL_01 | SKILL_01, the orchestrator's final run |
| The live run's throwaway harness (reuse, don't restart) | `temp/plugin-live/` in the `tidy` worktree (absolute path below) | earlier task | EVAL_01 |

Absolute path of the earlier harness:
`/Users/gm/Library/CloudStorage/Dropbox-Personal/Developer/web-apps/vision-board/.claude/worktrees/tidy/temp/plugin-live/`

## File Ownership (wave 1)

| Owner | Files |
|---|---|
| EVAL_01 | `tests/evals/**` (new), the `eval:bot` line in root `package.json`, `.gitignore` lines for eval output |
| TOOLS_01 | `packages/format/schema/openapi.json`, `packages/format/src/flags.ts`, `scripts/gen-*.mjs`, generated tool files, `packages/mcp/**`, `apps/board/server/**` (tools, engine, words), `apps/board/plugin/**` except `plugin/words/skill-edits.ts`, `docs/specification/api.md`, `api-reference.md`, `plugin.md` |
| KEY_01 | `apps/board/src/board/**` key handling for notes, its tests and page specs |
| orchestrator | `cortex/LOG.md`, `cortex-tasks/tracker.md`, `docs/decisions.md` (drafts only, appended in the morning with a yes), `PROPOSAL.md` |

Wave 2: SKILL_01 owns `skills/vision-board/SKILL.md`, `apps/board/plugin/words/skill-edits.ts`, and may edit
`tests/evals/bot/scenarios/**` only to add a scenario (never to loosen a check).

## Ports

EVAL_01 6010–6019 · TOOLS_01 tests 6110 (plugin), 6210 (pages) · KEY_01 6310 (plugin), 6410 (pages) ·
SKILL_01 evals 6510–6519. Never 4466.

## Implementation Notes

### Integration Notes

### Security Concerns

### Deviations from Plan
