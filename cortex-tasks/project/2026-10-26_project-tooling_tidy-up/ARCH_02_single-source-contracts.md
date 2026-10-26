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

1. [ ] **Typed client**: `npm run gen` also emits each operation's input and output types from the
   schemas; `call` is typed by `OperationId` so the caller writes no `T`. The client is made with a
   transport (`(path, init) => Promise<Response>`, paths relative to the board's route prefix), so the
   standalone page passes `fetch` on its origin and a host passes its `api`; it holds no origin itself. Replace `io.ts`'s hand-written
   types with the generated ones; the server's copy of `FolderEntry` imports the same. A type test fails
   when a schema and a caller disagree.
2. [ ] **Problems**: the problem schema is the source of codes and their HTTP status (an `x-` field);
   `server/problem.ts` `PROBLEMS` and `packages/client` `ProblemDocument` are generated from it;
   `PROBLEM_BASE` defined once; one `ProblemError` name per meaning.
3. [ ] **Server tables from gen**: `server/spec.ts` `securityOf` and `dispatch.ts` `NAMES` read a table
   `gen-api.mjs` emits, in the generator's own vocabulary (`authOf`).
4. [ ] **Card references**: one table of the fields that name a card (`n`, `nodes`, `cards`, …) beside
   `REFERENCES`, read both ways by `server/edge.ts` `cardsIn`, `server/write-refs.ts` `refsOf`/`resolve`,
   `packages/actions/src/numbers.ts` `eventOut` and `apps/board/src/board/card-numbers.ts` `answerEvent`.
   A test lists every event type's card fields from the schema and fails on a missing row.
5. [ ] **Tool declarations from the one source**: the table `gen-api.mjs` emits names, for every
   operation an agent may call, what a declared tool needs: its name, its words (the description, D-056),
   its input schema and whether it writes. `gen-mcp.mjs` reads that table; a later plugin manifest can be
   generated from it too (not built here). A test: every agent operation has one row, and no row lacks
   an operation.
6. [ ] **Constants once**: the ledger version from `LEDGER_FORMAT` (`server/schema.ts` `LEDGER_EVENT_ID`,
   `write-board.ts` `KEY_ID`); `writes.ts` `MAX_ITEMS` from the schema's `maxItems`; port 4466, the
   `VB_*` environment names and the `VB-Project` header each defined once (a constants module in
   `packages/format`), imported everywhere else.
7. [ ] `npm run gen`; `gen --check` green; tests failing first for 1, 2, 4 and 5.

## Validation

- [ ] No hand-written response type remains in `apps/board/src/board/io.ts`
- [ ] `grep` finds 4466, `VB_SERVER`, `VB-Project`, `PROBLEM_BASE` defined once each
- [ ] `npm test`, `npm run verify`, `npm run check`, `gen --check`; specs that call the API on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-format] ARCH_02: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_02_single-source-contracts.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
