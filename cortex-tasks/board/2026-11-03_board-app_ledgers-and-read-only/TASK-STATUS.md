---
task_name: Ledgers and Read-only
created: 2026-11-03
completed:
status: in-progress
categories: [board-app, board-security, board-agent, board-ui]
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Ledgers and Read-only - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-11-03 · **Checkpoint**: tag `checkpoint/before-ledgers` (main at 45ee1dd)

## Instructions for Agents

1. **Read PLAN.md first**, its Decisions and House Rules above all, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read the notes of completed tasks** (below and in their task files) before starting yours
3. **Respect the Wave column**
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component; import it, never re-create it
5. **Touch only the files you own** (File Ownership). Need a change elsewhere? `REQUESTS` in your return block
6. **Deviating?** Decide by the principles if it is small and say so in your notes; STOP and report `DEVIATION` if it changes a Decision
7. **Frontmatter `status`**: `planned` → `in-progress` when the first task starts (orchestrator); closing is the orchestrator's
8. **Update your row** when you finish; notes in your task file. Re-run? A `Run N:` line here and a `### Run N` block there
9. **No git commits**; never port 4466; never open or write the repo's own `.visionboard/`; never write in `~/ai/nclite`; never `cortex/AUDITED.md`
10. **Tests**: by tier (`cortex-task-exe` § Testing by Tier); `nice -n 15`, `VB_TEST_WORKERS=3`, your `VB_TEST_PORT` from the Ports table; a time limit on every run; no full page suite (the orchestrator's)
11. **Work in the worktree the brief names**, never a scratch copy. Check `git branch --show-current` first
12. **Every task's model is Opus 5.5** (PLAN decision 19); `strong` below means exactly that

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 0 | SETUP | 0 | — | — (orchestrator) | Branch `feat/ledgers`; D-084 and D-085 appended from PLAN; flags `ledgerFolders`, `readOnlyStart` added off; script `ledgers:undo` added to `package.json` | Completed | Plan committed on `main` (895f4b3); tag `ledgers/wave-0`. SETUP-R1 routed to PATHS_01 |
| 1 | PATHS_01 | 1 | strong | Software engineer who refactors live systems — a move changes no behaviour, and the tests and screenshots are the proof; a second home for a fact is a bug waiting. | [One paths module](./PATHS_01_paths-module.md) | Completed | `data-folder.ts` (`ledgerFolder`, `ledgerFiles`, `projectFiles` incl. `gitignore`, `projectOfLedger`, `homeFiles`, the names, `DATA_FOLDER_NAMES`); every caller on it, no behaviour change; verify rule in `scripts/verify-data-folder.mjs` (test marker `verify: data-folder-literal <reason>`); SETUP-R1 fixed in the test. `npm run map` needed (format API row). Requests R1 (gallery), R2 (format README), R3 (chat.md, optional) |
| 2 | ACCESS_01 | 1 | strong | Application security engineer — an agent never reads a secret because of where a file happens to sit; a rule is proven by a test that tries to break it, in every layout. | [Agent file rules for ledger folders](./ACCESS_01_agent-file-rules.md) | Completed | Twin rows `.visionboard/*/<file>` for agents, ledger, lock, app-state, images, apps (+ chat-sessions closed in a ledger folder); `refusedTail` meets a spelled-out name against the row's pattern (closed a nested-project glob gap). 147 agent tests pass. Note for LEDGERS_01's equality test: the extra `*/chat-sessions.json` row; `.gitignore` has no row (`.visionboard/**`) |
| 3 | LEDGERS_01 | 2 | strong | Backend engineer who owns storage migrations — data is moved once, by rename, recoverably, and never while another writer might hold it; the contract changes before the code. | [Ledgers on the server](./LEDGERS_01_ledgers-server.md) | Completed | Contract (`ledger`, `ledgers`, `keepOutOfGit`; list_boards/join `ledger`) and `gen`; `data-folder.ts` `ledgerFolder(project, ledger?)`, `ledgerNameProblem`, `MAIN_LEDGER`; `server/ledgers.ts`, `server/ledger-move.ts` (`moveIntoMain`, `undoMove`, ledger file last, part-way finishable), `bin/ledgers-undo.ts`; lock per ledger folder; recent.json `ledgers`; apps and images follow the open ledger. Tests: `api-ledgers` 12, `ledger-move` 8, `access-layout` 5, page `ledger-folders.spec.ts` 2; unit suite 2287/0. PATHS_01-R2, R3, R4 (`app-shape.ts`) done. Requests R1-R4 (LEDGER_UI_01 `folderMoved`; flags.ts and references.ts wording; schema app-path descriptions) |
| 4 | LEDGER_UI_01 | 3 | strong | Product designer who builds front-end — a new control earns its room at every width, reuses the pattern beside it, and has every state before anyone sees it. | [The ledger chip](./LEDGER_UI_01_ledger-chip.md) | Completed | Page parts `ledgerChip`/`ledgerField`/`ledgerRow` (`host.ts`), `ledger` in `header-tier.ts` (path at full and half, "⋯" row at a third); `shell/LedgerPart.svelte` (board picker's pattern), `LedgerRow`, `LedgerDialog`+`LedgerForm` (`ledgerNameProblem` live, Keep out of git), `shell/ledgers.ts`, words `shell/words/ledgers.ts`, `styles/ledgers.css`, gallery `ledger-section.ts`; `tests/pages/ledgers.spec.ts` 17/17, shared `tests/pages/header-fit.ts`. `FULL_MIN`/`HALF_MIN` re-measured, unchanged. LEDGERS_01-R1 done (`folderMoved` + per-ledger `lastBoardKey`); PATHS_01-R1 done (+ its test in `scripts/verify-data-folder.test.mjs`); GATE1-R1: environment (fails identically at f03ac48 on this machine): 6 screenshots updated (chat-attach, nodeSize, cardHistory x light/dark). Request R1 (`board/words/toolbar.ts` tooltip words) |
| 5 | LEDGERS_02 | 3 | strong | Developer-tools engineer — an agent always knows which folder and ledger it is talking to, and a mismatch stops it with one clear sentence, never a silent write elsewhere. | [Agents find and name the ledger](./LEDGERS_02_agents-and-ledgers.md) | Completed | `#client` `ledgersIn` (either layout; `projectOf` uses it; held equal to `ledgers.ts` by `ledger-layout-rule.test.ts`); `caller-folder.ts` `wrongLedger` (`wrong-folder` naming folder and both ledgers, words `http.ts` `theBoardHasLedgerOpen`), `secretElsewhere` every ledger of each folder; chat agent needs no `VB_LEDGER` (its secret is the open ledger's); `vb` prints `ledger` beside `project` (no code); `bin/reply.ts` follows the ledger (`--ledger`, last, main). LEDGERS_01-R5 done. Tests: `api-folder-mismatch-ledgers` 5, `bin-reply` 3, `ledger-layout-rule` 2, project +2, run +1; unit suite 2301/0. Small deviation: rule in `#client`, not shared with `ledgers.ts` (not owned). Requests R1-R3 |
| 6 | READONLY_01 | 4 | strong | Backend engineer for shared data on synced folders — a reader writes nothing, a writer proves it holds the lock before its first line, and a replaced file is never trusted to have only grown. | [Read-only and Edit on the server](./READONLY_01_read-only-server.md) | Completed | Problem `read-only` (409), `readOnly` on get_board/list_boards/read_ledger, get_project `readOnly`/`editing`, `edit_ledger`/`stop_editing` (`/api/project/edit`), SSE `reset`/`editing`; `server/editing.ts` (the open folder's state) gating `ledger.ts` `gate`, `agents.ts`, `EngineOptions.readOnly` (default never), panel state, chat starts (a running chat: words, no Send); start/switch take no lock, Edit takes it (old layout moved then), `Lock.held` stops a writer whose lock was taken over; replaced file reopened (`onReset`); page: `live.readOnly` from reads, sender/`lock-flow` paused with `READ_ONLY_PERSON`, seen kept in memory, `ApiError.code`, `blockedReason(…, readOnly)`. Tests in edit mode (`startTestBoard` `edit`). Unit 2330/0 off, 2329/0 on; page specs 71+68 off, 94 on; plugin 79/79. LEDGERS_01-R3, LEDGERS_02-R1/R2/R4 done. Needs `npm run map`. Requests R1-R7 |
| 7 | READONLY_UI_01 | 5 | strong | Interaction designer — the person always knows whether they can change what they see, and why not, at a glance, at any width. | [Read-only and Edit in the header](./READONLY_UI_01_edit-control.md) | Pending | |
| 8 | PLUGIN_RO_01 | 5 | strong | Platform engineer who keeps host contracts — an option a host may ignore is additive, and a type change is decided, never noticed late. | [Read-only for a plugin host](./PLUGIN_RO_01_plugin-read-only.md) | Pending | |
| 9 | CONSOLIDATE_01 | 5 | strong | API designer for agent tools — reading another ledger is a read with its name stated, never a way to write there. | [Read another ledger](./CONSOLIDATE_01_read-other-ledger.md) | Pending | |
| 10 | SKILL_01 | 6 | strong | Prompt engineer who treats instructions as code — every line earns its place by a scenario, and a change that breaks another case is reverted. | [Bot instructions: ledgers and read-only](./SKILL_01_bot-instructions.md) | Pending | |
| 11 | VERIFY_01 | 7 | strong | A developer who shares boards with a colleague through Dropbox, new to this code — opens, watches, edits, switches ledgers, and expects nothing lost or overwritten. | [Verification](./VERIFY_01_verification.md) | Pending | |
| 12 | FIX_01 | 8 | strong | Software engineer who fixes from findings — each fix starts with a failing test, and a finding left is left with its reason. | [Fix what VERIFY_01 found](./FIX_01_verify-findings.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Ports

Fixed per task (PLAN House Rules: not the port `npm run worktree` prints). Each owns `VB_TEST_PORT` to +99.
`eval:bot` uses its own door port (6010, `tests/evals/bot/limits.ts`), so no task's block starts at 6010.

| Task | `VB_TEST_PORT` | Task | `VB_TEST_PORT` |
|---|---|---|---|
| PATHS_01 | 6100 | READONLY_UI_01 | 6700 |
| ACCESS_01 | 6200 | PLUGIN_RO_01 | 6800 |
| LEDGERS_01 | 6300 | CONSOLIDATE_01 | 6900 |
| LEDGER_UI_01 | 6400 | SKILL_01 | 7000 |
| LEDGERS_02 | 6500 | VERIFY_01 | 7100 |
| READONLY_01 | 6600 | FIX_01 | 7200 |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/format/src/data-folder.ts` (`ledgerFolder`, `ledgerFiles`, `projectFiles`, `projectOfLedger`, `homeFiles`, the names) | PATHS_01 | every later task |
| Test helpers on the paths module: `apps/board/tests/api-harness.ts` `startBoard`, `test-board.ts` `startTestBoard`, `tests/pages/serve-boards.ts` `templates`, `folder-server.ts` `startFolderServer` | PATHS_01 | every later task's tests |
| The verify rule "only the paths module names a data-folder file" (`scripts/verify.mjs`) | PATHS_01 | every later task |
| `ACCESS_RULES` rows for both layouts (`packages/agent/src/access-rules.ts`) | ACCESS_01 | LEDGERS_01 (the equality test) |
| The ledger name rule (`data-folder.ts` `ledgerNameProblem`, `MAIN_LEDGER`) and the new layout in `ledgerFolder` / `projectOfLedger` | LEDGERS_01 | LEDGER_UI_01, LEDGERS_02, CONSOLIDATE_01 |
| The ledger contract: `get_project` / `open_project` ledger fields, `list_boards` / `join` `ledger` (`packages/format/schema/`, `openapi.json`, generated types) | LEDGERS_01 | LEDGER_UI_01, LEDGERS_02, CONSOLIDATE_01, SKILL_01 |
| `apps/board/server/ledger-move.ts` (`moveIntoMain`, `undoMove`) | LEDGERS_01 | VERIFY_01 |
| Page parts `ledgerChip`, `ledgerField`, `ledgerRow` (`apps/board/src/board/host.ts` `BoardPageParts`) and the `ledger` control in `header-tier.ts` | LEDGER_UI_01 | READONLY_UI_01 |
| The `read-only` problem (409), `readOnly` on reads, the engine's `readOnly` option (`EngineOptions`), the ledger's write gate, the Edit / Stop editing operations | READONLY_01 | READONLY_UI_01, PLUGIN_RO_01, CONSOLIDATE_01, SKILL_01 |
| The page's widened read-only condition (`controller.ts` `sender`, the `readOnly` passed to attention, proposals, updates, parking, chat-side, commands) | READONLY_01 | READONLY_UI_01 |
| A read tool's `ledger` input (another ledger of the project, read-only) | CONSOLIDATE_01 | SKILL_01 |

## File Ownership

A file has one owner per wave. Tests named for a task's own code are that task's. `TASK-STATUS.md` (own row and
notes) and `cortex/LOG.md` (append one line) are shared by design.

| Wave | Owner | Files |
|------|-------|-------|
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md` (`npm run map`), `package.json`, the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`, `.git/**` |
| 1 | PATHS_01 | `packages/format/src/{data-folder,images,apps,index}.ts`, `packages/format/tests/data-folder.test.ts`, `apps/board/server/**`, `apps/board/bin/**`, `packages/client/**`, `packages/mcp/**`, `packages/cli/**`, `scripts/verify.mjs` and its test, `apps/board/tests/**`, `tests/pages/**`, `docs/specification/{api,apps,images}.md` |
| 1 | ACCESS_01 | `packages/agent/**`, `docs/specification/chat.md` |
| 2 | LEDGERS_01 | `packages/format/schema/**`, `packages/format/src/**` (not `flags.ts`), generated files (`npm run gen` outputs, `docs/specification/api-reference.md`), `packages/actions/src/reads.ts`, `apps/board/server/**`, `apps/board/bin/**`, `apps/board/src/shell/page-io.ts` (types only), `apps/board/tests/**`, `tests/pages/` helpers and a folder spec of its own, `docs/specification/{api,apps,images,chat}.md`, `README.md`, `apps/board/README.md` |
| 3 | LEDGER_UI_01 | `apps/board/src/shell/**`, `apps/board/src/board/host.ts`, `apps/board/src/board/chrome/**`, `apps/board/src/styles/**`, `apps/board/src/gallery/**`, `tests/pages/**`, `docs/specification/{components,words}.md` |
| 3 | LEDGERS_02 | `packages/client/**`, `packages/mcp/**`, `packages/cli/**`, `apps/board/server/{caller-folder,chat-access,dispatch}.ts`, `apps/board/server/words/**`, `apps/board/tests/{api-folder-mismatch,api-chat-folder,api-chat-access}*.test.ts` and new tests of its own there, `docs/specification/api.md` |
| 4 | READONLY_01 | `packages/format/schema/**`, generated files, `packages/format/src/**` (not `flags.ts`), `packages/actions/**`, `packages/chat/**`, `apps/board/server/**`, `apps/board/src/board/**` (not `chrome/`), `apps/board/src/shell/{page-host,page-io,chat-panel,chat-rules,chat-bridge}.ts`, `apps/board/tests/**`, `tests/pages/` helpers and specs of write paths, `tests/plugin/` helpers if a default moved, `docs/specification/{api,components,chat}.md` |
| 5 | READONLY_UI_01 | `apps/board/src/shell/**` (not READONLY_01's files above), `apps/board/src/board/host.ts`, `apps/board/src/board/chrome/**`, `apps/board/src/styles/**`, `apps/board/src/gallery/**`, `tests/pages/**`, `docs/specification/{components,words}.md` |
| 5 | PLUGIN_RO_01 | `apps/board/plugin/**`, `apps/board/bin/plugin-types.ts`, `apps/board/tests/plugin-*.test.ts`, `tests/plugin/**`, `docs/specification/plugin.md` |
| 5 | CONSOLIDATE_01 | `packages/format/schema/**`, generated files, `packages/actions/src/reads.ts`, `apps/board/server/engine/**` (not `plugin/`), `apps/board/server/project.ts`, `apps/board/tests/api-*ledger*.test.ts` (new), `docs/specification/api.md` |
| 6 | SKILL_01 | `skills/vision-board/**`, the plugin's bot words (`apps/board/plugin/skill.ts`, `apps/board/plugin/words/**`), `packages/mcp/src/words/info.ts`, `tests/evals/bot/scenarios/**`, `apps/board/tests/plugin-skill.test.ts` |
| 7 | VERIFY_01 | `VERIFY_01_findings.md`, its task file; no code |
| 8 | FIX_01 | Whatever the findings name, except protected and orchestrator files |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| SETUP-R1 | SETUP | `apps/board/tests/engine.test.ts` "watch: a write through another engine…" fails on `main` before this set (and cancels the two tests after it): the ledger's follow timer is `unref`'d (`ledger.ts` `follow`), so awaiting another engine's poll lets the event loop drain. Fix the test (hold the loop while it waits), not the engine | PATHS_01 (owns `apps/board/tests/**`) | Done |
| PATHS_01-R1 | PATHS_01 | `apps/board/src/gallery/attach-section.ts`: build `DAY` from `projectFiles('').attachments` (`#format`) instead of the literal `.visionboard/attachments/2026-10-30`, then remove its `PENDING` row in `scripts/verify-data-folder.mjs` (it warns until then) | LEDGER_UI_01 (owns `gallery/**` wave 3; the `PENDING` row is a one-line follow-on in `scripts/`, which no later task owns: LEDGER_UI_01 may make it) | Done (LEDGER_UI_01) |
| PATHS_01-R2 | PATHS_01 | `packages/format/README.md`: App cards and Images bullets name `APPS_DIR` / `IMAGES_DIR` in `apps.ts` / `images.ts`, now untrue; add a `src/data-folder.ts` bullet (names, `DATA_FOLDER_NAMES`, `ledgerFolder`, `ledgerFiles`, `projectFiles`, `projectOfLedger`, `homeFiles`; D-084 2) | LEDGERS_01 (alone in wave 2; it changes the module) | Done |
| PATHS_01-R3 | PATHS_01 | `docs/specification/chat.md`: optionally cite `projectFiles` (`data-folder.ts`) beside the attachments and permissions paths | LEDGERS_01 (owns `chat.md` wave 2) | Done |
| PATHS_01-R4 | PATHS_01 (notes) | Sentences in code still name `.visionboard/apps/`, stale once each ledger has its folder: `packages/format/src/app-shape.ts`, `packages/actions/src/references.ts`, `packages/format/src/flags.ts` (`agentAccessRules` description) | LEDGERS_01 for `app-shape.ts` and the list; `references.ts` → READONLY_01 (owns `packages/actions/**` wave 4); `flags.ts` → orchestrator after wave 2 | Done (`app-shape.ts` by LEDGERS_01; `flags.ts` by orchestrator at wave 2 gate; `references.ts` is LEDGERS_01-R3) |
| GATE1-R1 | orchestrator (wave 1 gate) | Four page screenshots fail before this set, identical on `ledgers/wave-0` (same pixel counts): `chat-attach-gallery.spec.ts` `chat-attach-{dark,light}.png` (1430 / 1567 px) and `gallery.spec.ts` `gallery-nodeSize-{dark,light}.png` (3 / 6 px). Find the cause (a date or path in the attach section, PATHS_01-R1's file? rendering drift?); fix it if it is the page's or the test's, update a screenshot only if the cause is the environment, and name it in notes | LEDGER_UI_01 (owns `gallery/**`, `tests/pages/**` wave 3) | Done (LEDGER_UI_01: environment, glyph rendering; the same failures on f03ac48, the commit that last wrote them. Six screenshots re-taken: chat-attach, nodeSize and cardHistory, light and dark) |
| LEDGERS_01-R1 | LEDGERS_01 | `apps/board/src/shell/folder.ts` `folderMoved`: also compare `ledger`, not only `path`, so another open tab reloads after a ledger switch in the same folder | LEDGER_UI_01 (owns `shell/**` wave 3) | Done (LEDGER_UI_01) |
| LEDGERS_01-R2 | LEDGERS_01 | `packages/format/src/flags.ts`: `cardImages`, `svgImages`, `agentAccessRules` descriptions name the open ledger's `images/` and `apps/` | orchestrator | Done (wave 2 gate) |
| LEDGERS_01-R3 | LEDGERS_01 | `packages/actions/src/references.ts`: the app reference's meaning → "one folder in the open ledger's apps/ (.visionboard/apps/, or .visionboard/<ledger>/apps/ with ledger folders)" | READONLY_01 (owns `packages/actions/**` wave 4) | Done (READONLY_01) |
| LEDGERS_01-R4 | LEDGERS_01 | Agent-facing tool text still says `.visionboard/apps/` and `.visionboard/app-state/`: `openapi.json` (`list_apps`, the app id), `schema/api/list-apps-response.schema.json`, `schema/app/{manifest,panel-state}.schema.json`, `schema/common.schema.json` app `id`, and the mirror in `apps/board/server/words/plugin-tools.ts`; then `npm run gen`. Changed with the bot instructions so `eval:bot` runs once | SKILL_01 (alone in wave 6: these files are added to its ownership for this) | Open |
| LEDGERS_01-R5 | LEDGERS_01 (notes) | `caller-folder.ts` `secretElsewhere` and `packages/client` `projectOf` still look only at the old layout; `apps/board/bin/reply.ts` reads only the old layout | LEDGERS_02 (owns those; `bin/reply.ts` added to its ownership in wave 3, no one else holds `bin/`) | Done (LEDGERS_02) |
| LEDGERS_01-R6 | LEDGERS_01 (notes), sharpened by LEDGERS_02 | Chat sessions are repo-wide but keyed by board id: two ledgers with the same board id may see each other's sessions, and `chat-sessions.ts` `load` re-keys a session's agent on the open ledger's `agents.json`, so a `ui` session could put a hash into `main` for an agent that never joined there | VERIFY_01 (check; a finding goes to FIX_01) | Open |
| LEDGERS_02-R1 | LEDGERS_02 | `apps/board/server/ledgers.ts`: `isOldLayout` / `listLedgers` / `hasLedger` use the one layout rule (`#client` `ledgersIn`, or move it as is into `data-folder.ts`, fs handed in, both importing it); then `apps/board/tests/ledger-layout-rule.test.ts` can go | READONLY_01 (owns `server/**`, `format/src/**` wave 4; that test file too) | Done (READONLY_01) |
| LEDGERS_02-R2 | LEDGERS_02 | `apps/board/server/ledgers.ts`: export the list "old layout's folder, then each ledger's folder" (built twice now: `folders.ts` `countBoards`, `caller-folder.ts` `ledgerDirs`) and use it in both | READONLY_01 | Done (READONLY_01) |
| LEDGERS_02-R3 | LEDGERS_02 | `skills/vision-board/SKILL.md`, `packages/mcp/src/words/info.ts`: after `join`, check the answer's `ledger` is the one meant (`join` names no ledger in its request); a `wrong-folder` naming ledgers follows the same stop-and-tell rule | SKILL_01 | Open |
| LEDGERS_02-R4 | LEDGERS_02 | `apps/board/README.md`: the `bin/reply.ts` usage line adds `[--ledger <name>]` (old layout, else --ledger, else last open, else main) | READONLY_01 (alone in wave 4; added to its ownership) | Done (READONLY_01) |
| LEDGER_UI_01-R1 | LEDGER_UI_01 | `apps/board/src/board/words/toolbar.ts`: a `ledger` word ("Ledger") and a New ledger part in `moreTitle`, so the "⋯" tooltip names the Ledger row at a third and New ledger…; then `['ledger', toolbarWords.ledger]` in `Toolbar.svelte` `ALSO` | READONLY_UI_01 (owns `chrome/**` wave 5; `board/words/toolbar.ts` added to its ownership in wave 5, after READONLY_01's wave 4) | Open |
| LEDGER_UI_01-R2 | LEDGER_UI_01 | `packages/ui/src/base/dialog.css`: `.vb-dialog-item` and `.vb-dialog-hint` use `--vb-ink-subtle`, Lc 49 on the dialog surface in dark, under the reading tier of 60 (before this set; every dialog) | tracker row, at the close (outside this set; design tokens are protected) | Open |
| LEDGER_UI_01-R3 | LEDGER_UI_01 | `apps/board/src/shell/kept.ts` `pageStore` is not keyed per folder or per ledger: two ledgers' boards with the same id share zoom and proposals-hidden (across folders already before this set) | tracker row, at the close; VERIFY_01 may weigh it | Open |
| GATE3-R1 | orchestrator (wave 3 gate; repeated at wave 4) | `tests/pages/host-styles.spec.ts` "the board in a 550px pane inside a 1600px page…" (light) fails in the full suite at waves 3 and 4 (passed at waves 1-2, and 3 of 3 alone): the `vb-toolbar-end` visually-hidden span holds 8 characters on the first open and 0 on the second, so the two layouts differ. Started with wave 3 (`ToolbarEnd.svelte` changed then). Find what fills that span, and make it settle before `layoutOf`, or the page's own timing right | READONLY_UI_01 (owns `chrome/**`, `tests/pages/**` wave 5) | Open |
| READONLY_01-R1 | READONLY_01 | `docs/specification/modules.md`: `npm run map` (new `server/editing.ts`, `#actions` `READ_ONLY` / `READ_ONLY_PERSON`) | orchestrator | Done (wave 4 gate) |
| READONLY_01-R2 | READONLY_01 | Agent text: `openapi.json` `list_boards` / `get_board` / `join` / `request_grant` / `write_board` descriptions, `apps/board/server/words/plugin-tools.ts`, `packages/mcp/src/words/info.ts`, `skills/vision-board/SKILL.md`: `readOnly: true` means read, don't write; a `read-only` 409 means nothing was written, tell the person in one line they can press Edit; then `npm run gen` and `eval:bot` | SKILL_01 (with LEDGERS_01-R4's schema files, alone in wave 6) | Open |
| READONLY_01-R3 | READONLY_01 | `apps/board/src/shell/chat-panel-types.ts` + `App.svelte`: pass `status.readOnly` as `ChatPanel.show(board, past, readOnly)`; the header Edit / Stop editing control on `page-io.ts` `editLedger` / `stopEditing` and `get_project` `readOnly` / `editing`; `packages/ui` node-core / region-core pause on `BoardState.readOnly` as on `locked` | READONLY_UI_01 (`packages/ui/**` added to its ownership in wave 5: no other wave-5 task touches it) | Open |
| READONLY_01-R4 | READONLY_01 | `apps/board/plugin/engine.ts`: `readOnly` in `PluginEngineOptions`; `Engine.watch` has no reset, but the board reads from the start on a change with head 0 (`live.ts`), so a host can pass a replaced file on that way | PLUGIN_RO_01 | Open |
| READONLY_01-R5 | READONLY_01 | `package.json` `dev` script: add `--edit` (or `VB_EDIT=1`) when `readOnlyStart` turns on (read-only skips `VB_SEED`) | orchestrator, at the close | Open |
| READONLY_01-R6 | READONLY_01 | A chat started while editing keeps running after Stop editing; its own file tools (`images/`, `apps/` under `agentAccessRules`, `packages/agent`'s gate) and an app's process (`call_app_tool`) are not stopped by read-only | VERIFY_01 (check; a finding goes to FIX_01) | Open |
| READONLY_01-R7 | READONLY_01 | `packages/client/src/project.ts` `ledgersIn` comment still names the removed `ledger-layout-rule.test.ts`; the rule is now shared by `ledgers.ts` | FIX_01 | Open |

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### Wave gates (orchestrator)
- Setup: plan committed alone on `main` (895f4b3); `feat/ledgers` cut; D-084, D-085 appended; flags `ledgerFolders`, `readOnlyStart` off; `ledgers:undo` script. `map`, `verify`, `check` green; `npm test` 2237 pass, 0 fail, 3 cancelled — all in `engine.test.ts`, the same on the plan commit without these changes (SETUP-R1); `test:timing` green.
- Wave 1: PATHS_01, ACCESS_01 merged (no conflict). `map` (format API row), `verify` ok, `check` 0 errors, `gen --check` current, `npm test` 2258 pass / 0 fail / 0 cancelled (SETUP-R1 Done), `test:plugin` 79/79. PATHS_01 was wide, so the full page suite ran: 842 passed, 4 failed, 10 did not run; the 4 are screenshots that fail identically on `ledgers/wave-0` (GATE1-R1). Requests PATHS_01-R1..R4 routed. Tag `ledgers/wave-1`.
- Wave 2: LEDGERS_01 merged. Orchestrator: `flags.ts` descriptions (LEDGERS_01-R2). `map` (no change), `verify` ok, `check` 0 errors, `gen --check` current, `npm test` 2288 pass / 0 fail, `test:plugin` 79/79. Wide, so the full page suite: 844 passed, the same 4 screenshots failed with the same pixel counts (GATE1-R1), 10 did not run. Accepted LEDGERS_01's small deviation: the move refuses when `main/` already holds a ledger file or an entry is in both places (not on any `main/`), so a move stopped part-way finishes on the next open; still never twice (decision 7). Requests LEDGERS_01-R1..R6 routed. Tag `ledgers/wave-2`.
- Wave 3: LEDGER_UI_01, LEDGERS_02 merged (no conflict). `map` (no change), `verify` ok, `check` 0 errors, `gen --check` current, `npm run build`, `npm test` 2302 pass / 0 fail, `test:plugin` 79/79. Full page suite: 864 passed, 1 failed, 10 did not run; the one is a timing flake in `host-styles.spec.ts` (passed 3 of 3 alone; GATE3-R1). The four screenshot failures of GATE1-R1 are gone (six re-taken by LEDGER_UI_01, the environment's glyph rendering, proven on f03ac48). Looked at LEDGER_UI_01's header shots at three widths, light and dark. Requests LEDGERS_02-R1..R4 and LEDGER_UI_01-R1..R3 routed. Tag `ledgers/wave-3`.
- Wave 4: READONLY_01 merged. `map` (READONLY_01-R1), `verify` ok, `check` 0 errors, `gen --check` current, `build`, `npm test` 2330 pass / 0 fail, `test:plugin` 79/79. Wide, so the full page suite: 866 passed, 1 failed (the same `host-styles` light test as wave 3; repeated, so GATE3-R1 goes to READONLY_UI_01), 10 did not run. Accepted READONLY_01's small deviations (read-only state set by the controller from reads; proposals, parking, attention and updates stay visible with their writes refused or in memory; `stop_editing` answers with the flag off; one sentence in `shell/words/chat.ts`, unowned in wave 4). Requests READONLY_01-R1..R7 routed. Tag `ledgers/wave-4`.
- Wave 5:
- Wave 6:
- Wave 7:
- Wave 8 and close:

## Completion Checklist

- [ ] All tasks complete; every request `Done` or `Closed`
- [ ] VERIFY_01 re-check: no blocking finding; flags on (PLAN decision 22), or the reason they stay off
- [ ] Full gates green on `feat/ledgers`; merged to `main`; tag `ledgers/done`
- [ ] Closing note to the maintainer (below) written
- [ ] Set LOG entry; `[needs-human-input]` LOG item for `.git/export-gitlab.sh`

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`.
2. Append the set entry to `cortex/LOG.md`, one line ending in a newline:
   `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: Ledgers and Read-only → Task: [[cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/TASK-STATUS.md]]`
3. Check `.git/export-gitlab.sh` (read only): its `git filter-repo` line should drop `--path .visionboard` whole (the
   maintainer's change of 2026-11-03). If it still names only `.visionboard/ledger.jsonl`, append
   `[[YYYY-MM-DD HH:MM]] [needs-human-input] .git/export-gitlab.sh still exports ledger folders: replace --path .visionboard/ledger.jsonl with --path .visionboard` (one line).
4. Write `CLOSING.md` in this folder for the maintainer: what changed, the flags' state, that the maintainer's own
   repo folder moves into `.visionboard/main/` the first time their board opens it with `ledgerFolders` on, how to
   undo (`npm run ledgers:undo -- <folder>`, the flags off, tag `checkpoint/before-ledgers`), and every finding left.
   It also proposes, for the maintainer's yes (protected files), the steering line "One server per ledger" becoming
   "One writing server per ledger; any number read it" in `.kiro/steering/vision-board-proj.md` § Running, and the
   tracker rows the set closes or opens.
5. `cortex-garden` picks the entries up later. Nothing here writes `AUDITED.md`.
