---
category: board-agent
type: task-status
status: review
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
- **Resume point (2026-10-05 03:10)**: every step is built and verified; the set awaits the
  maintainer's review. Open follow-ups: a real Kiro/Claude Code session over `vb-mcp`; the agent
  skill (rule 17); `unseenItems` covers items only (D-018 says nodes); `controller.ts` at 401
  lines (split before Stage 3).

| Step | Task | Model | Status | Commit | Notes |
|---|---|---|---|---|---|
| 1 | [1_BE_01 ledger v3 schemas + ajv](./1_BE_01_ledger-v3-schemas.md) | Opus 5.5 | Done | see log | 172 unit, 26 page; ajv 8.20.0 MIT; `key` on `join` to be removed in 2_BE_05 |
| 1 | [1_BE_02 actions v3](./1_BE_02_actions-v3.md) | Opus 5.5 | Done | 5bdd688 | 214 unit; follow-ups for 2_BE_05: format context must refuse revoking a creator (fix `ledger-context.test.ts` case) and a repeat open grant request; `validateAct` gets `board` from the path |
| 1 | [1_BE_03 openapi.json 3.2](./1_BE_03_openapi.md) | Sonnet 5.5 | Done | ac3d62e (merge) | 13 operations, 20 API schemas; 241 unit, 26 page after merge |
| 2 | [2_BE_04 client, dispatcher, problems, reads](./2_BE_04_routes-reads.md) | Opus 5.5 | Done | 5a1d7ab | 275 unit, 26 page |
| 2 | [2_BE_05 identity, cookie, grants, write_board](./2_BE_05_identity-writes.md) | Opus 5.5 | Done | 7c3eb5f | 332 unit, 37 page |
| 2 | [2_FE_01 Send, access requests, holders](./2_FE_01_grants-send.md) | Opus 5.5 | Done | c066efc | 381 unit, 54 page; behind `agentAccess` (on) |
| 3 | [3_BE_06 vb commands](./3_BE_06_vb-cli.md) | Sonnet 5.5 | Done | 1a6267a (merge) | smoke-tested by the orchestrator |
| 4 | [4_BE_07 MCP server](./4_BE_07_mcp.md) | Opus 5.5 | Done | c988fd0 (merge) | 423 unit after merge; tools regenerated |
| 5 | [5_DOC_01 generated API reference](./5_DOC_01_api-reference.md) | Sonnet 5.5 | Done | 5fe8075 | 430 unit, 54 page |
| - | [VERIFY_01 end-to-end](./VERIFY_01_end-to-end.md) | Orchestrator | Done 2026-10-05 | 5fe8075 | 16/16 checks over real vb-mcp |
