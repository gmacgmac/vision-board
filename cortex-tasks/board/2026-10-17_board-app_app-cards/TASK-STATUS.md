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
| 9 | VERIFY_01 | 6 | strong | [By hand, light and dark, and the goal check](./VERIFY_01_by-hand.md) | Completed | Gates all green (528 pages); 7 findings inside the rulings (1-7, see § VERIFY_01) for FIX tasks; 17 proposed tracker rows (8-24) in § Proposed tracker rows |
| 10 | FIX_01 | 7 | strong | [Plain words in app and image problems (VERIFY_01 findings 4, 5, 7)](./FIX_01_plain-words.md) | Completed | `fieldWords` (manifest + tool shape, no pointer), `IMAGE_WORDS.web` for http(s)/`//` only, `sizeWords` (KB/MB); +39 B gzip (149.72 KB); 8 screenshots viewed: see notes |
| 11 | FIX_02 | 8 | strong | [App cards follow their files and never jump (VERIFY_01 findings 1, 2, 3, 6)](./FIX_02_app-card-state.md) | Completed | list_apps read on select and frame load; panel 404 with `PANEL_CSP`; missing: Check again; past keeps size; the row kept in every state (Stop app in it); +147 B gzip (149.86 KB); 532 pages: see notes |
| 12 | VERIFY_02 | 9 | strong | [Re-check findings 1-7 and Goal lines 3-4](./VERIFY_02_findings.md) | Completed | Gates all green at `6ebb96a` (532 pages); findings 1-7 fixed by hand, light and dark, both sizes; new finding 25 (an app card with no `w`/`h` changes size on load, invalid, missing; components.md's claim); tracker row 26: see notes |
| 13 | FIX_03 | 10 | strong | [An app card keeps its size when its app breaks or goes (VERIFY_02 finding 25)](./FIX_03_app-card-size.md) | Completed | (b) list_apps sends a broken app.json's good size (`AppFolder.size`); (c) the page keeps the last size (+12 B gzip, 149.87 KB); (a) claims narrowed; CSS polish tried, not kept (critique); 533 pages: see notes |
| 14 | FIX_04 | 11 | strong | [Two wording slips FIX_03 saw (findings 27, 28)](./FIX_04_two-words.md) | Completed | `retryDone` "<name> not found" when the folder went (+1 B gzip, 149.87 KB, 130 B left); `manifestOf` "not valid JSON near line N" (server only); 534 pages: see notes |
| 15 | FIX_05 | 12 | strong | [Name each file once; read app.json with a byte-order mark (findings 29, 30)](./FIX_05_file-lines.md) | Completed | Per-file lines name the file once (`manifest.ts`, `child.ts`, `runner.mjs` `Unfit`); one leading mark stripped, hash over the bytes as they are; server only (149.87 KB, 130 B left); 534 pages: see notes |
| 16 | FIX_06 | 13 | strong | [The gallery and the API examples show the server's real words (findings 31, 32)](./FIX_06_samples.md) | Completed | Two real invalid answers in `gallery.apps.json` (app.json; tools.mjs once allowed), held by `app-samples.test.ts` against the server, as the OpenAPI examples; board page unchanged (149.87 KB); 534 pages: see notes |
| 17 | FIX_07 | 14 | strong | [Problems end cleanly; examples match the server (findings 33-35)](./FIX_07_last-words.md) | Pending | |
| 18 | VERIFY_03 | 15 | strong | [Re-check findings 25, 27-35, Goal lines 2-4, 7 and 10](./VERIFY_03_size.md) | Pending | |

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
| 1 Tasks | No (orchestrator) | Now (VERIFY_01): rows 1-9 `Completed`, none `Blocked`; frontmatter still `status: in-progress`. FIX rows for VERIFY_01 findings 1-7 and a VERIFY_02 are still to be added and run (PLAN.md § Orchestrator guide, fix loop) |
| 2 Gates | Yes, at `6ebb96a` (re-run after any FIX for finding 25) | VERIFY_02, one sequential run on `feat/app-cards` at `6ebb96a` (tree: only FE_02's `.visionboard/` changes), 2026-10-18: `npm run check` exit 0 (svelte-check 348 files, 0 errors, 0 warnings; tsc 0); `npm test` exit 0 (1478 tests, 1478 pass, 0 fail; `test:timing` 7 tests, 7 pass); `npm run verify` exit 0 ("verify: ok (0 warning(s))"); `node scripts/gen-api.mjs --check` exit 0 ("gen-api: generated files are current"); `npm run build` exit 0; `npm run test:pages` exit 0 (532 passed, 11.2 min). Built page 153,457 B gzip = 149.86 of 150 KB, 143 B left (`scripts/verify.mjs` `pageWeight` after the build). Logs: `$TMPDIR/vb-v2/logs/{check,test,verify,gen,build,pages}.log`. VERIFY_01 at `a5bde82`: the same six exit 0 (1474 + 7 tests, 528 pages). Earlier waves: |
| 2 Gates (waves) | (interim) | Wave 1: check 0; test 1322+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 480 passed. Wave 2: check 0; test 1417+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 480 passed. Wave 3: check 0; test 1451+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 505 passed. Wave 4: check 0; test 1474+7 pass; verify 0 warnings (page 149.7/150 KB); gen --check 0; build 0; test:pages 528 passed. Wave 5: check 0; test 1474+7 pass; verify 0 warnings; gen --check 0; build 0; test:pages 528 passed |
| 3 End to end | Yes | `tests/pages/app-cards.spec.ts` › "end to end (light) › end to end: an agent draws the calculator, the person allows it, 12*3 comes back as 36 from its tool (light)" and "(dark)", passed in the VERIFY_02 page run at `6ebb96a` (tests 11-12; axe in the board and the panel, the 403 before Allow named, no other console error or failed request), as in VERIFY_01's. By hand, VERIFY_02 (scratch board, port 4497) at 1600×1000 and 1470×956, light and dark: Allow (confirm, toast "Calculator allowed") → `12*3=` → "Answer: 36" → History "Use 36 from 12×3"; `POST /api/apps/calculator/calls` `{"tool":"evaluate","arguments":{"expression":"12×3"}}` → 200 `structuredContent {value: 36}`, then `history` → 200 `items [{12×3, 36}]`; no console error but the board's deliberately missing image |
| 4 Safety (a-j) | Yes | All passed again in the VERIFY_02 runs at `6ebb96a`: `npm test` "ok" for 4c, 4d, 4e, 4f, 4g, 4h (both), 4i; `test:pages` tests 26-28 for 4a, 4b, 4j. By hand (VERIFY_02): the 30 MB answer → 413 "answered more than 256 KB", the panel "The tool's answer is too big." (VERIFY_01's other break-it results below were not re-run; FIX_01 and FIX_02 changed no host limit). All passed in the VERIFY_01 runs. (a) `app-safety.spec.ts` › "the panel is isolated › 4a: …"; (b) "… › 4b: a fetch to a domain the manifest did not declare is blocked …"; (c) `api-apps.test.ts` "4c: no tool runs before Allow; after a change to tools.mjs or app.json it asks again"; (d) "4d: a tool that never returns is stopped at the time limit; the next call works; …"; (e) "4e: a crash restarts on the next call; three in the window mark the app broken …"; (f) "4f: the tool can read its own folder, and nothing else; writing a file, a process or a worker is refused"; (g) "4g: the tool's env holds only the declared keys …"; (h) "4h: an app id with upper case, a slash or dots never reaches a path" and `app-folder.test.ts` "4h: manifest file names with a folder, `..`, a hidden name or an absolute path are refused"; (i) "4i: arguments that don't fit inputSchema, an unknown tool, an answer over the cap or off its outputSchema are refused"; (j) `app-safety.spec.ts` "4j: a message to the board from any window but the card's own frame is ignored". By hand: a 1,000-messages-a-second panel (5,000 sent, 245 answered, 4,745 `app-busy`, 120 reached the server, frame gaps at most 17 ms); a 30 MB answer refused 413 in the child (board RSS 164 → 165 MB); a looping tool timed out twice in 25 s of pressing `=` (`=` disabled while busy, board responsive); three crashes → "This app stopped" |
| 5 Contract | Yes | `packages/format/src/ledger.ts` `LEDGER_FORMAT = 17`, `ACTION_IDS` `app-allow`/`app-revoke`, `APP_ACTIONS`; `view.ts` `KINDS` ends `'app'`; `packages/format/schema/app/manifest.schema.json`; `schema/openapi.json` `info.version` 1.27.0, `GET /api/apps` `list_apps` `x-agent: true` (agent secret or person cookie), `POST /api/apps/{app}/calls` `call_app_tool` (person cookie); `packages/mcp/src/tools.generated.json` has `list_apps`; `packages/cli/src/commands.generated.ts` `list-apps`; drift tests green in `npm test` (1474 pass) and `gen-api --check` current |
| 6 Card states | Yes | Gallery `app-frame-section.ts` (every state of ruling 10 and the flag off; seen light and dark, `29-gallery-app-frame-{light,dark}.png`); page tests passed: `app-states.spec.ts` "every state the app host gives, each drawn in its card (light|dark)", "loading: … (light|dark)", "zoomed out past FAR_K, no panel runs … (light|dark)", "off screen, no panel runs … (light|dark)", "a past version: app cards are placeholders … (light|dark)", "Restart, once the agent fixed the code …"; `app-gallery.spec.ts` (3 tests). By hand every state was drawn (needs approval, code changed, ready, invalid, broken, missing, past, far), with findings 1 (missing never heals, blank panel), 2 (code changed shown late), 3 (past size) |
| 7 Docs | No (finding 25) | VERIFY_02: the claims of findings 3 and 6 now hold in use (a past version keeps the manifest's size; Allow, a code change and Stop app keep the card's height: § VERIFY_02). Read after FIX_01/FIX_02: components.md § App card 1-5 and 8 (the row, the states table with "Allowed to run" / "Nothing to allow", focus, `onLoad`, the reads); apps.md § States `missing` "… and **Check again**"; images.md § Reasons `no images from the internet` (`images.test.ts` "images.md lists every reason …" ok). Untrue in use: components.md § App card 2 "one height for every state" and the `node-app.ts` / `node-app.css` headers, for an app card with no `w`/`h` (loading, invalid, missing change its size: finding 25). VERIFY_01's reading: Present and read: `docs/decisions.md` D-047 and D-048 (each the PLAN text word for word: a diff of the two blocks prints nothing); `docs/specification/apps.md`; `docs/specification/images.md`; `api.md` § "Ledger v17: app cards (app-cards BE_01, D-047)"; `components.md` § App card, § Images in cards, § Image view; `packages/format/README.md` "format 17, readers accept 2 to 17". Two claims are untrue in use: components.md § App card 2 ("a state change … never moves the card": Allow shrinks the card 44 px, finding 6) and the size chain (agent's, else manifest's, else default) in a past version (finding 3) |
| 8 Example | Yes | `skills/vision-board/examples/apps/calculator/` runs as line 3 (page test and by hand). This repo: `diff -r skills/vision-board/examples/apps/calculator .visionboard/apps/calculator` prints nothing; ledger seq 192-197 (read only): 192 join, 193 board `app-cards` "App cards", 194 region `apps` "Apps", 195 node `kind: app` "Calculator" `app {id: calculator, w: 360, h: 440}`, 196 note "Try the calculator", 197 seen |
| 9 Skill | Yes (by reading) | `skills/vision-board/SKILL.md` status v3.8 (images; apps); `scenarios.md` §§ 28-31; `NOTES.md` § Skill v3.8 records the runs (Claude Code 2.1.301 and Kiro 2.24.0, both Opus 5.5): 28 ×4, 29 ×4, 30 ×2, 31 ×2 in round 2 pass; a new app `km-miles` built from the skill alone in every 29 run (harness logs `$TMPDIR/vb-skill38/claude-29.log`, `kiro-29-r2.log`: the three app files written). By hand, VERIFY_01 drew Claude's round-1 `km-miles` on a scratch board: Allow, 10 km → "6.213712 miles" from `convert_distance` (200) |
| 10 By hand | No (finding 25 open) | VERIFY_02 (scratch board port 4497, `HOME`/`VB_PROJECT` in `$TMPDIR/vb-v2/`, `VB_KIRO_AGENT=0`, 1600×1000 and 1470×956, light and dark, about 75 screenshots looked at in `$TMPDIR/vb-v2/shots/`): VERIFY_01's findings 1-7 each re-run and **fixed** (evidence per finding in § VERIFY_02); ux-copy kept FIX_02's four new words, design-critique passed the quiet row light and dark. New inside the rulings' instruction: finding 25 (an app card with no `w`/`h` changes size on load, invalid, missing), for a FIX and a re-check. New outside: tracker row 26. Before: VERIFY_01 done on a scratch board (port 4495, `HOME`/`VB_PROJECT` in `$TMPDIR/vb-vac/`, `VB_KIRO_AGENT=0`), 1600×1000 and 1470×956, light and dark, about 70 screenshots looked at (`$TMPDIR/vb-vac/shots/`). Findings inside the rulings: 1-7 (§ VERIFY_01), each needs a FIX task and VERIFY_02. Findings outside: § Proposed tracker rows 8-24 (with the earlier tasks' known limits) |
| 11 Images | Yes | `card-images.spec.ts` (13 tests: subfolder at the card's width light/dark, click wide and keyboard tall to 70% at both sizes, Esc/outside/× with focus back, replaced image after select with the conditional request and no timer, opening checks too, motion about 220 ms, reduced motion, axe light/dark) and `card-image-states.spec.ts` (10 tests) passed; route and unit safety: `images-route.test.ts` "path tricks are refused …", "svg is refused (415) …", "a file over the size limit is refused (413) …"; `images.test.ts` "imagePathProblem: …" ×6; `markdown-images.test.ts` "a path the one check refuses is the \"Image not shown\" box …"; `markdown-safety.test.ts` "an image cannot break out of its shape …"; `markdown-adversarial.ts` `IMG_SHAPE`. D-048 appended. By hand: 70% measured (wide 1120/1600, tall 700/1000; 1029/1470, 669/956), overwrite + select swapped to the new file, delete + select "Image not found: tall.png", internet URL and svg boxes, motion frames, reduced motion instant; 30 images × 3.2 MB on an 81-card board: nothing loaded far, frame gaps p95 17 ms panning |
| 12 Committed | No (orchestrator) | Now: waves 1-5 committed (`f7b8a1f` … `a5bde82`); uncommitted: FE_02's `.visionboard/ledger.jsonl` and `.visionboard/apps/` (committed at the end per the guide) and VERIFY_01's notes (this file, `VERIFY_01_by-hand.md`, `cortex/LOG.md`). LOG lines: one per task so far, the set's line still to come |

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
6. **Fix loop after VERIFY_01: two FIX tasks run one after the other, not side by side.** FIX_01 (findings
   4, 5, 7: words on the server and in `packages/format`) and FIX_02 (findings 1, 2, 3, 6: app-card page
   behaviour) both touch page-test files and screenshots, so they run in waves 7 and 8, then VERIFY_02 in
   wave 9. Finding 4 is worded on the server (agents read it too), not stripped on the page. Finding 6 is
   fixed in the layout (no jump), not by changing the claim. Finding 7 (KiB) is done, not skipped. Tracker
   row 22 (the panel isn't told about Allow) stays a tracker row: it needs a new protocol message.
7. **Fix loop after VERIFY_02: finding 25 gets FIX_03 and VERIFY_03.** Closest to ruling 3 and the
   no-jump UX: the server sends a broken manifest's valid `size`, the page keeps the last size for a
   missing app if the 143 bytes left allow, and the claims are narrowed for what still moves (a card with
   no `w`/`h` before the first `list_apps` answer). The budget is not raised.
8. **FIX_03 saw two wording slips; they get FIX_04 before VERIFY_03, not a later loop.** Both are inside the
   plain-words instruction (ruling 10's states): a "<name> updated" toast when the folder has gone (finding
   27) and a JSON parser's sentence with the file named twice (finding 28). Numbered after VERIFY_02's 25-26.
9. **FIX_04 saw two more; they get FIX_05 before VERIFY_03.** The per-file lines name the file twice
   ("panel.html: panel.html is over …", finding 29: the fewest-words instruction), and an app.json with a
   byte-order mark reads as broken (finding 30: ruling 10, the board stays usable). Both server only.
10. **FIX_05 saw two leftovers; they get FIX_06, the last fix before VERIFY_03.** The gallery's invalid
    sample shows words the server never sends (finding 31: rule 11) and the OpenAPI examples keep code marks
    and a pointer (finding 32: rule 6 and plain words). From here, a slip a FIX task sees in passing goes to
    VERIFY_03 to weigh, so the loop ends on a verify.
11. **FIX_06 saw four; three get FIX_07, one stays.** In: problems that run together without a full stop
    (finding 33, plain words), a `list_apps` example naming tools before Allow (finding 34, rule 6 against
    decision 2), "ending in .html" reading as the folder (finding 35). Out: the half-cut last line in a
    scrolling problems box stays, because a cut line is the usual sign there is more to scroll and the box
    scrolls by keyboard too. Decision 10 is amended: FIX_07 is the last fix; VERIFY_03 weighs anything after.

## Proposed tracker rows

_(Outside the rulings, not fixed in this set: the known limits the tasks named, gathered by VERIFY_01, and
VERIFY_01's own. Numbered after VERIFY_01's findings 1-7 so one number means one point.)_

| # | From | Row | Seen / example |
|---|---|---|---|
| 8 | Decision 4a, BE_02 | ajv checks an allowed app's input-schema `pattern` in the board's own process, so a slow pattern could stall the board. Check input in the app's process, or time-box the pattern. | Not tried by hand |
| 9 | Decision 4b, BE_02 | The one-file rule stops imports, not a tool that reads a file in its folder and runs it with `node:vm`; that code is outside the Allow hash. | Not tried by hand |
| 10 | Decision 4c, BE_02 | If the board is killed with SIGKILL while a tool loops, that app process keeps running (the others exit on disconnect). | Not tried; a normal stop and a folder switch left no runner (VERIFY_01 `ps`) |
| 11 | FE_02 (a) | A page with app cards on against a server with them off (`VB_FLAGS=-appCards`) loads the panel route's 404 into the frame; the page can't tell the server's flag. | Same blank-panel look as finding 1 |
| 12 | FE_02 (b) | Match card widths can widen an app card; the panel keeps its size at the card's left. | Not tried by hand |
| 13 | FE_02 (c) | Focus moved by pointer straight from one panel into another keeps the first frame's ring until focus returns to the board. | Not tried by hand |
| 14 | FE_02 (d), FE_03 | Page weight is 149.7 of 150 KB gzip (about 0.3 KB left). Findings 1, 2, 3, 5 and 6 add a little page code: a trim or a budget decision comes first. | `npm run verify` 0 warnings at `a5bde82` |
| 15 | FE_03 (a) | Images outside cards (note bubble, container notes, chat) load as the browser does, with no version check; a missing one shows the browser's broken-image mark, not the box. | Not tried by hand |
| 16 | FE_03 (b) | Only an image in a card's body opens the zoomed view; in a note it is the note's click. | Not tried by hand |
| 17 | FE_03 (c) | The first load of each file costs one HEAD; a card's images are all asked for at once when the card comes near. | A card with 30 images sent 30 HEADs in 2 ms, then the browser's lazy loading fetched 14 and the rest on scroll (`26b-near-top.png`) |
| 18 | FE_03 (d) | A picture smaller than the card shows at its own size (ruling 23's "never wider"); the zoomed view scales it up. | Not tried by hand |
| 19 | T_02 (a) | A panel agent gets the skill's text but not its folder; naming the folder (Claude's prompt, Kiro's agent `resources`) would let it read the calculator and a longer guide. | — |
| 20 | VERIFY_01 | Go to card leaves a partly visible card where it is, and a card it pans in can end under the toolbar. General board behaviour (go-to-card), not app cards. | At 117%: card 4 with 38 of its 161 px showing, its title under the toolbar; card 7 cut 162 px at the left; card 1 panned in with its top at y 32 under the 52 px toolbar (`01b-k100-card1.png`, `12-card7-1600-light.png`) |
| 21 | VERIFY_01 | The wheel over a loaded panel scrolls the panel, not the board, so scrolling the board stops whenever a panel passes under the pointer. | Six wheel steps from (1400, 500) moved the board 3,600 px; on the way back a panel under the pointer took the wheel and the board moved 600 px (`08b-panned-away.png`) |
| 22 | VERIFY_01 | A panel is never told the person allowed or stopped its app, so the calculator keeps "Press Allow on the card to calculate" after Allow until the next key (needs a protocol notification). | `31-after-allow-layout.png` |
| 23 | VERIFY_01 | The "1 selected" pill sits over a container's tools or a card's kind tab after a go-to. General board. | `12b-goto-9.png`, `15-1470-dark-images.png` |
| 24 | VERIFY_01 | With its folder gone the app card falls back to 360×320 (no manifest to read), so it changes size when the folder goes; the page could keep the last size it knew. | Card 3 Notice: 300×140 panel → 360×320 after a reload (`24-gone-reloaded.png`). VERIFY_02: now seen live (FIX_02 shows "not found" without a reload), and also for an invalid manifest and on load: raised inside as finding 25 (§ VERIFY_02) |
| 26 | VERIFY_02 | The body-limit problem says "Split the items across several calls." for every operation, a join too, which has no items (`apps/board/server/body.ts`, the `too-large` detail). Word the advice per operation, or drop it where it doesn't apply. | `POST /api/agents` with a 5 KB label: "The body is over the 4 KB limit. Split the items across several calls." |

T_02's row (b) (an open page shows an app's old state after a file change until Check again) is not here: VERIFY_01
counts it inside ruling 7 as finding 2.

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
_Status:_ Completed (2026-10-18), with findings 1-7 inside the rulings for FIX tasks
_Notes:_ Gates first, one after another at `a5bde82`: all six exit 0 (§ Goal check line 2). Then one scratch
board on port 4495 (`HOME`, `VB_PROJECT` in `$TMPDIR/vb-vac/`, `VB_KIRO_AGENT=0`; restarted once after the
folder switch), the repo's Playwright chromium, 1600×1000 and 1470×956, light and dark. A newly joined agent
drew board `verify` (Apps: calculator 360×440, T_02's `km-miles`, a panel-only "Notice"; Plans; Images;
"Try to break it": a flood panel, a 30 MB answer, a looping tool, a second calculator card, a crashing
tool) and board `big` (81 cards, one with 30 PNGs of 3.2 MB). Person's acts on the page. About 70
screenshots, each looked at, in `$TMPDIR/vb-vac/shots/`; scripts in `$TMPDIR/vb-vac/scripts/`. Everything
stopped after (server, driver, browser; no runner left). This repo's `.visionboard/` was only read.
Design skills run: design-critique, accessibility-review (keyboard order, names, live regions; axe in both
panels clean light and dark), ux-copy.
- **Passed by hand**: Allow (confirm, toast "Calculator allowed", focus on the card), keypad and keyboard
  sums, History; converter 10 km → 6.213712 miles; Stop app (confirm, then "Press Allow on the card to
  calculate"); a `tools.mjs` change → "Code changed. Allow it again?" after a call; a broken manifest →
  "This app has problems" with the lines, fixed + Check again → "Calculator updated", focus on the card;
  far zoom → placeholders, frames gone, back in → panels restart; panned well away → frames gone, back →
  made again; past version → "Apps don't run in past versions.", no frame; theme light → dark with a
  panel open (the panel's background followed); select + Z (131%), go to card 1, a note on the card shown
  like any card's; Tab card → Allow → panel, Esc → card; two cards of one app share one state; a folder
  switch stopped all three app processes. Images: subfolder, tall and wide at the card's width; click and
  keyboard open at 70% (both sizes); Esc, outside click and × close with focus back; motion in and out;
  reduced motion instant; overwrite + select swaps, delete + select says "Image not found"; internet and
  svg boxes. Break-it results: § Goal check line 4 and 11.

**Findings inside the rulings** (each for a FIX task; screenshots in `$TMPDIR/vb-vac/shots/`):

1. **Rulings 10 and 11: a deleted app folder never says "not found", its panel goes blank, and restoring
   the folder doesn't heal it.** Steps: card 3 (panel-only "Notice") on screen, move
   `.visionboard/apps/gone/` away. Seen: the card keeps its old panel; once the frame reloads (pan away and
   back) the panel is an empty grey box, and the console shows the panel route's 404 blocked by the board's
   own `frame-ancestors 'none'` (the 404 carries the page CSP). Only a page reload shows "App gone not
   found". Folder put back: still "not found" after a wait, a pan and a select (the `missing` state has no
   Check again, and list_apps is read again only on app ledger lines, Allow/Stop, Check again/Restart or a
   refused call). Should: "App <id> not found" once the panel can't load, and the panel back when the
   folder is. Fix: read list_apps again when a frame loads or fails (and on select, see 2); give `missing`
   Check again; let the panel route's 404 carry the panel's `frame-ancestors 'self'`. Files:
   `apps/board/src/board/app-cards.ts`, `app-state.ts`, `packages/ui/src/node/node-app.ts` (`COPY`),
   `apps/board/server/apps/panel.ts`, a page test. Adds page code: yes, a little.
   Shots: `24-gone-pan-back.png`, `24-gone-reloaded.png`, `24-gone-restored-select.png`.
2. **Ruling 7 (and 11): the card shows "Code changed" only after the person tries the app.** Steps: card 1
   allowed and ready, append a line to `tools.mjs`, wait, select the card. Seen: still "Item 1, App:
   Calculator" with Stop app; "Code changed. Allow it again?" appears only after `=` answers "Press Allow
   on the card to calculate". VERIFY_01 step 1 expects to see it after the change; T_02 proposed this as a
   tracker row (b). Fix: read list_apps again when an app card is selected and when its frame loads (same
   seam as 1). Files: `app-cards.ts`, `app-state.ts`, `apps/board/src/board/draw.ts` (select hook), a page
   test. Adds page code: yes, a little (shared with 1). Shots: `30-code-changed-before-a-call.png`,
   `06-code-changed-card1.png`.
3. **Rulings 3 and 10: a past version ignores the manifest's panel size.** Card 2 (Converter, no `w`/`h`,
   manifest 360×220) is 360×220 now and 360×320 in v19; card 3 (manifest 300×140) also becomes 360×320, so
   cards change size between now and a past version. Cause: `app-cards.ts` `input()` returns
   `{ past: true }` without the app's `info`, so `appView` falls back to the default. Fix: keep the known
   `info` (its `size`) with `past`. Files: `app-cards.ts`, maybe `node-app.ts` `cardState`;
   `app-states.spec.ts` "a past version" to assert the size. Adds page code: a few bytes.
   Shots: `09-past-version-1600-light.png` against `01b-k100-card1.png`.
4. **Ruling 10's problems list, plain words (maintainer's standing instruction): raw code marks on the
   person's screen.** Seen on the invalid card: "app.json /size/w: \`w\` must be at most 960" and
   "app.json /colour: unknown field \`colour\`": literal backticks and a JSON pointer. Should read like
   "app.json: w must be at most 960" / "app.json: unknown field colour". Fix: strip the backticks (and the
   pointer) in `node-app.ts` `problemLine` (a few bytes of page code), or word list_apps' problems without
   them (`apps/board/server/apps/manifest.ts`, `server/schema.ts`; no page code, but agents read those
   words too). Shots: `07-invalid-card1-light.png`, `07-invalid-card1-dark.png`.
5. **Ruling 19, plain words: an internet picture's box gives a folder rule, not the reason.** Seen on card
   8: "Image not shown: https://example.com/logo.png (must be inside the images folder)". The person reads
   a folder rule for a web address. Should say what happened, e.g. "(no images from the internet)", keeping
   "must be inside the images folder" for `..`, a leading `/` and the like. Fix: one more `IMAGE_WORDS`
   reason for a scheme or `//` in `packages/format/src/images.ts` `imagePathProblem`, and its row in
   `docs/specification/images.md` (a test holds that table). Adds page code: a few bytes (the words ship
   with the page). Shots: `13b-after-update-delete.png`, `15-1470-dark-images.png`.
6. **Great UX (standing instruction), and components.md § App card 2's claim: Allow makes the board
   jump.** The ask line exists only in "needs approval" and "code changed", so Allow shrinks the card by 44
   px (51 px on screen at 117%: card 1 762 → 711 px) and the container below jumps up 52 px under the
   pointer; Stop app and a code change grow it back. components.md says "a state change … never moves the
   card" (and `node-app.ts`'s header the same). Fix: keep the row's height in every app state (e.g. the
   ready state holds Stop app in that row instead of the footer), or correct the two claims. Files:
   `packages/ui/src/node/node-template.ts` `appStateMarkup`, `node-app.css`, components.md. Adds page code:
   a little (markup and CSS), none if only the claims change. Shots: `31-after-allow-layout.png`,
   `02-after-allow-card1.png`.
7. **Plain words in a problem agents see (standing instruction; minor).** `call_app_tool`'s too-large
   detail reads "The tool \"evaluate\" of the app \"huge\" answered more than 256 KiB. Answer less." Should
   be "256 KB". The API already says KiB elsewhere ("over the 64 KiB limit" for a body, "over the 1024 KiB
   limit" for an app file), so change all of them or none. Fix: `apps/board/server/apps/tool-checks.ts`
   (`tooLarge`), `apps/board/server/apps/manifest.ts`, `apps/board/server/body.ts`, and the tests that read them
   (`api-apps.test.ts`, `api-errors.test.ts`, `app-folder.test.ts`). No page code. Optional. (The person's panel shows the plain "The tool's answer is too big.")
Every other word on screen read plain to the ux-copy review: the asks, the confirms ("The agent wrote this
app. It runs on this computer and can use the internet, but it can't change your files."), the toasts, the
panel errors ("The tool took too long.", "The app is busy. Try again."), "Image not found: <path>"; the
skill's apps and images chapters are precise for agents and raised nothing.
Tracker rows 8-24: § Proposed tracker rows. Not this run's: headless Chromium shells from `~/.kiro/crew/`
are running on this machine.

### FIX_01: Plain words
_Status:_ Completed (2026-10-18)
_Notes:_ Findings 4, 5 and 7 fixed on the server and in `packages/format`. Read FIX_01_plain-words.md § Implementation Notes.
- **4**: `apps/board/server/apps/manifest.ts` `fieldWords` (the one mapping): "app.json: size.w must be at most 960",
  "unknown field colour", "env[0] is not a .env key…", no backticks and no `pointer`; tool-shape problems
  (`checkTools`) use it too. `schema.ts` and `problemLine` unchanged. Proof: `app-folder.test.ts` "finding 4: a manifest's
  problems name each field as a person writes it, with no code marks and no pointer"; `api-apps.test.ts` "finding 4: a tools
  module whose tools don't fit is invalid, its problems in plain words" (test app `fixtures/apps/bad-tool/`) and "list_apps: every
  folder …".
- **5**: `IMAGE_WORDS.web` "no images from the internet" for `http:`, `https:` or `//` only (deviation: `data:`, `file:`,
  `javascript:`, `C:/` are not the internet and keep "must be inside the images folder"); images.md row. Proof: `images.test.ts`
  "imagePathProblem: an internet address says so, not a folder rule (http:, https:, //)"; `card-image-states.spec.ts` "missing and
  refused › … (light|dark)".
- **7**: `apps/board/server/problem.ts` `sizeWords`: 64/4/512 KB (`body.ts`), 256 KB (`tool-checks.ts`), 1 MB (`manifest.ts`); OpenAPI
  example. Proof: `api-apps.test.ts` "4i: …", `api-errors.test.ts` "a body over 64 KB is too-large (413), in KB not KiB (finding 7); …",
  `api-identity.test.ts` "join: … over 4 KB …", `app-folder.test.ts` "what the agent must fix: …".
- **For FIX_02**: page weight 153,310 B gzip (149.72 of 150 KB, 290 B left). The list_apps problem schema and `AppProblem` keep
  an optional `pointer` the server no longer sends: dropping it from `problemLine` would give FIX_02 a few page bytes (a contract
  tidy, not done here). 8 screenshots re-baselined after viewing light and dark (card-image-refused, gallery-images, gallery markdown,
  gallery full page). scenarios.md § 31 quotes the new problem words.
Gates, one after another after the last change: check 0; npm test 1477 + 7 pass; verify 0 warnings; gen --check current; build 0;
test:pages 528 passed.

### FIX_02: App card state
_Status:_ Completed (2026-10-18)
_Notes:_ Findings 1, 2, 3 and 6 fixed on the page and the panel route. Read FIX_02_app-card-state.md § Implementation Notes.
- **1**: the panel route's 404s carry `PANEL_CSP` (`panel.ts` `FRAMED`); `vb-app-frame` `onLoad` → `app-cards.ts` reads
  list_apps again, so a gone folder says "App <id> not found" once its frame loads; `missing` has Check again ("<name>
  found" / "still not found."). Proof: `app-follow.spec.ts` "a deleted app folder › says "not found" … (finding 1)",
  `app-panel.test.ts` "404 for … (finding 1)".
- **2**: a selection change that selects an app card reads list_apps once (`AppCardsDeps.selection`; no timer). Proof:
  `app-follow.spec.ts` "a changed tools.mjs asks again as soon as the card is selected, … (finding 2)".
- **3**: `input()` gives `{ info, past: true }`. Proof: `app-states.spec.ts` "a past version: … at the size the manifest
  gives (light|dark)".
- **6**: the row over the panel is in the slot in every state (Allow, or "Allowed to run" + Stop app, or "Nothing to
  allow"; hidden by `visibility` with no panel); focus stays on the card when a state hides the focused button. Proof:
  `app-follow.spec.ts` "Allow, a code change and Stop app leave the card's height as it was, … (finding 6)",
  `app-states.spec.ts` "every state …" and "loading: …" (one height).
- **For VERIFY_02**: new words "Allowed to run", "Nothing to allow", "<name> found", "<name> still not found."; Stop app is
  now over the panel, not in the footer; the panel route's 404 is the panel's policy (BE_02's no-sandbox assertion
  changed). Page weight 153,457 B gzip (149.86 of 150 KB, 143 B left). `gallery-{light,dark}` re-baselined after viewing.
  Tracker row 24 (gone folder → default size) unchanged.
Gates, one after another after the last change: check 0; npm test 1478 + 7 pass; verify 0 warnings; gen --check current; build 0;
test:pages 532 passed.

### VERIFY_02: Re-check
_Status:_ Completed (2026-10-18), findings 1-7 fixed; new finding 25 inside the rulings' instruction
_Notes:_ Gates first, one after another at `6ebb96a`: all six exit 0 (§ Goal check line 2). Then a scratch board
on port 4497 (`HOME`, `VB_PROJECT` in `$TMPDIR/vb-v2/`, `VB_KIRO_AGENT=0`; VERIFY_01's scripts reused), the
repo's Playwright chromium, 1600×1000 and 1470×956, light and dark; about 75 screenshots looked at
(`$TMPDIR/vb-v2/shots/`). Everything stopped after; this repo's `.visionboard/` only read. Read
VERIFY_02_findings.md § Implementation Notes.
- **1 fixed**: card 3 (Notice, manifest 300×140) folder away, panned away (0 frames) and back: "App gone not
  found", "Ask the agent to add it.", Check again, no frame, ", app not found", no page reload; the console
  shows only the panel route's 404 (no `frame-ancestors` block). Check again → "Notice still not found.";
  folder back + Check again → panel back, focus on the card; away + select → "not found", back + select →
  panel back (`v24-*`).
- **2 fixed**: card 1 allowed, `tools.mjs` appended, 6 s: 0 list_apps reads, still "Allowed to run"; select →
  1 read, "Code changed. Allow it again?" + Allow, no tool call (`v06-d-*`).
- **3 fixed**: now and v20, cards 1, 2, 3, 13 the same boxes (`data-w/h` 360×440, 360×220, 300×140,
  360×440); "Apps don't run in past versions.", no iframe (`v03-*`).
- **4 fixed**: "app.json: size.w must be at most 960", "app.json: unknown field colour", light and dark;
  fixed + Check again → "Calculator updated", focus on the card (`v07-*`).
- **5 fixed**: "Image not shown: https://example.com/logo.png (no images from the internet)" (`v08-*`).
- **6 fixed**: card 1 456×676 on screen at 1600 (433×642 at 1470) through needs approval, Allow, code
  changed, Allow again, Stop app; card 4 under it stays at y 917 (877); all four sizes/themes (`v06-*`).
- **7 fixed**: 30 MB answer → 413 "… answered more than 256 KB. Answer less.", panel "The tool's answer is
  too big."; list_apps "panel.html is over the 1 MB limit. Make it smaller."; join "over the 4 KB limit".
- **New, 25** (great UX; Goal line 7): an app card with no `w`/`h` changes size whenever list_apps can't give
  the manifest's size: card 2 (manifest 360×220) broken → 360×320 (421 → 537 px on screen), back on the
  fix; card 3 folder gone → 387×328 → 456×537 (width too); on load with list_apps held, cards 2 and 3 at
  360×320, then shrink. components.md § App card 2 ("one height for every state"), the `node-app.ts` and
  `node-app.css` headers claim no state change moves the card. Row 24 named only the gone folder; FIX_02
  shows it live now. Page tests miss it (cards with `w`/`h`; fixture with no manifest size). Fix, cheapest
  first: (a) narrow the three claims to cards that give their size (no page code; needed for loading
  anyway); (b) list_apps sends an invalid manifest's valid `size` (`server/apps/state.ts`, no page code);
  (c) `app-state.ts` keeps the last size while missing (page code, a few dozen bytes of 143).
- **Copy and design**: ux-copy kept all four new words; design-critique: the quiet row reads as a status
  line, not a field, light and dark (`sheet-row.png`). Tracker row 26 added.

### FIX_03: App card size
_Status:_ Completed (2026-10-18)
_Notes:_ Finding 25 fixed for a broken app.json and a gone folder. Read FIX_03_app-card-size.md § Implementation Notes.
- **(b)**: `server/apps/manifest.ts` `AppFolder.size` (the manifest's `size`, else the default) whenever no schema problem
  sits at the top or under `size`; `state.ts` `appState` sends it in every state with a folder. No page code. Proof:
  `api-apps.test.ts` "finding 25: list_apps gives the size of an app.json with other problems while its size is good, so a
  card with no size keeps it".
- **(c)**: `app-state.ts` `readOnce` keeps the last size list_apps gave when an answer has none (deviation inside decision
  7: any sizeless answer, so a half-written app.json too, not only `missing`). +12 B gzip: 153,469 B (149.87 of 150 KB,
  131 B left). Proof: `app-follow.spec.ts` "a card with no size of its own keeps its box when its app.json breaks and when
  its folder goes, so nothing under it moves (finding 25)" (failed before (b), and with (b) alone: 354×324 → 394×464).
- **(a)**: components.md § App card 2 and 8, `node-app.ts` and `node-app.css` headers, `node-template.ts` `appSlot`,
  `node/pattern.json`; apps.md § Panel size and § Kept true by. What still moves: a card with no `w`/`h` until the
  first list_apps answer (or, gone since the page opened, until a size is first known). Skill unchanged (right as is).
- **CSS polish**: tried (−8 B), not kept: design-critique found the indented quiet line off the title/panel edge on every
  allowed card worse than the shift on Allow. No screenshot changed.
- **For VERIFY_03**: seen, not fixed: Check again on an invalid app whose folder went toasts "<name> updated"; a
  half-written app.json reads "app.json: app.json is not valid JSON: …" (file named twice, the parser's words).
Gates, one after another after the last change: check 0; npm test 1479 + 7 pass; verify 0 warnings; gen --check current;
build 0; test:pages 533 passed.

### FIX_04: Two wording slips
_Status:_ Completed (2026-10-18)
_Notes:_ Findings 27 and 28 fixed. Read FIX_04_two-words.md § Implementation Notes.
- **27**: `app-words.ts` `retryDone`: a change into `missing` toasts "<name> not found" (no period, like "found" and
  "updated"), as the card says. +1 B gzip: 153,470 B (149.87 of 150 KB, 130 B left). Proof: `app-words.test.ts` "Check
  again on an app whose folder went since it had problems says not found, as its card does (finding 27)".
- **28**: `server/apps/manifest.ts` `manifestOf`: "app.json: not valid JSON near line N" (the file once, no parser
  sentence), "app.json: not valid JSON" with no line; the line read only from the end of the parser's message
  (`PARSED_AT`), never from the file's text it may quote. No page code. No other file in this path is read as JSON.
  Proof: `app-folder.test.ts` "finding 28: an app.json that is not JSON says so once, near its line, without the
  parser's words".
- Both on the page: `app-follow.spec.ts` "a half-written app.json says so near its line, and Check again once its folder
  went says not found (findings 27, 28)". No doc quotes either wording; ux-copy kept both as written.
- **For VERIFY_03**: seen, not fixed: an app.json with a byte-order mark reads "not valid JSON" with no line; the per-file
  lines still name the file twice ("panel.html: panel.html is over the 1 MB limit…", kept by FIX_01).
Gates, one after another after the last change: check 0; npm test 1481 + 7 pass; verify 0 warnings; gen --check current;
build 0; test:pages 534 passed.

### FIX_05: File lines
_Status:_ Completed (2026-10-18)
_Notes:_ Findings 29 and 30 fixed, server only. Read FIX_05_file-lines.md § Implementation Notes.
- **29**: each per-file line names its file once (the card and `appInvalid` put "<file>: " first): `manifest.ts`
  `locate` ("over the 1 MB limit. Make it smaller.", "links outside the app's folder. Make it a real file.", "not a
  file."), `readApp` ("not in the app's folder. Write it there" for app.json, the panel, the tools file; the folder
  link "links outside .visionboard/apps/. Make it a real folder."); `child.ts` ("did not finish loading within N s.
  …"); `runner.mjs` sends its own words (`Unfit`) as they are ("must export default { tools: [...] }.", "Tool "a" has
  no run function.", "has two tools named "a".", "Import only Node's built-in modules, such as node:fs, not "x". Put
  that code in this file, …"), anything else "could not load: …". Proof: `app-folder.test.ts` "finding 29: each
  file's problem names the file once, …"; `api-apps.test.ts` "finding 29: a tools module that doesn't load or doesn't
  fit says why without naming its file again", "one file: …", "a tools module that never finishes loading …".
- **30**: `manifestOf` strips one leading mark before parsing; the hash stays over the file's bytes (ruling 7). Proof:
  `app-folder.test.ts` "finding 30: an app.json saved with a byte-order mark reads as it is; the hash is over its
  bytes, mark and all". FIX_04's finding-28 case moved from a mark to a stray first character.
- **For VERIFY_03**: no page code, doc or screenshot changed. Seen, not fixed: the gallery's invalid sample shows
  tools words the server never sends; the OpenAPI `app-invalid` and `list_apps` examples keep code marks (and a
  pointer) from before FIX_01.
Gates, one after another after the last change: check 0; npm test 1484 + 7 pass; verify 0 warnings; gen --check current;
build 0; test:pages 534 passed.

### FIX_06: Samples
_Status:_ Completed (2026-10-18)
_Notes:_ Findings 31 and 32 fixed; no server or board-page code. Read FIX_06_samples.md § Implementation Notes.
- **31**: the gallery's invalid sample is two real list_apps answers in `apps/board/src/gallery/gallery.apps.json`
  (read by `app-frame-section.ts` `INVALID`): the calculator's broken app.json ("size.w must be at most 960", "unknown
  field colour"), and its tools.mjs importing ./parser.mjs once allowed (FIX_05's import line). Two cards, because a
  schema problem and a load problem never come in one answer (deviation, rule 11). The server's words have no one
  source the tests read, so the file is the one copy and the test gets the same answers from the real server.
- **32**: OpenAPI `list_apps` `release-notes` (no pointer, no code marks; the `size` and `hash` the server sends) and
  `appInvalid` (the call's words for the import case); `npm run gen` changed only `api-reference.md`; no version change.
- **Proof**: `app-samples.test.ts` (2 tests), `openapi.test.ts` "the app examples are in plain words, …", and
  `app-gallery.spec.ts` "app frame: …", each seen failing first. `gallery-{light,dark}` re-baselined after viewing.
- **For VERIFY_03**, seen, not fixed: `appInvalid` joins problems with a space only (a detail with no period runs into
  the next); the `list_apps` example's `needs-approval` calculator names tools the server sends only after a run; the
  import line half cut at the scroll box's edge in a 300×220 panel; "…in the app's folder ending in .html" reads two ways.
Gates, one after another after the last change: check 0; npm test 1487 + 7 pass; verify 0 warnings; gen --check current;
build 0; test:pages 534 passed. Board page 153,470 B gzip (149.87 of 150 KB, 130 B left).

### FIX_07: Last words
_Status:_ Pending
_Notes:_

### VERIFY_03: Re-check size
_Status:_ Pending
_Notes:_

---

## On Completion

1. Every § Goal check line ticked with evidence; frontmatter `status: completed`, `completed: <date>`.
2. Append the set's LOG line (one line, newline-terminated):
   `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: App cards → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/TASK-STATUS.md]]`
3. Commit on `feat/app-cards`. Nothing writes to `AUDITED.md`.
