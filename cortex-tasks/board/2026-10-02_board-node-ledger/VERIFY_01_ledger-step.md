# VERIFY_01_ledger-step: Prove step 2 end to end

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

Show, by running it, that the board works on the ledger exactly as it did on view files, and
that the ledger keeps its rules.

## Steps

1. [x] Gates, each run separately and its exit code read: `npm test`, `npm run check`,
   `npm run verify`.
2. [x] `npm run demo`, open the board at `http://localhost:4466` (localhost, not 127.0.0.1):
   - the roadmap board draws in every mode as before, with no console errors
   - acknowledge one item, comment on another, drag a card (pin), change a region's mode
   - reload: all four are still there
   - a second tab shows each change without a reload
3. [x] `temp/demo/.visionboard/ledger.jsonl`: one new line per action, `by: "person"`, `seq` rising
   by one, and `validateLedger` reports no problems.
4. [x] `curl`: an act on an unknown node and an agent-only action from the page both return 422
   with problems, and the ledger gains no line.
5. [x] `bin/reply.ts roadmap` prints the numbered reply.
6. [x] `packages/format/fixtures/` is unchanged after the demo (the seed was copied, not written).

## Validation

- [x] Each step above passes, with a screenshot of the reloaded board in the notes

## Implementation Notes

**Status**: COMPLETED 2026-10-04, by the orchestrator in person (maintainer, point 343).

Every step passed, on a fresh `temp/demo` seeded from `roadmap.ledger.jsonl`:

1. `npm test` 71/71, `npm run check` 0, `npm run verify` 0 (one long-file warning:
   `apps/board/src/board/controller.ts`, 340 lines).
2. Chromium probe (`temp/verify-ledger.mjs`, two tabs): all five modes draw 17 cards; acknowledge,
   comment, pin and a mode change each show in the second tab without a reload and survive a
   reload. No console errors, page errors or failed requests. 19 checks, 0 problems.
3. Ledger went 36 to 44 lines, one per action (5 mode, ack, comment, pin), all `by: "person"`,
   `seq` rising by one; `eventProblems` reports nothing on any of the 45 lines.
4. `curl` act on node 999 and an unknown action `approve`: both 422 with problems, no line added.
5. `VB_PROJECT=temp/demo node apps/board/bin/reply.ts roadmap` prints `1 ok`, `2 comment: verify
   note` and the open list. Without `VB_PROJECT` it looks in the repo root and finds no board.
6. `git status packages/format/fixtures` is clean after the demo.

Findings carried forward (not fixed here):

- **Unknown fields are stored.** An act body carrying an extra `title` was accepted and written
  to the ledger as-is (`type` is forced to `act`, so it cannot become a node change, and the fold
  ignores it). `eventProblems` allows extra keys. U4 step 1's JSON Schema should close each event
  shape (`additionalProperties: false`).
- **`npm run validate` still checks view files** (`packages/format/bin/validate.ts`). The agent
  write path for ledgers arrives with U4; the CLI should move with it.

`sessions/` moved to the git-ignored `temp/keep-local/sessions-v1/` with a keep note (point 344).
