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
- **Resume point (2026-10-04)**: N7 and U3 step 2 done (board runs on the project ledger,
  `45cd36a`). Design locked: mockups `01b-cards-content-first.html` + `05-final-spec.html` and
  the picks in `prototypes/board-v3-design/README.md`. **Next: Stage 2a** `<vb-node>` and
  `<vb-region>` (task files in `board/`), with U4 step 1 alongside → 2b Architect's look → 2c
  Markdown → U4 steps 2-4 → 2d, 2e → Stages 3-8. Server: `npm run dev` (example board) or
  `npm run board` (project ledger). Task files are written one stage at a time from the latest PLAN.
- Models: Opus 5.5 for new patterns and judgment-heavy structural work; Sonnet 5.5
  (`claude-sonnet-5.5`) for well-specified tasks, including configuration and cross-file work
  that follows a defined pattern. Every task: orchestrator reads `git diff`, runs the gate
  itself, browser-checks UI, then commits.

| Stage | Status | Commit | Notes |
|---|---|---|---|
| 1 Plan and decisions | Done | 9b9daaa | D-010, D-011; framework interview D-012 to D-015; foundation D-016 |
| 2 Card and container basics | In progress | 3ee805b | Step 1 and 2a done (2026-10-04); 2b next |
| 3 Selection and moving | Planned | | Port from architect-extract |
| 4 Send | Planned | | Uses U4 |
| 5 Proposals, seen, parking | Planned | | U3 step 3 |
| 6 Chat panel (MCP), then kiro-cli | Planned | | |
| 7 Decision flow, incremental layout | Planned | | U3 step 4 |
| 8 Verification | Planned | | |

## Stage 2a tasks (written 2026-10-04)

Pattern: `docs/specification/components.md`. Research briefs (git-ignored):
`temp/research/stage-2a-brief.md`. Run one at a time, in this order. After each, the
orchestrator reads the diff, runs `npm test`, `npm run check` and `npm run verify`, browser-checks
UI work, then commits that task alone.

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [2a_BE_01 node-type registry](./2a_BE_01_node-type-registry.md) | Sonnet 5.5 | Done | see log |
| 2 | [2a_FE_01 `<vb-node>`](./2a_FE_01_vb-node.md) | Opus 5.5 | Done | see log |
| 3 | [2a_FE_02 `<vb-region>`](./2a_FE_02_vb-region.md) | Sonnet 5.5 | Done | see log |
| 4 | [2a_FE_03 page tests and gallery](./2a_FE_03_page-tests.md) | Sonnet 5.5 | Done | see log |
| 5 | Stage check: orchestrator clicks through `npm run dev` in dark and light | Orchestrator | Done | page tests + gallery read by eye |

## Stage 2b tasks (written 2026-10-04)

Palette done first by the orchestrator with the maintainer's yes (`1d7d560`; originals in
`prototypes/board-v3-design/README.md` § Palette). Gates are now four: add `npm run test:pages`.

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [2b_FE_01 card recipe](./2b_FE_01_card-recipe.md) (also fixes N8) | Opus 5.5 | Running | |
| 2 | [2b_FE_02 open frames](./2b_FE_02_open-frames.md) | Sonnet 5.5 | Planned | |
| 3 | Stage check: orchestrator compares gallery and board with 01b and 05; maintainer's look | Orchestrator | Planned | |
