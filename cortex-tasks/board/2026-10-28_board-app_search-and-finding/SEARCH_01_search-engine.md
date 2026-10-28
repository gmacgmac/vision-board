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

- [ ] Every behaviour in step 2 tested, seen failing first
- [ ] `packages/search` has no dependencies and imports nothing from the repo
- [ ] `boardSearchDocs` covers title, body, container, notes, replies

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

1. Notes above; your row in TASK-STATUS.md. 2. One LOG line, ending in a newline:
   `[[YYYY-MM-DD HH:MM]] [board-app] SEARCH_01: … → Task: [[cortex-tasks/board/2026-10-28_board-app_search-and-finding/SEARCH_01_search-engine.md]]`
3. Return Contract, `REQUESTS` for the workspace and anything else.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
