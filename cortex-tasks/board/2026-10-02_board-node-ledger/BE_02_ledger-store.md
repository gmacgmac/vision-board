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

**Status**: Completed 2026-10-02

- **`ledger.ts`** (`apps/board/server/ledger.ts`, 123 lines): `ledgerPath(dir)`; `openLedger(file,
  warn?)` returns a `Ledger` with `file`, `problems` (load problems), `append`, `state`, `onAppend`.
  `Caller` = `{ by: 'person' } | { by: 'agent', agent }`. `warn` defaults to stderr; tests pass a
  collector.
- **Load**: `readLedger` on the lines; valid events folded once with `foldLedger`; the index's
  `seq` raised to the highest integer `seq` on any parseable line (`highestSeq`), so the next `seq`
  is above every one seen. A torn last line (no newline) gets a newline before the next append,
  so it never swallows the new event.
- **Append**: the body's `v`, `seq`, `at`, `by`, `agent`, `person` are dropped and the server
  stamps them. `node` without `n` gets `maxN + 1`; every `node` gets `ver` = current + 1, whatever
  the body says. A `node` naming an `n` that does not exist is refused ("leave n out to create a
  node"), so a client can never pick a fresh number. Checks run in order: shape
  (`eventProblems`), context (`contextProblems`), then `validateAct` for `act`; any problem throws
  `HttpError(422, 'Invalid event', problems)` and writes nothing (no `seq` is used up). Then
  `mkdirSync` `.visionboard/`, `appendFileSync` one line ending `\n`, `indexEvent`, and
  **`applyEvent`** on the cached state (no refold). A throwing listener is reported, never fails
  a write that already landed.
- **Exports changed**: `applyEvent` added to `packages/actions/src/index.ts` (already in `fold.ts`;
  importing it from `fold.ts` directly is a back-door import that `npm run verify` fails).
  `docs/specification/modules.md` regenerated with `npm run map`.
- **Tests** (`apps/board/tests/ledger-store.test.ts`, 12 tests, temp dirs under `os.tmpdir()`
  removed after each): stamping and `.visionboard/` creation; numbers assigned and never reused;
  `ver 2`; a bad event writes nothing and returns every problem; the body cannot set `by`, `seq`,
  `at`, `v` or `agent`; stale proposal refused; current proposal decided; corrupt line reported
  while the rest loads; torn last line; `onAppend` unsubscribe; reopen gives the same state.
  Root `test` glob now includes `apps/*/tests/**/*.test.ts` (51 -> 63 tests).
- **Rule 18**: no id reaches a path here (the path is fixed under the project dir); board and
  region ids are checked against `ID_PATTERN` by `eventProblems` before any write.
- **Found, not changed (BE_01's file)**: `readLedger` sets `index.seq` to a bad line's `seq` even
  when it is lower than the current one. A corrupt line carrying a low `seq` (e.g. a duplicate)
  would make the next valid line fail "seq: expected" on reload. Fix is one word in
  `ledger-index.ts` (`Math.max`), outside this task's inputs.
- **Gap**: the root `tsconfig.json` does not include `apps/*/tests`, so `npm run check` does not
  type-check the new test file. It was type-checked once with a scratch config extending the root
  one (exit 0). Adding `apps/board/tests/**/*.ts` to the include is a one-line follow-up.
- Security: none found. No new dependency. The server stamps identity; a body cannot claim it.

### Orchestrator review (2026-10-02)

- Gates rerun by the orchestrator: `npm test` 63/63, `npm run check`, `npm run verify` exit 0.
- Two fixes from the notes above, applied by the orchestrator: `readLedger` now keeps the higher
  `seq` when it skips a bad line (`Math.max`), so a corrupt low-`seq` line cannot lower it; the root
  `tsconfig.json` now includes `apps/*/tests/**/*.ts`, so the new test is type-checked.
