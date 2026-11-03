# CONSOLIDATE_01_read-other-ledger: Read another ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

An agent's read tools take an optional `ledger`: the name of another ledger of the same project, read read-only,
so the agent can bring a throwaway ledger's work into the open one by drawing a summary there. No write ever reaches
the other ledger.

## Context

PLAN decision 9. LEDGERS_01 (the name rule, `ledgerFolder`), READONLY_01 (opening a ledger read-only, no lock, the
`readOnly` mark). The reads an agent uses: `list_boards`, `get_board`, `show_node`, `show_container`, `show_layout`,
`check_responses`, `list_open` (`packages/format/schema/openapi.json`; engine reads in `apps/board/server/engine/reads.ts`
and `packages/actions/src/reads.ts`). Agents are per ledger (decision 3): an agent joined on `main` has no identity in
`scratch`, so a read of another ledger is answered as an unmarked read (no `owed`, no `held`: those are about the
caller, D-083 rule 4) and says `ledger` and `readOnly: true`.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (CONSOLIDATE_01, wave 5)
- **Shared artifacts to reuse**: `ledgerNameProblem`, `ledgerFolder` (LEDGERS_01); the read-only opening (READONLY_01);
  never a second ledger reader
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Contract first**: `ledger` (optional string, the ledger name rule) on `list_boards` and `get_board` at least, and on
   any other read whose answer an agent needs to summarise a board (decide from the tool table; say which and why in
   your notes). `x-hosts`: standalone only (a host passes one `dir`, D-077). Tool descriptions say it is read-only and
   another ledger's. `npm run gen`.
2. **Failing tests first** (`apps/board/tests/api-read-ledger.test.ts`): reading `scratch` while `main` is open answers
   `scratch`'s boards, `ledger: "scratch"`, `readOnly: true`; `scratch`'s files are byte-identical after; a bad or
   unknown name is `invalid` / `not-found` in plain words; a write tool has no `ledger` input (refused if sent);
   with `ledgerFolders` off the input is refused.
3. **The read**: a small cache of read-only ledgers by name in `apps/board/server/project.ts` (opened on first read,
   followed while open, closed with the folder), reusing `openLedger` with writing off; the engine's read operations
   take the other ledger's state.
4. **Docs** (`cortex-docs`): `api.md` (reading another ledger); `api-reference.md` is generated.

## Validation

- [x] `api-read-ledger.test.ts` and `npm test` green (port 6900); `gen -- --check`, `verify`, `check` green
- [x] On a scratch project: an MCP agent joined on `main` reads `scratch`'s board and draws a summary on `main`

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5, worktree `feat/consolidate-01`)

### Changes Made
- **Which reads take `ledger`** (step 1): `list_boards`, `get_board`, `show_node`. Together they summarise a board: the
  boards, a board whole (cards, notes, answers, versions) and one card's versions and replies (not in `get_board`).
  Not `show_container` (its cards' detail is `show_node`'s, its list is in `get_board`), not `show_layout` (the
  arrangement: a summary is drawn fresh and the engine places it), not `list_open` / `check_responses` (the caller's
  own conversation: scoped to an agent that has no identity there, and `wait` on a ledger nobody writes through this
  server), not `read_ledger` (the person's), no write.
- **Contract**: `openapi.json` parameter `otherLedger` (`name: ledger`, query, `$ref` `project.schema.json`
  `ledgerName`, `x-hosts: ["standalone"]`, short description "Another ledger of this folder to read, read-only.") on the
  three reads; `list_boards` declares 404; `notFound` says "…region or ledger"; `list_boards` description "No input
  needed" (it was "No input", now untrue). Responses: `get-board-response` `ledger`, `show-node-response` `ledger` and
  `readOnly`; `list-boards-response` `ledger` and `common.schema.json` `readOnly` descriptions cover a read of another
  ledger. `npm run gen`: types, tool tables, CLI commands, `api-reference.md`. API version unchanged (as LEDGERS_01 and
  READONLY_01 left it).
- **Engine** (`server/engine/engine.ts`): `EngineOptions.otherLedger(name)` (host's; undefined = the open ledger);
  `namedLedger` takes `ledger` out of the params; `run` runs the read on that ledger with no caller (unmarked: no
  `owed`, no `held`), `ledgerName` = its name, `readOnly: true`, and adds `ledger` and `readOnly: true` to the answer.
  No `otherLedger` (flag off, a plugin host): `bad-request`, `words/http.ts` `oneLedgerHere`.
- **Host** (`server/project.ts` `otherLedgers`, passed by `hold` with `ledgerFolders` on): opens a ledger
  `listLedgers` lists with `openLedger(…, { readOnly: () => true })` on its first read (no lock, no agents file), keeps
  it while the folder is open (the engine `refresh`es it on every read, so another writer's lines and a replaced file
  are followed), clears it in `close` (switch, ledger switch). Unknown or data-folder name: `not-found`,
  `words/server-folders.ts` `noLedgerToRead` naming the folder's ledgers. The old layout's `main` is the open one.
- **Plugin refusal words**: `words/plugin-tools.ts` `inputRefusals` rows for `list_boards`/`get_board`/`show_node`
  `ledger` (with `botToolRules` on a host's bot is not given it; `bot-tool-rules.test.ts` requires the words).
- **Tests**: `apps/board/tests/api-read-ledger.test.ts` (10, red first: 9 failed before the code): the three reads
  named, read-only, unmarked for an agent whose id drew and is owed in scratch, every file of scratch's folder the
  same byte for byte and no lock / agents file; a line another writer appends followed; names (`bad-request`,
  `not-found` with the list, `images`, the open ledger as usual); a write with `ledger` is an unknown query parameter;
  the real `vb-mcp` joined on main reads scratch and draws a summary board on main; with `readOnlyStart` (open ledger
  read-only too); after a ledger switch main is the other; flag off; a host's engine with rules on and off.
- **Docs**: `api.md` new 113b (Reading another ledger), Operations rows for the three reads; `api-reference.md`
  generated.

### Issues & Resolutions
- Contract-held tests outside the brief's list needed the new input: `api-errors.test.ts` (its "undeclared status"
  example was list_boards 404, now declared: 401), `packages/cli/tests/help-format.test.ts` (show-node usage gains
  `[--ledger <string>]`), `scripts/gen-tools.test.mjs` (the inputs limited to standalone now include the reads'
  `ledger`), `packages/mcp/tests/tools.test.ts` (size budget raised on purpose: whole list 30,400 → 30,800,
  list_boards 600 → 700, get_board 1050 → 1100, show_node 1100 → 1150; the input's words were cut to one short
  sentence first). No wave-5 task owns these; each is a one-line change. See Deviations.
- `project.ts` is 316 lines (verify warns over 300); the cache's natural home is `ledgers.ts` (not owned): request.
- No `timeout` on this machine: runs limited with `perl -e 'alarm N; exec …'`.

### Caught Beyond the Brief
- With **both flags defaulted on** (a temporary local flip of `flags.ts`, reverted), 21 existing tests in
  `apps/board/tests` fail, identically without this task's changes (`git stash` baseline, same list): tests of the old
  layout and "flag off" tests that rely on the default (`api-project`, `api-folder-mismatch`, `api-read-only-open`,
  `api-read-only`, `api-ledgers` "ledgerFolders off…", …). PLAN decision 22 turns both on at the close: those tests
  need their flags made explicit first (this task's own "flag off" test passes `ledgerFolders: false` for that reason).
- `flags.ts` `ledgerFolders` description does not say an agent's reads may name another ledger (orchestrator's file).

### Deviations from Plan
- Small, by the principles. A bad ledger name is `bad-request` (400), not `invalid`: it is a query parameter, and
  every bad query value in the API is `bad-request` (`operations.ts` `readParam`); an unknown name is `not-found` as
  the task says. A data-folder name (`images`) is `not-found` too: no ledger has it.
- Four contract-coupled test files outside the File Ownership list were updated (Issues). The contract change made
  them fail, no other wave-5 task owns them, and leaving them red would fail the gate.

### Verification
- Tier: normal (contract, engine, server host; no page change). `npm run gen -- --check` current; `verify` ok (34
  warnings: `project.ts` 316 lines is this task's); `check` 0 errors (svelte-check and tsc). Unit suite (npm test's
  globs, 3 at a time, `VB_TEST_PORT=6900`): 2340 pass, 0 fail, 0 cancelled. Both flags defaulted on: `apps/board/tests`,
  `packages/mcp`, `packages/client`: the same 21 failures as the baseline without these changes, none new;
  `api-read-ledger` and `bot-tool-rules` 20/20. No page spec touched; `test:plugin` not run (a host's bot lists the same
  tools with `botToolRules` on).
- Scratch project: in `api-read-ledger.test.ts`, the real `vb-mcp` (cwd the two-ledger project, no `VB_PROJECT`)
  read `scratch`'s board with `ledger` and drew a summary board on `main` with main's secret; `scratch`'s folder
  unchanged byte for byte.

## On Completion

Notes; your row; one LOG line (`[board-agent] CONSOLIDATE_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
