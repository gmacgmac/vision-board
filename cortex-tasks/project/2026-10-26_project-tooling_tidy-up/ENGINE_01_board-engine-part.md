# ENGINE_01_board-engine-part: The Board's Engine Part

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The board's server side is one HTTP-free engine, `createEngine(dir)`, giving routes, chip resolve,
tools and a ledger watcher, so nclite's engine can host it; the standalone server and the MCP server
are hosts of it, with behaviour unchanged.

## Context

PLAN § The Plugin Contract (nclite draft v0.1, `~/ai/nclite/docs/plugins.md` § Where each part runs;
the spike's `host/plugin-engine.ts` `PluginEngine` and `host/runtime.ts` `createRuntime`; read only).
Today the HTTP edge and the board are one: `apps/board/server/dispatch.ts` matches every `/api` request
against the generated route table and calls the handler table (`handlers.ts`) with the request, the
ledger, agents, chats and the app host; `ledger.ts` finds its file under the project (`DATA_DIR`
`.visionboard`, `ledgerPath`); `callers.ts` and `caller-folder.ts` turn a secret into a `Caller`. Under
nclite the edge is nclite's (its origin checks, its run door, the bot from its run ticket), the data is
the bot's `plugins/board/` folder, and the bot calls declared tools, not routes.

**The contract may bend to the board** (maintainer, 2026-10-26): build the shape the board needs, and
list each difference from the draft under `REQUESTS` for nclite. Known ones: tool inputs as full JSON
Schema (the draft's are flat strings and booleans; `write_board` takes a list of items); routes and
tools that may return a promise; a per-turn hook for the person's answers since the bot's last
message (`roundOf`); the watch event carrying the board and the ledger head.

Runs in wave 4 beside ARCH_03 (the page): you own the server side, it owns `apps/board/src/`.

## Inputs

- **Files to modify**: `apps/board/server/**` (a new `engine/` folder with its public file, and the
  edge files that become its host: `app.ts`, `dispatch.ts`, `handlers.ts`, `ledger.ts`, `callers.ts`,
  `caller-folder.ts`, `chat-prompt.ts`, `chat-round.ts`), `apps/board/server.ts`, `packages/mcp/src/**`
  (only where it reaches the board), their tests.
- **Files to reference**: the spike files above; `docs/principles.md` § The board is a plugin;
  `docs/specification/api.md` (agents, grants, the action layer); D-016 layers; D-027, D-034 (access).
- **Shared artifacts to reuse**: the typed client and tool table (ARCH_02), `Chip` and `resolveChip`,
  the board-data builder and queries (ARCH_04), module names (ARCH_01).
- **Skills**: `cortex-architecture` (rule 5: one layer, one interface; `references/contracts.md`).

## Steps

1. [x] **The engine's interface**, plain TypeScript, in the contract's shape where it fits:
   `createEngine({ dir, ... })` → `route(req)` (method, path relative to the board's prefix, query,
   body, and the caller; a reply of status and body), `resolve(kind, ref)` (ARCH_04's `resolveChip`),
   `turn(since)` (the person's answers since the bot's last message, `roundOf`: the board's addition),
   `tools` (one per agent operation in ARCH_02's tool table, input checked against its schema, the
   caller passed in), `watch(onChange)` (`{ board, head }` for each ledger change, from anyone). Promises
   are allowed. No `IncomingMessage`, no socket, no `process.env` inside it.
2. [x] **The data folder is given**: the ledger, its lock and any other board file live under `dir`;
   the standalone host passes `<project>/.visionboard`, a host like nclite passes the bot's
   `plugins/board/`. Nothing in the engine finds its own folder.
3. [x] **The caller is given**: the engine takes a `Caller` from its host. The standalone edge keeps
   today's secrets, `join` and grants and turns them into a `Caller`; under a host that already knows
   the agent (nclite's run ticket), the host passes it. What grants still protect with one bot per
   folder goes in your notes, for the handover reply.
4. [x] **The standalone server is one host**: `dispatch.ts` keeps the HTTP edge (Origin and Host checks,
   body limits, the route table, streams) and calls `route`; the change stream reads `watch`. The chat
   server, app host and folder switching stay in the standalone host. Behaviour, responses and pictures
   unchanged; `gen --check` green.
5. [x] **Tests with no HTTP server**: the engine on a temp folder answers a read route, a write route, a
   chip resolve (and its refusal), `turn`, each tool (and a refused input), and a watch event for a
   write made through another engine on the same folder.
6. [x] Note in `docs/specification/api.md` (via `cortex-docs`): the engine, what its host supplies, and
   each difference from nclite's draft.

## Validation

- [x] `grep` finds no `node:http` import and no `process.env` under `apps/board/server/engine/`
- [x] The engine tests pass; every API and MCP test passes unchanged
- [x] `npm test`, `npm run verify`, `npm run check`, `gen --check` (green but for ARCH_03's in-flight files); the page specs that write through the API on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27  

### Changes Made
- **Step 1, the interface** (`apps/board/server/engine/`, front door `index.ts`): `createEngine({ dir,
  ledger?, name?, onSend?, warn? })` gives `route(req)` (method, path relative to `ROUTE_PREFIX` with or
  without a leading slash, query, body as a value or a reader called with the operation's byte limit,
  caller, signal → `{ status, body, headers? }`, or null for a path that is not the engine's),
  `resolve(kind, ref)` (`resolveChip`, with a `gone` refusal for an unknown kind or a ref that is no
  object), `turn({ board, since, agent })` (`turnOf`), `tools` (one per tool-table row the engine
  serves, `tools.ts` `makeTools`: input checked with `schema.ts` `foreignSchemas` against the row's
  JSON Schema, split by its `route`, defaults filled, the caller passed in; `{ ok, result }` or
  `{ ok: false, problem }`), `watch(onChange)` (`{ board?, head }` per ledger change). Files:
  `engine.ts` (createEngine, `ENGINE_OPERATIONS`, `servesOperation`), `operations.ts` (`matchRoute`,
  `readParams`, `withDefaults` moved from dispatch.ts; `checkCaller`, `ONLY_PERSON`, the `Op`/`OpCtx`
  types), `reads.ts` and `writes.ts` (moved from `server/`, each handler answering a reply instead of
  writing a response; `checkBody`, `invalid`), `tools.ts`. No `node:http`, no `process.env` under
  `engine/` (grep).
- **Step 2, the folder is given**: the ledger is `<dir>/ledger.jsonl` and the agents' hashes
  `<dir>/agents.json`; the standalone host passes `<project>/.visionboard` and its already-opened
  ledger (taken under `lock.ts`). The ledger (`ledger.ts`) gains `refresh()` (reads whole lines another
  writer appended, checked as `readLedger` checks a line; run before every append and every engine
  operation) and `follow()` (counted `fs.watchFile` every `FOLLOW_MS` = 200 ms while anyone watches),
  so two engines on one folder share the fold and never repeat a `seq`.
- **Step 3, the caller is given**: the engine takes a `Caller` from its host and refuses one the
  operation does not take (`checkCaller`: never fires in the standalone server, whose `callers.ts`
  refuses first). The standalone edge keeps the cookie, secrets, `join` and grants.
- **Step 4, the standalone server is one host**: `dispatch.ts` keeps Host/Origin, matching and
  parameters (from the engine's front door), the folder header and the caller; `handlers.ts`
  `viaEngine` sends the engine's operations through `route` (body read here with `readJson`, a signal
  aborted when the response closes or the folder closes, `read_ledger` as JSON Lines when asked);
  `streams.ts` (new) holds `watch_board`/`watch_project` on `engine.watch` and `endWhenClosed`;
  `project.ts` gives each open folder a lazy engine (its `onSend` hands the chat session the Send,
  after the answer, as `writes.ts` did); `respond.ts` gains `sendProblem` (from problem.ts) and
  `sendReply`; `body.ts` gains `body(id, req, limit)` for the chat, folder and app routes. The chat
  server, app host and folder switching stay in the standalone host.
- **Step 5, tests**: `apps/board/tests/engine.test.ts` (7 tests, no HTTP server): a read route, a
  write route with the right and wrong callers and a bad body, `resolve` (card, note, changed, gone,
  unknown kind, bad ref), `turn` (none, answers, unknown board), every tool with the caller plus a
  refused input and an agent tool with no agent, `watch` of a write through a second engine on the same
  folder (and the watcher's next `seq` after it), and a held `check_responses` ended by the signal.
- **Step 6**: `docs/specification/api.md` points 159-163 (the engine, what the host supplies, the
  standalone host, MCP stays a relay, the differences from nclite's draft) and 131 (the prompt from
  chips; `turnOf` where `roundOf` was cited).
- **Routed requests**: ARCH_02-R3 (`FolderEntry` = `OperationOutput<'list_folders'>['folders'][number]`;
  `PROJECT_HEADER` from `#format`, read lower-cased; `ItemProblem` from `ProblemDocument`, `ProblemBody`
  gone); ARCH_02-R4 server part (`server.ts` `DEFAULT_PORT`, `ENV.*`; `vb-mcp.ts` `DEFAULT_SERVER`,
  `ENV.server`, `ENV.agentSecret`); ARCH_04-R4 server part (the private `clip` is gone: labels come from
  the chips); ARCH_04-R5 (`chat-prompt.ts` `promptFor` from `cardChip`/`noteChip`, the refusal's reason
  as the pointer detail, lower-cased with no full stop so a gone note or card reads as before; text from
  `resolveChip`; the line stays `- <chip detail>: <text>`; `boardBlocks` kept; `chat-sessions.ts`
  `unsaid` uses `turnOf`; the `hidden` refusal applies now); ARCH_01-R7 in part (the calculator skill
  test imports `compileSchema` from the engine's front door; the cli/mcp tests, see Issues).

### Verification
- `grep` under `apps/board/server/engine/`: no `node:http`, no `process.env`.
- `node --test apps/board/tests/engine.test.ts`: 7 pass. Every API test passes unchanged (348 server
  and API tests; then `npm test`: 1694 of 1697 pass, the 3 failures are `chat-bridge.test.ts`,
  `side.source is not a function`, ARCH_03's page work in flight; `test:timing` 10 pass).
- `node scripts/gen-api.mjs --check`: current. `npm run verify`: 1 failure,
  `apps/board/src/shell/page-io.ts` (ARCH_03's, in flight); none in my files. `tsc -p tsconfig.json`:
  one error, `apps/board/tests/chat-bridge.test.ts` (ARCH_03's `BoardSide.source`).
- Page specs on 4755 under `temp/pages.lock` (board, versions, proposals, group-note, person-remove,
  open-folder, current-folder, app-cards, app-alive, chat-panel, chat-send, live-boards, send-access,
  new-board; the set ARCH_02 ran): 153 passed, no screenshot changed, in the HEAD copy below.

### Issues & Resolutions
- **The shared page build is broken by ARCH_03's work in flight** (`card-images.ts` imports
  `imageVersion`, no longer exported by `io.ts`), so the page specs could not build in the worktree.
  I ran them in `temp/engine01-page/`: `git archive HEAD` with only my files laid over it
  (`apps/board/server/**`, `server.ts`, `engine.test.ts`, `packages/mcp`, the skill test) and the
  worktree's `node_modules` linked, under the lock. That proves the server change against the
  committed page; the orchestrator's full suite proves both together.
- **cli/mcp tests (ARCH_01-R7)**: packages may not import an app (D-016, verify's `imports an app`),
  and both test `vb` and `vb-mcp` against a real HTTP server, so they keep spawning
  `apps/board/tests/serve-fixture.ts` by path; the board they reach now answers through the engine.
  Their door by name is ENGINE_01-R1 (TEST_01). The calculator skill test imports from the engine's
  front door.
- A test ledger stand-in with no `file` (api-errors' broken ledger) made the folder's engine fail at
  start: the open folder now makes its engine on first use, as it did its agents store.
- `refresh` repeats `readLedger`'s per-line check (about 8 lines) because `#format` has no per-line
  export: ENGINE_01-R3.

### Caught Beyond the Brief
- An agent id with no `join` line is accepted as a writer (`a-zzzzzzzz` wrote a board; `bot-x` is
  refused by the id pattern). Under nclite the host should `join` once per bot folder and keep the id,
  or the bot has no label on the board. In the nclite reply (ENGINE_01-R4).
- `check_responses` held in the engine now also follows the file, so a Send written by another
  writer wakes it (none can in the standalone server, which holds the lock).
- The prompt's refusals: a removed card used to read "there is no card N"; it now reads "card N on
  board "b" was removed" (the chip's reason). A gone card or note reads exactly as before.

### Deviations from Plan
- MCP is not an in-process host of the engine: it stays a relay over HTTP to the standalone host
  (api.md 162). Hosting the engine in the agent's process would make a second writer on a folder
  the standalone server holds the lock for, found by the MCP's own upward search: the persona's
  "an engine that finds its own folder". The tool table is the one source for both lists.
- `turn` takes `{ board, since, agent }`, not `since` alone: a bot may have several boards, and the
  round is per board and per agent (`turnOf`).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-app] ENGINE_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ENGINE_01_board-engine-part.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
