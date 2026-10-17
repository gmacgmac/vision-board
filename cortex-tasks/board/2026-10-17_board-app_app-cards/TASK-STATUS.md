---
task_name: App Cards - Agent-Built Apps Inside a Card
created: 2026-10-17
completed:
status: planned
categories: [board-app, board-format, board-ui, board-security, board-agent]
tracker:
---

# App Cards - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Branch**: `feat/app-cards` · **Go**: given in full (maintainer away;
> rulings binding) · **Run**: `cortex-task-exe` under `/goal`; the done-condition is PLAN.md § Goal state.

---

## Goal for `/goal` (paste as the goal; the checker reads § Goal check below)

> Execute `cortex-tasks/board/2026-10-17_board-app_app-cards/TASK-STATUS.md` with the
> `cortex-task-exe` skill on branch `feat/app-cards`, following PLAN.md § Orchestrator guide, until
> every line of PLAN.md § Goal state is met and ticked with evidence in TASK-STATUS.md § Goal check,
> the frontmatter says `status: completed`, and the branch has no uncommitted change from this run.

---

## Instructions for Agents

1. **Read PLAN.md first**: Rulings, Goal state, Orchestrator guide.
2. **Read notes from completed tasks** before starting yours.
3. **Respect the Wave column.** Same wave = parallel; disjoint files.
4. **Reuse Shared Foundations**: import, never re-create.
5. **Deviation**: inside the rulings, do it and say why in your notes; a change to a ruling, don't:
   report DEVIATION with the option closest to the rulings, and the orchestrator decides (PLAN.md §
   Orchestrator guide). The maintainer is away; nobody waits for an answer.
6. **Frontmatter `status`**: `planned` → `in-progress` → `completed` (the orchestrator).
7. **Update your row** and your section below when you finish.
8. **No git commits** by sub-agents (the orchestrator commits each wave on the branch).
9. Never touch `.visionboard/` of this repo (except FE_02 as its task says); don't use the board on
   port 4466; scratch in the system temp folder; stop every process you start; one page-test run at a
   time; any write over 50 lines is created in chunks (workspace Long File Strategy).
10. **Edit this file surgically.** Change only your own row and your own section with an exact string
    replacement; never read-modify-write the whole file (tasks in one wave run at the same time).

---

## Task List

| # | ID | Wave | Model | Task | Status | Notes |
|---|-----|------|-------|------|--------|-------|
| 1 | BE_01 | 1 | strong | [Contract: kind, ledger v17, manifest, operations, D-047](./BE_01_contract.md) | Pending | |
| 2 | BE_02 | 2 | strong | [App host: manifest, process supervisor, routes, panel CSP](./BE_02_app-host.md) | Pending | |
| 3 | FE_01 | 2 | strong | [Frame pattern: vb-app-frame and the message protocol](./FE_01_app-frame.md) | Pending | |
| 4 | T_01 | 2 | standard | [Example app: calculator panel and plugin](./T_01_example-calculator.md) | Pending | |
| 5 | FE_02 | 3 | strong | [Page wiring, gallery, end-to-end and safety page tests](./FE_02_page-wiring.md) | Pending | |
| 6 | T_02 | 4 | strong | [Skill v3.8: building apps; scenarios with both agents](./T_02_skill-apps.md) | Pending | |
| 7 | VERIFY_01 | 5 | strong | [By hand, light and dark, and the goal check](./VERIFY_01_by-hand.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`
FIX_NN rows are added by the orchestrator after VERIFY_01 (PLAN.md § Orchestrator guide).

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/view.ts` `KINDS` with `app`; `ViewNode.app`; `ledger.ts` `NodeBody.app`, `LEDGER_FORMAT = 17`, acts `app-allow`/`app-revoke` | BE_01 | all |
| `packages/format/src/apps.ts` `APP_SIZE`, `APP_LIMITS`, `APP_ID`, `AppRef` | BE_01 | BE_02, FE_01, FE_02, T_02 |
| `packages/format/schema/app/manifest.schema.json` + `AppManifest` type | BE_01 | BE_02, T_01, T_02 |
| `docs/specification/apps.md` (folder, manifest, panel protocol, tools module, limits, states) | BE_01 | BE_02, FE_01, T_01, T_02 |
| OpenAPI `list_apps`, `call_app_tool` + schemas + problem codes; generated client/MCP/CLI | BE_01 | BE_02 (handlers), FE_02 (page I/O) |
| Reference kind `app` (`packages/actions/src/references.ts`); `NODE_TYPES.app`; flag `appCards`; `--vb-kind-app` token; `KIND_ICON.app` | BE_01 | FE_01, FE_02 |
| `apps/board/server/apps.ts` (front door): `appState`, supervisor, handlers, panel route | BE_02 | FE_02 |
| `packages/ui/src/app-frame/` `vb-app-frame`, `app-frame-core.ts` (`createAppBridge`, protocol types) | FE_01 | FE_02 |
| `skills/vision-board/examples/apps/calculator/` | T_01 | FE_02 (fixture copy), T_02, VERIFY_01 |
| `apps/board/tests/fixtures/apps/` (good and misbehaving test apps) | BE_02 | FE_02 |

---

## Goal check (the orchestrator fills this; PLAN.md § Goal state)

| Line | Met? | Evidence (command and result, test name, file) |
|---|---|---|
| 1 Tasks | | |
| 2 Gates | | |
| 3 End to end | | |
| 4 Safety (a-j) | | |
| 5 Contract | | |
| 6 Card states | | |
| 7 Docs | | |
| 8 Example | | |
| 9 Skill | | |
| 10 By hand | | |
| 11 Committed | | |

## Decisions taken during the run

_(The orchestrator records each choice it made where a sub-agent's deviation touched a ruling.)_

---

## Implementation Notes

### BE_01: Contract
_Status:_ Pending
_Notes:_

### BE_02: App host
_Status:_ Pending
_Notes:_

### FE_01: Frame pattern
_Status:_ Pending
_Notes:_

### T_01: Example app
_Status:_ Pending
_Notes:_

### FE_02: Page wiring
_Status:_ Pending
_Notes:_

### T_02: Skill v3.8
_Status:_ Pending
_Notes:_

### VERIFY_01: By hand
_Status:_ Pending
_Notes:_

---

## On Completion

1. Every § Goal check line ticked with evidence; frontmatter `status: completed`, `completed: <date>`.
2. Append the set's LOG line (one line, newline-terminated):
   `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: App cards → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/TASK-STATUS.md]]`
3. Commit on `feat/app-cards`. Nothing writes to `AUDITED.md`.
