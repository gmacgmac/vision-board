---
task_name: Insert, Markdown and Update Signals
created: 2026-11-05
status: in-progress
categories: [board-actions, board-ui, board-tokens, board-app, board-agent]
skills: [cortex-architecture, cortex-docs]
---

# Insert, Markdown and Update Signals - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-11-05 · **Checkpoint**: tag `insert-md/start`

## Instructions for Agents

1. Read PLAN.md (Decisions, House Rules), `docs/principles.md`, and the `cortex-architecture` skill
2. Work in the worktree your brief names; check `git branch --show-current` first
3. Touch only the files you own (File Ownership); a need elsewhere goes under `REQUESTS`
4. Your row here and one LOG line: in the main checkout. No git commits. Never port 4466
5. Tests by tier (`cortex-task-exe`), `nice -n 15`, `VB_TEST_WORKERS=3`, your `VB_TEST_PORT`, a time limit on every run

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | ACT_01 | 1 | strong | API designer for agents — one item does one thing a person would name, all or nothing, and a refusal says exactly what to fix. | [Insert a card into a flow](./ACT_01_insert-into-flow.md) | Pending | |
| 2 | MD_01 | 1 | strong | Typesetter for small screens — a heading tells you where you are, a table reads at a glance, and nothing scrolls sideways. | [Heading sizes, tables, breaks](./MD_01_markdown-more.md) | Pending | |
| 3 | FE_01 | 1 | strong | Visual designer for monitoring screens — what changed is the brightest thing on the board until you've looked, then it steps back. | [Updated in amber; the agent's reply edge](./FE_01_update-signals.md) | Pending | |
| 4 | FE_02 | 1 | strong | Interaction designer — a two-state setting is one control that shows its state and flips on a press. | [Read-only as one toggle](./FE_02_read-only-toggle.md) | Pending | |
| 5 | BOT_01 | 2 | strong | Prompt engineer who treats instructions as code — every line earns its place by a scenario. | [Bot instructions and check_responses](./BOT_01_skill-and-reads.md) | Pending | |
| 6 | VERIFY_01 | 2 | strong | A product manager using the board daily on a dark screen, with no builder context — scans a busy board for what changed. | [Review the set](./VERIFY_01_review.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Ports

| Task | `VB_TEST_PORT` | Task | `VB_TEST_PORT` |
|---|---|---|---|
| ACT_01 | 7100 | BOT_01 | 7500 (eval's door: 6010) |
| MD_01 | 7200 | VERIFY_01 | 7600 |
| FE_01 | 7300 | orchestrator | 7900 |
| FE_02 | 7400 | | |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Flags `insertBetween`, `markdownMore`, `updateSignals`, `readOnlyToggle` (on) | orchestrator, SETUP | ACT_01, MD_01, FE_01, FE_02 |
| `insert` on the node item, its result and refusals | ACT_01 | BOT_01 |
| Heading sizes, tables (≤ 4 columns), breaks | MD_01 | BOT_01 |
| `--vb-state-updated` | FE_01 | VERIFY_01 (reports the value) |
| Write result (`key`, `n`, `title`), `list_open` | earlier sets | BOT_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`, `package.json`, the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`, `.git/**` |
| 1 | ACT_01 | `packages/format/schema/events/node.schema.json`, `packages/format/schema/api/write-*.schema.json`, `packages/format/schema/openapi.json`, every output of `npm run gen` (`*.generated.*`, `packages/mcp/src/tools.generated.json`, `packages/cli/src/commands.generated.ts`, `docs/specification/api-reference.md`), `apps/board/server/write-*.ts`, `apps/board/server/examples.ts`, the server's words file for write refusals, `packages/actions/src/**`, `docs/specification/api.md`, unit tests of these, a new page spec of its own if one is needed |
| 1 | MD_01 | `packages/ui/src/markdown/**`, `packages/ui/src/words/markdown.ts`, `packages/ui/tests/markdown*`, `packages/layout/src/size.ts` and its tests, `apps/board/src/gallery/markdown-section.ts`, a new `tests/pages/markdown-more.spec.ts`, `docs/specification/components.md` |
| 1 | FE_01 | `packages/tokens/src/tokens.css` (the one token), `packages/tokens/README.md`, `packages/ui/src/node/**`, `packages/ui/src/region/region-fresh.*`, `packages/ui/src/note-bubble/**`, `packages/ui/src/words/{node-notes,node-updates,note-bubble}.ts` and the region-fresh words, `apps/board/src/board/{cards,canvas}/**`, gallery `{fresh,updates,note-bubble,group-notes,node}-section.ts`, `tests/pages/{fresh-cards,card-updates,notes,note-polish,group-note}.spec.ts` and a new spec of its own |
| 1 | FE_02 | `apps/board/src/shell/{EditChip.svelte,editing.ts}`, `apps/board/src/shell/words/editing.ts`, `apps/board/src/board/chrome/**`, `apps/board/src/board/host.ts`, gallery `{editing,read-only-controls,header,toolbar}-section.ts`, `tests/pages/{read-only,read-only-writes,read-only-controls,header-tiers}.spec.ts` and a new spec of its own |
| 1 | each | the screenshots of the specs it owns, under `tests/pages/__screenshots__/` |
| 2 | BOT_01 | `skills/vision-board/**`, `apps/board/plugin/words/skill-edits.ts`, `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/**`, `packages/format/schema/openapi.json` (descriptions) and every output of `npm run gen` |
| 2 | VERIFY_01 | `docs/specification/**` except `modules.md` and `api-reference.md` (doc requests), any screenshot under `tests/pages/__screenshots__/` the merged wave changed and no wave-1 task re-took; findings only for code |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

_Each task's notes are in its own file._
