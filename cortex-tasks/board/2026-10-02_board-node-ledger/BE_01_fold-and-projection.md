# BE_01_fold-and-projection: Fold the ledger into board state

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

One pure function turns ledger events into board state, plus a projection to the `View` shape
the layout engine and page already read, so step 2 changes where data comes from, not how it draws.

## Context

The ledger format is done (step 1): `packages/format/src/ledger.ts` (event types),
`ledger-shape.ts` (`eventProblems`), `ledger-index.ts` (`contextProblems`, `indexEvent`,
`validateLedger`). Today `packages/actions/src/reduce.ts` (`reduceTranscript`) folds the old
transcript; this task adds its ledger replacement beside it. Old code is deleted in FE_01, once
nothing calls it.

## Inputs

- **Create**: `packages/actions/src/fold.ts`, `packages/actions/src/act.ts`,
  `packages/actions/tests/fold.test.ts`
- **Modify**: `packages/actions/src/index.ts`, `packages/actions/src/reply.ts`,
  `packages/format/src/ledger-index.ts`
- **Reuse**: `ACTIONS`, `DECIDED` (`registry.ts`); `applyItem` rules in `reduce.ts` (same status
  and note rules, moved, not rewritten); `contextProblems`; fixture `login-review.ledger.jsonl`

## Steps

1. [ ] `ledger-index.ts`: add `readLedger(lines) -> { events, problems, index }` holding the one
   loop; `validateLedger` becomes `readLedger(lines).problems`. No second loop.
2. [ ] `fold.ts`: `foldLedger(events): LedgerState` with `seq`; `boards` (id, title, summary,
   regions in order); `nodes` (n -> board, versions with `at`; latest = last); `links`;
   `items` (n -> status + notes, the `applyItem` rules); `replies`; `pins`; `modes` (per
   board/region); `seen` (n -> ver); `proposals` (seq -> n, ver, action, reason, source, agent,
   `decidedBy` act seq); `parks` (n -> bundle).
3. [ ] `fold.ts`: `boardView(state, board): View`. Node `id` = `String(n)`; `n` set only when the
   latest version has `item: true`; links and `region.center` mapped to the same strings;
   `version` = `state.seq`. `boardState(state, board): BoardState` keyed the same way, so
   `apps/board/src` keeps working unchanged.
4. [ ] `act.ts`: `validateAct(event, state): string[]` for `act` events, from the registry:
   `personOnly`, `onItem` (latest version has `item: true`), required text, mode region exists.
5. [ ] `reply.ts`: `replyText` keeps its output, reading `boardView` + `boardState`.
6. [ ] Tests in `fold.test.ts` on `login-review.ledger.jsonl`: statuses and notes, version count,
   the parked bundle, the accepted proposal is marked decided, `boardView` passes `validateView`,
   and ids are unchanged when nodes are reordered or one is removed (rule 10).

## Validation

- [ ] `npm test` (all pass, new tests included), `npm run check`, `npm run verify`: exit 0 each
- [ ] No file over 300 lines; no function over about 50

## Constraints

No coordinates except a person's pin (rule 9). No new dependency. No PII. No commits. Deviation:
stop and ask.

## Implementation Notes

**Status**: Pending
