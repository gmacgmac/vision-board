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
- **Resume point (2026-10-04)**: N7 and U3 step 2 are done, so step 1 can start alongside board
  v3 Stage 2a. Spec additions since planning: three read calls, named-container writes and write
  grants (proposed) in `docs/specification/api.md` § Operations and `docs/vision.md`.

| Step | Status | Commit | Notes |
|---|---|---|---|
| 1 Schemas, spec, ajv | Planned | | |
| 2 HTTP routes from the spec | Planned | | Needs U3 step 2 |
| 3 vb commands | Planned | | |
| 4 MCP server | Planned | | |
| 5 API docs and agent skill | Planned | | |
