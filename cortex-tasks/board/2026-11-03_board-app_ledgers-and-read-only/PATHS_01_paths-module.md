# PATHS_01_paths-module: One paths module

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Every data-folder path in code comes from one module, `packages/format/src/data-folder.ts`, and nothing else names
`.visionboard` or a data-folder file. **No behaviour changes**: the layout on disk is today's; this task only
gives it one home, so LEDGERS_01 can change it in one place (PLAN decision 2).

## Context

Today the names are constants in about ten files, and several callers rebuild `<project>/.visionboard` themselves
or find the project by going two levels up from `ledger.file`. With `.visionboard/main/ledger.jsonl` those would
silently point at the wrong folder. Read PLAN.md (Decisions 1, 2, 6) and the notes above in TASK-STATUS.md first.

What exists (research, 2026-11-03; check each before relying on it):

| Name / expression | Where | Folder from |
|---|---|---|
| `DATA_DIR`, `LEDGER_FILE`, `ledgerPath(projectDir)` | `apps/board/server/ledger.ts` | rebuilds `<project>/.visionboard` |
| `path.join(dir, LEDGER_FILE)`, `path.join(dir, IMAGES_DIR)` | `apps/board/server/engine/engine.ts` `createEngine` | engine `dir` (keep: this is the right shape) |
| `AGENTS_FILE`, `openAgents(dir)`, `ignoreInGit(dir, name)` | `apps/board/server/agents.ts` | given `dir` |
| `LOCK_FILE`, `takeLock(dir, …)` | `apps/board/server/lock.ts`; callers `apps/board/server.ts` (top level) and `project.ts` `openProject().open` | callers rebuild `path.join(project, DATA_DIR)` |
| `CHAT_SESSIONS_FILE`, `openChatIndex(dir)` | `apps/board/server/chat-index.ts`; `chat-sessions.ts` `openChats` | `path.dirname(ledger.file)` |
| `PERMISSIONS_FILE`, `openPermissions(dir, root)` | `apps/board/server/chat-permissions.ts`; `openChats` | `dir` = dirname(ledger.file), `root = cwd = dirname(dir)` (two levels up) |
| `ATTACHMENTS_DIR`, `dayFolder`, `saveAttachment`, `attachedFile`, `saveBeside`; `TOP_STEPS` | `apps/board/server/chat-files.ts`; `chat-read.ts` | rebuilds `folder/DATA_DIR`; `TOP_STEPS` hard-codes the depth |
| `IMAGES_DIR`; `serveImage` | `packages/format/src/images.ts`; `apps/board/server/images.ts` | rebuilds from the project |
| `APPS_DIR`, `APP_STATE_DIR`; `appsDir(project)`, `appIds`, `readApp`; `stateFile(ledgerFile, …)` | `packages/format/src/apps.ts`; `apps/board/server/apps/manifest.ts`; `apps/board/server/apps/panel-state.ts` | apps: rebuilds from the project; state: dirname(ledger.file) |
| `RECENT_FILE`, `recentPath(home)` | `apps/board/server/recent.ts` | `~/.visionboard/recent.json`, the person's own |
| `secretElsewhere` | `apps/board/server/caller-folder.ts` | rebuilds `path.join(folder, DATA_DIR)` |
| `hold`: `data = path.dirname(ledger.file)`, `getDir = realPath(path.dirname(data()))` | `apps/board/server/project.ts` | two levels up |
| `hasBoard`, `countBoards` | `apps/board/server/folders.ts` | `ledgerPath` |
| `projectOf`, `hasBoard` | `packages/client/src/project.ts` | literal `'.visionboard', 'ledger.jsonl'` |
| `ledgerPath(VB_PROJECT ?? ROOT)` | `apps/board/bin/reply.ts` | rebuilds |

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (PATHS_01)
- **Files to reference**: the table above; `docs/decisions.md` D-059 and D-060 (module doors: `packages/format`
  is loaded by the page, so this module uses no `node:` import); `scripts/verify.mjs` (how a repo rule is written)
- **Patterns to follow**: `packages/format/src/images.ts` `IMAGES_DIR` (a layout name in format, used by server
  and page); one front door per module (`packages/format/src/index.ts`)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

## Steps

1. **The module, pure and with no `node:` import**: `packages/format/src/data-folder.ts`, exported from
   `packages/format/src/index.ts`. It holds every data-folder name (move `DATA_DIR`, `LEDGER_FILE`, `LOCK_FILE`,
   `AGENTS_FILE`, `CHAT_SESSIONS_FILE`, `PERMISSIONS_FILE`, `ATTACHMENTS_DIR`, `RECENT_FILE` here; `IMAGES_DIR`,
   `APPS_DIR`, `APP_STATE_DIR` move here and `images.ts` / `apps.ts` re-export them only if a caller outside
   format needs the old name) and these functions, joining with `/`:
   - `ledgerFolder(projectDir)`: the engine's `dir` (today `<project>/.visionboard`).
   - `ledgerFiles(ledgerDir)`: `{ ledger, agents, lock, images, apps, appState, gitignore }`.
   - `projectFiles(projectDir)`: `{ root, chatSessions, permissions, attachments }` (repo-wide, PLAN decision 6;
     today they equal the ledger folder's).
   - `projectOfLedger(ledgerDir)`: the project folder for a ledger folder. This replaces every "two levels up"
     (`project.ts` `hold` `getDir`, `chat-sessions.ts` `openChats` `cwd`, `panel-state.ts`). Today: the parent of
     `.visionboard`. Write it so LEDGERS_01 changes only this file for the new layout.
   - `homeFiles(home)`: `{ recent }`.
   Doc comment on each: what it gives, and that it is the only home of the fact.
2. **Unit tests first**, `packages/format/tests/data-folder.test.ts`: each function on a POSIX project path; that
   `projectOf…` inverts `ledgerFolder`; that nothing in it imports `node:`.
3. **Move every caller in the table onto it**, one file at a time, unit tests green after each: the server
   (`ledger.ts` `ledgerPath` becomes a thin call or goes; `server.ts`; `project.ts` `hold`, `open`; `lock.ts`
   callers; `agents.ts`; `chat-index.ts`; `chat-permissions.ts`; `chat-sessions.ts` `openChats`; `chat-files.ts`,
   `chat-read.ts` `TOP_STEPS` derived from the layout, not a literal; `images.ts` `serveImage`;
   `apps/manifest.ts`, `apps/panel-state.ts`, `apps/host.ts`; `recent.ts`; `caller-folder.ts` `secretElsewhere`;
   `folders.ts` `hasBoard`, `countBoards`), `packages/client/src/project.ts` `projectOf` `hasBoard`,
   `apps/board/bin/reply.ts`. Keep `createEngine`'s `path.join(dir, …)` shape but take the names from the module.
   Sentences that name the layout stay in their words files; where a sentence hard-codes `.visionboard/…`, make
   the path an argument of the words function so LEDGERS_01 can pass the real one.
4. **Test helpers onto it**: `apps/board/tests/api-harness.ts` (`startBoard`), `test-board.ts` (`startTestBoard`),
   `images-support.ts` (`imagesDir`), `app-support.ts` (`addApp`), `tests/pages/serve-boards.ts` (`templates`),
   `folder-server.ts` (`startFolderServer`), `app-server.ts` (`startAppServer`), `chat-server.ts`,
   `gallery-images.ts`. Then the test files with a literal `.visionboard` path (about 32 in `apps/board/tests`,
   2 in `packages/mcp/tests`, 8 under `tests/`; not `packages/agent`, which is ACCESS_01's): use the helpers or the
   module. Keep a literal only where a test checks the on-disk layout from outside (for example
   `repo-example-app.test.ts`, `packages/mcp/tests/project.test.ts`), with a one-line comment saying so.
5. **A repo rule**: `scripts/verify.mjs` fails when a file under `apps/` or `packages/` other than
   `packages/format/src/data-folder.ts`, a words file, a `*.schema.json`, `openapi.json` or a generated file contains
   the string `.visionboard` or a data-folder file name as a path; `packages/agent/src/access-rules.ts` is the one
   allowed exception (D-037), named in the rule. Test it the way the other verify rules are tested.
6. **Docs** (`cortex-docs`): `docs/specification/modules.md` is regenerated by the orchestrator (`npm run map`);
   say in your notes which docs name a constant you moved, and fix those claims in `api.md`, `apps.md` and `images.md`
   where they cite a symbol by file. `chat.md` is ACCESS_01's this wave: list its claims under `REQUESTS`.

## Validation

- [x] `npm run verify` (with the new rule; only `modules.md` awaits the orchestrator's `npm run map`), `npm run check`, `npm test` green; `npm run test:plugin` green
- [x] Page specs that start servers on folders: `tests/pages/*folder*.spec.ts`, `*app*.spec.ts`, `*image*.spec.ts`,
      `chat-panel.spec.ts` green; no screenshot changed
- [x] `grep -rn "'.visionboard'" apps packages --include=*.ts` finds only the module and the access rules (plus the agent's tests, D-037, and the marked tests of the layout from outside)
- [x] On a scratch project under the OS temp folder, the board starts, writes, serves a picture and an app exactly as before

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/paths-01`)

### Changes Made
- **The module**: `packages/format/src/data-folder.ts`, exported from `index.ts`, no import at all. Names
  `DATA_DIR`, `LEDGER_FILE`, `AGENTS_FILE`, `LOCK_FILE`, `IMAGES_DIR`, `APPS_DIR`, `APP_STATE_DIR`, `GITIGNORE_FILE`,
  `CHAT_SESSIONS_FILE`, `PERMISSIONS_FILE`, `ATTACHMENTS_DIR`, `RECENT_FILE`, and `DATA_FOLDER_NAMES` (all of them,
  for verify and for LEDGERS_01's ledger-name rule). Functions `ledgerFolder`, `ledgerFiles`, `projectFiles`
  (`''` gives project-relative paths: what an agent is told), `projectOfLedger`, `homeFiles`. The depth lives in
  one private `LEDGER_STEPS`: LEDGERS_01 changes `ledgerFolder` / `LEDGER_STEPS` and nothing else moves.
  `IMAGES_DIR` left `images.ts`; `APPS_DIR`, `APP_STATE_DIR` left `apps.ts` (no re-export: every caller used `#format`).
- **Tests first**: `packages/format/tests/data-folder.test.ts` (7): each function, `projectOfLedger` inverts
  `ledgerFolder` (POSIX, `\`, `/`, relative), names unique and every path ends in one, the file imports nothing.
- **Server**: `ledger.ts` (`DATA_DIR`/`LEDGER_FILE` gone; `ledgerPath` is a thin call), `engine.ts`, `agents.ts`
  (`openAgents`, `ignoreInGit`), `lock.ts`, `chat-index.ts`, `chat-permissions.ts`, `chat-sessions.ts` `openChats`
  (`projectOfLedger` + `projectFiles`, no "two levels up"), `chat-files.ts` (`ATTACHED = projectFiles('').attachments`;
  `attachedFile` checks the prefix, same shapes accepted and refused), `chat-read.ts` `TOP_STEPS` derived,
  `images.ts` `serveImage`, `apps/manifest.ts` `appsDir` + `APPS_FOLDER`, `apps/panel-state.ts`, `apps/host.ts`,
  `recent.ts` (`recentPath` thin), `caller-folder.ts` `secretElsewhere`, `folders.ts`, `project.ts` `hold` `getDir`
  and `open`, `server.ts`; `bin/reply.ts` unchanged (it already goes through `ledgerPath`).
  `packages/client/src/project.ts` `projectOf` (and `ProjectFs.path` no longer needs `join`).
- **Words take the path** (so LEDGERS_01 passes the real one): `server-chat.ts` `theFileCouldNotBe(attachments)`,
  `theNewFolderCouldNot(attachments)`; `apps-host.ts` `thereIsNoApp(id, appsFolder)` and
  `apps-manifest.ts` `linksOutsideTheAppsFolder(appsFolder)` (both were literals in code); `server-folders.ts`
  `noVisionBoardHere(displayName, ledgerFile)` (was a literal in `project.ts`). Same sentences as before.
- **Repo rule**: `scripts/verify-data-folder.mjs` `checkDataFolder`, run by `verify.mjs`, proven by
  `verify-data-folder.test.mjs` (6). It takes the names from the module itself (`#format`), strips comments, and
  fails a whitespace-free string literal under `apps/` or `packages/` (source and tests) that holds `.visionboard`
  or a dotted data-folder file name as a whole path step. Allowed: the module, `words/`, `*.schema.json`,
  `openapi.json`, `*.generated.*`, `packages/agent/src/access-rules.ts` (D-037), and a file marked
  `verify: data-folder-literal <reason>` (a test of the layout seen from outside). Pending (a warning, not a failure):
  `apps/board/src/gallery/attach-section.ts` (request R1).
- **Test helpers**: `images-support.ts` `imagesDir`, `app-support.ts` `addApp`, `tests/pages/serve-boards.ts`
  `templates`, `app-server.ts` `startAppServer`; `api-harness.ts`, `test-board.ts`, `folder-server.ts` already went
  through `ledgerPath`; `chat-server.ts`, `gallery-images.ts` build no path. 34 test files moved onto the module or
  marked (marked: `chat-files`, `chat-read`, `chat-read-notes`, `api-chat-files`, `chat-attach`, `chat-schema`,
  `pdf-pages` (attachment paths an agent sees), `api-chat-access`, `chat-approvals` (paths the agent's tools send the
  gate), `repo-example-app`, `packages/mcp/tests/project.test.ts`, and the page specs `chat-attach`,
  `chat-attach-pages`).
- **Docs**: `api.md` 161, `apps.md` § The folder and § Saving the panel's state, `images.md` § The folder now cite
  the paths module. Docs naming a moved constant: `packages/format/README.md` (`APPS_DIR` under apps.ts,
  `IMAGES_DIR` under images.ts; not this task's file: request R2). `modules.md`: only the `packages/format` API
  row changes (`* from data-folder.ts`); the orchestrator's `npm run map`.
- **SETUP-R1 done**: `apps/board/tests/engine.test.ts` "watch: a write through another engine…" holds the loop
  with an interval while it awaits the watcher (the ledger's follow timer is `unref`'d, `ledger.ts` `follow`); the
  engine is unchanged. The file: 13 pass, 0 cancelled (was 10 pass, 3 cancelled).

### Issues & Resolutions
- The orchestrator-owned `docs/specification/modules.md` is out of date until `npm run map`: `npm run verify`'s
  only failure in this worktree.
- No `timeout` on this machine: runs were limited with `perl -e 'alarm N; exec …'`.

### Caught Beyond the Brief
- `chat-sessions.ts` used `dirname(ledger.file)` as the chat's repo-wide folder: right today, wrong with ledger
  folders (it would have put chat sessions and permissions inside the ledger). Now `projectFiles(projectOfLedger(…)).root`.
- Sentences outside words files still name the layout (`packages/format/src/flags.ts` descriptions,
  `app-shape.ts`, `packages/actions/src/references.ts`); the rule leaves sentences to the words rule. With ledger
  folders `.visionboard/apps/` becomes `.visionboard/<ledger>/apps/`, so LEDGERS_01 should revisit them.
- `apps/board/server/words/plugin-tools.ts` matches the OpenAPI text `.visionboard/apps/`: it changes when that does.

### Deviations from Plan
- Small, by the principles: the rule lives in its own `scripts/verify-data-folder.mjs` (+ test), as
  `verify-style.mjs` does, so `verify.mjs` stays under 300 lines. `ProjectFiles` also has `gitignore` (the repo-wide
  folder's own git rules; tests and `ignoreInGit` callers need it). `packages/agent/tests/` is allowed by the rule as
  well as `access-rules.ts`: the agent package imports nothing from this repo (D-037), so its tests can only name
  the layout as the agent sends it; those files are ACCESS_01's this wave.

## On Completion

Notes; your row; one LOG line (`[board-app] PATHS_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
