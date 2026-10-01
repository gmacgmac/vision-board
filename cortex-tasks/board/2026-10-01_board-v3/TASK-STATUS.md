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
- **Resume point (2026-10-01)**: foundation (tracker U2) is done. Next is **Stage 2, step 1**:
  install the D-014 dependencies (exact pins, add `docs/specification/dependencies.md`), then move
  the canvas from `apps/board/public/` to Svelte + Vite in `apps/board/src/` with
  `compilerOptions.runes = true`, keeping every current behaviour, before any new feature.
  Get the maintainer's go first (tracker rule 9).

| Stage | Status | Commit | Notes |
|---|---|---|---|
| 1 Plan and decisions | Done | 9b9daaa | D-010, D-011; framework interview D-012 to D-015; foundation D-016 |
| 2 Card and container basics | Planned | | |
| 3 Selection and moving | Planned | | |
| 4 Send and vb wait | Planned | | |
| 5 kiro-cli spike | Planned | | |
| 6 Chat panel | Planned | | |
| 7 Verification | Planned | | |
