---
task_name: Read-only Follow-ups
created: 2026-11-03
completed:
status: in-progress
categories: [board-ui, board-tokens, board-agent, project-tooling]
skills: [cortex-architecture, cortex-docs]
tracker: cortex-tasks/tracker.md#N44, #N45, #M51, #M52, #M53, #M54
---

# Read-only Follow-ups - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-11-03 · **Checkpoint**: tag `ledgers/done`

## Instructions for Agents

1. Read PLAN.md (Decisions, House Rules), `docs/principles.md`, and the `cortex-architecture` skill
2. Work in the worktree your brief names; check `git branch --show-current` first
3. Touch only the files you own (File Ownership); a need elsewhere goes under `REQUESTS`
4. Your row here and one LOG line: in the main checkout. No git commits. Never port 4466
5. Tests by tier (`cortex-task-exe`), `nice -n 15`, `VB_TEST_WORKERS=3`, your `VB_TEST_PORT`, a time limit on every run

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | FE_01 | 1 | standard | Interaction designer — a control that can't act looks it, and says why, before anyone presses it. | [Write controls while read-only](./FE_01_read-only-controls.md) | Pending | |
| 2 | FE_02 | 1 | strong | Front-end engineer who owns page state — what the server says decides what the page shows, and one person's settings never leak into another place. | [Ledger chip and page memory per ledger](./FE_02_ledger-chip-and-memory.md) | Pending | |
| 3 | T_02 | 1 | standard | Test engineer — a check fails only for a real difference, never for how a pixel was rounded. | [Whole-pixel host-styles shots](./T_02_whole-pixel-shots.md) | Pending | |
| 4 | BOT_01 | 1 | strong | Evaluation engineer for agents — an instruction counts as working when a scored run shows it, not when one hand check did. | [Standalone bot eval](./BOT_01_standalone-eval.md) | Pending | |
| 5 | T_01 | 2 | standard | Accessibility engineer — reading text reads, in every theme, on every surface it sits on. | [Subtle ink to the reading tier](./T_01_subtle-ink-contrast.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Ports

| Task | `VB_TEST_PORT` | Task | `VB_TEST_PORT` |
|---|---|---|---|
| FE_01 | 6100 | BOT_01 | 6400 (eval's door: 6010) |
| FE_02 | 6200 | T_01 | 6500 |
| T_02 | 6300 | orchestrator | 7300 |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Read-only state and words: `BoardState.readOnly`, `blockedReason` (`shell/chat-rules.ts`), `READ_ONLY_PERSON` (`packages/actions/src/read-only.ts`), `#ui` paused (`packages/ui/src/paused/paused.ts`) | earlier set | FE_01 |
| Ledger page parts (`board/host.ts` `ledgerChip` / `ledgerField` / `ledgerRow`), `header-tier.ts` `ledger`, `get_project` `ledger` / `ledgers` | earlier set | FE_02 |
| Eval harness: `Stage` (incl. `readOnly`), checks, report (`tests/evals/bot/`) | earlier sets | BOT_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`, `package.json`, the lockfile, `packages/format/src/flags.ts`, `.git/**` |
| 1 | FE_01 | `apps/board/src/board/chrome/{AccessRequests,BoardAgents}.svelte`, `apps/board/src/board/access/**`, `apps/board/src/board/words/chrome-access.ts`, card toolbar files F10 names in `apps/board/src/board/**` (not `chrome/` header files below), `packages/ui/**`, `apps/board/src/gallery/**` except `ledger-section.ts`, new `tests/pages/read-only-controls.spec.ts` and the access/agents/app specs it must update |
| 1 | FE_02 | `apps/board/src/shell/**`, `apps/board/src/board/host.ts`, `apps/board/src/board/chrome/{Toolbar,ToolbarEnd,ToolbarMenu,HeaderFields}.svelte`, `chrome/header-tier.ts`, `apps/board/src/gallery/ledger-section.ts`, `tests/pages/{ledgers,header-tiers,last-board}.spec.ts` and a new spec of its own, `tests/pages/{board-page,folder-server}.ts`, `docs/specification/{components,words}.md` |
| 1 | T_02 | `tests/pages/host-styles.spec.ts` |
| 1 | BOT_01 | `tests/evals/bot/**`, `skills/vision-board/scenarios.md`, `skills/vision-board/NOTES.md` |
| 2 | T_01 | `packages/tokens/src/tokens.css` (after the maintainer's yes), `packages/tokens/README.md`, `packages/ui/src/base/dialog.css`, `tests/pages/__screenshots__/**` it must re-take, `docs/specification/components.md` (FE_01's doc requests) |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### Wave gates (orchestrator)
- Setup: `feat/ro-follow-ups` cut from `main` (after `ledgers/done` and the 403-406 commit). T_01 Run 1 (measure only, writes nothing but its notes) runs beside wave 1, so the maintainer's yes on the token value comes early; its Run 2 (the write) stays wave 2.
- Wave 1:
- Wave 2 and close:

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`; tracker rows N44, N45, M51, M52, M53, M54 deleted.
2. Set LOG entry: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Read-only Follow-ups → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/TASK-STATUS.md]]`
3. Merge `feat/ro-follow-ups` into `main`, tag `ro-follow-ups/done`.
