---
task_name: Every node is part of the conversation
created: 2026-10-10
status: planned
categories: [board-actions, board-format, board-ui, board-agent]
tracker: cortex-tasks/tracker.md#U13
---

# Every node is part of the conversation - Task Status

> **Plan**: [PLAN.md](./PLAN.md) (rulings 1-8 are the maintainer's; do not reopen).

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [Contract: the kind decides, numbers on every node](./BE_01_contract.md) | Opus 5.5 | Planned | |
| 2 | BE_02 | 2 | [Action layer and server](./BE_02_actions-server.md) | Opus 5.5 | Planned | |
| 3 | FE_01 | 3 | [The page: every card numbered and answerable](./FE_01_page.md) | Opus 5.5 | Planned | |
| 4 | T_01 | 4 | [The skill](./T_01_skill.md) | Opus 5.5 | Planned | |
| 5 | VERIFY_01 | 5 | [By hand with real agents](./VERIFY_01_by-hand.md) | Orchestrator | Planned | |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run gen -- --check`, `npm run test:pages`. No git commits or stash by sub-agents. Each task
appends its own LOG line (real time from `date`), fills its Implementation Notes and its row.
Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/` or
real home-folder files. Page tests share ports: one page-testing agent at a time.

## Shared Foundations

| What | Path + symbol | Owner | Consumers |
|---|---|---|---|
| Kinds that need an answer, action lists | `packages/format/src/node-types.ts` (`NODE_TYPES[kind].answer`, `ANSWER_ACTIONS`, `NOTE_ACTIONS`) | BE_01 | all |
| Ledger v11 node event (no `item`) | `packages/format/schema/events/node.schema.json` | BE_01 | BE_02, T_01 |
| View `n` on every node | `packages/format/src/board-view.ts` | BE_01 | FE_01 |
| Decided statuses | `packages/actions/src/registry.ts` `DECIDED` | BE_01 | BE_02, FE_01 |
| Response order | `packages/actions/src/pending.ts` `responsesAfter` | BE_02 | T_01 |

## Implementation Notes

### BE_01
### BE_02
### FE_01
### T_01
### VERIFY_01
