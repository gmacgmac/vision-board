---
task_name: Awareness Tables - References, Permissions, Conditions
created: 2026-10-07
completed: 2026-10-07
status: completed
categories: [board-actions, board-format, board-security, board-app]
tracker: cortex-tasks/tracker.md#U8,U9,U10
---

# Awareness Tables - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-07

## Execution record (read this first if resuming)

- Branch `main`. Gates after every task, run and read by the orchestrator: `npm test`,
  `npm run check`, `npm run verify`, `npm run test:pages`, `npm run gen -- --check` (exit 0 each).
- Every wave is one task (page tests share ports 4468-4470).
- **Gate before BE_02**: D-033 and D-034 accepted by the maintainer (wording below), then added
  to `docs/decisions.md` by the orchestrator.
- Then Set 2 (`2026-10-07_board-app_navigation`) builds on these tables.

## Decisions for the maintainer (proposed wording)

> **D-033 Awareness tables: references, permissions, conditions**
> - **Date**: 2026-10-07 · **Status**: Accepted · **From**: maintainer (chat 176-201), after nclite and Uplynk Studio
> - **Decision**: What belongs to what, who may write what, and what needs attention are each one
>   typed table in `packages/actions`, derived from the folded ledger and read alike by the server,
>   the page and agents. A new kind without a row is a type error; every row has a test. A check
>   needed in more than one place is a row, never a local check.
> - **Why**: The same facts were worked out in several places and drifted.
> - **Alternative rejected**: Leaving each check where it is used; nclite's stored notices table
>   (the ledger is already the history).
> - **Task**: [[cortex-tasks/board/2026-10-07_board-actions_awareness-tables/PLAN.md]]

> **D-034 Board access, then container access** (replaces D-027's rule that any agent may add containers anywhere)
> - **Date**: 2026-10-07 · **Status**: Accepted · **From**: maintainer (chat 170C-171)
> - **Decision**: An agent writes to a board only if it created the board or the person granted
>   it. On such a board it creates and edits its own containers; another agent's container still
>   needs that container's grant. Among agents, only a board's creator changes its title and
>   summary; the person can rename any board. Grants attach to the agent's one secret.
> - **Why**: A board is a topic; nothing on it can be deleted yet, so a stray write is permanent.
> - **Alternative rejected**: Container grants only (any agent writes to any board).
> - **Task**: [[cortex-tasks/board/2026-10-07_board-actions_awareness-tables/PLAN.md]]

## Instructions for Agents

1. Read PLAN.md first, then notes from completed tasks.
2. Respect the Wave column; reuse Shared Foundations; never write a second copy of a listed table.
3. If you need to deviate, STOP and report to the orchestrator.
4. Update your row and your notes entry here; Implementation Notes in your task file.
5. No git commits, no git stash.

## Task List

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [One server per ledger](./BE_01_ledger-lock.md) | Sonnet 5.5 | Completed | `.visionboard/lock`; `server/lock.ts` |
| 2 | BE_02 | 2 | [References table](./BE_02_references.md) | Opus 5.5 | Completed | `references.ts`: `REFERENCES`, `scopeOf`, `placeOf` |
| 3 | BE_03 | 3 | [Permissions table, board access](./BE_03_permissions.md) | Opus 5.5 | Completed | `permissions.ts`: `PERMISSIONS`, `canWrite`; ledger v8, OpenAPI 1.6.0 |
| 4 | BE_04 | 4 | [Conditions table, board seen](./BE_04_conditions.md) | Opus 5.5 | Completed | `conditions.ts`: `CONDITIONS`, `conditionsOf`; `seen {board, head}` in v8, OpenAPI 1.7.0 |
| 5 | FE_01 | 5 | [Page reads conditions](./FE_01_page-conditions.md) | Opus 5.5 | Completed | `attention.ts`, `pageConditions`; `board.changed` reads `agentHeads` |
| 6 | VERIFY_01 | 6 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | COMPLETED | Real MCP flows; fixed a keepView bug (no-room fit) |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/actions/src/references.ts` (`REFERENCES`, `scopeOf`) | BE_02 | BE_03, BE_04, FE_01 |
| `packages/actions/src/permissions.ts` (`PERMISSIONS`, `canWrite` as a one-line call) | BE_03 | BE_04, FE_01 |
| Board creator and holders in `LedgerIndex` (`packages/format/src/ledger-index.ts`) | BE_03 | BE_04 |
| `packages/actions/src/conditions.ts` (`CONDITIONS`, `conditionsOf`) and `seen {board, seq}` | BE_04 | FE_01, Set 2 |

## Implementation Notes

### BE_01: One server per ledger
_Status:_ Completed. `apps/board/server/lock.ts` (`takeLock`, `holderMessage`, injected `LockEnv`) holds `.visionboard/lock` (host, pid, port, started, beat every 30 s; stale at 2 min or dead pid on this host). `server.ts` takes it before the seed and `openLedger`, releases on `exit`/SIGINT/SIGTERM in every mode, and has a `listen` error handler. `ignoreAgents` in `agents.ts` is now the exported `ignoreInGit(dir, name)`. Checked by hand (refuse, release, kill -9 replace, EADDRINUSE); all five gates 0.

### BE_02: References table
_Status:_ Completed. `packages/actions/src/references.ts`: `REFERENCE_KINDS`, `REFERENCES` (row per kind: `to`, `meaning`, `lookup`), `placeOf` (one rule for a card's container: the person's move if on the board or Later, else drawn; also returns `drawn`), `scopeOf` (typed per event type and per action), `eventBoard` as a one-line call. Deleted `boardOf`, `cardsOfAct`, `regionOf`, `movedFrom`; grants' and reads' place functions call `placeOf` (grants still judges a card in Later by where it was drawn). Format gained `actCard(e)` for `contextProblems`' move lookup. Coverage tests fail when a row, event type or action has no case (maintainer's addition). Oracle equal on every fixture ledger; no existing test changed; all five gates 0.

### BE_03: Permissions table, board access
_Status:_ Completed. `packages/actions/src/permissions.ts`: `PERMISSIONS` (row per write kind: `'ok'`, `{ board }` / `{ board, region }`, or `'creator'`), `canWrite` one line; the `switch` in `grants.ts` is gone. Index: board creator and holders in the same `creators`/`holders` maps by `accessKey` (a region created or container granted also holds the board; board revoke removes it); `revokeProblem` shared by ledger and act checks. Ledger v8 (grant-request and revoke without `region`), OpenAPI 1.6.0 (`boardHolders`, optional `region`), api.md 81-86 (23-26 marked replaced). Missing board + container answers the container (its grant brings the board), so old refusals are unchanged. Page: board request row, toolbar "Agents" list with Remove access. Replay oracle: no fixture write refused for an agent already on the board; real ledger 46/46 still allowed. For BE_04: `pending.ts` container-note scoping still reads container holders directly. All five gates 0.

### BE_04: Conditions table, board seen
_Status:_ Completed. `packages/actions/src/conditions.ts`: `CONDITIONS` (7 rows: about, audience, shows, trueWhen, endsWhen, derive), `conditionsOf(s, { board, agent })`, ids only; agent rows scoped through `mayAnswer`/`mayAnswerIn` (permissions.ts), person rows left out for an agent. `pendingItems` a short read of the table; `owedContainers`, `unseenItems`, `openRequest` gone; `openItems`, `openContainers`, `boardAccess` requests, `owedRegions` read it; `DRAWING_EVENTS` shared by `drewOn` and `board.drawn`. Board seen in v8 (no bump) as `{ board, head }`: `seq` is every line's own stamp, so the field is `head`. Fold: `seenBoards`, `drawnHeads`; a board seen moves no head. OpenAPI 1.7.0, api.md 87-89. Behaviour changes: board-revoked agent no longer told container notes nor passed container/mode acts in `check_responses`; `PendingItem.later` only when no ask is owed. Oracle equal on all fixtures; agent-answer tests untouched. For FE_01: all existing boards read `board.new` on first load; the person's own acts count toward `board.changed` (send a board seen on leaving); fire the toast when `board.drawn`'s seq rises. All five gates 0.

### FE_01: Page reads conditions
_Status:_ Completed. `board.changed` refined in the table: the fold's `agentHeads` (last agent line per board, replies and requests included), one rule `boardNews` behind `board.new`/`board.changed`, so the person's own acts never mark a board. Page: `pageConditions` (`board-data.ts`, also the gallery's) is the one `conditionsOf` read; `attention.ts` runs it per batch and switch (picker marks ` · new`/` · changed`, chip "N boards updated", badges, strip announcement from request lines in the batch, toast when `board.drawn`'s line is in the batch) and sends board seen when due: on open, on leave (switch, `pagehide` keepalive), while open at most once a minute. Gone: `boards.ts` `known`, the strip's `known`, `owedRegions` (page and gallery copy), `drewOn`. Board screenshots re-taken (version chip v37: the board seen is a ledger line). All five gates 0; `controller.ts` 300 lines.

### VERIFY_01: End-to-end check
_Status:_ COMPLETED. See the task file; one bug fixed (keepView saved a fit taken with no room).

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`.
2. One LOG line: `[[YYYY-MM-DD HH:MM]] [board-actions] Completed set: Awareness Tables → Task: [[cortex-tasks/board/2026-10-07_board-actions_awareness-tables/TASK-STATUS.md]]`
3. Delete tracker rows U8, U9, U10.
