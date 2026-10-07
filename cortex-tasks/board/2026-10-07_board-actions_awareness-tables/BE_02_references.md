# BE_02_references: References table

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 2;
> rulings 1, 2) · **Decision**: D-033 (accepted before starting) · **Model**: Opus 5.5

## Objective

One table that says what belongs to what, and one function that gives the board, container and
cards any ledger line touches, replacing the five places that work this out today.

## Rulings (do not reopen)

1. `packages/actions/src/references.ts` exports `REFERENCE_KINDS` (`board`, `container`, `card`,
   `note`, `link`, `request`, `agent`), a `REFERENCES` table of edges (card → container,
   container → board, note → card or container, link → its two cards, request → container or
   board, agent → its containers), each row with a one-line meaning and its lookup, and
   `scopeOf(state, event): { board?: string; container?: string; cards: number[] }`.
2. `scopeOf` covers every event type: the table is typed `Record<LedgerEvent['type'], …>` (and
   acts by `action`), so a new event type without a rule is a type error.
3. One answer for "which container is a card in now": the person's move if that container
   exists on the board, else where the agent drew it (`canWrite`'s current rule). `regionOf`
   (`moves.ts`) and both `placeOf`s call it; `later` stays a container no one holds.
4. Replace, keeping names only as one-line calls where callers are many: `eventBoard` (fold.ts),
   `boardOf` and `cardsOfAct` (pending.ts), `placeOf` in `grants.ts`, `placeOf`/`regionOf` in
   `reads.ts` and `moves.ts`, and the move-board lookup in `contextProblems`
   (`packages/format/src/ledger-index.ts`, a lower layer: give format the minimal lookup it needs
   and have `references.ts` build on it, never the reverse; D-016 layers).
5. No behaviour change visible to agents or the page: every existing test passes unchanged.

## Steps

1. [x] Tests first (`packages/actions/tests/references.test.ts`): one case per row and per
   event type, on the fixture ledgers; `scopeOf` equals the old functions on every line of
   every fixture ledger (keep the old functions in the test only as the oracle, as BE_01 of the
   found-in-use set did for `boardHeads`).
2. [x] `references.ts`; switch every caller listed in ruling 4; delete what is now unused.
3. [x] `packages/actions/README.md` lists the table; `npm run map`.

## Validation

- [x] The five gates exit 0 with no existing test changed.

## Implementation Notes

**Status**: Completed (2026-10-07)

- `packages/actions/src/references.ts` (130 lines): `REFERENCE_KINDS`, `REFERENCES` (one row per
  kind: `to`, `meaning`, `lookup`; `satisfies Record<ReferenceKind, …>`), `placeOf` (the one
  answer for a card's container: the person's move when that container is on the board or is the
  built-in Later, else where the agent drew it; returns `drawn` too), `scopeOf` (rules typed
  `{ [T in LedgerEvent['type']]: … }` and `Record<ActionId, …>`, so a new type or action without
  a rule fails `tsc`), and `eventBoard` kept as a one-line call (`scopeOf(s, e).board`; callers
  in fold, server reads, board-data and heads.test).
- A `move`'s scope is the container it moves to; a link's is its `from` card's; a card act's is the
  first card's. `Container` now lives here (grants imports it).
- Replaced: `eventBoard` (fold.ts), `boardOf` and `cardsOfAct` (pending.ts, deleted), `regionOf`
  and `movedFrom` (moves.ts, deleted, and dropped from the front door: no other callers), reads.ts
  `placeOf` (now `whereIs` on `placeOf`), grants.ts `placeOf` (one line on `placeOf`: Later has no
  holders, so a card there is judged by where it was drawn, exactly as before).
- Format (D-016): `actCard(e)` in `ledger.ts`, the card an act names first; `contextProblems`'
  move lookup and `references.ts` both use it.
- Tests (`packages/actions/tests/references.test.ts`, 9): a ledger with every event type and every
  action, each line with its expected scope; a case per table row; two coverage tests (every
  `EVENT_TYPES` and `act:<ACTION_IDS>` has a case, every `REFERENCE_KINDS` key has a row and a
  `ROW_CASES` entry; `ROW_CASES` is also typed `Record<ReferenceKind, …>`), added at the
  maintainer's request so a row added later without a test fails `npm test`; and the oracle (the
  old functions, kept in the test only) equal on every line of the four fixture ledgers and the
  every-kind ledger. Checked the scope test fails when an expected value is wrong.
- No existing test changed. Gates: `npm test` 607 + 4 pass, `npm run check`, `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages` 149 pass; `npm run map` regenerated modules.md.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-actions] BE_02: …`).
