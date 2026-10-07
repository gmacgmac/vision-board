# Awareness tables: references, permissions, conditions - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-07 · **Tracker**: U8, U9, U10 · **From**: maintainer, chat 2026-10-07
> (131-135, 170C-171, 176-201) · **Pattern**: nclite `engine/store/conditions.ts`,
> `references.ts` (also in Uplynk Studio), adopted in spirit, not copied

---

## Problem Statement

What needs the person's or an agent's attention is worked out in many places that can drift
apart, what-belongs-to-what is derived three different ways, and write permission is a `switch`
that lets any agent write to any board. And two servers on two computers forked the ledger.

---

## Current State

- **Belongs-to** (which board, container and cards a ledger line touches): `eventBoard`
  (`packages/actions/src/fold.ts`), `boardOf` and `cardsOfAct` (`pending.ts`, `boardOf`
  duplicates `eventBoard`'s act branch), `placeOf` inside `canWrite` (`grants.ts`, ignores a move
  to a region that no longer exists) and `regionOf` (`moves.ts`, doesn't), `contextProblems`'
  own board lookup for moves (`packages/format/src/ledger-index.ts`).
- **Permissions**: `canWrite` (`grants.ts`): `board` always ok (a second `board` line for an
  existing id is refused by `contextProblems`, so nobody can retitle a board today); a new region
  ok on any board; existing containers need a grant. The index records container creators and
  holders (`ledger-index.ts` `indexRegion`, `indexAct`) but no board creator.
- **Attention** (each worked out on its own): `pendingItems`, `owedContainers` (`pending.ts`),
  `owedRegions` (`apps/board/src/board/region-notes.ts`, repeated inline in the gallery
  `fixture.ts`), `openItems` / `openContainers` (`reads.ts`, re-applying `canWrite`),
  `unseenItems` (server only; the page never calls `mark_seen`), `grantRequests` plus the
  strip's own `known` set (`AccessRequests.svelte`), the page-only new-board set (`boards.ts`
  `known`, reset on reload), and `drewOn` for the "agent drew" toast (`board-data.ts`).
- **Seen** is per node and version (`seen {n, ver}`, D-018). Nothing records "the person has
  looked at board X up to line N", so "this board changed" can't be known across reloads or
  computers.
- **Server**: `apps/board/server.ts` takes no lock; signal handling only in watch mode; ledger
  held in memory from start, so a second writer makes its line numbers stale.

---

## Proposed Solution

Three typed tables in `packages/actions`, plain TypeScript, read alike by the server, the page
and (through the API) agents. Everything is derived from the folded ledger; nothing is stored
that can go stale; every row has a test; adding a kind without a row is a type error. Existing
checks move onto the tables; new needs are added only as rows.

### Decisions to accept first (exact wording in TASK-STATUS; maintainer's yes before BE_02)

- **D-033 Awareness tables**: references, permissions and conditions as typed tables.
- **D-034 Board access, then container access** (supersedes part of D-027).

### Key Changes

1. **Ledger lock** (U8, BE_01): `.visionboard/lock` holding host, pid, port, start and a
   heartbeat refreshed every 30 s. A second server refuses to start while the lock is live, and
   says which computer holds it. A lock is stale when its heartbeat is over 2 minutes old, or it
   is on this computer and its process is gone. Released on exit in every mode.
2. **References** (BE_02): one table naming every kind (board, container, card, note, link,
   request, agent) and one function, `scopeOf(state, event)`, giving the board, container and
   cards a line touches. `eventBoard`, `boardOf`, `cardsOfAct` and both place functions become
   that table's rows; one rule for a move into a container that no longer exists.
3. **Permissions** (BE_03): `PERMISSIONS: Record<WriteKind, Rule>` replaces the `switch`; board
   creator and board holders in the index; `request_grant` may name a board without a container;
   a grant on a board lets the agent create and edit its own containers there; only the board's
   creator may write its `board` line (and today nobody can rewrite it at all).
4. **Conditions** (BE_04): `CONDITIONS: Record<ConditionKind, Row>`, each row: what it is about
   (from references), who sees it (person, agent, both), where it shows, and `derive`. First kinds,
   all moved from today's checks unless marked new: `item.owed`, `container.owed`, `item.unseen`,
   `grant.requested`, `board.drawn`, `board.new` (moved and made durable), `board.changed` (new).
   A person `seen` on a board (`seen {board, seq}`, contract change) makes the last two survive
   reloads and work across computers.
5. **Page** (FE_01): the picker, badges, request strip and toast read conditions only; the
   page-local `known` sets and the gallery's copy of `owedRegions` go.

### Rulings (maintainer, 2026-10-07; do not reopen)

1. Adopt the spirit of nclite's tables, not its code: no stored notices table, no polling, no
   mascot. The ledger is the history; `seen` is the dismissal; the live stream is the trigger.
2. Migrate, don't add alongside. Every existing check in Current State moves onto a table in this
   set. If moving one does not come out simpler, stop and bring it to the maintainer.
3. An agent may write to a board only if it created it or the person granted it the board. On
   such a board it creates and edits its own containers freely; another agent's container still
   needs a container grant. Approval adds the board or container to the agent's existing secret.
4. Among agents, only a board's creator may change its title or summary, for now; the person
   can rename any board (Set 2, maintainer 206).
5. One server per ledger, across computers.

---

## Dependencies

- BE_01 (lock) is independent; it goes first because two writers is a live risk.
- BE_02 (references) before BE_03 and BE_04: both read `scopeOf`.
- BE_03 (permissions) before BE_04: agent-scoped conditions ("what this agent owes") read the
  permission table.
- BE_04 (conditions) before FE_01 (page).
- D-033 and D-034 accepted before BE_02 and BE_03 start.
- Page tests use fixed ports, so every wave is one task.

---

## Out of Scope

- The toolbar, version view, finder, key bubble, icon and new board (Set 2,
  `2026-10-07_board-app_navigation`), which build on these tables.
- Deleting cards and containers (tracker N24); purge (N14).
- Several people (D-018 tracks one person).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Existing ledgers become unwritable under board access | An agent that holds any container on a board, or wrote a `board` line, counts as holding the board; a test folds every fixture ledger and checks no existing write would now fail |
| Conditions recomputed over the whole state on every batch | `derive` reads the folded indexes (heads, seen, marks), per board, never a full scan; a timing test on the 1,000-card perf ledger |
| A lock on Dropbox lags between computers | The heartbeat window (2 minutes) is far above Dropbox's usual sync delay; the refusal names the other computer so the person can act |
| A crash leaves a lock | Stale by heartbeat age, or by a dead process on the same computer |
| Moving checks changes agent-visible answers | `list_open`, `check_responses` and `write_board.pending` tests are kept unchanged and must pass before and after |

---

## Success Criteria

- [ ] A second `npm run board` on the same ledger, here or on another computer, refuses to start
- [ ] `canWrite`'s `switch`, `eventBoard`, `boardOf`, `cardsOfAct`, both `placeOf`s, `owedRegions`
  and the page's `known` sets are gone or one-line calls into the tables
- [ ] An agent can't write to a board it wasn't granted; a granted agent can make its own containers
- [ ] A board changed in another chat is marked in the picker, after a reload and on the other computer
- [ ] A test for every row of every table; the five gates exit 0
