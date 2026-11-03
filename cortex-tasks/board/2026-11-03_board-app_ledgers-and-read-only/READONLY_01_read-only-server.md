# READONLY_01_read-only-server: Read-only and Edit on the server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With `readOnlyStart` on, a ledger opens read-only: no lock, nothing written into its folder, every read marked
`readOnly`, every write refused `read-only` before anything is written. Edit takes the lock at that moment or names
who holds it; Stop editing releases it. A followed ledger reopens when its file is replaced. The page's write paths
stop cleanly. Tests start in edit mode first, so nothing else breaks.

## Context

PLAN decisions 11-17. LEDGERS_01's notes first (the lock is per ledger). Research, 2026-11-03:

- **The one ledger choke point**: every line passes `Ledger.append` → `check()` in `apps/board/server/ledger.ts`,
  including the chat's (`chat-access.ts` appends `join`, `grant-request`, `grant`; `chat-sessions.ts` `tell` appends a
  `send` act). `dispatch.ts` sees every HTTP request but not the engine's `tools.call`; the engine's `run`
  (`engine.ts` `createEngine`: `namedCaller` → `checkCaller` → `ledger.refresh` → `OPS[id]`, errors through `toReply`)
  covers `route` and `tools`, not chat or app writes.
- **Writes outside the ledger**: `join` writes `agents.json` (`agents.ts` `store.add`) *before* its ledger line;
  `answer_approval`, `forget_permission` (`chat-permissions.ts`); `attach_chat_file` (`chat-files.ts`); `chat-index.ts`
  (`chat-sessions.json`); `put_panel_state` (`apps/panel-state.ts`); `open_project` (`recent.ts`, the lock). Under
  decision 13 the per-ledger ones are refused first (agents, panel state, the lock); the repo-wide chat files may
  still be written.
- **D-043, which stays untouched**: `packages/actions/src/lock.ts` `writeProblem` (archived, then locked; `passesLock`
  lets `seen`, `PRIVATE_ACTIONS` (flags) and `APP_ACTIONS` through), its words (`actions/src/words/actions-refusals.ts`),
  `apps/board/server/visibility.ts` (`requireUnlocked`, `refuseLocked`, `isLocked`), 423 `locked`
  (`packages/format/schema/api/problem.schema.json` `$defs/codes.locked`, generated into `operations.generated.ts`
  `PROBLEMS`, `ProblemCode`; read by `apps/board/server/problem.ts`). The "ruling 7" test in
  `apps/board/tests/api-lock-person.test.ts` allows `.locked` / `boardLocked` only in `visibility.ts` and `lock.ts`,
  and `writeProblem` only in `ledger.ts`: name everything here `readOnly`, never `locked`.
- **Reads that carry a state today**: `list_boards` (`packages/actions/src/reads.ts` `boardList`,
  `list-boards-response.schema.json` `boards[].locked`), `get_board` (`apps/board/server/engine/reads.ts` `getBoard`,
  `get-board-response.schema.json` `locked`); the page gets `BoardState` from `packages/actions/src/board-state.ts`.
- **The contract walk**: `apps/board/tests/api-lock.test.ts` with `contract-walk.ts` (`agentOps`, `answer`): it walks
  every agent operation. Copy its shape for read-only.
- **Locks at start and switch**: `server.ts` takes the lock at start and exits when it is held; `project.ts`
  `openProject` / `hold` and `open_project` take one on a switch; the heartbeat (`lock.ts` `BEAT_MS`) runs over
  `cur.lock`. `startTestBoard` (`apps/board/tests/test-board.ts`) passes no lock ("tests take none").
- **Engines without a lock**: the plugin's hosts and `eval:bot` (`tests/evals/bot/host.ts`) have none. The engine's
  read-only option defaults to off, or nclite and the eval break.
- **The page**: `controller.ts` `sender` (`refusal` is `versions.state ? READ_ONLY : lock.refuse`; `sender.ts` calls
  itself "the one funnel"); `readOnly: () => !!versions.state` is passed to attention, proposals, updates, parking,
  chat-side and commands `barButtons`; words `words/send.ts` `thisIsAPastVersion`. Writes that bypass `sender`:
  `attention`'s `markBoardSeen` (calls `io.markBoardSeen`), card-seen marks on select, and the chat's Send record
  (server side). The chat panel's blocked reason: `apps/board/src/shell/chat-rules.ts` `blockedReason(board, past,
  refused, archived)` → `ChatHost.blocked` (`packages/chat/src/conditions.ts`, `composer-core.ts` `shut`).
- **Following**: `ledger.ts` `follow`, `FOLLOW_MS` 200, `refresh` reads only growth (`now <= size` returns).
  The page follows through `watch_project` / `watch_board` (`streams.ts`, a `change { seq }` per change).

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (READONLY_01, wave 4)
- **Files to reference**: the Context above; `docs/specification/api.md` (callers, errors, the locked board);
  `apps/board/tests/api-lock.test.ts`, `api-lock-person.test.ts`, `contract-walk.ts`
- **Shared artifacts to reuse**: `data-folder.ts`; the lock per ledger and `open` from LEDGERS_01; `takeLock`,
  `holderMessage` as they stand
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Tests start in edit mode, first, before any default changes**: a `BoardServerOptions` member (`edit: true`) used
   by `startTestBoard`, `startBoard` (`api-harness.ts`) and `tests/pages/serve-boards.ts`; with `readOnlyStart` on,
   the full unit suite and a sample of page specs pass unchanged. Commit nothing; note the run.
2. **Contract**: the problem `read-only` (HTTP 409) in `problem.schema.json` (`npm run gen`); `readOnly: true` on
   `get_board`, `list_boards` and `get_project` (only when true, like `locked`); `get_project` also answers `editing`
   (`{ here: true }` when this server holds the lock, or `{ host, since }` from the live lock of another); operations
   `edit_ledger` (POST `/api/project/edit`: take the lock) and `stop_editing` (DELETE): the person's only, an agent
   is `forbidden`. Words for `read-only` in the server's and actions' words files: what happened and that the person
   can press Edit, never "locked".
3. **The gate**: `openLedger` gains a writable switch (default writable, so hosts and the eval are unchanged); `append`
   checks it first and throws `read-only`, before `stamp`. The engine takes `readOnly` (`EngineOptions`, a function so
   the standalone host can flip it on Edit). Refuse before any side effect in the writes outside the ledger that
   touch the ledger's folder: `join` (before `store.add`), `put_panel_state`, `request_grant`, `write_board`'s
   up-front checks. The chat: a message on a read-only ledger records no Send (the `isLocked` path in
   `chat-sessions.ts`, widened by a read-only check of its own); starting a chat that needs a `join` or grant line
   is refused with the read-only words.
4. **The contract walk**: `apps/board/tests/api-read-only.test.ts` (new), shaped on `api-lock.test.ts`: every agent
   write and every person write operation answers 409 `read-only` and writes nothing (the ledger file's bytes, the
   agents file and the folder listing unchanged); every read answers as before plus `readOnly: true`; `locked`
   boards still answer `locked` in edit mode, and flags still work on them (D-043 unchanged).
5. **Start, switch, Edit, Stop editing**: with the flag on, `server.ts` opens without the lock (no exit when one is
   held; it shows `editing` instead); `--edit` / `VB_EDIT=1` takes it at start as today. A switch opens read-only and
   releases any lock held. Edit: `takeLock` on the ledger folder at that moment; refused → 409 `conflict` with
   `holderMessage`, still read-only. Stop editing: release and flip to read-only. The heartbeat runs only while a lock
   is held. Tests for each, including Edit refused by a live lock of "another computer" (fake `LockEnv`).
6. **Replacement**: `refresh` also notices a file that shrank, or whose first bytes changed since the last read
   (keep a short head digest), and then reopens the ledger from the file and sends `reset` on the streams; the page
   (`apps/board/src/board/live.ts` and `shell/page-host.ts`) catches up from zero on `reset`. Tests: grow, replace
   with a longer history, replace with a shorter one, replace while a line is half-written.
7. **The page's write paths**: the board learns read-only from the reads (`readOnly` into `BoardState`,
   `packages/actions/src/board-state.ts` `boardState`), never from the standalone shell, so a plugin host gets it with
   no seam change. Widen the existing past-version read-only path to "past version or read-only ledger"
   (`controller.ts` `sender` refusal, the `readOnly` given to attention, proposals, updates, parking, chat-side,
   commands); `markBoardSeen` and card-seen marks do not write while read-only (seen stays in memory); flags refused
   (not through `passesLock`); the chat panel's `blockedReason` gains read-only for Send. Words in the page's words
   files. The header control itself is READONLY_UI_01's; here only the paths stop, and a tooltip-level reason exists.
8. **Docs** (`cortex-docs`): `api.md` (read-only, `read-only` 409, Edit and Stop editing, `editing`, `reset`);
   `components.md` and `chat.md` where they state what a locked board pauses (add read-only beside it).

## Validation

- [ ] `npm test` green with `readOnlyStart` on and off; `api-read-only.test.ts` walks every operation; `api-lock*.test.ts` unedited and green
- [ ] `npm run gen -- --check`, `verify`, `check` green; `npm run test:plugin` green (the engine's default unchanged)
- [ ] Page specs of write paths (`lock-board.spec.ts`, `new-board.spec.ts`, `chat-panel.spec.ts`, `notes*.spec.ts`) green
- [ ] A scratch project: two servers on one folder (one `--edit`, one read-only); the reader follows every line and a
      replaced file; the reader's Edit is refused naming the writer; after the writer stops editing, the reader's Edit works

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

Notes; your row; one LOG line (`[board-app] READONLY_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
