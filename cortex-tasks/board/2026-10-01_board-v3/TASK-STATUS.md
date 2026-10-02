---
category: board-app
type: task-status
status: in-progress
tracker: cortex-tasks/tracker.md#U1
created: 2026-10-01
---

# Board v3: status

## Execution record (read this first if resuming)

- Plan: `PLAN.md` in this folder. After a compaction, read `HANDOVER-compaction.md` first. Stages run in order, and each one is committed when it ends.
- Node: use 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`). `/usr/local/bin/node` is 22.14 and
  can't run `.ts`.
- Server: `node apps/board/server.ts` on http://localhost:4466. The review session is `first-look`.
- Gate: `npm test` and `npm run verify` (exit 0 both). Read the exit code yourself. In
  `temp/smoke.ts`, the "bad Host" check gives a false failure (Node's `fetch` can't set `Host`;
  `curl` gets the correct 403).
- Decisions in force: D-005 and D-009 to D-016. Svelte rules: `.kiro/steering/svelte-conventions.md`.
  Module map: `docs/specification/modules.md` (`npm run map`).
- **Resume point (2026-10-02)**: re-planned (PLAN § Stages). Branch `board-v3`. Design locked:
  D-024 and mockup `prototypes/board-v3-design/mockups/01b-cards-content-first.html`; Markdown
  D-023. Order across sets: N7 type check → U3 step 2 ledger module → Stage 2a `<vb-node>` with
  U4 step 1 (schemas and spec) alongside → 2b Architect's look → 2c Markdown → U4 steps 2-4 →
  2d, 2e → Stages 3-8. Task files are written one stage at a time from the latest PLAN.
- Models: Opus 5.5 for components, layout, visual work and anything cross-file; Sonnet 5 only for
  mechanical work that follows an existing pattern. Every task: orchestrator reads `git diff`,
  runs the gate itself, browser-checks UI, then commits.

| Stage | Status | Commit | Notes |
|---|---|---|---|
| 1 Plan and decisions | Done | 9b9daaa | D-010, D-011; framework interview D-012 to D-015; foundation D-016 |
| 2 Card and container basics | In progress | 3ee805b | Step 1 done; 2a-2e next |
| 3 Selection and moving | Planned | | Port from architect-extract |
| 4 Send | Planned | | Uses U4 |
| 5 Proposals, seen, parking | Planned | | U3 step 3 |
| 6 Chat panel (MCP), then kiro-cli | Planned | | |
| 7 Decision flow, incremental layout | Planned | | U3 step 4 |
| 8 Verification | Planned | | |
