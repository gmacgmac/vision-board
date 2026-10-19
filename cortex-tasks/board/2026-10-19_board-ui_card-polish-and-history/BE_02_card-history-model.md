# BE_02_card-history-model: Card history model

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A pure function that turns a card's ledger lines into history rows — when, who, what — with no
note or reply text and no private marks, plus the cheapest way for the page to get those lines.

---

## Context

PLAN.md § Key Changes 7 and § Contracts first. The maintainer wants "when what happened", not the
conversation: note text is already on the card. A card is an identity (D-041), so lines are matched
by the card's identity, not its number. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to create**: `packages/actions/src/card-history.ts` (`cardHistory`, `HistoryRow`),
  `packages/actions/tests/card-history.test.ts`
- **Files to modify**: `packages/actions/src/index.ts` (export)
- **Files to reference**: `apps/board/src/board/updates.ts` (`unseenSteps`, how versions of a card
  are found), `apps/board/src/board/versions.ts` (`linesTo`, ledger paging),
  `packages/actions/src/notes.ts` (note numbering, edits, removals, group notes `nodes`),
  `packages/format/src/ledger.ts` (`PRIVATE_ACTIONS`, event types), `docs/specification/performance.md`
- **Shared artifacts to reuse**: `notes-hide` / `notes-show` in `PRIVATE_ACTIONS` — built by BE_01
- **Skills**: `cortex-architecture` — load before starting

---

## Steps

1. [x] `HistoryRow`: `{ seq, at, who: 'person' | 'agent', agent?: string, kind, words, note?: number, reply?: number }`.
   `kind` is one of: drawn (vN), note sent / edited / removed (note N), replied (to note N),
   check, cross, reopened, later, parked, size, moved, pinned / reset, proposal made / answered,
   app allowed / stopped, removed / restored. `words` is the one line ("Agent drew v3",
   "You sent note 1", "Agent replied to note 1"); `note` / `reply` carry the seq the box links to.
2. [x] `cardHistory(events, cardId)`: newest first; drops every `PRIVATE_ACTIONS` line and every
   `seen` line; a group note shows on each card it names; never copies note, reply or reason text.
3. [ ] Lines for one card: decide how the page gets them in proportion (rule 15). Prefer what the
   page already holds or pages (`linesTo`); if that means reading the whole ledger for one card on a
   large project, STOP and propose a filtered read (contract first: api.md / openapi) to the user.
   Record the decision in Implementation Notes.
4. [x] Unit tests: one per kind, ordering, private marks absent, no text leaks (assert no row
   contains a fixture note's words), group note, removed note, a card renumbered stays one history.

---

## Validation

- [ ] `node --test packages/actions/tests/card-history.test.ts` passes; `npm test`, `npm run verify` pass (test and npm test pass; verify fails only on the dist page weight, sibling work)
- [x] A 1,000-event card builds its history under the timing budget in `performance.md` (add a
  `.timing.ts` beside the test)

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Blocked (steps 1, 2, 4 done; step 3 needs the maintainer's choice of read, see Deviations)  
**Completed**: 2026-10-19 (model and tests)  

### Changes Made
- `packages/actions/src/card-history.ts` (new): `cardHistory(events, id, labels?)`, `HistoryRow`,
  `HistoryKind`, `HISTORY_KINDS`. Takes any run of ledger lines in order (the whole ledger or only
  the card's) and the card's identity (D-041), never its board number; FE_03 converts with
  `idOf` (`apps/board/src/board/card-numbers.ts`) and passes `LedgerState.agents` as `labels`.
  Newest first. Drops every `isPrivateAct` line and every `seen` line; never copies note, reply,
  proposal reason or park bundle text. Notes are numbered by reusing `askOf` / `foldNoteAct` /
  `liveNotes` (`notes.ts`), so the numbers equal the card's (`conversation` in node-core.ts numbers
  `ItemState.notes`, which is `liveNotes`). A group note shows on every card it names; edits and
  removals are matched by the note `seq` they name, whichever card the line names. App allow / stop
  show on a card from the first line that draws it with that app (`node.app.id`).
- Words: "Agent drew v3", "You sent note 1" ("… on 2 cards" for a group note), "You edited note 1",
  "You removed a note", "You asked for more context", "Agent replied to note 1" / "to a note" /
  "replied", "You marked it ✓/✗", "You reopened it", "You saved it for later", "Agent parked it",
  "You set its size to S" / "back to automatic", "You moved it to Later" / "to another container",
  "You placed it", "You reset its place", "Agent proposed ✓/✗", "You accepted the proposal (✓)",
  "You turned down the proposal", "You allowed the app", "You stopped the app", "Agent/You removed it".
- `note` is set only while the named note is still on the card (so every link has a target);
  `reply` is the reply's own `seq` on a `replied` row.
- `packages/actions/src/index.ts`: exports. `docs/specification/modules.md` regenerated
  (`npm run map`; the only diff is the new exports).
- `packages/actions/tests/card-history.test.ts` (8 tests): every kind, order, line times, agent
  labels, no text leaks, private marks and seen absent, removed note, group note and its edit, an
  app allow before the card exists, identity 4 = card 1 on b2 kept apart, own lines = whole ledger.
- `packages/actions/tests/card-history.timing.ts`: 1,001 lines on one card of the 1,000-card
  performance ledger: 0.42 ms from its own lines, 0.34 ms from the whole ledger (budget 50 ms).

### Issues & Resolutions
- performance.md has no history row; the timing test uses 50 ms ("One change shown", the nearest
  budget: the box opens on one press). VERIFY_01 (or the maintainer) may add a row to performance.md.
- "removed / restored": a card has no restore in the format (a retire is for good, api.md 126;
  `restore` is a board's archive undo and a private mark), so only `removed` exists.
- More context with no words is an ask, not a note: its own kind `context` (not in the step's list).
- `npm run verify` fails only on the dist page weight (151.7 KB vs 150 KB, sibling front-end work);
  `npm test` passes (1,514 unit + 10 timing).

### Deviations from Plan
- **Step 3: no in-proportion source for one card's lines exists; awaiting the maintainer.** The
  page keeps only the folded state (`live.ts` folds and drops the lines); `linesTo` (versions.ts)
  reads the ledger from line 1; `read_ledger` filters by `board` only, so a card's history would
  page through the whole board's lines (pages of at most 500) on every open. Options:
  - **A (recommended): a card filter on `read_ledger`**, contract first: an optional card identity
    parameter (api.md operations table and openapi, then `apps/board/server/reads.ts`
    `readLedger`, then a server test), answering only the lines about that card. The match should be
    one shared predicate exported from `card-history.ts` (the same rules `cardHistory` uses: its
    own lines, group notes in `nodes`, edits / removals of its notes by `note`, retires in `cards`,
    its app's allow / stop), so server and model never disagree. Fits performance.md approach 6
    (history read on demand, only for that node).
  - B: the page keeps the lines it already reads, indexed by card identity in `live.ts` (no fetch
    on open, no contract change; memory grows with the ledger; touches the page's live state).
  - C: read `read_ledger?board=` on open (no change anywhere; cost grows with the board).
  `cardHistory` works unchanged with any of the three.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-actions] BE_02: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/BE_02_card-history-model.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
