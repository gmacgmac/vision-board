---
category: board-format
type: task-status
status: planned
tracker: cortex-tasks/tracker.md#U3
created: 2026-10-02
---

# Node ledger and board API: status

## Execution record (read this first if resuming)

- Plan: `PLAN.md` in this folder. The design was agreed in chat on 2026-10-02; D-017 to D-021
  were accepted the same day.
- Node: 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`). Gate: `npm test`, `npm run verify`,
  `npm run check`, exit 0 each, read yourself.
- This set runs before board v3's `<vb-node>` step, because `<vb-node>` draws the states and
  actions D-018 defines.
- **Resume point (2026-10-02)**: step 1 done. Ledger format 2 is defined and validated in
  `packages/format` (`ledger.ts`, `ledger-shape.ts`, `ledger-index.ts`, fixture
  `login-review.ledger.jsonl`). Every node gets a number; `item: true` marks those that ask for a
  response. Nothing reads the ledger yet. Next: step 2, the ledger module, after N7. Task files are written one step at a time from the latest PLAN.

| Step | Status | Commit | Notes |
|---|---|---|---|
| 0 Design and decisions | Done | | D-017 to D-021 accepted |
| 1 Format v2 | Done | | Event types, shape and context checks, 9 tests |
| 2 Ledger module and migration | Planned | | Next |
| 3 Board UI: proposals, seen, park, branch | Planned | | After `<vb-node>` (board v3) |
| 4 Incremental layout, decision flow | Planned | | |

API, `vb` and MCP: see `../2026-10-02_board-api-pattern/TASK-STATUS.md` (U4).
