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

- [ ] `npm run verify` (with the new rule), `npm run check`, `npm test` green; `npm run test:plugin` green
- [ ] Page specs that start servers on folders: `tests/pages/*folder*.spec.ts`, `*app*.spec.ts`, `*image*.spec.ts`,
      `chat-panel.spec.ts` green; no screenshot changed
- [ ] `grep -rn "'.visionboard'" apps packages --include=*.ts` finds only the module and the access rules
- [ ] On a scratch project under the OS temp folder, the board starts, writes, serves a picture and an app exactly as before

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] PATHS_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
