---
category: board-format
type: task-status
status: in-progress
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
- **Resume point (2026-10-02)**: step 1 done; step 2 task files written (table below). Ledger
  format 2 is defined and validated in `packages/format` (`ledger.ts`, `ledger-shape.ts`,
  `ledger-index.ts`, fixture `login-review.ledger.jsonl`). Every node gets a number; `item: true`
  marks those that ask for a response. Task files are written one step at a time from the latest PLAN.
- **Who builds step 2 (revised 2026-10-02)**: sequential sub-agents via `cortex-task-exe`, one per
  task, at the model in the table, at the maintainer's request. The orchestrator does NOT trust
  return blocks (maintainer rule, overrides the skill): after each task it reads the `git diff`,
  runs `npm test`, `npm run check` and `npm run verify` itself and reads each exit code, then
  commits that task alone. A red gate or a BLOCKED/DEVIATION stops the run.
- **Retired code is archived, not deleted** (maintainer, point 255): format-1 view files, the
  transcript code and the old sessions move to `prototypes/archive/view-format-v1/` as reference.
- **Checkpoint**: git tag `checkpoint/u3-step2-start` marks the tree before step 2.
- **Known gap until U4**: step 2 removes view files, and the agent `write` call arrives with U4, so
  in between, boards come only from fixture ledgers (`npm run demo`).

| Step | Status | Commit | Notes |
|---|---|---|---|
| 0 Design and decisions | Done | | D-017 to D-021 accepted |
| 1 Format v2 | Done | | Event types, shape and context checks, 9 tests |
| 2 Ledger module and migration | Planned | | Tasks below |
| 3 Board UI: proposals, seen, park, branch | Planned | | After `<vb-node>` (board v3) |
| 4 Incremental layout, decision flow | Planned | | |

## Step 2 tasks

| # | ID | Wave | Task | Model | Status | Commit |
|---|---|---|---|---|---|---|
| 1 | BE_01 | 1 | [Fold the ledger into board state](./BE_01_fold-and-projection.md) | Opus 5.5 | COMPLETED | |
| 2 | BE_02 | 2 | [The project ledger in the I/O layer](./BE_02_ledger-store.md) | Opus 5.5 | COMPLETED | |
| 3 | BE_04 | 2 | [Test boards become ledger files](./BE_04_fixture-ledgers.md) | Opus 5.5 | Pending | |
| 4 | BE_03 | 3 | [Serve boards from the ledger](./BE_03_server-routes.md) | Opus 5.5 | Pending | |
| 5 | FE_01 | 4 | [The page reads and writes through the ledger](./FE_01_page-on-ledger.md) | Opus 5.5 | Pending | |
| 6 | VERIFY_01 | 5 | [Prove step 2 end to end](./VERIFY_01_ledger-step.md) | Sonnet 5 | Pending | |

Same wave = no shared files, so the tasks could run side by side; the orchestrator runs them in
table order.

## Shared foundations (step 2)

| Artifact | Created by | Consumed by |
|---|---|---|
| `packages/format/src/ledger-index.ts` (`readLedger`) | BE_01 | BE_02 |
| `packages/actions/src/fold.ts` (`foldLedger`, `boardView`, `boardState`) | BE_01 | BE_02, BE_03, BE_04, FE_01 |
| `packages/actions/src/act.ts` (`validateAct`) | BE_01 | BE_02, BE_04 |
| `apps/board/server/ledger.ts` (`openLedger`, `append`, `state`, `onAppend`) | BE_02 | BE_03 |
| `packages/format/fixtures/roadmap.ledger.jsonl` | BE_04 | BE_03 (`demo` seed), VERIFY_01 |
| `/api/boards` routes | BE_03 | FE_01 |

API, `vb` and MCP: see `../2026-10-02_board-api-pattern/TASK-STATUS.md` (U4).
