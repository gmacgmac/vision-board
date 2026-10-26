# ARCH_04_ledger-queries-and-geometry: Ledger Answers And Geometry In Packages

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Every DOM-free answer about the ledger lives in `packages/actions` with its tests, one builder makes the
board data for both the page and the server, and box geometry has one home.

## Context

Review §5, §7, §3 (`get_board` built twice) and closer-look 12. Runs in wave 3 beside ARCH_02 and
UI_01: touch only your files. `card-numbers.ts` is ARCH_02's (the card-reference table), not yours.

nclite's plugin contract (PLAN § The Plugin Contract) resolves every chip on send by asking the plugin
for its current text (`resolve(kind, ref)` → `{ where, text }` or a refusal), and has no hook yet for
the person's answers since the bot's last message, which the board sends today (`roundOf`,
`packages/actions/src/board-message.ts`). Both are ledger answers, so they live here, pure; ENGINE_01
wires them. Where the contract's chip shape is too narrow for the board, keep the board's and list the
change under `REQUESTS`.

## Inputs

- **Files to modify**: as listed for ARCH_04 in TASK-STATUS File Ownership.
- **Files to reference**: review §5 (the list: `updates.ts` `unseenCount`/`unseenSteps`/`seenDue`/
  `seenMarks`, `retired.ts` `retiredCounts`/`pastLines`, `proposals.ts` `proposalRows`/`acceptAllPlan`,
  `go-to-card.ts` `goTarget`, `board-data.ts` `boardData`/`answeredIds`/`pageConditions`,
  `remove-words.ts`), §7 (`note-bubble-core.ts` `StageBox`/`meets`, `selection-bar-core.ts` `touches`,
  layout `geometry.ts` `overlaps`/`boundsOf`, `boxAround`, two `clamp`), D-016 `LAYERS`.
- **Shared artifacts to reuse**: module names from ARCH_01.
- **Skills**: `cortex-architecture` (rules 1, 5).

## Steps

1. [ ] **Move the queries** into `packages/actions` (a sub-folder per area if it helps; the public file
   stays `src/index.ts`), with their tests. The app keeps only the wiring (`*-flow.ts`) and imports them.
2. [ ] **One board-data builder** in `packages/actions`, used by `apps/board/src/board/board-data.ts` and
   `apps/board/server/reads.ts` `getBoard`; the test that held the two copies equal becomes a test of the one.
3. [ ] **Geometry**: `Box` and its primitives (overlap, bounds, clamp) in one module both `ui` and
   `layout` may use under D-016 (`packages/format/src/geometry.ts`, or a `geometry` layer if that reads
   better; say which and why). Replace the copies; unit tests for each primitive.
4. [ ] **Chips**: one `Chip` type in the contract's shape, `{ plugin, kind, ref, label, detail }`
   (`kind`: `card` or `note` today; `ref` the board and the card's number, or the note's sequence), and
   one pure `resolveChip(state, kind, ref)` → `{ where, text }`, or a refusal when the card is retired,
   the note hidden, or its text changed since the chip was made. Today's chip shape and the server's
   `chat-prompt.ts` text come from these (the server file is ENGINE_01's: list the call it needs). Keep
   `roundOf` here as the answers-since-the-last-message query, and give it the same refusal words.
   Tests for each kind and each refusal.
5. [ ] **Decision draft only**: should `packages/actions` split into `ledger` (fold and queries) and
   `actions` (the registry)? Write the case both ways in your notes and as a `REQUEST`; do not split.

## Validation

- [ ] No DOM-free ledger query left in `apps/board/src/board/` (`grep` for the moved symbols)
- [ ] One `Box` type and one implementation each of overlap, bounds and clamp
- [ ] One `Chip` type; `resolveChip` tested for every kind and refusal
- [ ] `npm test`, `npm run verify`, `npm run check`; updates, retire, proposals, go-to-card, notes and selection specs on your port

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
   `[[YYYY-MM-DD HH:MM]] [board-actions] ARCH_04: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_04_ledger-queries-and-geometry.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
