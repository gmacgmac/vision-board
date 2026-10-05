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
| 2 Card and container basics | In progress | 3ee805b | 2a-2e done (2026-10-05); 2f and N12 next |
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
| 1 | [2b_FE_01 card recipe](./2b_FE_01_card-recipe.md) (card half of N8) | Opus 5.5 | Done | see log |
| 2 | [2b_FE_02 open frames](./2b_FE_02_open-frames.md) | Sonnet 5.5 | Done | see log |
| 3 | Stage check: orchestrator compares gallery and board with 01b and 05; maintainer's look | Orchestrator | Done: maintainer's look 2026-10-04 ("looks great") | a706fcb |

From the maintainer's look: tracker U5 (dragging selects text), U6 (zoom controls, box zoom,
Shift-lasso) and U7 (card width adapts to content; no token change until designed with him).

## Stage 2c tasks (written 2026-10-04)

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [2c_FE_01 Markdown renderer](./2c_FE_01_markdown.md) | Opus 5.5 | Done | see log |
| 2 | Stage check: orchestrator reads the diff, runs the four gates, checks gallery and board in dark and light | Orchestrator | Done 2026-10-04 (149 unit, 26 page; link-scheme probe) | see log |

Open from 2c (maintainer): dark link inside a quote or note scores Lc 44.0 (tier 45); the fix is
the protected token `--vb-accent-text` dark `#ff5cbe` -> `#ff66c2` (Lc 46.1+), which also lifts the
note "who" line (44.9, item 492).

## Stage 2d tasks (written 2026-10-05)

Facts: `temp/research/stage-2d-2e-3-brief.md` (git-ignored). The two tasks touch disjoint
packages and run in parallel: FE_01 in the main checkout, BE_01 in worktree branch `2d-layout`.

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1a | [2d_FE_01 icon row, popover, cog](./2d_FE_01_icon-row.md) (region half of N8) | Opus 5.5 | Done | e12780a |
| 1b | [2d_BE_01 no overlaps](./2d_BE_01_no-overlaps.md) | Opus 5.5 | Done | 70fb930 (merge e11950a) |
| 2 | Stage check: orchestrator merges, runs the four gates, compares with 05 in dark and light | Orchestrator | Done 2026-10-05 (434 unit, 58 page; board read by eye) | e11950a |

Open from 2d: a link line can cross a container's icon row (wires draw over the top line); at 434px a long title plus count can clip the count; one access test keeps `KNOWN_AXE` when 3-4 holders pile up on a 336px frame. The row hides at the board's opening fit zoom (far), as the card buttons do.

## Stage 2e tasks (written 2026-10-05)

Rulings from the maintainer (chat 717-719, 736): one unsent note per card, editable and
removable until sent; sent notes are history; removing a sent note from history is open (740);
zoomed-out hiding is a switch, off (N13).

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [2e_FE_01 note bubbles](./2e_FE_01_note-bubbles.md) | Opus 5.5 | Done | see log |
| 2 | Stage check: orchestrator runs the gates, checks bubble placement and keyboard in dark and light | Orchestrator | Done 2026-10-05 (466 unit, 66 page; bubble read by eye) | see log |

Open from 2e: the new-note hint wraps "cancel" at 300px; clicking empty board keeps the bubble open, and opening another card's bubble drops unsaved text; APCA not measured for the sent pin, Remove and error text; `markdown-safety` 50 ms timing test flakes under full-suite load (passes alone), to fix with N12's budget tests.

## N12 tasks (written 2026-10-05, before Stage 3)

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [N12_FE_01 incremental board](./N12_FE_01_incremental-board.md) | Opus 5.5 | Done | see log |
| 2 | Check: orchestrator runs the gates and the counting tests, tries a full rebuild to see them fail | Orchestrator | Done 2026-10-05 (480 unit + 4 timing, 74 page; no baseline changed) | see log |

## Stage 3 tasks (written 2026-10-05)

Reference behaviour: Uplynk Architect (`architect-extract/`), with the maintainer's changes
(chat 665, 667, 673-679): Shift+drag lasso, kind tab moves, drag in a card selects text,
background drag pans, the selection bar offers Comment or Zoom to selection, zoom buttons in the
header. Run in order; each changes code the next builds on.

| Order | Task | Model | Status | Commit |
|---|---|---|---|---|
| 1 | [3_FE_01 select and drag](./3_FE_01_select-and-drag.md) (U5) | Opus 5.5 | Done | see log |
| 2 | [3_FE_02 lasso, selection bar, group notes, zoom](./3_FE_02_lasso-and-zoom.md) (U6) | Opus 5.5 | Running | |
| 3 | 3_FE_03 move cards between containers, group move, the Later container, container notes | Opus 5.5 | Planned | |
| 4 | Stage check: orchestrator, then the maintainer's look | Orchestrator | Planned | |
