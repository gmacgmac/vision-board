---
task_name: Stage 6 - The Chat Panel
created: 2026-10-08
status: completed
completed: 2026-10-09
categories: [board-agent, board-app, board-ui, board-security]
tracker: cortex-tasks/tracker.md#U1,N17
---

# Stage 6: the chat panel - Task Status

> **Plan**: [PLAN.md](./PLAN.md) (rulings 1-13 are the maintainer's; do not reopen). D-036 and D-037 accepted 2026-10-08.

## Resume point (paused by the maintainer, 2026-10-09)

- Done and gated by the orchestrator (five gates exit 0 after each): BE_01, BE_02, BE_03, FE_01,
  FE_02 (853 unit + 258 page tests at the pause). Not committed: everything since `9146906`.
- Next: T_01 (skill), then BE_04 (Kiro, one real round only if its login works), then VERIFY_01
  by hand with the real `claude`; then flip `chatPanel` on by default (toolbar screenshots gain
  the Chat button; the full-gallery run needs `-chatPanel`), then commit.
- Open with the maintainer: whether to add `vb` to the desktop chat app's
  `claude_desktop_config.json` (Claude Code user and local scopes already have it).


| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | BE_01 | 1 | [Contract: chat events and routes](./BE_01_contract.md) | Opus 5.5 | Completed | Schema, 7 routes, OpenAPI 1.10.0, gates green |
| 2 | BE_02 | 2 | [Agent package and the Claude adapter](./BE_02_agent-claude.md) | Opus 5.5 | Completed | Adapter, gate hook, recorded fixtures, gates green |
| 3 | BE_03 | 3 | [Server: sessions, gate, board access](./BE_03_server-sessions.md) | Opus 5.5 | Completed | Chat module, index, gate, grant, real round, gates green |
| 4 | FE_01 | 4 | [Chat package: core and elements](./FE_01_chat-package.md) | Opus 5.5 | Completed | Core, conditions, 5 elements, gallery, chatPanel flag (off), gates green |
| 5 | FE_02 | 5 | [Board sidebar and bridge](./FE_02_sidebar-bridge.md) | Opus 5.5 | Completed | Sidebar, bridge, stepper link, page tests on a fake CLI, gates green |
| 6 | T_01 | 6 | [The skill, rewritten](./T_01_skill.md) | Opus 5.5 | Completed | SKILL.md v1, scenarios.md (8), gates green |
| 7 | BE_04 | 7 | [Kiro adapter over ACP](./BE_04_kiro.md) | Sonnet 5.5 | Completed | ACP v2 adapter, approvals via the gate route, recorded fixture, one real round (writes refused by a bug since fixed), gates green |
| 8 | FIX_01 | 8 | [Fixes from VERIFY round 1](./FIX_01_verify-fixes.md) | Opus 5.5 | Completed | Bugs 1-7 fixed test-first; real Kiro write recorded (`kiro-draw.jsonl`); header relaid; gates green |
| 9 | VERIFY_01 | 9 | [End-to-end check](./VERIFY_01_end-to-end.md) | Orchestrator | Completed | Round 1 found 7 bugs (FIX_01); round 2 passed with real Claude and Kiro; chatPanel on by default |

Gates after every task, run by the orchestrator: `npm test`, `npm run check`, `npm run verify`,
`npm run test:pages`, `npm run gen -- --check`. No git commits or stash by sub-agents. Each task
appends its own LOG line (real time from `date`) and fills its Implementation Notes and its row.
Scratch in the system temp folder; stop only your own processes by PID or port; never touch
`.visionboard/`. A task that runs the real `claude` keeps it to a few short turns.

## Shared Foundations

| What | Path + symbol | Owner | Consumers |
|---|---|---|---|
| Chat event schema (own contract) | `packages/chat/schema/chat-event.schema.json` | BE_01 | all |
| Chat routes in OpenAPI | `packages/format/schema/openapi.json` (chat operations) | BE_01 | BE_03, FE_02 |
| Adapter interface | `packages/agent/src/adapter.ts` (`AgentAdapter`, `AgentUpdate`) | BE_02 | BE_03, BE_04 |
| Approval facts and answer | `packages/agent/src/approvals.ts` (`WriteFacts`, `CommandFacts`, `ApprovalAnswer`) | BE_02 | BE_03, FE_01 |
| Recorded Claude stream fixture | `packages/agent/tests/fixtures/claude-*.jsonl` | BE_02 | BE_03, FE_01 (gallery) |
| Chat conditions table | `packages/chat/src/conditions.ts` | FE_01 | FE_02 |
| `--chat-*` properties and their board mapping | `packages/chat/src/chat.css`; `apps/board/src/styles/chat-host.css` | FE_01 | FE_02 |
| Launched agent's instructions | `skills/vision-board/SKILL.md` | T_01 | BE_03 (passes it) |

## Implementation Notes

### BE_01
_Status:_ Completed 2026-10-08. Chat event schema `packages/chat/schema/chat-event.schema.json`
(six kinds, `seq` stamped by the host, approval `facts`/`answer`/`outcome` in `$defs`); seven
routes (six person-only, `ask_approval` on a new `runToken` scheme, `auth: 'run'`); OpenAPI
1.10.0; `apps/board/server/chat.ts` holds placeholder handlers for BE_03 to replace; api.md
98-104, `docs/specification/chat.md`. Details in the task file.
### BE_02
_Status:_ Completed 2026-10-08. `packages/agent` (LAYERS `[]`): `AgentAdapter`/`AgentUpdate`
(`src/adapter.ts`), approval facts (`src/approvals.ts`), `toChatEvent` (`src/events.ts`), the Claude
adapter (`src/claude.ts`, args, stream parser), the gate (`bin/gate.ts`, `src/gate.ts`: env
`AGENT_GATE_URL`/`AGENT_GATE_TOKEN`, anchored PreToolUse matcher, `|| exit 2`, denies on anything but
a yes). Fixtures recorded from Claude Code 2.1.295: `packages/agent/tests/fixtures/claude-draw.jsonl`,
`claude-refused.jsonl`. Details in the task file.
### BE_03
_Status:_ Completed 2026-10-08. `apps/board/server/chat*.ts`: handlers (`chat.ts`), sessions and the
only CLI start (`chat-sessions.ts`, `openChats`), the index `.visionboard/chat-sessions.json`
(`chat-index.ts`, `{ ...session, agentId }`, validated, 0600, git-ignored), one live session
(`chat-session.ts`: stamping, stream, run token, Stop), approvals (`chat-approvals.ts`: 120 s, released,
session scope per facts kind), board access (`chat-access.ts`: join, grant, `rekey`, secret only in the
vb server's env), prompt (`chat-prompt.ts`). `ServerEnv.chats`; CLIs stopped on server close and exit.
vb MCP `INSTRUCTIONS_JOINED` when `VB_AGENT_SECRET` is set. api.md 105-107. Real round with Claude Code
passed (approval allowed, file written, card drawn). Details in the task file.
### FE_01
_Status:_ Completed 2026-10-08. `packages/chat/src`: patterns `feed/`, `message/`, `approval/`, `composer/`,
`header/` (core, template, element, CSS, pattern.json), `events.ts`, `conditions.ts` (busy, waiting, blocked,
stopped, error; `ChatHost.blocked` is the host's reason), `chat.css` (`--chat-*` with neutral fallbacks);
`apps/board/src/styles/chat-host.css` maps them to `--vb-*`. Flag `chatPanel` added, default off; gallery
section `chat-section.ts` fed by `gallery.chat.json` (the recording, kept in step by
`apps/board/tests/chat-fixture.test.ts`); `tests/pages/chat.spec.ts` with new chat screenshots only. APCA
measured, all tiers pass. Details and FE_02 hand-off in the task file.
### FE_02
_Status:_ Completed 2026-10-09. `board/chat-bridge.ts` (chips from the selection and unsent notes; change chip selects
and zooms, opening its board; stepper link via `packages/ui` `CardUpdates.source`), `board/chat-panel.ts` (session in
use, `watch_chat` with start-over, send/start/answer/stop/new/pick through `io.ts`), `shell/ChatSidebar.svelte` (right,
T and toolbar Chat, drag/arrow width, kept per viewer, `--vb-chat-w`), `styles/chat-sidebar.css`; stage ResizeObserver
(`wiring.ts`). Page tests `tests/pages/chat-panel.spec.ts` on an in-process server with the fake CLI
(`chat-server.ts`, port 4471). Flag still off. Details in the task file.
### T_01
_Status:_ Completed 2026-10-09. `skills/vision-board/SKILL.md` v1 on the MCP API, covering both settings (own
chat: join and keep the secret; panel: no join or secret, short chat words, Allow/Deny, never `wait`), layout by
shape, naming, keys, access, reading, reply vs append, propose, park (fresh when re-saved).
`skills/vision-board/scenarios.md`: 8 scenarios; 1 and 3 are for VERIFY_01. NOTES.md intro updated. Details
in the task file.
### BE_04
_Status:_ Completed 2026-10-09. `packages/agent` Kiro adapter over ACP engine v2 (`acp.ts`, `kiro.ts`, `kiro-turn.ts`,
`kiro-permission.ts`): process per session, `session/new`/`load` with the vb server and secret in `env`, instructions
lead the first message, `session/request_permission` asked through the gate route (vb tools and reading unasked, file
changes and commands asked, the rest refused), `AgentSession.close()`. `start_chat` accepts `kiro`. Fixture
`kiro-denied.jsonl` (one real turn), fake `fake-kiro.ts`, tests in the agent package and `api-chat-kiro.test.ts`. One real
round: login worked, no credit error; a successful board write over Kiro is not observed live. Details in the task file.
### FIX_01
_Status:_ Completed 2026-10-09. Message during a start waits for the new session (page `hold`; server `conflict`
while starting, Send only once accepted); Kiro write result from `rawOutput` (real fixture `kiro-draw.jsonl`);
newest session after reload; restart line; Claude error said once; header pickers full width; round baseline
`firstCards` (rounds.ts). Chat gallery screenshots updated (header only). Details in the task file.
### VERIFY_01
_Status:_ Completed. Round 1 (Kiro; Claude blocked by a stale CLI) found bugs 1-7, fixed in FIX_01; round 2 passed with the real Claude (current CLI) and Kiro: draw, chips, approvals, restart, Stop, past version, scenarios 1 and 3. Then `chatPanel` on by default. Open, not blocking: `VB_CLAUDE_BIN` (FIX_02, optional), the chip says "Drew" for an append, the agent's chat words run long (skill evaluation).
