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

- [x] No expiry; Stop and a new message release; only working time counts; 24 h hook; flag off = today (unit and adapter tests; the server flag's wiring is a REQUEST, below)

## Implementation Notes

**Status**: Completed (the flag reaches the server's chat through three files HOLD_01 does not own: REQUESTS) · **Completed**: 2026-10-28

### Changes Made
- `packages/agent/src/turn-clock.ts` (new, nobody's row): `startTurnClock(limitMs, onExpire)` → `{ hold(on), stop() }`. Pauses on `hold(true)`, resumes with the time left on `hold(false)`; idempotent; dead after `stop()`. One clock for both adapters (no copy).
- `adapter.ts`: `AgentSession.hold?(on)` (the Shared Foundation WIRE_01 uses; optional like `close?`, so other implementors and fakes still compile) and `StartOptions.approvalHold?`.
- `claude.ts`: the turn deadline is a `TurnClock`; `ClaudeSession.hold` forwards to the running turn; with `approvalHold` the CLI's environment gets `AGENT_GATE_WAIT_MS`.
- `kiro.ts`: same clock; `KiroSession.hold`; the permission request waits `gateWaitMs(approvalHold)`.
- `gate.ts`: `HELD_HOOK_TIMEOUT_S` (86 400), `gateWaitMs(hold)`, `GATE_WAIT_ENV`, `gateWaitFrom(env)` (a bad value keeps 585 s); `runGate` uses it. `HOOK_TIMEOUT_S`/`GATE_WAIT_MS` unchanged.
- `claude-args.ts`: `gateSettings(node, gate, hold)` and `buildClaudeArgs` take the hook timeout from `options.approvalHold`.
- `chat-approvals.ts`: `createApprovals(emit, ttlMs | null, onWait)`: `null` sets no timer and leaves `expiresAt` out; `onWait(true/false)` on the first question opening and the last settling (answer, release, abort, expiry). `ApprovalDraft.expiresAt` optional.
- `chat-session.ts`: `createLiveSession(..., { hold })`: on, `createApprovals(emit, null, w => agent.hold?.(w))`; off, as before.
- Docs: `chat.md` § The approval's timing (new section).
- Tests: `turn-clock.test.ts` (new), `chat-hold.test.ts` (new), additions to `chat-approvals`, `claude`, `kiro`, `claude-args`, `gate` tests; `fake-claude.ts` notes `AGENT_GATE_WAIT_MS`.

### Findings
- **Kiro's own limit on a permission request**: not established in sources. kiro.dev's ACP page lists the methods (no `session/request_permission` at all) and says nothing of a timeout; this adapter's ACP client (`acp.ts`) has none on a request the agent makes. The fake cannot show a real Kiro's limit, and no real CLI was run. So: the adapter side waits as long as the board does; a limit inside the real Kiro stays unverified (the maintainer's look will show it: a question held past a few minutes with Kiro).
- Claude's 86 400 s hook timeout is the CLI's configured value; whether the real CLI honours that long a hook is likewise unverified here (fake only).
- Page specs `chat.spec.ts`, `chat-panel.spec.ts` on 5200: see Verification in the return.

### Caught Beyond the Brief
- `AbortSignal.timeout` allows up to 2^31 ms; 86 385 000 fits (tested). `gateWaitFrom` rejects bigger values.
- In Node 24 `IncomingMessage` emits `close` after `end` (a test server cleared its answer timer on it); tests use `res.on('close')`.
- `packages/agent/tests/kiro.test.ts` is now 318 lines (verify warns over 300; it is not a failure). Splitting would copy its helpers.

### Deviations from Plan
- New file `turn-clock.ts` (not in File Ownership): created, no other task touches it. No export added to `index.ts` (RULES_01's lines); WIRE_01 imports nothing new from the package beyond the `hold` already on `AgentSession`.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-agent] HOLD_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
