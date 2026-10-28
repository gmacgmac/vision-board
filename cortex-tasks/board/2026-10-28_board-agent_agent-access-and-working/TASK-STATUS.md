---
task_name: Agent Access and Working Alongside
created: 2026-10-28
completed:
status: in-progress
categories: [board-security, board-agent, board-app]
---

# Agent Access and Working Alongside - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-10-28

## Instructions for Agents

1. **Read PLAN.md first**, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column**
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component
5. **Touch only the files you own** (File Ownership). Need a change elsewhere? `REQUESTS`
6. **If you need to deviate, STOP and inform the user**
7. **Frontmatter `status`**: `planned` → `in-progress` when you start; closing is the orchestrator's
8. **Update your row** when you finish; **implementation notes** in your task file and brief notes here.
   Re-run? A `Run N:` line here and a `### Run N` block in your task file
9. **No git commits**; never port 4466; never `cortex/AUDITED.md`
10. **Your port**: your row's Notes (`VB_TEST_PORT`, workers +10)
11. **No full page suite in a task**: unit tests, `check`, `verify`, `gen-api --check`, your page specs
12. **A bug fix starts with the failing test**
13. **No test starts a real CLI** on the person's account: fake CLIs and the chat fixtures only

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | RULES_01 | 1 | strong | Application security engineer who has written sandbox policies — a rule that matches the path as typed rather than the file it reaches is no rule; every refusal must hold against `..`, symlinks, case and a second route to the same file. | [The access rules and the policy](./RULES_01_access-rules.md) | Pending | port 5100 |
| 2 | HOLD_01 | 1 | standard | Reliability engineer for long-running processes — a person's slow answer is not a failure; only the agent's own runaway work should be cut, and every wait must still end cleanly on Stop. | [Questions wait for the person](./HOLD_01_questions-wait.md) | Pending | port 5200 |
| 3 | WORK_01 | 1 | strong | Product designer for collaborative tools — while someone else is working the person must see it at a glance, never be blocked from their own work, and never miss the moment a reply arrives. | [Working alongside the agent](./WORK_01_working-alongside.md) | Pending | port 5300 |
| 4 | WIRE_01 | 2 | strong | Application security engineer who has written sandbox policies — the same as RULES_01's: one policy, applied before anything remembered, on every route a tool call can take. | [Every route uses the policy](./WIRE_01_wire-policy.md) | Pending | port 5400 |
| 5 | ASK_01 | 3 | standard | — | [Allow for this folder, and forgetting it](./ASK_01_folder-scope-ui.md) | Pending | port 5500 |
| 6 | VERIFY_01 | 4 | strong | Penetration tester given a running board and a chat with an agent they control, no history of the work — tries every way to read `.env` or the bots' secrets, write the ledger or `.git/`, keep a yes beyond its scope, or get a question to answer itself. | [Verification](./VERIFY_01_access-verification.md) | Pending | port 5600 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/agent/src/access-rules.ts` (`ACCESS_RULES`, the one table) and `policy.ts` (`policy(facts, folder)` → allow / ask / refuse with a reason; `resolveIn(folder, path)`; `readOnlyCommand(command)`) | RULES_01 | WIRE_01, ASK_01, VERIFY_01 |
| `adapter.ts` session `hold(on)`: the turn clock pauses while a question waits | HOLD_01 | WIRE_01 |
| The chat schema's answer `scope: 'folder'` | orchestrator (before wave 2) | WIRE_01, ASK_01 |
| `server/chat-permissions.ts` (`.visionboard/permissions.json`, list and forget) and its api.md operations | WIRE_01 | ASK_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | RULES_01 | `packages/agent/src/access-rules.ts` (new), `packages/agent/src/policy.ts` (new), `packages/agent/src/readonly-command.ts` (new, if `policy.ts` would pass 300 lines), their tests in `packages/agent/tests/`, the export lines in `packages/agent/src/index.ts`, `packages/agent/README.md`, `packages/agent`'s words file (new if none: per `docs/specification/words.md`) |
| 1 | HOLD_01 | `apps/board/server/chat-approvals.ts` (the time limit only), `apps/board/server/chat-session.ts` (telling the adapter to hold), `packages/agent/src/adapter.ts`, `claude.ts`, `kiro.ts`, `gate.ts` (the timeouts only), `claude-args.ts` (`HOOK_TIMEOUT_S` only), their tests, `docs/specification/chat.md` § the approval's timing |
| 1 | WORK_01 | `apps/board/src/shell/chat-bridge.ts`, `ChatSidebar.svelte`, `chat-panel.ts`, `chat-view.ts`, the chat button and the toast in `apps/board/src/shell/` (and `App.svelte` for wiring only), `apps/board/src/shell/words/shell-send.ts` and the chat's shell words, `packages/chat/src/composer/**`, `packages/chat/src/header/**`, the board's working mark (its CSS and status field), `apps/board/src/gallery/` (new sections last), `tests/pages/chat*.spec.ts`, `docs/specification/chat.md` § the panel (not § approvals) |
| 2 | WIRE_01 | `packages/agent/src/gate.ts`, `approvals.ts`, `kiro-permission.ts`, `claude-args.ts`, `apps/board/server/chat-approvals.ts`, `chat-access.ts`, `chat-session.ts`, `chat-permissions.ts` (new), `apps/board/server/words/`, `packages/format/schema/` (the permissions operations in openapi.json), their tests, `docs/specification/chat.md` § approvals, `docs/specification/api.md`, `skills/vision-board/SKILL.md` (what the agent may read and write; version line) and `NOTES.md` |
| 3 | ASK_01 | `packages/chat/src/approval/**`, `packages/chat/src/header/**`, the chat's words, `apps/board/src/shell/chat-*.ts` (the forget list's wiring), `apps/board/src/gallery/` (last), `tests/pages/chat*.spec.ts` |
| 4 | VERIFY_01 | its notes, `VERIFY_01_findings.md` |
| — | orchestrator | `package.json`, lock, `docs/decisions.md`, `cortex-tasks/tracker.md`, `packages/format/src/flags.ts`, `packages/chat/schema/chat-event.schema.json` (the `folder` scope), generated files, unexpected baselines |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### RULES_01
_Status:_ Pending

### HOLD_01
_Status:_ Pending

### WORK_01
_Status:_ Pending

### WIRE_01
_Status:_ Pending

### ASK_01
_Status:_ Pending

### VERIFY_01
_Status:_ Pending

## The Run (orchestrator)

| Wave | Tasks | Commit · tag | Gate |
|------|-------|--------------|------|
| 1 | RULES_01, HOLD_01, WORK_01 | — | — |
| 2 | WIRE_01 | — | — |
| 3 | ASK_01 | — | — |
| 4 | VERIFY_01 | — | — |

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] D-066 appended with the maintainer's yes
- [ ] The maintainer looks: a held question; working on the board while the agent works; a reply announced
- [ ] LOG entry created

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`
2. Set LOG entry: `[[YYYY-MM-DD HH:MM]] [board-security] Completed set: Agent Access and Working Alongside → Task: [[cortex-tasks/board/2026-10-28_board-agent_agent-access-and-working/TASK-STATUS.md]]`
3. Remind the maintainer that plugin mode is next
