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

**Status**: Completed · **Completed**: 2026-10-29

### Changes Made
- `VERIFY_01_findings.md` (new): 13 findings, each with a fix in this set or a tracker row; what held; what
  only a live run settles; gates; doc audit. No product or test code changed.
- Probes (`temp/verify01/`, deleted): a scratch board folder with every refused file, links and an outside
  folder; Claude's hook input through `gate.ts` `decide`, Kiro's ACP call through `verdictFor`, the server's
  `createApprovals` for kept yeses. A scratch board on 5600 for the gallery look, stopped.
- Checks: unit 1907 + timing 14 pass, check 0 errors, verify ok, gen-api current; `chat-alongside` and
  `chat-folder` page specs on 5600: 17 passed; the gallery looked at in light and dark.

### Caught Beyond the Brief
- **F1 (blocking)**: Kiro's own default policy reads the workspace silently (`fs_read` on `./**`), so `.env`
  and the bots' secrets never reach `verdictFor`. Fix: `ask` and `deny` rules in the agent file.
- **F2, F3, F4 (high)**: a command's session yes covers outside paths (head only); a search of the board's
  parent is only asked; command words resolve from the board's folder, not the shell's (after a `cd`,
  `cat agents.json` goes unasked).
- F5 app-state readable (D-050 says no agent read), F6 `git config` remembered, F7 remembered runners run
  agent-written code (and the person cookie), F8 Claude tools outside the gate (`--tools`), F9 to F11 rule gaps,
  F12 untrue Kiro lines in four docs and the gallery, F13 the search advice.

### Deviations from Plan
- Step 1's "fake CLIs" were replaced by the CLIs' exact input shapes fed to `decide`, `verdictFor` and
  `createApprovals` directly: the same code the fake CLIs reach, without starting processes. What the real
  CLIs do was taken from their documentation, as briefed.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
