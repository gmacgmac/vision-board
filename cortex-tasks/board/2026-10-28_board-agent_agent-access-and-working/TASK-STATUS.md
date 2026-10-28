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
| 1 | RULES_01 | 1 | strong | Application security engineer who has written sandbox policies — a rule that matches the path as typed rather than the file it reaches is no rule; every refusal must hold against `..`, symlinks, case and a second route to the same file. | [The access rules and the policy](./RULES_01_access-rules.md) | Completed | port 5100 |
| 2 | HOLD_01 | 1 | standard | Reliability engineer for long-running processes — a person's slow answer is not a failure; only the agent's own runaway work should be cut, and every wait must still end cleanly on Stop. | [Questions wait for the person](./HOLD_01_questions-wait.md) | Completed | port 5200 |
| 3 | WORK_01 | 1 | strong | Product designer for collaborative tools — while someone else is working the person must see it at a glance, never be blocked from their own work, and never miss the moment a reply arrives. | [Working alongside the agent](./WORK_01_working-alongside.md) | Completed | port 5300 |
| 4 | WIRE_01 | 2 | strong | Application security engineer who has written sandbox policies — the same as RULES_01's: one policy, applied before anything remembered, on every route a tool call can take. | [Every route uses the policy](./WIRE_01_wire-policy.md) | Completed | port 5400 |
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
| HOLD_01-R1 | HOLD_01 | `apps/board/server/chat-sessions.ts`, `project.ts`, `app.ts`: pass `approvalHold` from `VB_FLAGS` to the live session and the adapters | WIRE_01 (ownership widened) | Done |
| HOLD_01-R2 | HOLD_01 | Chat schema: `expiresAt` optional; regenerate | Orchestrator | Done |
| HOLD_01-R3 | HOLD_01 | `packages/chat` events, feed, approval: `expiresAt` optional; no countdown and no "expired" without it ("Waiting for your answer") | ASK_01 | Open |
| HOLD_01-R4 | HOLD_01 | api.md: an approval's 120 s becomes no limit with `approvalHold`; agent README: `hold`, `approvalHold`, `turn-clock.ts` | WIRE_01 | Done |
| RULES_01-R1 | RULES_01 | Words home `packages/agent/src/words` in words-homes.mjs and words.md | Orchestrator | Done |
| RULES_01-R2 | RULES_01 | D-066 appended with the maintainer's yes | Orchestrator (point 340) | Done |
| RULES_01-R3 | RULES_01 | `.env.example` refused by `**/.env.*`; a nested board's secrets readable | Maintainer: .env.example readable (338), the bots' secrets refused in any board folder (339); WIRE_01 changes the table | Done |
| WORK_01-R1 | WORK_01 | Server queues words alone while the agent works (`chat.ts` `sendChat`, `chat-sessions.ts` `tell`), and a refused message stops releasing waiting approvals (`busy()`); then a `ChatHost` flag that the page queues words | WIRE_01 (ownership widened): server Done; the page's flag needs `packages/chat` (WIRE_01-R2) | Done (server) |
| ALL-R1 | all | `npm run map` | Orchestrator | Done |
| Words alone queue while the agent works: `server/chat-sessions.ts` `tell` holds them like attached ones (joined, `QUEUED_WORDS` line, 202), and the folder branch of `server/chat.ts` `sendChat` uses `live.post`; a refused message no longer releases waiting approvals (`busy()`) | WORK_01 | non-blocking (point 328: "the person can send more") | WIRE_01 | Done (same as WORK_01-R1) |
| WIRE_01-R1 | WIRE_01 | Chat schema (orchestrator's): `$defs/readFacts` in `facts`, `approval_request.scopes`, `outcome.asked` wording, made by WIRE_01 to verify: accept or redo; decide the `$id` move (chat.md 7) | Orchestrator: accepted, `$id` stays chat/1 | Done |
| WIRE_01-R2 | WIRE_01 | `packages/chat`: `ChatHost.queues` (words alone go while the agent works; the composer's hint), then `apps/board/src/shell/chat-panel.ts` `render` sets it with `holds` (both on a board and in the folder) under `workAlongside` | ASK_01 (packages/chat) | Open |
| WIRE_01-R3 | WIRE_01 | `packages/chat` events, feed, approval: render `read` facts (`{ path, recursive? }`) and offer only the request's `scopes` (`folder` → "Allow for this folder"); the forget list on `list_permissions`/`forget_permission` | ASK_01 | Open |
| WIRE_01-R4 | WIRE_01 | `npm run map` (new exports: `chat-permissions.ts`, `#agent` `coverOf`, `rememberedHead`, `claudeDenyRules`, `gateEnv`, `READ_TOOLS`, `RULES_REFUSAL`, `GATE_*_ENV`); `npm run gen` to confirm | Orchestrator | Open |

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### RULES_01
_Status:_ Completed (2026-10-28)
- `policy(facts, folder, { reader?, strict? })`, `resolveIn`, `ACCESS_RULES`/`accessFor`, `readOnlyCommand`,
  `shellWords`, `commandHead` exported from `#agent`. `ReadFacts` (with `recursive` for a search) lives in
  `policy.ts`; WIRE_01 may move it beside `WriteFacts`. `strict` = `agentAccessRules` off.
- Apply `policy` before any remembered yes; remember a command only by `commandHead` (null: don't).
- Beyond the brief: physical `..`, dangling links, case via `realpath.native`, hard links asked once,
  searches (`grep -r`, `rg`, Grep) refused when anything under them is refused. D-066 drafted in the task file.
- Orchestrator: `npm run map` (new exports); the words home `packages/agent/src/words/` to add to
  `scripts/words-homes.mjs` `PARTS` and `docs/specification/words.md`.

### HOLD_01
_Status:_ Completed. `AgentSession.hold?(on)` (adapter.ts) is what WIRE_01 and the server call; `StartOptions.approvalHold` and `createLiveSession(..., { hold })` carry the flag. New file `packages/agent/src/turn-clock.ts` (`startTurnClock`). `createApprovals(emit, ttlMs | null, onWait)`: `null` = no expiry and no `expiresAt` on the request. Gate: `gateWaitMs(hold)`, `AGENT_GATE_WAIT_MS`, `HELD_HOOK_TIMEOUT_S`. Kiro's own limit on a permission request: not established in sources (kiro.dev ACP page silent; fake only). The flag does not yet reach the server's chat: three files outside HOLD_01 need two lines each (see Requests). Details in HOLD_01_questions-wait.md.

### WORK_01
_Status:_ Completed (2026-10-28)
- The Chat button is the board's mark (`shell/ChatButton.svelte`: "Agent working", "Waiting for your OK", "1 new"), from `shell/chat-news.ts` (`agentWork` on the chat's conditions; `createReplyNews`, `panelNews`). Send while working reads "Queued"; a reply out of sight brings a polite toast with Open chat (`shell/Toast.svelte`, `toast(…, action)`). Gallery section last (`gallery/alongside-section.ts`); spec `tests/pages/chat-alongside.spec.ts` with two new baselines.
- Words alone while the agent works still can't go: the server refuses them. Request to WIRE_01 (a server queue); the page follow-up is small (`ChatHost` says it queues words).
- `npm run verify` fails only on `docs/specification/modules.md` (RULES_01's new exports): orchestrator's `npm run map`.

### WIRE_01
_Status:_ Completed (2026-10-28)
- One `policy` on every route: Claude's gate (writes, `Bash`, and now `Read`/`Glob`/`Grep`; folder from
  `AGENT_GATE_FOLDER`, never the hook's `cwd`), Claude Code's own `permissions.deny` (`claudeDenyRules`), Kiro's
  `verdictFor` (every path a call names; its agent file no longer pre-approves reads), and the server again
  (`chat-approvals.ts`), before any kept yes. Kept yeses are narrow (`coverOf`: a write's folder, a read's file,
  a search's folder, `rememberedHead`); requests carry `scopes`; `folder` kept in `.visionboard/permissions.json`
  (`chat-permissions.ts`), `list_permissions`/`forget_permission`. Flags from `VB_FLAGS`: `approvalHold`,
  `agentAccessRules` (→ `strictAccess`).
- WORK_01-R1 server side: words alone (and folder messages) queue, joined; an accepted message releases the
  waiting questions, a refused one nothing. The page flag needs `packages/chat` (WIRE_01-R2, ASK_01).
- Deviations: the chat schema (WIRE_01-R1) and a line or two in `adapter.ts`, `claude.ts`, `kiro.ts`, the Kiro
  agent file; `npm run gen` run. For ASK_01: `read` facts and `scopes` to render (WIRE_01-R3).
- Checks: unit 1895 pass, check 0 errors, gen-api current, verify fails only on modules.md (map); chat page
  specs on 5400 (4 workers): 65 passed. For the maintainer: `rm`/bare-`git` heads, whole-folder searches
  always refused (task file).
- Run 2: `NEVER_REMEMBERED` (one table beside `commandHead`: code runners, commands acting on their targets,
  forced git, network) asked every time; `git -C x commit` → `git commit`. Unit 1897, check 0, chat specs 65.

### ASK_01
_Status:_ Pending

### VERIFY_01
_Status:_ Pending

## The Run (orchestrator)

| Wave | Tasks | Commit · tag | Gate |
|------|-------|--------------|------|
| 1 | RULES_01, HOLD_01, WORK_01 | `access/wave-1` | Green 2026-10-28: unit 1874, check 0 errors, verify ok, gen-api current, full page suite 746 passed (port 4710). Orchestrator: chat schema (`expiresAt` optional, `folder` scope), the agent's words home, `npm run gen`/`map`, chat-schema.test.ts to the new rule |
| 2 | WIRE_01 (Runs 1–2) | `access/wave-2` | Green 2026-10-28: unit 1897 + timing 14, check 0 errors, verify ok, gen-api current, full page suite 746 passed (port 4710). WIRE_01's chat schema additions (read facts, request scopes) accepted; $id stays chat/1 |
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
