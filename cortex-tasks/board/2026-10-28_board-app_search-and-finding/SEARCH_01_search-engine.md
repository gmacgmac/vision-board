# SEARCH_01_search-engine: The search engine and the board's documents

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A framework-free search engine in a new `packages/search`, and the board's cards as its documents in
`packages/actions`, so the board (SEARCH_02) and later nclite's Journal search the same way.

## Context

Tracker M7 and PLAN.md § The maintainer's rulings: words in any order, part of a word, case and
accents ignored, best matches first, which part matched (title, text, note, reply, container).
Principles § Shared pieces are shared: search lives in `packages/`, never only in `apps/board/`. No
library fits without a dependency, and dependencies are high-risk here: write it, small.

## Inputs

- **Files to modify**: `packages/search/**` (new: `package.json` with no dependencies, `src/index.ts`,
  `src/*.ts`, `tests/*.test.ts`, `README.md`), `packages/actions/src/search-docs.ts` (new) and its
  export in `packages/actions/src/index.ts`, `packages/actions/tests/search-docs*.test.ts`
- **Files to reference**: `packages/actions/src/board-data.ts` (`boardData`), `liveNotes`, replies in
  the ledger state (`LedgerState`), `packages/format` view types (`View`, node kinds, regions),
  `packages/layout/package.json` (a package's shape), `docs/specification/modules.md` (layers),
  `scripts/` that build the module map and `npm run verify`'s layer rules
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **The contract first** (`packages/search/src/types.ts`): `SearchDoc { id: string; fields: { name: string; text: string; weight: number }[] }`,
   `SearchHit { id; score; fields: { name; ranges: [start, end][] }[] }`, `SearchIndex`.
   `searchIndex(docs)` builds once; `search(index, query, { limit? })` returns hits best first.
2. **Failing tests first**: words in any order ("pricing annual" finds "Annual pricing"); part of a
   word (`pric`); case and accents ignored (`resume` finds "Résumé", `CAFE` finds "café"); every query
   word must match somewhere (AND); a title match outranks a text match, a word start outranks a
   middle, more matched words outrank fewer; ranges point at the original text (accents kept), so a
   highlight lands right; an empty or blank query returns nothing; 1,000 docs of 500 characters
   answer a 3-word query in under 5 ms (a timing test in the existing `*.timing.ts` style).
3. **The engine**: normalise with `NFD` and strip combining marks, lowercase; split on non-letters and
   non-digits; keep a map from normalised offsets back to original ones. No regex built from the query.
4. **The board's documents** (`packages/actions/src/search-docs.ts` `boardSearchDocs(state, board, view)`):
   one doc per live card on the board shown: fields `title` (weight 3), `body` (2), `container` (the
   card's container title, 1), `note` (the person's notes on it, 1), `reply` (agent replies on it, 1).
   The id is the card's number. Past versions: the caller passes the view shown. Tests with a small
   fixture ledger.
5. **Wiring**: `packages/search` is a new workspace; the root `package.json`/lock are the
   orchestrator's: return the exact change as a blocking `REQUEST`. Until then, import it by relative
   path in tests only if the workspace isn't there; say which. Add the package to the layer rules
   (`packages/actions` may import it; it imports nothing) where `npm run verify` reads them; if that
   file is generated or orchestrator-owned, a `REQUEST`.
6. **README** for the package: what it does, the API, what it doesn't do (no fuzzy typo matching yet).
7. **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`.

## Validation

- [x] Every behaviour in step 2 tested, seen failing first (21 of 21 against a stub; the one-letter
      ranking test failed before its fix)
- [x] `packages/search` has no dependencies and imports nothing from the repo
- [x] `boardSearchDocs` covers title, body, container, notes, replies

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- `packages/search/src/types.ts`: the contract: `SearchDoc`, `SearchField`, `SearchHit`, `FieldHit`
  (`name`, `field`: its place in the doc, `ranges`), `Range`, `SearchIndex`, `SearchOptions`, and the
  index's insides `IndexedDoc`, `IndexedField`.
- `packages/search/src/normalise.ts` (`normalise`, `queryWords`): per code point NFD, lower case,
  marks stripped (ASCII fast path); original start and end offsets per normalised unit; a lone
  decomposed accent extends the letter before it, so a highlight never splits "e\u0301".
- `packages/search/src/search.ts` (`searchIndex`, `search`): AND over query words; plain `indexOf`
  (no pattern from the query); fit whole 3, start 2, inside 1, times the field weight; a word's best
  field in full plus 0.2 of each other field; +0.25 per further match in a field, at most 2; stable
  sort, so ties keep doc order; ranges sorted, merged, mapped to the original text.
- `packages/search/tests/search.test.ts` (22 tests), `search.timing.ts` (index of 1,000 docs about
  15 ms, budget 100; 3-word queries 1.7-1.9 ms, budget 5, including a worst case of one-letter words
  hitting 898 docs), `README.md`.
- `packages/actions/src/search-docs.ts` (`boardSearchDocs`, `SEARCH_FIELDS`, `SearchFieldName`) and
  its export lines in `packages/actions/src/index.ts`; `packages/actions/tests/search-docs.test.ts`
  (4 tests on the shared `scene` ledger: fields and weights, group note on each card, removed note
  gone, a past view's words, a moved card's container through `placedView`, an unknown card).

### Caught Beyond the Brief
- A one-letter word (every search's first keystroke) matches word starts only, and never counts as a
  whole word: without it "a" lit 14 of the roadmap's 17 cards with the article "a" in a body ranked
  over titles. Word starts are indexed per field (`heads`), so the first keystroke is the cheapest.
- "More matched words outrank fewer" under AND is read as: more of the card's words matched in a
  field (capped, so repeating a word never lifts an inside match over a word start) and the query's
  words in the title rather than spread over title and text. Tests name both.
- Notes on a whole container are not on any card, so no card document carries them (a container
  search would be its own document kind, later).
- The full `npm test` has one failure outside this task: `apps/board/tests/api-chat-kiro.test.ts`
  "start: Kiro joins..." expects the label "Kiro chat 00000000" and gets the folder name: ACCESS_01's
  label change in flight (its files), not this task.

### Deviations from Plan
- No `packages/search/package.json`: no package in this repo has one; a module is named by the root
  `package.json` `imports` map (D-059), so "the new workspace" is one `imports` entry (REQUEST).
- `packages/actions` imports `#search` for the `SearchDoc` type only, so its tests need no relative
  path into `packages/search`. Until the orchestrator adds `#search` and the `LAYERS` row,
  `npm run check` (tsc and svelte-check) and `npm run verify` fail on that one import, and verify's
  module map is stale. Checked with the change simulated in `temp/` (deleted): tsc clean, verify's
  per-file rules clean for every file here; without the `LAYERS` row verify fails the import, so it
  is needed.

## On Completion

1. Notes above; your row in TASK-STATUS.md. 2. One LOG line, ending in a newline:
   `[[YYYY-MM-DD HH:MM]] [board-app] SEARCH_01: … → Task: [[cortex-tasks/board/2026-10-28_board-app_search-and-finding/SEARCH_01_search-engine.md]]`
3. Return Contract, `REQUESTS` for the workspace and anything else.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
