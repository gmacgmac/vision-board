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

1. [x] **Move the queries** into `packages/actions` (a sub-folder per area if it helps; the public file
   stays `src/index.ts`), with their tests. The app keeps only the wiring (`*-flow.ts`) and imports them.
2. [x] **One board-data builder** in `packages/actions`, used by `apps/board/src/board/board-data.ts` and
   `apps/board/server/reads.ts` `getBoard`; the test that held the two copies equal becomes a test of the one.
3. [x] **Geometry**: `Box` and its primitives (overlap, bounds, clamp) in one module both `ui` and
   `layout` may use under D-016 (`packages/format/src/geometry.ts`, or a `geometry` layer if that reads
   better; say which and why). Replace the copies; unit tests for each primitive.
4. [x] **Chips**: one `Chip` type in the contract's shape, `{ plugin, kind, ref, label, detail }`
   (`kind`: `card` or `note` today; `ref` the board and the card's number, or the note's sequence), and
   one pure `resolveChip(state, kind, ref)` → `{ where, text }`, or a refusal when the card is retired,
   the note hidden, or its text changed since the chip was made. Today's chip shape and the server's
   `chat-prompt.ts` text come from these (the server file is ENGINE_01's: list the call it needs). Keep
   `roundOf` here as the answers-since-the-last-message query, and give it the same refusal words.
   Tests for each kind and each refusal.
5. [x] **Decision draft only**: should `packages/actions` split into `ledger` (fold and queries) and
   `actions` (the registry)? Write the case both ways in your notes and as a `REQUEST`; do not split.

## Validation

- [x] No DOM-free ledger query left in `apps/board/src/board/` (`grep` for the moved symbols)
- [x] One `Box` type and one implementation each of overlap, bounds and clamp
- [x] One `Chip` type; `resolveChip` tested for every kind and refusal
- [x] `npm test`, `npm run verify`, `npm run check`; updates, retire, proposals, go-to-card, notes and selection specs on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 04:00  

### Changes Made
- **Step 1, queries** (`packages/actions/src/answers/`, exported from `src/index.ts`): `updates.ts`
  (`unseenCount`, `unseenSteps`, `seenDue`, `seenMarks`, `seenOnSelect`, `seenVer`, `UnseenStep`),
  `retired.ts` (`retiredCounts`, `lastShown`, `pastLines`), `proposal-rows.ts` (`proposalRows`,
  `answerable`, `acceptAllPlan`, `ProposalRow`, `ProposalFound`), `go-target.ts` (`goTarget`,
  `GoTarget`), `page-conditions.ts` (`pageConditions`, `PageConditions`, `BoardMark`, `FreshCount`),
  `remove-words.ts` (`cardsWords`, `containerWords`). They take the card by `cardId(s.index, ...)` from
  `#format`, so no `idOf` copy was made. The app keeps wiring: `proposals.ts` (the act and the words:
  `proposalAct`, `answerDone`, `barWords`, `acceptAllWords`), `go-to-card.ts` (`createGoTo`, the box),
  `board-data.ts` (`numberedView`, `canApply`: the page's draw and apply rules). `updates.ts`,
  `retired.ts`, `remove-words.ts` left the app; importers (flows, shell, gallery, tests) now import
  from `#actions`. Tests moved with them: `updates`, `remove-words` as they were; `retired-markers`
  (counts + a `pastLines` test; the page's count label stays in `apps/board/tests/retired.test.ts`),
  `proposal-rows` (rows, plan, answerable; acts and words stay as a page test over hand-built rows),
  `go-target`.
- **Step 2, one board-data builder**: `answers/board-data.ts` `boardData` (the page's shape) and
  `boardJson(boardData)` (`get_board`'s JSON, `locked` left to the server). `server/reads.ts`
  `getBoard` is `{ ...boardJson(boardData(s, id)), ...(isLocked && { locked: true }) }`; the page uses
  `boardData`. `apps/board/tests/board-data.test.ts` no longer copies the server's shape (`asJson`
  is `boardJson`); it still holds the page's folded state equal to `get_board` over HTTP. New unit
  test `packages/actions/tests/board-data.test.ts` (shape, `boardJson`, `answeredIds`).
- **Step 3, geometry** in `packages/format/src/geometry.ts` (a format file, not a new layer: both
  `layout` and `ui` already may use format under D-016, and a `geometry` layer would be a third
  edge for six functions with no state): `Box`, `Point`, `Size`, `clamp`, `overlaps(a, b, gap)`,
  `touches`, `boundsOf`, `boxAround`, `boxBetween`. Layout's `types.ts` re-exports the three types
  and `geometry.ts` re-exports `boundsOf`/`overlaps`, so layout's files and its front door are
  unchanged and its own `normalise`/`centre`/`round` stay. The ui `StageBox`/`StageSize` are aliases
  of `Box`/`Size`; the two private `clamp`s, `meets` and `overlaps` are gone; `selection-bar-core`
  re-exports `boxAround`, `boxBetween`, `touches` so `#ui` is unchanged. `packages/format/tests/geometry.test.ts`.
- **Step 4, chips** (`answers/chips.ts`): `Chip` = `{ plugin: 'board', kind: 'card' | 'note', ref,
  label, detail }`; `ref` for a card is `{ board, n, ver }`, for a note `{ board, seq, rev }` (`rev`
  the line that last edited it), so "changed since the chip was made" is a comparison, not a stored
  copy. `cardChip(s, board, n)` and `noteChip(s, board, seq)` make a chip or a refusal;
  `resolveChip(s, kind, ref)` gives `{ where, text }` or `{ refused: 'gone' | 'retired' | 'hidden' |
  'changed', reason }`. `turnOf(s, board, since, agent)` is `roundOf` with the same refusal for a
  board the ledger does not hold. `roundOf` itself is unchanged. `clip` (the chip labels' cut) moved
  to `packages/format/src/clip.ts` (it existed twice: the server's private one and the page's
  `apps/board/src/board/clip.ts`). `packages/actions/tests/chips.test.ts` (13 tests: both kinds, every
  refusal, survives edits elsewhere, group and container notes, `turnOf`).
- **Step 5, decision draft only** (below).

### Issues & Resolutions
- `apps/board/tests` and several app files outside the six the File Ownership row names (controller,
  flows, shell, gallery) import the moved names; a move cannot leave them broken, so I changed their
  import lines only (no logic). None is owned by ARCH_02 or UI_01.
- `packages/format/src/index.ts` is not in the ownership row; geometry and `clip` each need one export
  line there (appended; ARCH_02's `constants*` will need one too).
- Full `npm test` has 5 failures, all in the server's writes and route table (`append`, `act: the
  person rejects a proposal`, route table `check_responses`): ARCH_02's in-flight files
  (`dispatch.ts`, `spec.ts`, `write-refs.ts`, `writes.ts`, `operations.generated.ts`), not mine.

### Caught Beyond the Brief
- `Size` in `packages/ui/src/image-view/image-view-core.ts` is a third copy of `{ w, h }`.
- `refused` for a hidden note is new behaviour for the chat prompt (`chat-prompt.ts` does not refuse a
  note on a card whose notes are hidden today). The task asks for it; ENGINE_01 decides whether to
  wire it in at once.

### Deviations from Plan
- None. (Judgement: `proposalAct`, the proposal words, `numberedView` and `canApply` stay in the app:
  the act body is the page's `ActFields`, the sentences are ARCH_05's, the other two are the page's
  draw and apply rules, not ledger answers.)

### Decision draft: split `packages/actions` into `ledger` and `actions`?
- **Case for**: the package is 33 top-level files plus `answers/` (about 530 lines more); two jobs
  share one name: the fold and its reads (what happened, DOM-free: `fold`, `board-state`, `conditions`,
  `reads`, `numbers`, `answers/`) and the action layer (what may be done: `registry`, `act`,
  `permissions`, `lock`, `archive`). `registry.ts` imports only format, so the cut has no cycle
  (`ledger` would import `actions`' registry for statuses, or the registry moves to format). A
  host that only reads (nclite's chip `resolve`, the MCP reads) then depends on the smaller one, and
  D-016 states the layer each consumer needs.
- **Case against**: 118 files import `#actions` and ARCH_01 has just made that the one name; a split is
  a second codemod and a new `LAYERS` row; every consumer here needs both halves (page, server, cli);
  eleven files already import the registry, so the line between them is one-way but thin; `answers/` already gives the package the sub-folder rule 3 asks for; nclite sees one engine.
- **Recommendation**: do not split now. Keep the `answers/` sub-folder, and split when a consumer
  needs the reads without the action layer (nclite's engine resolving chips is the first candidate),
  or when the package passes about 50 top-level files. If it splits, move `registry.ts` to the action
  side, name the halves `ledger` (reads) and `actions` (writes), and let `ledger` import `actions`.

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-actions] ARCH_04: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_04_ledger-queries-and-geometry.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
