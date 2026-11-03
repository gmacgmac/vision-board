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

- [ ] `api-read-ledger.test.ts` and `npm test` green (port 6900); `gen -- --check`, `verify`, `check` green
- [ ] On a scratch project: an MCP agent joined on `main` reads `scratch`'s board and draws a summary on `main`

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

Notes; your row; one LOG line (`[board-agent] CONSOLIDATE_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
