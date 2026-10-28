# HOLD_01_questions-wait: Questions wait for the person

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A question the agent asks waits until the person answers, presses Stop, or sends a new message. The
turn's time limit counts only the agent's own working time. Behind the `approvalHold` flag (server
flags, `VB_FLAGS`); off, today's 2 minutes and 10 minutes.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (HOLD_01)
- **Files to reference**: `apps/board/server/chat-approvals.ts` (`APPROVAL_TTL_MS`, `createApprovals`),
  `chat-session.ts` (the live session, `approvalTtlMs`), `packages/agent/src/adapter.ts`, `claude.ts`
  (`TURN_LIMIT_MS`, the deadline), `kiro.ts` (its deadline), `gate.ts` (`HOOK_TIMEOUT_S`, `GATE_WAIT_MS`),
  `claude-args.ts` (`gateSettings`), PLAN.md ruling 335
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first**: an approval with the flag on never expires (fake timers past 2 min, an hour);
   Stop and a new message still release it; a turn whose time includes a long wait for an answer is not
   stopped at 10 minutes, and one that works 10 minutes on its own is (fake timers, the fake CLIs);
   Claude's hook timeout in the generated settings is 86 400 s and the gate waits just under it; Kiro's
   permission request waits as long as the board does (adapter test).
2. **The adapter contract** (`adapter.ts`): a session's `hold(on: boolean)`; the turn deadline pauses on
   `hold(true)` and resumes with the time left on `hold(false)`. `claude.ts` and `kiro.ts` implement it;
   the server's live session calls it when a question opens and when it settles.
3. **No expiry**: with the flag on `createApprovals` sets no timer; `approval_request`'s `expiresAt` is
   left out (check the chat schema allows that; if `expiresAt` is required, a `REQUEST` to make it
   optional, and say what the panel does with it).
4. **Claude's hook**: `HOOK_TIMEOUT_S` 86 400 with the flag on; `GATE_WAIT_MS` 15 s under it.
5. **Kiro**: find whether Kiro (`kiro-cli acp`) has its own limit on a permission request; read its
   documentation and test it with the fake; report what you find.
6. **Docs**: chat.md § the approval's timing. **Checks**: unit tests, `check`, `verify`, `gen-api --check`,
   the chat page specs that use approvals (`chat*.spec.ts`) on 5200.

## Validation

- [ ] No expiry; Stop and a new message release; only working time counts; 24 h hook; flag off = today

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-agent] HOLD_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
