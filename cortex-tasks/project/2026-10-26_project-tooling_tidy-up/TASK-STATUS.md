---
task_name: Tidy-Up To The Target Architecture
created: 2026-10-26
completed:
status: in-progress
categories: [project-tooling]
tracker:
---

# Tidy-Up To The Target Architecture - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-26 · **Worktree**: `.claude/worktrees/tidy` (branch `refactor/tidy`)

---

## Instructions for Agents

1. **Read PLAN.md first** (House Rules are binding), then `docs/principles.md` and the review it cites
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — if it is listed, import it, do not reinvent it
5. **Touch only the files you own** (File Ownership below, or your task's *Files to modify*). Need
   a change elsewhere? List it under `REQUESTS` in your return block — the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when you start. Closing the set is the orchestrator's job, after the full gates
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:`
   line here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commits** — the orchestrator commits and tags once per wave (PLAN House Rules)
11. **Your page-test port** is in the Task List's Notes column; never 4466

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | FIX_01 | 1 | standard | — | [Green baseline](./FIX_01_green-baseline.md) | Completed | port 4700 |
| 1b | FIX_02 | 1 | standard | — | [A proposal on a retired card ends](./FIX_02_proposal-on-retired-card.md) | Completed | port 4705 |
| 2 | ARCH_01 | 2 | strong | Build and tooling engineer — a module has one front door, and a back door that the checks can't see is a back door that will be used. | [One front door per module](./ARCH_01_module-front-doors.md) | Pending | port 4710 |
| 3 | ARCH_02 | 3 | strong | API contract engineer — one schema, everything else generated or tested against it; a hand-written copy of a type is a future bug. | [One source per contract](./ARCH_02_single-source-contracts.md) | Pending | port 4720 |
| 4 | UI_01 | 3 | strong | Design-systems engineer — a menu, a dialog or a focus ring is built once, with every state and keyboard path, and every screen gets it by reuse. | [Shared UI base](./UI_01_shared-ui-base.md) | Pending | port 4730 |
| 5 | ARCH_04 | 3 | standard | — | [Ledger answers and geometry in packages](./ARCH_04_ledger-queries-and-geometry.md) | Pending | port 4740 |
| 6 | ARCH_03 | 4 | strong | Front-end architect for embeddable components — a component that imports its host's state can't be hosted anywhere else. | [The board is hostable](./ARCH_03_board-host-interface.md) | Pending | port 4750 |
| 6b | ENGINE_01 | 4 | strong | Back-end engineer who builds engines other programs embed — an engine that opens its own socket or finds its own folder can only ever run alone. | [The board's engine part](./ENGINE_01_board-engine-part.md) | Pending | port 4755 |
| 7 | TEST_01 | 5 | strong | Test infrastructure engineer — a test that passes only in a certain order is not a test; shared fixtures have one home. | [Test support and parallel page tests](./TEST_01_test-support-and-parallel.md) | Pending | port 4760 (+ worker ports) |
| 8 | ARCH_05 | 6 | standard | — | [Words files](./ARCH_05_words-files.md) | Pending | port 4770 |
| 9 | ARCH_06 | 7 | standard | — | [Feature folders and short functions](./ARCH_06_feature-folders-and-functions.md) | Pending | port 4780 |
| 10 | VERIFY_01 | 8 | strong | Staff engineer joining the nclite team, reviewing this code to host it as a plugin, with no history of how it got here — wants every rule in `docs/principles.md` true of the code, not of the docs. | [Verification](./VERIFY_01_tidy-verification.md) | Pending | port 4790 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: same number = run in parallel; waves run in ascending order.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Module names (root `package.json` `imports`: `#format`, `#ui`, …) and their CSS/asset front doors | ARCH_01 | every later task |
| `verify` back-door checks (`scripts/verify.mjs`) | ARCH_01 | every later task (keep green) |
| Typed client: `call` typed by `OperationId` (`packages/client`) | ARCH_02 | ARCH_03, ARCH_06 |
| One card-reference table (beside `packages/actions` `REFERENCES`) | ARCH_02 | ARCH_03, ARCH_06 |
| `packages/ui/src/base/` (menu, layer, dialog) and its CSS (button, surface, menu, a11y) | UI_01 | ARCH_03, ARCH_06 |
| Ledger queries and one board-data builder in `packages/actions` | ARCH_04 | ARCH_03, ARCH_06 |
| One geometry home (`Box`, overlap, bounds, clamp) | ARCH_04 | ARCH_06 |
| `Chip` type and `resolveChip`; `roundOf` as the turn query (`packages/actions`) | ARCH_04 | ARCH_03, ENGINE_01 |
| Tool table from the one OpenAPI source (`gen-api.mjs`) | ARCH_02 | ENGINE_01 |
| Board host interface and `mount(root, host)` | ARCH_03 | TEST_01, ARCH_06, VERIFY_01 |
| Board engine `createEngine({ dir, ... })` (`apps/board/server/engine/`) | ENGINE_01 | TEST_01, ARCH_06, VERIFY_01 |
| Test support module and fixtures in their packages | TEST_01 | ARCH_05, ARCH_06, VERIFY_01 |
| Words homes and their test | ARCH_05 | ARCH_06 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | FIX_01 | the four failing specs and their baselines, `packages/ui/src/region/{region,region-narrow}.css`, `packages/ui/src/node/*.css` (target size only), `temp/` |
| 1 | FIX_02 | `packages/actions/src/{retire,proposals,conditions}.ts`, `apps/board/src/board/{proposal-flow,proposals}.ts`, their tests, a proposals page spec, `docs/specification/api.md` |
| 3 | ARCH_02 | `packages/client/**`, `scripts/gen-api.mjs`, `scripts/gen-mcp.mjs`, `scripts/openapi-refs.mjs`, `packages/format/schema/api/problem.schema.json`, `packages/format/src/constants*` (new), `apps/board/server/{problem,spec,dispatch,edge,write-refs,schema,writes,write-board}.ts`, `packages/actions/src/numbers.ts`, `apps/board/src/board/{io,card-numbers}.ts`, the generated files `npm run gen` writes, their tests |
| 3 | UI_01 | `packages/ui/src/base/**` (new), `packages/ui/src/tip/hover-tip.ts`, `packages/ui/src/region/{region-row,region-note}.ts`, every `*.css` under `packages/ui/src/` and `apps/board/src/styles/`, `apps/board/src/shell/{ConfirmDialog,BoardDialog,FolderDialog,ArchivedDialog,ToolbarMenu,MenuSelect}.svelte`, `apps/board/src/board/{move-menu,menu-keys,app-cards,selection-pill,note-outside}.ts`, `scripts/verify.mjs`, their tests |
| 3 | ARCH_04 | `packages/actions/src/**` except `numbers.ts`, `packages/actions/tests/**`, `packages/format/src/geometry.ts` (new), `packages/layout/src/{geometry,types}.ts`, `packages/ui/src/note-bubble/note-bubble-core.ts`, `packages/ui/src/selection-bar/selection-bar-core.ts`, `apps/board/src/board/{updates,retired,proposals,go-to-card,board-data,remove-words}.ts`, `apps/board/server/reads.ts`, their tests in `apps/board/tests/` |
| 4 | ARCH_03 | `apps/board/src/**`, `scripts/verify.mjs`, `scripts/verify.test.mjs`, `docs/specification/components.md`, their tests |
| 4 | ENGINE_01 | `apps/board/server/**`, `apps/board/server.ts`, `packages/mcp/src/**` (where it reaches the board), `docs/specification/api.md`, their tests |
| — | orchestrator | `package-lock.json`, `docs/decisions.md`, `packages/tokens/src/tokens.css` (new tokens), `.kiro/steering/`, `CLAUDE.md`, `AGENTS.md`, `docs/specification/modules.md` (`npm run map`, after each wave) |

Waves 2 and 5-8 have one task each: it owns what its task file lists.

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| FIX_01-R1 | FIX_01 | The selection bar and its pill cover a container's Move grip when the selection is in the first row (a real overlap, not only a test one) | orchestrator, now (maintainer, point 283): `placeBar` takes boxes to avoid; the board passes each container title line | Done |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### FIX_01: Green baseline
_Status:_ Completed  
_Notes:_ Grip is a 24px target (region.css); every-node clears the selection before axe; size.spec `maxDiffPixels: 20`; board.spec screenshot on its own roadmap server (`tests/pages/roadmap-server.ts`), no baseline refreshed; review-colours reads distinct colours once (outside the named specs). send-access failure did not reproduce (5 full runs green): see the task file. Full suite green twice (657 passed). Selection bar covering a container's grip is open for UI_01 / the maintainer. Deviation (send-access left alone, review-colours fixed outside the named specs) accepted by the maintainer (point 284).

---

### FIX_02: A proposal on a retired card ends
_Status:_ Completed  
_Notes:_ The fold already closed proposals on a retire (retire.ts `foldRetire`, tested); the bug as described did not reproduce. Fixed the page side: `answerable` rows only, `proposalAct` undefined for an accept with no `ver`, `refresh` after a refused answer. `endsWhen` words and api.md updated. Unit, verify, check and the two proposals page specs green on 4705; no screenshot changed.

---

### ARCH_01: One front door per module
_Status:_ Pending  
_Notes:_ 

---

### ARCH_02: One source per contract
_Status:_ Pending  
_Notes:_ 

---

### UI_01: Shared UI base
_Status:_ Pending  
_Notes:_ 

---

### ARCH_04: Ledger answers and geometry in packages
_Status:_ Pending  
_Notes:_ 

---

### ARCH_03: The board is hostable
_Status:_ Pending  
_Notes:_ 

---

### ENGINE_01: The board's engine part
_Status:_ Pending  
_Notes:_ 

---

### TEST_01: Test support and parallel page tests
_Status:_ Pending  
_Notes:_ 

---

### ARCH_05: Words files
_Status:_ Pending  
_Notes:_ 

---

### ARCH_06: Feature folders and short functions
_Status:_ Pending  
_Notes:_ 

---

### VERIFY_01: Verification
_Status:_ Pending  
_Notes:_ 

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] LOG entry created (see below)

---

## On Completion

When ALL tasks are done and the full gates pass, the orchestrator:

1. Sets frontmatter `status: completed` and `completed: YYYY-MM-DD`
2. Appends the set LOG entry, one line ending in a newline:
   ```
   [[YYYY-MM-DD HH:MM]] [project-tooling] Completed set: Tidy-Up To The Target Architecture → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/TASK-STATUS.md]]
   ```
3. Updates `docs/principles.md` § "Where we are" (with the maintainer's yes): the gaps closed, any left as tracker rows.
4. Reminds the maintainer that search is next: tracker M7 (search the board in plain words), planned from there.
