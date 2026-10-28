# VERIFY_01_access-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Show, with evidence, that PLAN.md's success criteria hold, by trying to break them; list exactly what
doesn't. You change no code; findings in `VERIFY_01_findings.md`, each with a fix or a tracker row.

## Steps

1. **Escape the rules**, with the fake CLIs driving real tool-call shapes for Claude and Kiro: read
   `.env` (directly, `../`, a symlink, `.ENV`, `cat`, `grep -r`, `find -exec cat`, a pipe), read
   `.visionboard/agents.json`, write the ledger, `.git/hooks/`, `permissions.json`; make a yes outlive its
   scope (session to another folder, command head to another command, outside to remembered).
2. **Hold**: a question unanswered for an hour (fake timers) still waits; Stop and a new message end it;
   the turn clock pauses only while asking.
3. **Working alongside**: the marks, sending more, the announced reply, as a person sees them, light and dark.
4. **The folder scope UI**: four answers inside, three outside, the list, Forget.
5. **Gates**: `npm test`, `check`, `verify`, `gen-api --check`. **Doc audit** (`cortex-docs`): chat.md,
   api.md, the agent README, the skill.

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
