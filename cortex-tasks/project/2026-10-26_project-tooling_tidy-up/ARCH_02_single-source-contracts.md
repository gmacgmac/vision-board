# ARCH_02_single-source-contracts: One Source Per Contract

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Every contract has one source; everything else is generated from it or tested against it.

## Context

Review §3. Runs in wave 3 beside UI_01 and ARCH_04: touch only your files (TASK-STATUS File
Ownership). `boardData`/`getBoard` (one board-data builder) is ARCH_04's, not yours. The chat
server's own types are out of scope (PLAN § Out of Scope); chat operations still get generated types
like every other operation.

nclite's plugin contract (PLAN § The Plugin Contract) calls the board's routes through `host.api(path,
init)` under `/api/bots/{bot}/plugins/board/`, and declares the bot's tools in a manifest. So the
client takes its transport instead of owning one, and the operations table carries what a tool
declaration needs. Where the contract's shape is too narrow for the board (its tool inputs are flat
strings and booleans; `write_board` takes a list of items), keep the board's full JSON Schema and list
the gap under `REQUESTS` for nclite; do not flatten a schema to fit.

## Inputs

- **Files to modify**: as listed for ARCH_02 in TASK-STATUS File Ownership.
- **Files to reference**: `packages/format/schema/openapi.json` (the source), `scripts/gen-api.mjs`
  (`OPERATIONS`, `authOf`), `packages/client` `Client.call`, `apps/board/src/board/io.ts` (its
  hand-written `FolderInfo`, `FolderEntry`, `FolderList`, `ChatSessionInfo`, `ActFields`, `BoardFields`,
  `BoardData`), `apps/board/server/folders.ts` `FolderEntry`, `packages/actions` `REFERENCES`.
- **Shared artifacts to reuse**: the module names from ARCH_01.
- **Skills**: `cortex-architecture` (rule 4, `references/contracts.md`).

## Steps

1. [x] **Typed client**: `npm run gen` also emits each operation's input and output types from the
   schemas; `call` is typed by `OperationId` so the caller writes no `T`. The client is made with a
   transport (`(path, init) => Promise<Response>`, paths relative to the board's route prefix), so the
   standalone page passes `fetch` on its origin and a host passes its `api`; it holds no origin itself. Replace `io.ts`'s hand-written
   types with the generated ones; the server's copy of `FolderEntry` imports the same. A type test fails
   when a schema and a caller disagree.
2. [x] **Problems**: the problem schema is the source of codes and their HTTP status (an `x-` field);
   `server/problem.ts` `PROBLEMS` and `packages/client` `ProblemDocument` are generated from it;
   `PROBLEM_BASE` defined once; one `ProblemError` name per meaning.
3. [x] **Server tables from gen**: `server/spec.ts` `securityOf` and `dispatch.ts` `NAMES` read a table
   `gen-api.mjs` emits, in the generator's own vocabulary (`authOf`).
4. [x] **Card references**: one table of the fields that name a card (`n`, `nodes`, `cards`, …) beside
   `REFERENCES`, read both ways by `server/edge.ts` `cardsIn`, `server/write-refs.ts` `refsOf`/`resolve`,
   `packages/actions/src/numbers.ts` `eventOut` and `apps/board/src/board/card-numbers.ts` `answerEvent`.
   A test lists every event type's card fields from the schema and fails on a missing row.
5. [x] **Tool declarations from the one source**: the table `gen-api.mjs` emits names, for every
   operation an agent may call, what a declared tool needs: its name, its words (the description, D-056),
   its input schema and whether it writes. `gen-mcp.mjs` reads that table; a later plugin manifest can be
   generated from it too (not built here). A test: every agent operation has one row, and no row lacks
   an operation.
6. [x] (in my files; the rest is REQUESTS) **Constants once**: the ledger version from `LEDGER_FORMAT` (`server/schema.ts` `LEDGER_EVENT_ID`,
   `write-board.ts` `KEY_ID`); `writes.ts` `MAX_ITEMS` from the schema's `maxItems`; port 4466, the
   `VB_*` environment names and the `VB-Project` header each defined once (a constants module in
   `packages/format`), imported everywhere else.
7. [x] `npm run gen`; `gen --check` green; tests failing first for 1, 2, 4 and 5.

## Validation

- [x] No hand-written response type remains in `apps/board/src/board/io.ts`
- [ ] `grep` finds 4466, `VB_SERVER`, `VB-Project`, `PROBLEM_BASE` defined once each
- [ ] `npm test`, `npm run verify`, `npm run check`, `gen --check`; specs that call the API on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 (page specs on 4720 below)  

### Changes Made
- **Typed client (1)**. `scripts/gen-types.mjs` (new) writes `packages/format/src/api-types.generated.ts`:
  each operation's input (path and query parameters by name, `body`) and output (its 2xx JSON answers)
  from openapi.json and the schemas. A `$ref` to an object, union or long enum gets a module-local name
  (no clash with a hand-written type beside it); `if`/`then`, patterns and bounds are not types (looser,
  never tighter; ajv stays the control); a schema that says nothing is `JsonValue`. Exported through
  `operations.generated.ts` (already on `#format`'s front door): `OperationTypes`, `OperationInput`,
  `OperationOutput`, `ProblemDocument`, `PointerError`. `packages/client` `Client.call<Id>(id, input,
  opts)` returns `OutputOf<Id>`; a relay holding a run-time id (`vb`, MCP) gets `CallInput` in and
  `unknown` out, so `packages/cli` and `packages/mcp` compile unchanged. The client takes a
  `Transport` (`(path, init) => Promise<Response>`, path relative to `ROUTE_PREFIX`); `httpTransport`
  is the standalone one; `base`/`fetch` still build it for callers that have nothing else.
  `buildRequest` returns `path` (relative), not `url`; `pathFor` new. `apps/board/src/board/io.ts`:
  every `<T>` gone; `ActFields`, `BoardFields`, `RetireFields`, `ChatSessionInfo`, `ChatMessageBody`,
  `FolderInfo`, `FolderList`, `FolderEntry` are aliases of the generated types; the page passes its
  transport (and the keepalive client wraps it). Type test: `packages/client/tests/typed-call.test.ts`
  (`@ts-expect-error` per disagreement; the act body's actions equal `ActionId`).
- **Problems (2)**. `problem.schema.json` `$defs/codes`: each code as a property with its status as
  `const` and its `title` (a plain schema, not an `x-` keyword: see Deviations). `scripts/gen-contract.mjs`
  (new) emits `PROBLEM_BASE` (from `$defs/code`'s pattern), `PROBLEMS`, `ProblemCode`, and fails `gen`
  when the pattern and the table list different codes. `server/problem.ts` reads them; `ProblemBody` is
  an alias of the generated `ProblemDocument`; `ProblemExtras` takes the schema's types. The client's
  `ProblemError` interface (a pointer error) is gone: `PointerError` on both sides, `ProblemError` only
  the server's thrown class, `ApiProblem` the client's (`packages/client/src/problem.ts`, new).
- **Server tables (3)**. `authOf` gains `optional-agent` (an empty requirement beside `agentSecret`:
  `list_open`, `check_responses`); `server/spec.ts` `security` is `OPERATIONS[id].auth` (`securityOf`
  gone), `agent` is `xAgent`. `dispatch.ts` `NAMES` → generated `PATH_WORDS` (gen-contract
  `PATH_WORDS`; a new path parameter fails `gen` until it has words).
- **Card references (4)**. `CARD_FIELDS` and `cardFields(type)`, generated from the schemas (gen-contract
  `cardFieldsOf`: every ledger event type's stored and sent forms, then write item forms that are no
  event, i.e. `append`; a field is a card when it `$ref`s `nodeNumber`/`nodeRef` or lists them). Read by
  `server/edge.ts` `cardsIn` (now takes the line type), `write-refs.ts` `refsOf`/`resolve` (a region's
  `center` through the table, not a special case), `packages/actions` `eventOut`, the page's
  `answerEvent`. Test: `packages/format/tests/card-fields.test.ts` (a row per event and item type, a
  plain file scan finds no card field missing, the table as it stands).
- **Tool table (5)**. `scripts/gen-tools.mjs` (new) writes `packages/format/src/tools.generated.json`:
  per x-agent operation `name`, `title`, `description` (the words), `input` (merged, standalone,
  without the secret), `writes`, `secret`, `route`. `gen-mcp.mjs` reads it and adds MCP's own (the
  `secret` argument and its words, annotations): `packages/mcp/src/tools.generated.json` is
  byte-identical. Tests: `scripts/gen-tools.test.mjs` (one row per agent operation, none without one;
  `write_board` keeps its full items schema; the MCP list is made row for row).
- **Constants (6)**. `server/schema.ts` `LEDGER_SCHEMA_BASE`/`LEDGER_EVENT_ID` and `write-board.ts`
  `KEY_ID` from `LEDGER_FORMAT`; `writes.ts` reads `write_board`'s `items.maxItems` from its schema.
  Generated from openapi.json: `PROJECT_HEADER` (its one header parameter), `DEFAULT_SERVER` and
  `DEFAULT_PORT` (`servers[0]`), `ROUTE_PREFIX`. `packages/format/src/constants.ts` (new) `ENV`: the
  `VB_*` names, once. The client sends `PROJECT_HEADER`.
- **7**. Tests for 1, 2, 4, 5 are new and fail on the old code (no generated types/table/rows);
  `gen --check` current.
- **Verification**: `npm test` 1690 + 10 pass; `npm run check` 0 errors; `gen-api --check` current;
  `verify` fails only on `docs/specification/modules.md` (`npm run map`, orchestrator). Page specs on
  4720 (board, versions, proposals, group-note, person-remove, open-folder, current-folder, app-cards,
  app-alive, chat-panel, chat-send, live-boards, send-access, new-board): 153 passed, no screenshot
  changed. An earlier run whose filter matched every spec (the worktree path holds `board`) showed only
  `app-gallery`'s code caption in a darker colour: UI_01's CSS in progress, not this task (no CSS,
  HTML or Svelte changed here). Stopping that run left `temp/pages.lock` behind for about half an
  hour; I removed it (it was mine).

### Issues & Resolutions
- Not all of step 6 is in my files. Defined once now: `PROBLEM_BASE`, the ledger version, `MAX_ITEMS`,
  `PROJECT_HEADER`, `DEFAULT_PORT`/`DEFAULT_SERVER`, `ENV`. Still a second copy, in files I don't own
  (REQUESTS): 4466 in `apps/board/server.ts`, `packages/mcp/bin/vb-mcp.ts`, `packages/cli/src/globals.ts`;
  `VB_SERVER`/`VB_*` read by name in those and `apps/board/bin/reply.ts`, `packages/cli/src/run.ts`;
  `'vb-project'` in `apps/board/server/caller-folder.ts`. `ENV` needs `export * from './constants.ts'` in
  `packages/format/src/index.ts` first; until then nothing imports it (its test imports it in place).
- `docs/specification/api-reference.md` now says "who: undefined" for `list_open` and
  `check_responses`: `scripts/gen-reference.mjs` `WHO` has no `optional-agent` row (not my file).
- The server's `FolderEntry` (`apps/board/server/folders.ts`, not my file) is still hand-written; the
  page's is generated. One line (REQUESTS).
- `BoardData` stays in `io.ts`: it is the page's own model built from the fold (`BoardState` with Maps),
  not an answer of the server, and ARCH_04 owns its builder; it belongs beside that builder.
- `example` on a problem: the schema says any JSON (`JsonValue`); `examples.ts` hands `unknown`, so
  `ProblemExtras.example` stays `unknown` and is cast at the one place the body is built.

### Caught Beyond the Brief
- `ActionId` (the registry) and the act schema's `action` enum are proved the same type
  (`typed-call.test.ts`), and so is the folder entry the page reads.
- The card table covers `append`, a write item that names a card and is no ledger event; the old
  `refsOf` caught it only because its default was `n` for any type.
- `operations.generated.ts` stays the one generated door on `#format`; the new types file is
  reached through it (`export type { … } from './api-types.generated.ts'`), so `#format`'s front door
  needed no edit.

### Deviations from Plan
- Problem codes: the source is a plain schema (`$defs/codes`, status as `const`, `title`), not an `x-`
  field: strict ajv (server, `openapi-ajv.ts`, the MCP tests) refuses an unknown keyword wherever it
  compiles one. Same table, valid JSON Schema.
- The card-reference table is generated into `#format` (`CARD_FIELDS`) from the schemas, not a hand
  table beside `REFERENCES` tested against them: one source, and `packages/actions/src/index.ts` (and
  every other reader) needed no new export. The test still lists every type's card fields from the
  schema and fails on a missing row.
- The tool table is `packages/format/src/tools.generated.json` (JSON, Node-side, out of the page
  bundle). ENGINE_01 needs its path: `TOOLS_FILE` on `#format/files` (REQUESTS).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-format] ARCH_02: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_02_single-source-contracts.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
