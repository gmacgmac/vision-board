---
task_name: Ledgers and Read-only
created: 2026-11-03
completed:
status: planned
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
| 0 | SETUP | 0 | — | — (orchestrator) | Branch `feat/ledgers`; D-084 and D-085 appended from PLAN; flags `ledgerFolders`, `readOnlyStart` added off; script `ledgers:undo` added to `package.json` | Pending | |
| 1 | PATHS_01 | 1 | strong | Software engineer who refactors live systems — a move changes no behaviour, and the tests and screenshots are the proof; a second home for a fact is a bug waiting. | [One paths module](./PATHS_01_paths-module.md) | Pending | |
| 2 | ACCESS_01 | 1 | strong | Application security engineer — an agent never reads a secret because of where a file happens to sit; a rule is proven by a test that tries to break it, in every layout. | [Agent file rules for ledger folders](./ACCESS_01_agent-file-rules.md) | Pending | |
| 3 | LEDGERS_01 | 2 | strong | Backend engineer who owns storage migrations — data is moved once, by rename, recoverably, and never while another writer might hold it; the contract changes before the code. | [Ledgers on the server](./LEDGERS_01_ledgers-server.md) | Pending | |
| 4 | LEDGER_UI_01 | 3 | strong | Product designer who builds front-end — a new control earns its room at every width, reuses the pattern beside it, and has every state before anyone sees it. | [The ledger chip](./LEDGER_UI_01_ledger-chip.md) | Pending | |
| 5 | LEDGERS_02 | 3 | strong | Developer-tools engineer — an agent always knows which folder and ledger it is talking to, and a mismatch stops it with one clear sentence, never a silent write elsewhere. | [Agents find and name the ledger](./LEDGERS_02_agents-and-ledgers.md) | Pending | |
| 6 | READONLY_01 | 4 | strong | Backend engineer for shared data on synced folders — a reader writes nothing, a writer proves it holds the lock before its first line, and a replaced file is never trusted to have only grown. | [Read-only and Edit on the server](./READONLY_01_read-only-server.md) | Pending | |
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

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### Wave gates (orchestrator)
- Setup:
- Wave 1:
- Wave 2:
- Wave 3:
- Wave 4:
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
