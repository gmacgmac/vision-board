# BE_03_permissions: Permissions table, board access

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 3;
> rulings 3, 4) · **Decision**: D-034 (accepted before starting) · **Builds on**: BE_02 ·
> **Model**: Opus 5.5

## Objective

Write permission becomes a table with a tested row per kind of write, and an agent needs the
board before it can write anything on it.

## Rulings (do not reopen)

1. **Index**: `LedgerIndex` records each board's creator (the agent on its `board` line) and its
   holders: the creator, agents granted the board, and, so every existing ledger stays valid,
   any agent that holds a container on it. Revoke works on a board as on a container.
2. **Contract first**: `grant-request` and `request_grant` take `region` as optional; without it
   the request is for the board. `act` `grant`/`deny` answer either kind; `revoke` takes an
   optional `region`. Schemas, OpenAPI (minor bump), regenerate, `api.md` 23-27 rewritten as new
   points appended (do not renumber; mark the old ones replaced), MCP and `vb` descriptions say
   to ask for the board first.
3. **Table**: `packages/actions/src/permissions.ts`, `PERMISSIONS: Record<WriteKind, Rule>`, each
   row returning `'ok'` or what to ask for (`{ board }` or `{ board, region }`):
   - `board`: a new id is ok (the writer becomes creator); an existing id only for its creator
     (the context check still refuses a second `board` line; keep that, and the row states the
     future rule).
   - `region`: new on a board the agent holds, ok; existing, its container grant.
   - `node`, `link`, `unlink`, `reply`, `propose`, `park`: the board first, then today's container
     rule (from `scopeOf`).
   `canWrite` stays as a one-line call so `write-board.ts`, `pending.ts` and `reads.ts` don't move.
4. **Page**: the request strip (`apps/board/src/board/access.ts`, `AccessRequests.svelte`) shows a
   board request as "wants to draw on this board"; Allow and Refuse work the same; holders on the
   board are listed in the board's settings (toolbar) — keep it minimal, behind `agentAccess`.

6. **Every row is proven**: a coverage test iterates over the table's keys and fails if any row
   has no test case (maintainer, 2026-10-07: the test proves the implementation works when it is
   built and on every run after).

## Steps

1. [x] Tests first: a test per table row (`packages/actions/tests/permissions.test.ts`); the
   old `grants.test.ts` cases still pass; every fixture ledger folds with no write that worked
   before now refused; API tests: an agent writing to another agent's board gets `needs-grant`
   with `{board}`, asks, is granted, writes; a board revoke stops it.
2. [x] Index, contract, table, server answers, page strip.
3. [x] `vb` and MCP help text regenerated; skill notes (`skills/vision-board/NOTES.md` § Access)
   updated to the two-level rule.

## Validation

- [x] The five gates exit 0; `npm run gen -- --check` shows MCP and `vb` match the spec.

## Implementation Notes

**Status**: Completed (2026-10-07)

- **Table**: `packages/actions/src/permissions.ts` (84 lines): `PERMISSIONS` typed
  `{ [K in WriteKind]: Rule<K> }`, each row answering `'ok'`, a `Need` (`{ board }` or
  `{ board, region }`) or `'creator'`; `canWrite` is the one-line call (write-board, pending, reads
  unchanged). `WriteItem` moved here from `grants.ts`, whose `switch` is gone; `holders` and
  `creatorOf` take an optional `region` (no region = the board).
- **Index** (`packages/format/src/ledger-index.ts`): board creator and holders live in the same
  `creators` / `holders` maps, keyed by the new `accessKey(board, region?)` (board id, or
  `containerKey`). A v3+ `board` line makes its writer creator and holder; creating a region, or a
  grant on a container, also holds the board (ruling 1, recorded when it happens, so a board revoke
  can take it away); a board grant adds the board; `revoke` with no `region` removes it.
  `revokeProblem` is the one revoke check, used by `contextProblems` and `validateAct`.
- **Interpretation (not a deviation)**: when both the board and an existing container are missing,
  the answer names the container (`{ board, region }`), since its grant brings the board; so every
  old `grants.test.ts` refusal (C asking for `b/r`) is unchanged. Board first holds otherwise: an
  agent revoked from the board can write nothing there, its own containers and authored cards too.
- **Board row**: an existing board's line for a non-creator answers `'creator'` → per-item
  `forbidden` ("Only the agent that created board … can change its title and summary"); the creator
  still reaches the context check's "already exists".
- **Contract**: ledger v8 (api.md 11: every ledger schema change bumps it; all `$id`s to
  `ledger/8/`), `grant-request.region` optional, `revoke` needs `holder` + `board` only; OpenAPI
  1.6.0: `request_grant` and `grant-response` `region` optional, `get_board` adds `boardHolders`
  (one `$defs/holder` shared with `holders`), `requests[].region` optional, `join`/`request_grant`/
  `write_board` descriptions and the MCP instructions say to ask for the board first. api.md 81-86
  appended; 23-26 marked replaced, 27 kept in 86; error table rows for `forbidden` and
  `needs-grant`. `npm run gen` regenerated the route table, MCP tools, `vb` table, api-reference.
- **Server**: `request_grant` takes no `region` for a board; `checkGrant` words a board need
  ("…Call request_grant once with just the board…") and keeps the container wording.
- **Page** (behind `agentAccess`): strip row "<agent> wants to draw on this board" (shared
  `askWords` for the row and the announcement), Allow/Refuse unchanged; a new `BoardAgents.svelte`
  "Agents N" disclosure in the toolbar lists `boardHolders`, creator marked, others with Remove
  access (confirm, then `revoke` with no region). `Board.answer` became `Board.access` (the
  `AccessFlow`), keeping controller.ts at 300 lines. Gallery: two v8 lines (a board request on
  `gallery`, a granted board request on `notes`) and an "Agents on the board" sample; agent-access
  and see-through baselines updated on purpose (see-through moved by sub-pixels only), viewed in
  light and dark; also checked the toolbar list on a scratch server (temp/, port 4481, removed).
- **Tests**: `permissions.test.ts` (13): a case per row + coverage test (`ROW_CASES` typed
  `Record<WriteKind, …>`), board grant/deny/revoke, and an oracle replay (the old `canWrite` kept in
  the test) over the four fixture ledgers and a scene: no write that worked before is refused for
  an agent already holding a container on the board. The maintainer's `.visionboard/ledger.jsonl`
  replayed read-only the same way: all 46 agent writes still allowed. Changed for D-034 only:
  `grants.test.ts` (C's new region now needs the board; unknown-region case uses B; `boardAccess`
  gains `boardHolders`), `api-write.test.ts` (B asks for A's board before its own container; the
  grant loop's first region now needs the board; new board-revoke test), MCP `session.test.ts`
  (asks for the board first), the stored-`v` asserts 7→8, schema cases (v8, board request and
  revoke lines), gallery fixture test (three requests). Added: ledger-context board test,
  page test for a board request through Allow and Remove access.
- **For BE_04**: `pending.ts` `owedContainers` and `concerns` (container notes, `mode`) still check
  container holders directly, so a board-revoked agent is still told about container notes on
  that board; agent-scoped conditions should read `canWrite`.
- Gates: `npm test` 623 + 4, `npm run check`, `npm run verify` (0 warnings), `npm run gen --
  --check`, `npm run test:pages` 150, all exit 0.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-security] BE_03: …`).
