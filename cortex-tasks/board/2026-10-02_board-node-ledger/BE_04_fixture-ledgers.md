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

1. [ ] One-off converter in `temp/` (deleted afterwards): each view fixture becomes a ledger of
   `board`, `region` and `node` events plus links, numbering nodes 1, 2, 3 in view order and
   mapping old ids to numbers in links and `region.center`. Old numbered nodes get `item: true`.
2. [ ] Each new fixture passes `validateLedger` with no problems.
3. [ ] Tests load fixtures through one helper per package, keeping every existing assertion's
   intent. Layout and format tests: `foldDrawn` -> `boardView`, imported from
   `packages/format` only (D-016; `npm run verify` checks test files too). Actions tests:
   `foldLedger`. Rewrite `actions.test.ts` around `validateAct` and
   `foldLedger`. `validate.test.ts`: the projection of every fixture ledger passes
   `validateView`, and the existing negative cases run on a projection copy.
4. [ ] Archive, do not delete: `git mv` the two view fixtures into
   `prototypes/archive/view-format-v1/fixtures/`, and move the local `sessions/` folder to
   `prototypes/archive/view-format-v1/sessions/` (check it holds no PII first). Write
   `prototypes/archive/view-format-v1/README.md`: what format 1 was, what replaced it (the
   ledger, D-017), and that nothing runs from here. Add a line for it to `prototypes/README.md`.
   Drop `sessions/` from `.gitignore`. `.visionboard/` must not be ignored (point 113).

## Validation

- [ ] `npm test` passes with at least as many tests as before
- [ ] `grep -rn "fixtures/.*\.json'" packages apps` finds nothing

## Constraints

Fixtures use invented, non-identifying content (no PII). No commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Pending
