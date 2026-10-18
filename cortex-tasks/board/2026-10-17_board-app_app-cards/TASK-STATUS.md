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
| 2 | BE_02 | 2 | strong | [App host: manifest, process supervisor, routes, panel CSP](./BE_02_app-host.md) | Completed | Host in `server/apps/`; `tools` known only after Allow and a first run; `VB_FLAGS`; `APP_LIMITS` + `restartMs`, `fileBytes`: see notes |
| 3 | FE_01 | 2 | strong | [Frame pattern: vb-app-frame and the message protocol](./FE_01_app-frame.md) | Completed | vb-app-frame + createAppBridge, app card states (node-app.ts), gallery entry (deviation); 44 gallery screenshots re-baselined after viewing (sub-pixel shift): see notes |
| 4 | T_01 | 2 | standard | [Example app: calculator panel and plugin](./T_01_example-calculator.md) | Completed | Calculator in `skills/vision-board/examples/apps/calculator/` (3 files); tests beside it, root `test` glob + `skills/**/*.test.mjs` |
| 5 | FE_02 | 3 | strong | [Page wiring, gallery, end-to-end and safety page tests](./FE_02_page-wiring.md) | Completed | Wired (`app-cards.ts`, `app-state.ts`); page tests prove lines 3, 4a, 4b, 4j, 6; this repo's board drew "App cards"; `APP_PANEL_PATH`; frame focus ring fixed: see notes |
| 6 | BE_03 | 3 | standard | [Image route and contract, D-048](./BE_03_image-route.md) | Completed | `IMAGE_LIMITS`, `IMAGE_WORDS`, `imagePathProblem` in format; `/board-images/` in `server/images.ts`; images.md, api.md 154-155, D-048; depth = 8 folders: see notes |
| 7 | FE_03 | 4 | strong | [Images on the page: Markdown image, zoomed view, updates](./FE_03_card-images.md) | Completed | `![alt](path)` image or box (`image.ts`), flag `cardImages` via `setMarkdownImages`, `image-view/` pattern, `card-images.ts` (near-only loads, HEAD version + `?v=`, select/open check, swap, re-measure); page weight 149.7 KB: see notes |
| 8 | T_02 | 5 | strong | [Skill v3.8: apps and images; scenarios with both agents](./T_02_skill-apps.md) | Completed | v3.8 (SKILL.md 406 lines, no skill-local apps.md: see notes); scenarios 28-31 pass with Claude Code and Kiro (Opus 5.5); new app built from the skill alone in 29, all four runs |
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
| `apps/board/server/apps.ts` (front door): `appState`, `createAppHost`, `APP_HANDLERS`, `servePanel`/`panelCsp`/`PANEL_CSP`; `createBoardServer({ flags, appLimits })`, `VB_FLAGS`; harness `startBoard({ flags, appLimits })`, `tests/app-support.ts` | BE_02 | FE_02 |
| `packages/ui/src/app-frame/` `vb-app-frame` (`wire`, `load`, `unload`, `lookChanged`; `readLook`, `PANEL_PATH`), `app-frame-core.ts` (`createAppBridge`, `panelSize`, `hostContext`, `hostStyles`, `PROBLEM_WORDS`, `FRAME_CALLS`, `AppCallError`, protocol types), `app-frame.css`; node pattern `node-app.ts` (`appView`, `APP_CARD_STATES`, `APPS_OFF`), `node-app.css`, `CardConditions.app`, `NodeState.app`, `NodeTemplateOptions.appCards`, `[data-app-act]` buttons | FE_01 | FE_02 |
| `skills/vision-board/examples/apps/calculator/` | T_01 | FE_02 (fixture copy), T_02, VERIFY_01 |
| `apps/board/tests/fixtures/apps/` (good and misbehaving test apps) | BE_02 | FE_02 |
| `packages/format/src/images.ts` `IMAGE_LIMITS`, `imagePathProblem` (the one image path check); route `/board-images/` | BE_03 | FE_03, T_02 |
| `packages/ui/src/image-view/` (`fitImage`, the zoomed view) | FE_03 | T_02, VERIFY_01 |

---

## Goal check (the orchestrator fills this; PLAN.md § Goal state)

| Line | Met? | Evidence (command and result, test name, file) |
|---|---|---|
| 1 Tasks | | |
| 2 Gates | (interim) | Wave 1: check 0; test 1322+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 480 passed. Wave 2: check 0; test 1417+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 480 passed. Wave 3: check 0; test 1451+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 505 passed. Wave 4: check 0; test 1474+7 pass; verify 0 warnings (page 149.7/150 KB); gen --check 0; build 0; test:pages 528 passed. Wave 5: check 0; test 1474+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 528 passed |
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
2. **Wave 2, BE_02: `list_apps` shows tool names only after Allow and a first run.** Ruling 12 asks
   for tool names; the board can only learn them by loading the module, and ruling 7 says nothing runs
   before Allow. Ruling 7 wins: `tools: []` until then. FE_02 and T_02 must not expect names earlier.
3. **Wave 2, BE_02: the `appCards` flag also has a server side** (`VB_FLAGS=-appCards`), so ruling 13's
   "the panel route and `call_app_tool` answer `not-found`" can hold; the page flag stays per viewer.
4. **Known limits outside the rulings (proposed tracker rows, not fixed in this set):** (a) ajv checks an
   allowed app's input-schema `pattern` in the board's own process, so a slow pattern could stall the
   board; (b) the one-file rule stops imports but not a tool reading a file in its folder and running it
   with `node:vm`; (c) if the board is killed with SIGKILL while a tool loops, that app process is left
   running.
5. **Wave 3, BE_03: images get a flag.** The rulings give images no flag; steering rule 12 says new
   behaviour ships behind one. Closest to both: FE_03 adds page flag `cardImages` in `flags.ts`, **on** by
   default; off, `![alt](path)` renders as plain text as before. The route needs no flag (it serves only
   files the project put in its images folder).

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
_Status:_ Completed (2026-10-18)
_Notes:_ The host is `apps/board/server/apps/` behind `server/apps.ts`: manifest, hash, env, the one
state function, runner (a resolve hook refuses every import but Node's built-ins), child (`fork` with
`--permission`, read-only to the app folder and runner, capped heap, declared env only), tool checks,
supervisor, host, panel route, handlers. Read BE_02_app-host.md § Implementation Notes. For wave 3:
- **FE_02**: `list_apps` `tools` is `[]` until the person allowed this version and a tool first ran
  (nothing runs before Allow); don't show tool names before that. `VB_FLAGS=-appCards` starts a
  server with app cards off (panel route and `call_app_tool` answer `not-found`). Test apps for page
  tests: `apps/board/tests/fixtures/apps/` (copy with `tests/app-support.ts` `addApp`). The panel
  route is `GET /app-panels/<id>`; 404 for missing, invalid or off. `call_app_tool` problems are as
  apps.md § Errors; `needs-approval` detail says to press Allow (and "changed" after a code change).
- `APP_LIMITS` gained `restartMs` and `fileBytes` (apps.md § Limits).
Safety tests: `api-apps.test.ts` 4c-4i and the one-file rule; `app-folder.test.ts` 4h (names,
links); `app-panel.test.ts` (exact CSP, domains, sandbox, 404s, `frame-src 'self'`, flag);
`app-host.test.ts` (busy, idle, folder switch, close by pid, Stop app, memory, given-up call).
Gates: check 0; npm test 1417 + 7 pass; verify 0 warnings; gen --check current (build and pages not
run in this wave, per the orchestrator).

### FE_01: Frame pattern
_Status:_ Completed (2026-10-18)
_Notes:_ `<vb-app-frame>` (sandbox `allow-scripts` only, `/app-panels/<id>`, title, no referrer;
hidden until the panel is ready) and the DOM-free protocol `createAppBridge` (every apps.md rule
unit-tested with fake windows); the app card's states in the node pattern (`node-app.ts`
`appView`, ruling 10), reviewed with design-critique, accessibility-review and ux-copy, light and
dark. Read FE_01_app-frame.md § Implementation Notes ("For FE_02") before wiring. In short:
- **FE_02**: import `node-app.css` and `app-frame.css` in the board page; pass
  `CardConditions.app` (`{}` → `{ info }` → `{ past: true }`; nothing and `{ appCards: false }`
  with the flag off); per card `vb-app-frame` → `wire({ callTool })` (rejects `{ problem,
  detail? }`), `load()` only while `st.app.frame` and on screen at or above `FAR_K`, `unload()`
  off it, `lookChanged()` on a theme change (the look defaults to `readLook`, Esc to the card);
  act on `[data-app-act]` = `app-allow` (with list_apps' `hash`) / `app-revoke` / `retry`.
- **Deviations (inside the rulings)**: a gallery entry `apps/board/src/gallery/app-frame-section.ts`
  (+ `main.ts` imports and `SAMPLES` row; a new pattern needs one, `gallery.spec.ts` fails without);
  the gallery fixture's four `app` samples got `w: 280, h: 160` (at 360 the matrix widened the page
  past 1600); `PANEL_PATH` is a local constant beside BE_02's route string (one source in
  `packages/format/src/apps.ts` would be better: not added, BE_02 edits it this wave).
- **Screenshots**: 44 gallery shots re-baselined after viewing every diff light and dark: the new
  section (it sorts first) and the node section's App column moved the sections under them by a
  sub-pixel; content unchanged. The gallery section rounds its own height to a whole pixel.
Gates: check 0; test 1417 + 7 pass; verify 0 warnings; build 0; test:pages 480 passed.

### T_01: Example app
_Status:_ Completed (2026-10-18)
_Notes:_ `skills/vision-board/examples/apps/calculator/`: `app.json`, `panel.html` (303 lines), `tools.mjs` (170; the safe
parser is inside it and exported as `calculate`; imports nothing). Tests: `skills/vision-board/examples/apps/calculator.test.mjs`
(19 tests, outside the folder so the folder holds only an app's own files); root `test` glob gained
`"skills/**/*.test.mjs"`. Full notes in T_01_example-calculator.md § Implementation Notes. For you:
- **Gates**: `npm test` 1401 tests, 1384 pass, the 17 failures are all BE_02's unfinished `app-folder`/`app-host`/`app-panel`
  tests. `npm run verify`: one failure, `docs/specification/modules.md` out of date from the siblings' new folders (run
  `npm run map` after the wave). I ran no build and no page tests.
- **Checked end to end** in a sandboxed frame under a scratch fake host with apps.md's exact CSP and the real tools:
  15 of 15 steps, no console or CSP problem; contrast 4.9:1 or better and axe clean, light and dark; `design:accessibility-review`
  and `design:ux-copy` applied (findings fixed, listed in the task file).
- **FE_01/FE_02**: the panel expects `ui/notifications/host-context-changed` `params` = the partial host context
  (`{ theme, styles: { variables } }`) and sets those variables and `color-scheme` on its page; it takes messages only from
  `window.parent`; Esc sends `ui/notifications/escape` only when its History list is closed.
- **apps.md** § Kept true by could list `calculator.test.mjs` (not edited; not my file). The test imports
  `compileSchema` from `apps/board/server/schema.ts`, so a half-edited `schema.ts` can fail it for a moment.
- Error and panel wording is plain words (maintainer's standing instruction), not the task file's "Division by zero"
  and "Unexpected ')' at 4".

### FE_02: Page wiring
_Status:_ Completed (2026-10-18)
_Notes:_ Page: `apps/board/src/board/app-cards.ts` (frames loaded only on the visible stage at or above
FAR_K and removed a screen away or zoomed out, wired to `io.ts` `callAppTool` and Esc → card; theme
→ `lookChanged`; Allow / Stop app confirmed and sent through the sender; Check again / Restart),
`app-state.ts` (the one copy of list_apps: on load, app lines, after acts, on retry, and after a
refused call that says the state moved, so an edited `tools.mjs` shows "Code changed"),
`app-words.ts`, `io.ts` `listApps`/`callAppTool`. One route constant: `packages/format/src/apps.ts`
`APP_PANEL_PATH` (server `panel.ts` and `vb-app-frame.ts`). Gallery: `app-section.ts` (live
calculator, appCards flag); the node matrices' app cards no longer say "Loading…" forever. Read
FE_02_page-wiring.md § Implementation Notes. For the next waves:
- **Proof by name**: line 3 `app-cards.spec.ts` "end to end (light|dark) › end to end: an agent draws
  the calculator, the person allows it, 12*3 comes back as 36 from its tool (light|dark)"; 4a, 4b, 4j
  `app-safety.spec.ts` "the panel is isolated › 4a: …", "… › 4b: …", "4j: a message to the board from
  any window but the card's own frame is ignored"; line 6 `app-states.spec.ts` (every state, loading,
  far zoom, off screen, past version, light and dark, axe), `app-cards.spec.ts` (code change, Stop app,
  flag off, keyboard), `app-gallery.spec.ts`.
- **This repo's board**: lock was free; `.visionboard/apps/calculator/` copied byte for byte (a unit
  test keeps it equal); agent "app-cards build" drew a board of its own, "App cards" (`app-cards`),
  container "Apps": the calculator (360×440) and a note "Try the calculator" (ledger seq 192-197).
- **FE_01's element fixed** (accessibility review): Chromium never matches `:focus-within` on a
  cross-origin frame, so `vb-app-frame` sets `data-focus-in` from the window's blur and focus.
- **Page-test helpers**: `test.use({ expected: { problems: [...] } })` names refusals a test causes on
  purpose; axe runs with `iframes: false` (a panel is checked by passing its Frame). Servers:
  `tests/pages/app-server.ts` (ports 4473, 4474). Test-only app `apps/board/tests/fixtures/apps/probe/`.
- **FE_03 / T_02**: `docs/specification/components.md` § App card 8 says how the page wires apps;
  key list row "Leave an app · Esc". Known limits (page on, server off; Match widths; panel-to-panel
  focus by pointer) are proposed tracker rows in the task file.
Gates: check 0; test 1451 + 7 pass; verify 0 warnings; gen --check current; build 0; test:pages 505
passed (6 screenshots re-baselined after viewing each diff light and dark: gallery full page ×2, key
bubble ×4). Old `@playwright/cli` daemons from 1-8 October are running on this machine (not this run's).

### BE_03: Image route
_Status:_ Completed (2026-10-18)
_Notes:_ Format: `packages/format/src/images.ts` (`IMAGE_LIMITS`, `IMAGES_DIR`, `IMAGE_ROUTE`, `IMAGE_WORDS`, `imageNotReal`,
`imagePathProblem` = the one path check, pure string logic, `imageTypeByName`, `imageTypeOf`). Route: `apps/board/server/images.ts`
`serveImage`, wired in `app.ts` after `/api` (HEAD too): decode once, `imagePathProblem`, real path inside the real images folder
(`folders.ts` `isUnder`), one open file for size, first bytes and body; ETag, `no-cache`, 304; 404 / 415 / 413 / 405. Docs:
`images.md`, api.md 154-155, D-048, format README. Read BE_03_image-route.md § Implementation Notes. For FE_03:
- Call `imagePathProblem(path)` first in the renderer; show "image not shown: <path>" with the reason from `IMAGE_WORDS`. The
  route is `IMAGE_ROUTE + path`; a problem's `detail` (`over 8 MB`, `not a real png`, `not found`) is the reason for the box.
- `IMAGE_LIMITS.depth` is 8 **folders** above the file (ruling 20): 8 folders and a file pass, 9 folders fail.
- Real 1x1 test images: `apps/board/tests/images-support.ts` `IMAGES`. `apps/board/README.md` should list `server/images.ts`.
- No flag for images (the plan gives none; steering rule 12 would ask for one): orchestrator's call.
Safety tests (Goal state line 11): `images.test.ts` "imagePathProblem: …" (4 refusal tests), "imageTypeOf: …"; `images-route.test.ts`
"path tricks are refused and never read the decoys…", "subfolders work down to the depth limit…", "svg is refused (415)…", "other
extensions are refused (415)…", "a file over the size limit is refused (413)…", "a link out of the images folder is refused…",
"the images folder may itself be a link…", "the Host check applies to images…". Gates: check 0; npm test 1447 + 7 pass;
verify 0 warnings (after `npm run map`); gen --check current (build and pages not run, per the orchestrator).

### FE_03: Images on the page
_Status:_ Completed (2026-10-18)
_Notes:_ Markdown writes `![alt](path)` as one fixed `<img>` after `imagePathProblem` (`packages/ui/src/markdown/image.ts`
`imageMarkup`; a refused path is `imageNote`'s box "Image not shown: <path> (<reason>)" in `IMAGE_WORDS`' words; no alt
text is the path); flag `cardImages` (on) reaches every surface once through `setMarkdownImages` (page and gallery
`main.ts`). Pattern `packages/ui/src/image-view/` (`fitImage`, `flipFrom`, `motionMs`, `<vb-image-view>` a native modal
dialog, `imageButton`, `showProblem`). Page: `card-images.ts` (made by `draw.ts`): images load only near and not far,
at the version a HEAD names (`io.ts` `imageVersion`, `?v=<ETag>`); select and open ask again with `If-None-Match`, a
newer one is decoded out of sight then swapped; a card re-measures alone (`draw.ts` `resized`). Read FE_03_card-images.md
§ Implementation Notes. For the next waves:
- **Proof by name** (Goal state line 11): `card-images.spec.ts` › "an agent's card shows ![Flow](diagrams/flow.png) from a
  subfolder at the card's width, and its card is measured with it (light|dark)", "a click opens a wide image to 70% of the
  screen's width, never past its height, at 1600×1000|1470×956", "the keyboard opens a tall image to 70% of the screen's
  height, at 1600×1000|1470×956", "Esc, a click outside the image and the × each close it with focus back on the image; …",
  "a replaced image shows after its card is selected again: a conditional request with its ETag, the new picture swapped
  in, and no request on a timer", "opening an image asks for a newer version too, …", "with motion › the view grows from
  the card's image box …, for about 220 ms, …", "reduced motion: the view appears and goes without motion", "the open view
  passes axe and matches its screenshot (light|dark)"; `card-image-states.spec.ts` › "missing and refused › a missing file,
  a fake png, one over 8 MB, a path out of the folder and an internet address each say why in their place; …
  (light|dark)", flag off, far zoom, off screen, a file that goes, the close-event race, the gallery; unit
  `markdown-images.test.ts`, `markdown-safety.test.ts` ("an image cannot break out of its shape…"),
  `markdown-adversarial.ts` `IMG_SHAPE`, "CommonMark: Images", `image-view-core.test.ts`.
- **T_02**: the skill can say: alt text is required (else the path shows); a path is relative to `.visionboard/images/`,
  subfolders up to 8; png, jpeg, webp, gif; overwrite the file to update it (the person sees it on select or open); a
  picture shows at the card's width at most and 420 px tall at most (the view shows it whole).
- **Page weight 149.7 of 150 KB gzip**: about 0.3 KB left; more page code needs a trim or a budget decision.
- **Deviations** (inside the rulings; full list in the task file): the flag via `setMarkdownImages`; width/height set by
  the page, not the renderer; the button made by the page through the pattern; in-card max-width 100% and a 420 px height
  cap; `src` held back at far zoom (lazy alone loads there); a HEAD check plus `?v=`; motion = `--vb-motion` × 0.6 (no
  220 ms token; tokens.css is protected); pattern.json `flag` for gallery sections; `pngOf` added to `images-support.ts`.
- **Known limits** (proposed tracker rows): images outside cards (bubble, container notes, chat) load as the browser
  does and a missing one there shows the browser's broken-image mark; only a card body's image opens the view.
Gates: check 0; npm test 1474 + 7 pass; verify 0 warnings; gen --check current; build 0; test:pages 528 passed (4 new screenshot
pairs viewed; `gallery.spec.ts/markdown-{light,dark}` re-baselined after viewing: card 61's internet image is now the box).

### T_02: Skill v3.8
_Status:_ Completed (2026-10-18)
_Notes:_ SKILL.md v3.8: § Writing cards › Images in cards, an `app` row in § Kinds, § Apps on the board
(files and manifest, what a panel can't do, the panel messages, tools and `ctx.env`, good to use with the
host variables, size, `list_apps` first, the `app` card, Allow, Check again, keys in `.env`, the calculator
as the model). Scenarios 28-31 in `scenarios.md`; runs in NOTES.md § Skill v3.8. Read T_02_skill-apps.md
§ Implementation Notes. For VERIFY_01 and the orchestrator:
- **Goal state line 9, by run** (Claude Code 2.1.301 and Kiro 2.24.0, both ran Opus 5.5): 28 pass ×4
  (rounds 1 and 2); 29 pass ×4: a new `km-miles` app built from the skill alone in every run (no agent read
  the calculator or a doc), 10 km → "6.21… miles" from its tool after the harness pressed Allow; 30 pass
  ×2 (`![…](ui/settings.png)` appended to card 1); 31 failed ×2 in round 1 on the closing words only, then
  pass ×2 in round 2 (Check again on the open page → Allow).
- **Deviation (inside ruling 17)**: no skill-local `apps.md`; the chapter lives in SKILL.md (406 lines,
  about 400), because a panel agent gets the skill's text with no path to its folder.
- **Still slips**: the closing words (no "Done." or an extra sentence), as in every version before.
- **Proposed tracker rows**: (a) the panel could name the skill's folder so panel agents can read the
  calculator; (b) an open page shows an app's old state after a file fix until Check again.
Gates: verify 0 warnings; check 0; npm test 1474 + 7 pass. All harness processes stopped.

### VERIFY_01: By hand
_Status:_ Pending
_Notes:_

---

## On Completion

1. Every § Goal check line ticked with evidence; frontmatter `status: completed`, `completed: <date>`.
2. Append the set's LOG line (one line, newline-terminated):
   `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: App cards → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/TASK-STATUS.md]]`
3. Commit on `feat/app-cards`. Nothing writes to `AUDITED.md`.
