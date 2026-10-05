---
category: board-agent
type: task-status
status: planned
tracker: cortex-tasks/tracker.md#U4
created: 2026-10-02
---

# Board API pattern: status

## Execution record (read this first if resuming)

- Plan: `PLAN.md` here; pattern spec `docs/specification/api.md`. Branch `board-v3`.
- Node 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`). Gate: `npm test`, `npm run verify`,
  `npm run check`, exit 0 each, read by the orchestrator itself after every task.
- Task files are written one step at a time from the latest PLAN (maintainer, 2026-10-02).
- Models: Opus 5.5 for the spec, routes and MCP design; Sonnet 5.5 (`claude-sonnet-5.5`) for
  well-specified tasks that follow a defined pattern (generated tables, doc regeneration,
  fixtures, configuration).
- **Resume point (2026-10-05, overnight run)**: the contract is designed and reviewed
  (`docs/specification/api.md` 1-57, commit `5dbb2bf`; D-027 to D-029). Build runs one task at a
  time in this order; each task file is written just before it starts, from the contract.

| Step | Task | Model | Status | Commit | Notes |
|---|---|---|---|---|---|
| 1 | [1_BE_01 ledger v3 schemas + ajv](./1_BE_01_ledger-v3-schemas.md) | Opus 5.5 | Done | see log | 172 unit, 26 page; ajv 8.20.0 MIT; `key` on `join` to be removed in 2_BE_05 |
| 1 | 1_BE_02 actions: registry, validateAct, fold (holders, keys, sizes, send, pending) | Opus 5.5 | Planned | | |
| 1 | 1_BE_03 openapi.json 3.2, API body schemas, route table generator, spec-validity tests | Sonnet 5.5 | Planned | | |
| 2 | 2_BE_04 packages/client, route dispatch, RFC 9457 errors, reads, page io switch | Opus 5.5 | Planned | | |
| 2 | 2_BE_05 identity, person cookie, grants, write_board, new acts | Opus 5.5 | Planned | | |
| 2 | 2_FE_01 board page: grant requests, Send button | Opus 5.5 | Planned | | |
| 3 | 3_BE_06 vb commands (packages/cli) | Sonnet 5.5 | Planned | | |
| 4 | 4_BE_07 MCP server (packages/mcp) | Opus 5.5 | Planned | | |
| 5 | 5_DOC_01 generated API reference | Sonnet 5.5 | Planned | | |
| - | VERIFY_01 end-to-end: two agents, grants, Send loop | Orchestrator | Planned | | |
