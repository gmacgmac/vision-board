# BE_04_fixture-ledgers: Test boards become ledger files

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

Every test, the demo and the gallery run on fixture ledgers in the exact format (rule 11). The
view-file fixtures and the old local sessions are removed, not kept as legacy (maintainer,
2026-10-02, point 131).

## Context

`packages/format/fixtures/roadmap.json` and `login-review.json` feed the layout, action and format
tests. `login-review.ledger.jsonl` (step 1) is the lifecycle walkthrough and stays as it is.

## Inputs

- **Create**: `packages/format/fixtures/roadmap.ledger.jsonl`,
  `packages/format/fixtures/login-layout.ledger.jsonl`
- **Modify**: `packages/layout/tests/layout.test.ts`, `packages/actions/tests/actions.test.ts`,
  `packages/format/tests/validate.test.ts`, `.gitignore`
- **Delete**: `packages/format/fixtures/roadmap.json`, `login-review.json`; local `sessions/`
- **Reuse**: `foldLedger`, `boardView`, `validateAct` (BE_01); `validateLedger`, `validateView`

## Steps

1. [ ] One-off converter in `temp/` (deleted afterwards): each view fixture becomes a ledger of
   `board`, `region` and `node` events plus links, numbering nodes 1, 2, 3 in view order and
   mapping old ids to numbers in links and `region.center`. Old numbered nodes get `item: true`.
2. [ ] Each new fixture passes `validateLedger` with no problems.
3. [ ] Tests load fixtures through one helper per package (`foldLedger` -> `boardView`), keeping
   every existing assertion's intent. Rewrite `actions.test.ts` around `validateAct` and
   `foldLedger`. `validate.test.ts`: the projection of every fixture ledger passes
   `validateView`, and the existing negative cases run on a projection copy.
4. [ ] Delete the two view fixtures and the local `sessions/` folder; drop `sessions/` from
   `.gitignore`. `.visionboard/` must not be ignored (it is committed, point 113).

## Validation

- [ ] `npm test` passes with at least as many tests as before
- [ ] `grep -rn "fixtures/.*\.json'" packages apps` finds nothing

## Constraints

Fixtures use invented, non-identifying content (no PII). No commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Pending
