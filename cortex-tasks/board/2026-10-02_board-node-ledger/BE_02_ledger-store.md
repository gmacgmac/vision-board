# BE_02_ledger-store: The project ledger in the I/O layer

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

The only module that reads or appends `<project>/.visionboard/ledger.jsonl` (rule 7): it validates
every line it reads and every event before it writes, stamps events, and assigns node numbers.

## Context

Replaces `apps/board/server/sessions.ts` (view files + transcript). The server is one Node process
and appends synchronously, so writes are applied one at a time (PLAN key change 2). Agents never
touch the file. Routes stay in BE_03.

## Inputs

- **Create**: `apps/board/server/ledger.ts`, `apps/board/tests/ledger-store.test.ts`
- **Modify**: root `package.json` `test` glob: add `"apps/*/tests/**/*.test.ts"`
- **Reuse**: `readLedger`, `eventProblems`, `contextProblems`, `indexEvent` (format);
  `foldLedger`, `validateAct` (BE_01); `HttpError` (`server/guard.ts`)

## Steps

1. [ ] `ledgerPath(projectDir)` -> `<dir>/.visionboard/ledger.jsonl`.
2. [ ] `openLedger(file)`: read it if present (absent = empty); `readLedger`; print each problem to
   stderr and keep the valid events (one bad line never hides the rest). Next `seq` is above
   every `seq` seen, valid or not.
3. [ ] `append(input, caller)`: `caller` = `{ by: 'person' }` or `{ by: 'agent', agent }`, set
   by the server, never by the body. Stamp `v`, `seq`, `at`, `by`, `agent`. For `node`: no `n`
   = new node, `n = maxN + 1`, `ver = 1`; with `n` = next version, server sets `ver`. Run
   `eventProblems`, `contextProblems`, and `validateAct` for `act`; on problems throw
   `HttpError(422, ..., problems)` and write nothing. Else create `.visionboard/` if needed,
   `appendFileSync` one line ending `\n`, index and fold it, notify listeners.
4. [ ] `state()` returns the folded `LedgerState` (cached, refreshed on append);
   `onAppend(fn)` returns an unsubscribe.
5. [ ] Tests (temp dirs under `os.tmpdir()`, removed after): numbers are assigned and never
   reused; a second version gets `ver 2`; a bad event writes nothing and returns every problem;
   a corrupt line is reported while the rest loads; the body cannot set `by` or `seq`; a stale
   proposal cannot be accepted; reopening the file gives the same state.

## Validation

- [ ] New tests pass; `npm test`, `npm run check`, `npm run verify` exit 0 each
- [ ] `ledger.ts` under 300 lines

## Constraints

Board and region ids pass `ID_PATTERN` before any path use (rule 18). No new dependency. No
commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Pending
