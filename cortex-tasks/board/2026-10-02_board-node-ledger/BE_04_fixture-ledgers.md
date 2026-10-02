# BE_04_fixture-ledgers: Test boards become ledger files

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

Every test, the demo and the gallery run on fixture ledgers in the exact format (rule 11). The
view-file fixtures and the old local sessions are archived as reference, not deleted
(maintainer, 2026-10-02, point 255).

## Context

`packages/format/fixtures/roadmap.json` and `login-review.json` feed the layout, action and format
tests. `login-review.ledger.jsonl` (step 1) is the lifecycle walkthrough and stays as it is.

## Inputs

- **Create**: `packages/format/fixtures/roadmap.ledger.jsonl`,
  `packages/format/fixtures/login-layout.ledger.jsonl`
- **Modify**: `packages/layout/tests/layout.test.ts`, `packages/actions/tests/actions.test.ts`,
  `packages/format/tests/validate.test.ts`, `.gitignore`
- **Archive (move, see step 4)**: `packages/format/fixtures/roadmap.json`, `login-review.json`;
  local `sessions/`
- **Reuse**: `foldDrawn`, `boardView` (`packages/format`, so layout and format tests may import
  them under D-016); `foldLedger`, `validateAct` (`packages/actions`); `validateLedger`,
  `validateView`

## Steps

1. [x] One-off converter in `temp/` (deleted afterwards): each view fixture becomes a ledger of
   `board`, `region` and `node` events plus links, numbering nodes 1, 2, 3 in view order and
   mapping old ids to numbers in links and `region.center`. Old numbered nodes get `item: true`.
2. [x] Each new fixture passes `validateLedger` with no problems.
3. [x] Tests load fixtures through one helper per package, keeping every existing assertion's
   intent. Layout and format tests: `foldDrawn` -> `boardView`, imported from
   `packages/format` only (D-016; `npm run verify` checks test files too). Actions tests:
   `foldLedger`. Rewrite `actions.test.ts` around `validateAct` and
   `foldLedger`. `validate.test.ts`: the projection of every fixture ledger passes
   `validateView`, and the existing negative cases run on a projection copy.
4. [~] Archive, do not delete (done except `sessions/`: see notes): `git mv` the two view fixtures into
   `prototypes/archive/view-format-v1/fixtures/`, and move the local `sessions/` folder to
   `prototypes/archive/view-format-v1/sessions/` (check it holds no PII first). Write
   `prototypes/archive/view-format-v1/README.md`: what format 1 was, what replaced it (the
   ledger, D-017), and that nothing runs from here. Add a line for it to `prototypes/README.md`.
   Drop `sessions/` from `.gitignore`. `.visionboard/` must not be ignored (point 113).

## Validation

- [x] `npm test` passes with at least as many tests as before
- [x] `grep -rn "fixtures/.*\.json'" packages apps` finds nothing

## Constraints

Fixtures use invented, non-identifying content (no PII). No commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Completed 2026-10-03, except the `sessions/` move (held back, see PII check)

- **Fixtures**: `roadmap.ledger.jsonl` (36 events: board, 4 regions, 17 nodes, 14 links) and
  `login-layout.ledger.jsonl` (32 events: board, 4 regions, 16 nodes, 11 links), board id = file
  name, agent `kiro`, invented times 2026-10-02T09:00:00Z + 1 s per event. Nodes numbered 1, 2, 3
  in view order; old numbered nodes carry `item: true`; links and `region.center` use numbers.
  Roadmap renumbers after the unnumbered hub: old `stack` is node 7 (not an item), old items 7-16
  are now 8-17. Login: all 16 nodes were items, so numbers are unchanged. Converted by a one-off
  script in `temp/` (deleted); both pass `validateLedger` and their projections match the old
  views node, link, item and region for region.
- **Helpers**, one per package, in the test file that loads fixtures: `load(name)` in
  `layout.test.ts` and `validate.test.ts` = `readLedger` -> `foldDrawn` -> `boardView`, imported
  from the format front door only; `load(extra)` in `actions.test.ts` = the roadmap ledger plus
  person acts stamped with the next `seq`, checked by `readLedger` (asserts no problems), then
  `foldLedger`.
- **Test changes** (every assertion keeps its intent):
  - `layout.test.ts`: fixture `login-review` -> `login-layout`, so four test names changed.
  - `validate.test.ts`: per fixture, `is a valid view` -> `is a valid ledger` plus `projects to a
    valid view`, over every `*.ledger.jsonl` (now including `login-review`); a new guard test
    fails if no fixtures are found. Negative cases unchanged, run on a projection copy.
  - `actions.test.ts`: rewritten on `validateAct` and `foldLedger` (same nine tests, same
    assertions): `validateRecord` -> `validateAct`; `reduceTranscript` -> appended act events
    folded by `foldLedger`; `statusOf` and `counts` now read `boardState`/`boardView`. The text
    cap is now checked with `eventProblems` (format), because for ledger events the cap lives in
    the shape check, not in `validateAct`. Pins are keyed by number.
  - `reduceTranscript`, `validateRecord` and `makeRecord` have no tests left; they retire with
    the transcript code (FE_01).
- **Archive**: `git mv` of `roadmap.json` and `login-review.json` to
  `prototypes/archive/view-format-v1/fixtures/`; README there; line added to
  `prototypes/README.md`.
- **PII check on `sessions/`** (not moved): `roadmap/` and `login-review/` are byte-for-byte the
  fixtures. `first-look/` has two views and a 46-line `transcript.jsonl` holding the maintainer's
  verbatim dictated comments (personal working notes, a mention of his own subscription tier, the
  employer's product name) and a view body describing his machine's Node install. No names or
  emails, but personal enough that it should not become tracked without the maintainer's yes. So
  `sessions/` stays local and `sessions/` stays in `.gitignore` (dropping the line would expose it
  to `git add`). `.visionboard/` is not ignored (checked).
- **Known gap** (expected, Execution record): the old server's `seedFixtures` reads `*.json` from
  `packages/format/fixtures/`, so it now seeds nothing; boards come from the ledger with BE_03.
- **Gates**: `npm test` 0 (71 tests, was 66), `npm run check` 0, `npm run verify` 0 (one existing
  warning, `controller.ts` 336 lines). `grep -rn "fixtures/.*\.json'" packages apps`: no hits.
- **Security**: none found.
