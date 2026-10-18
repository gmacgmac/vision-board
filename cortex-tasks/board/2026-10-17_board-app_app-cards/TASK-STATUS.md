---
task_name: App Cards and Card Images - Agent-Built Apps and Images Inside a Card
created: 2026-10-17
completed:
status: in-progress
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
| 1 | BE_01 | 1 | strong | [Contract: kind, ledger v17, manifest, operations, D-047](./BE_01_contract.md) | Completed | Ledger v17, OpenAPI 1.27.0, apps.md, D-047. Tools module is one file (BE_02 enforces, T_01 inlines the parser): see notes |
| 2 | BE_02 | 2 | strong | [App host: manifest, process supervisor, routes, panel CSP](./BE_02_app-host.md) | Pending | |
| 3 | FE_01 | 2 | strong | [Frame pattern: vb-app-frame and the message protocol](./FE_01_app-frame.md) | Pending | |
| 4 | T_01 | 2 | standard | [Example app: calculator panel and plugin](./T_01_example-calculator.md) | Pending | |
| 5 | FE_02 | 3 | strong | [Page wiring, gallery, end-to-end and safety page tests](./FE_02_page-wiring.md) | Pending | |
| 6 | BE_03 | 3 | standard | [Image route and contract, D-048](./BE_03_image-route.md) | Pending | Added 2026-10-18 |
| 7 | FE_03 | 4 | strong | [Images on the page: Markdown image, zoomed view, updates](./FE_03_card-images.md) | Pending | Added 2026-10-18 |
| 8 | T_02 | 5 | strong | [Skill v3.8: apps and images; scenarios with both agents](./T_02_skill-apps.md) | Pending | |
| 9 | VERIFY_01 | 6 | strong | [By hand, light and dark, and the goal check](./VERIFY_01_by-hand.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`
FIX_NN rows are added by the orchestrator after VERIFY_01 (PLAN.md § Orchestrator guide).

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/view.ts` `KINDS` with `app`; `ViewNode.app`; `ledger.ts` `NodeBody.app`, `LEDGER_FORMAT = 17`, acts `app-allow`/`app-revoke` | BE_01 | all |
| `packages/format/src/apps.ts` `APP_SIZE`, `APP_LIMITS`, `APP_ID`, `AppRef`; also `APP_STATES`, `APP_FILES`, `APPS_DIR`, `APP_HASH_PATTERN`, `APP_TOOL_NAME`, `appSize`, `AppInfo`, `AppToolInfo`, `AppToolResult`, `AppProblem`, and the panel protocol `APP_PROTOCOL_VERSION`, `PANEL_METHODS`, `HOST_NOTIFICATIONS`, `PANEL_ERRORS`, `APP_STYLE_VARIABLES` (BE_02 may add a back-off row to `APP_LIMITS`) | BE_01 | BE_02, FE_01, FE_02, T_02 |
| `packages/format/schema/app/manifest.schema.json` (+ `$defs/tool`, `$defs/toolName`) + `AppManifest` type; the hand twin `packages/format/src/app-shape.ts` | BE_01 | BE_02, T_01, T_02 |
| `docs/specification/apps.md` (folder, manifest, panel protocol, tools module, limits, states) | BE_01 | BE_02, FE_01, T_01, T_02 |
| OpenAPI `list_apps` (auth `agent-or-person`), `call_app_tool` + `api/list-apps-response`, `api/app-call-request`, `api/app-call-response` + problem codes (`needs-approval`, `app-not-found`, `app-invalid`, `app-failed`, `app-busy`, `app-timeout`; server `PROBLEMS`); generated client/MCP/CLI; stubs in `server/handlers.ts` `APPS` | BE_01 | BE_02 (handlers), FE_02 (page I/O) |
| Reference kind `app` (`packages/actions/src/references.ts`); `packages/actions/src/apps.ts` (`foldAppAct`, `appRules`, `appOf`, `namedApps`, `appCards`), `LedgerState.appAllowed`, `APP_ACTIONS`; `NODE_TYPES.app`; flag `appCards`; `--vb-kind-app` token; `KIND_ICON.app` | BE_01 | FE_01, FE_02 |
| `apps/board/server/apps.ts` (front door): `appState`, supervisor, handlers, panel route | BE_02 | FE_02 |
| `packages/ui/src/app-frame/` `vb-app-frame`, `app-frame-core.ts` (`createAppBridge`, protocol types) | FE_01 | FE_02 |
| `skills/vision-board/examples/apps/calculator/` | T_01 | FE_02 (fixture copy), T_02, VERIFY_01 |
| `apps/board/tests/fixtures/apps/` (good and misbehaving test apps) | BE_02 | FE_02 |
| `packages/format/src/images.ts` `IMAGE_LIMITS`, `imagePathProblem` (the one image path check); route `/board-images/` | BE_03 | FE_03, T_02 |
| `packages/ui/src/image-view/` (`fitImage`, the zoomed view) | FE_03 | T_02, VERIFY_01 |

---

## Goal check (the orchestrator fills this; PLAN.md § Goal state)

| Line | Met? | Evidence (command and result, test name, file) |
|---|---|---|
| 1 Tasks | | |
| 2 Gates | (interim) | Wave 1: check 0; test 1322+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 480 passed |
| 3 End to end | | |
| 4 Safety (a-j) | | |
| 5 Contract | | |
| 6 Card states | | |
| 7 Docs | | |
| 8 Example | | |
| 9 Skill | | |
| 10 By hand | | |
| 11 Images | | |
| 12 Committed | | |

## Decisions taken during the run

_(The orchestrator records each choice it made where a sub-agent's deviation touched a ruling.)_

1. **Wave 1, BE_01: the tools module is one file and imports only Node built-ins.** Accepted as inside
   rulings 2 and 7: the ruling-7 hash is "the manifest plus the tools file", so code in a second file
   would run without approval. One file keeps that hash complete. BE_02 enforces it in the runner;
   T_01 keeps the safe parser inside `tools.mjs`.

---

## Implementation Notes

### BE_01: Contract
_Status:_ Completed (2026-10-18)
_Notes:_ Ledger v17 (kind `app`, `node.app {id, w?, h?}`, acts `app-allow {app, hash}` / `app-revoke {app}`),
OpenAPI 1.27.0 (`list_apps` x-agent with auth `agent-or-person`, `call_app_tool` person; stubs in
`server/handlers.ts` `APPS`), manifest schema, `packages/format/src/apps.ts`, D-047, `apps.md`, api.md
150-153. Read BE_01_contract.md § Implementation Notes before starting. For wave 2:
- **BE_02**: the tools module is **one file** (Node built-ins only), so the ruling-7 hash (manifest +
  tools file) covers all code: enforce it in the runner and report it as a problem. `app-busy` (503)
  is the full-queue code; `too-large` the output cap. `namedApps` gives the `missing` apps. Keep
  `app-allow` free of an apps-folder check, or update `api-lock-person.test.ts`. Replace `APPS` in
  `handlers.ts`.
- **FE_01**: protocol constants `PANEL_METHODS`, `HOST_NOTIFICATIONS`, `PANEL_ERRORS`,
  `APP_STYLE_VARIABLES`, `APP_PROTOCOL_VERSION`; host context per apps.md § Host context.
- **T_01**: put the parser inside `tools.mjs` (no sibling `calculator-parser.mjs`; export it by name
  for its test).
Gates: check 0; npm test 1322 + 7 pass; verify 0 warnings; gen --check current; build 0; test:pages
478 passed, then the 2 versions banner screenshots (v257 → v331: the gallery's new drawing run) and
the 2 gallery screenshots (the App column) updated after viewing each diff, light and dark.

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

### BE_03: Image route
_Status:_ Pending
_Notes:_

### FE_03: Images on the page
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
