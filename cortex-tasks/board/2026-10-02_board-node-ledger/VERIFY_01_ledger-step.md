# VERIFY_01_ledger-step: Prove step 2 end to end

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

Show, by running it, that the board works on the ledger exactly as it did on view files, and
that the ledger keeps its rules.

## Steps

1. [ ] Gates, each run separately and its exit code read: `npm test`, `npm run check`,
   `npm run verify`.
2. [ ] `npm run demo`, open the board at `http://localhost:4466` (localhost, not 127.0.0.1):
   - the roadmap board draws in every mode as before, with no console errors
   - acknowledge one item, comment on another, drag a card (pin), change a region's mode
   - reload: all four are still there
   - a second tab shows each change without a reload
3. [ ] `temp/demo/.visionboard/ledger.jsonl`: one new line per action, `by: "person"`, `seq` rising
   by one, and `validateLedger` reports no problems.
4. [ ] `curl`: an act on an unknown node and an agent-only action from the page both return 422
   with problems, and the ledger gains no line.
5. [ ] `bin/reply.ts roadmap` prints the numbered reply.
6. [ ] `packages/format/fixtures/` is unchanged after the demo (the seed was copied, not written).

## Validation

- [ ] Each step above passes, with a screenshot of the reloaded board in the notes

## Implementation Notes

**Status**: Pending
