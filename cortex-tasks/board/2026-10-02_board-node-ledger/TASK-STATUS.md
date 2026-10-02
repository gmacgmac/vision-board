---
category: board-format
type: task-status
status: planned
tracker: cortex-tasks/tracker.md#U3
created: 2026-10-02
---

# Node ledger and board API: status

## Execution record (read this first if resuming)

- Plan: `PLAN.md` in this folder. The design was agreed in chat on 2026-10-02; the drafted
  decisions D-017 to D-021 still need the maintainer's yes before they go in the register.
- Node: 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`). Gate: `npm test`, `npm run verify`,
  `npm run check`, exit 0 each, read yourself.
- This set runs before board v3's `<vb-node>` step, because `<vb-node>` draws the states and
  actions D-018 defines.
- **Resume point (2026-10-02)**: PLAN written. Next: maintainer approves D-017 to D-021, then
  build step 1 (format version 2), with an explicit go.

| Step | Status | Commit | Notes |
|---|---|---|---|
| 0 Design and decisions | In review | | PLAN written; D-017 to D-021 drafted |
| 1 Format v2 | Planned | | |
| 2 Ledger module | Planned | | |
| 3 HTTP API and `vb` | Planned | | Replaces board v3 Stage 4 `vb wait` |
| 4 MCP wrapper | Planned | | |
| 5 Board UI | Planned | | After `<vb-node>` |
| 6 Incremental layout, decision flow | Planned | | |
