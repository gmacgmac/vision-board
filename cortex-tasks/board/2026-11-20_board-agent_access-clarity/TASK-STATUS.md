---
task_name: Access Clarity
created: 2026-11-20
completed:
status: planned
categories: [board-agent, board-app, board-ui]
tracker:
---

# Access Clarity - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-11-20

Follow `cortex-task-exe`: read PLAN.md first; touch only the files you own; no git commands that change state; add
notes to your task file and your row; append your own one-line LOG entry.

## Task List

| # | ID | Wave | Model | Own worktree | Persona | Task | Status | Notes |
|---|-----|------|-------|--------------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | yes | Principal API designer for agent tools — a read answers the caller's next question before it is asked and never disagrees with the write. | [Reads say what you may write](./T_01_reads-say-access.md) | Pending | |
| 2 | T_02 | 1 | strong | yes | Principal security engineer for local agent tooling — an identity is reused only where the person's own clicks already granted it, and never widens past them. | [One chat identity per folder](./T_02_chat-identity.md) | Pending | |
| 3 | T_04 | 1 | strong | yes | Staff front-end engineer for print and PDF pipelines — what draws on screen must draw the same in every engine's PDF, and a rule keeps it so. | [Print-safe container corners](./T_04_print-safe-corners.md) | Completed | Corners are a clip-path polygon, every square clockwise so short frames keep their sides; verify `checkPrintSafe` on sources and the built sheet; WebKit PDF proof in the task notes; backdrop-filter prints unblurred, outside the print view; rail-{light,dark} renewed (also stale since point 699) |
| 4 | T_03 | 2 | standard | yes | — | [Holders as one chip](./T_03_holders-chip.md) | Pending | |
| 5 | VERIFY_01 | 3 | standard | no | A product designer who uses the best collaborative canvases daily — expects to see at a glance who can edit and to never see an agent fumble access. | [Verify](./VERIFY_01_verify.md) | Pending | |

## Shared Foundations

| What | From | Used by |
|---|---|---|
| `clip-path` corner rule on `vb-region::before` (`packages/ui/src/region/region.css`) | T_04 | T_03 (its chip sits on the same title line) |
| `you` / `joined` read marks (`apps/board/server/engine/caller-marks.ts`) | T_01 | VERIFY_01 |

## File Ownership (wave 1)

| Owner | Files |
|---|---|
| T_01 | `apps/board/server/engine/{caller-marks,reads,writes}.ts`, `packages/format/schema/**` and what `npm run gen` writes, `apps/board/server/words/plugin-tools.ts`, `packages/mcp/src/words/info.ts`, `skills/vision-board/**`, `tests/evals/bot/scenarios/**`, `apps/board/tests/{bot-tool-rules,openapi,plugin-skill,api-schemas}.test.ts`, `docs/specification/{api,api-reference}.md` |
| T_02 | `apps/board/server/chat-*.ts`, `apps/board/server/agents.ts`, their tests, `docs/specification/chat.md` |
| T_04 | `packages/ui/src/region/region.css`, `packages/ui/src/region/pattern.json`, `tests/pages/container-rules.spec.ts`, `scripts/verify*.mjs`, `docs/specification/plugin.md`, screenshots its change renews |
| orchestrator | `docs/decisions.md`, this file's frontmatter and close |

## Implementation Notes
