# BE_04_conditions: Conditions table, board seen

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 4;
> rulings 1, 2) · **Decision**: D-033 · **Builds on**: BE_02, BE_03 · **Model**: Opus 5.5

## Objective

What needs attention is one table: each condition says what it is about, who sees it, where it
shows and how it is derived; the server's agent reads and the page both read it.

## Rulings (do not reopen)

1. `packages/actions/src/conditions.ts`: `CONDITION_KINDS`, `CONDITIONS: Record<ConditionKind,
   Row>`; a row: `about` (a reference kind from BE_02), `audience` (`person`, `agent`, `both`),
   `shows` (where the page shows it: `picker`, `card`, `container`, `strip`, `toast`), `trueWhen`
   and `endsWhen` (one line each, read by the tests and the docs), and `derive(state, ctx)`.
   `conditionsOf(state, ctx)` returns `Condition[]` (`{ kind, board, container?, n?, seq? }`, ids
   only, never text). `ctx` is `{ board?: string; agent?: string }` (the open board; the asking
   agent for scoping through `PERMISSIONS`).
2. **Rows, all moved from today's code** (ruling 2), plus one new:
   `item.owed` and `container.owed` (`pendingItems`, `owedContainers`), `item.unseen`
   (`unseenItems`), `grant.requested` (`grantRequests` open ones), `board.drawn` (`drewOn`),
   `board.new` and, new, `board.changed`. `pendingItems`, `unseenItems`, `openItems`,
   `openContainers` and `owedRegions` become one-line reads of `conditionsOf`, or go.
3. **Board seen (contract)**: `seen` gains a board form, `{ board, seq }` ("the person has looked
   at this board up to this line"), sent by the page (FE_01) when it opens a board and when new
   lines arrive while it is open, at most once a minute per board. Fold keeps `seenBoards: Map<board,
   seq>`. `board.new`: a board with no board seen; `board.changed`: `heads[board] > seenBoards[board]`
   and the board isn't `ctx.board`. Schema, `mark_seen` body as a `oneOf`, OpenAPI bump, `api.md`.
4. **Cost**: every `derive` reads folded indexes (heads, seen, marks, requests), per board; no
   scan of all events. A timing test on the perf ledger (`tests/pages/perf-ledger.ts` size) keeps
   `conditionsOf` under 5 ms.
5. Agent answers unchanged: `list_open`, `check_responses`, `write_board.pending` and `containers`
   pass their existing tests untouched.

6. **Every row is proven**: a coverage test iterates over the table's keys and fails if any row
   has no test case (maintainer, 2026-10-07: the test proves the implementation works when it is
   built and on every run after).

## Steps

1. [x] Tests first: a test per row (true when, ends when) on built ledgers
   (`packages/actions/tests/ledger-v3.ts` builder); old functions as the oracle on every fixture.
2. [x] Contract for board seen; fold; table; switch the server reads to it.
3. [x] `packages/actions/README.md` and `docs/specification/components.md` § a short "Awareness
   tables" section naming the three tables and the rule "a check needed twice is a row".

## Validation

- [x] The five gates exit 0; the timing test passes.

## Implementation Notes

**Status**: Completed (2026-10-07)

- **Table**: `packages/actions/src/conditions.ts` (139 lines): `CONDITION_KINDS`, `CONDITIONS:
  Record<ConditionKind, ConditionRow>` (`about`, `audience`, `shows` as a list, empty for an
  agent-only row, `trueWhen`, `endsWhen`, `derive`), `conditionsOf(s, ctx)`. With `ctx.agent`, rows
  whose audience is `person` are left out and the rest are scoped through the permissions table:
  new `mayAnswer` (the `reply` row) and `mayAnswerIn` (the `region` row on an existing container) in
  `permissions.ts`. `owedOn` and `replied` moved here from `pending.ts`.
- **Moved onto the table**: `pendingItems` is now a 6-line read of `item.owed` + `container.owed`
  (kept: four test files pin its shape); `owedContainers` and `unseenItems` are gone (`item.unseen`;
  its one test moved to `conditions.test.ts`); `openItems` and `openContainers` read `conditionsOf`;
  `boardAccess`' open requests read the `grant.requested` row; `openRequest` (unused, a second
  "open" definition) is gone; `concerns` (`check_responses`) uses `mayAnswerIn` for container acts
  and `mode`. Page: `owedRegions` is a one-line `conditionsOf` read; the drawing-line set moved to
  `DRAWING_EVENTS` (fold.ts), which `drewOn` and `board.drawn` share. The page's `known` sets, the
  gallery's inline `owedRegions` copy and the toast's switch to `board.drawn` are FE_01's.
- **Behaviour changes (only these)**: (1) an agent revoked from a board is no longer told the
  container notes owed there, and `check_responses` no longer passes it container notes and `mode`
  acts on that board (BE_03's open item); (2) `PendingItem` carries `later` only when no ask is
  owed (the ask comes first, as `openItem.pending` already read it), internal only; (3) a board
  seen moves no board head, so `list_boards`' `seq` ignores the person looking.
- **Contract**: board seen added to ledger v8 (not bumped to v9: v8 is unreleased). The field is
  `head`, not `seq` as written in ruling 3: every stored line already has its own `seq`, so `{ board,
  seq }` cannot be stored; `head` is the API's word for a ledger position. `seen.schema.json` core
  holds `n`, `ver`, `board`, `head`, and `$defs/rules` is the `oneOf` (node or board, never both),
  used by `sent`, `stored` and `seen-request`; the hand twin is `seenRules` in `ledger-shape.ts`.
  Context: unknown board, `head` above the ledger's last line. `mark_seen` checks the body's
  `board` is the path's. OpenAPI 1.7.0 (two named examples); api.md 87-89 and the `mark_seen` row;
  `npm run gen` regenerated the reference and MCP version.
- **Fold**: `LedgerState.seenBoards` (highest head per board) and `drawnHeads` (last drawing line
  per board); `board.new`, `board.changed` and `board.drawn` read only those and `heads`.
- **Tests**: `conditions.test.ts` (15): oracle (old `pendingItems`/`owedContainers`/`unseenItems`/
  open requests kept in the test) equal on all four fixture ledgers for every board and every
  agent; a case per row (true when, ends when) with a coverage test over `CONDITION_KINDS`;
  audience; the board-revoke fix; board seen in the fold. `conditions.timing.ts`: under 5 ms on the
  perf ledger (0.09 ms). Added: schema valid/broken seen cases, ledger-context board seen,
  `mark_seen` board form API test, a `board seen` case in `references.test.ts` (its oracle's `seen`
  branch made to compile). Changed: `openapi.test.ts` version 1.7.0. Unchanged: every `list_open`,
  `check_responses`, `write_board` test.
- **Docs**: `packages/actions/README.md`, `docs/specification/components.md` § Awareness tables;
  `modules.md` regenerated.
- **For FE_01**: (a) every board in an existing ledger has no board seen, so all but the open one
  read `board.new` on the first load; (b) `heads` count the person's own acts, so a board the person
  acted on and left within the minute reads `board.changed` unless the page also sends a board seen
  on leaving it; (c) `board.drawn` holds on the open board until its first board seen, so the toast
  should fire when its `seq` rises after a batch, not when it is present.
- Gates: `npm test` 639 + 6 timing, `npm run check`, `npm run verify` (0 warnings), `npm run gen --
  --check`, `npm run test:pages` 150, all exit 0.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-actions] BE_04: …`).
