---
title: Agent Access and Working Alongside
created: 2026-10-28
categories: [board-security, board-agent, board-app]
---

# Agent Access and Working Alongside

## Problem

The side-panel agent (Claude Code or Kiro, started by the board server) asks the person before every
file write and shell command, and nothing else stands between it and the disk:

1. **A remembered yes covers a whole kind.** `apps/board/server/chat-approvals.ts` `kept` holds `write`
   or `command` once the person answers "this session": one yes to one file lets every later write
   through (the ledger, `.git/hooks/`, files outside the folder); one yes to `npm test` lets any command run.
2. **Reads have no limit.** Claude's `Read`, `Glob`, `Grep` are allowed outright (`server/chat-access.ts`
   `CHAT_TOOLS`), Kiro's `read`/`search` too (`packages/agent/src/kiro-permission.ts` `verdictFor`):
   `.env`, `.visionboard/agents.json` (the bots' secret hashes), anything in the person's home.
3. **Nothing is protected.** The ledger, the board's own files and `.git/` are ordinary files to write.
4. **Paths are judged as written.** `factsFor` (`packages/agent/src/approvals.ts`) joins `cwd` and the
   path but never resolves `..` or symlinks.
5. **Questions expire and turns are cut.** An unanswered question is a denial after 2 minutes
   (`APPROVAL_TTL_MS`); a turn is stopped after 10 minutes of wall time, waiting included
   (`claude.ts` `TURN_LIMIT_MS`, used by `kiro.ts` too); Claude's hook gives up at 600 s (`gate.ts` `HOOK_TIMEOUT_S`).
6. **The person can't tell or keep going.** While the agent works, Send is held ("Waiting for agent",
   `shell/words/shell-send.ts`); the board itself shows nothing; a reply that lands while the person
   is on the board passes unnoticed.

## The maintainer's rulings (2026-10-28)

- **328**: while the agent works the person keeps working on the board; the board shows the agent is
  working; the person can send more (it goes in order); a reply that lands is announced with a count
  on the chat button and a toast that opens it.
- **329 / 331**: access is decided by **rules on paths relative to the board's folder** (the folder the
  board has open; the agent's working folder). The agent reads the folder and every subfolder. The
  list is one table now; a file the person edits comes later.
- **334**: anything the rules don't name is asked. Outside the folder: asked, "once" or "this session"
  only, never remembered for the folder.
- **335**: a question waits until the person answers it, Stops, or sends a new message: no expiry; the
  turn's limit counts only the agent's own working time (it pauses while a question waits); where
  Claude needs a number for its hook, 24 hours.

## The rules (one table, `packages/agent/src/access-rules.ts`)

| Path, relative to the board's folder | Read | Write |
|---|---|---|
| everything in the folder | allow | ask |
| `**/.env`, `**/.env.*` | refuse | refuse |
| `.visionboard/agents.json`, `.visionboard/chat-sessions.json` | refuse | refuse |
| `.visionboard/ledger.jsonl` | allow | refuse |
| `.visionboard/lock`, `.visionboard/app-state/**`, `.visionboard/permissions.json` | allow | refuse |
| any other path in `.visionboard/` but `images/**` and `apps/**` | allow | refuse |
| `.visionboard/images/**`, `.visionboard/apps/**` | allow | allow |
| `.git/**` | allow | refuse |
| outside the folder | ask (once or session) | ask (once or session) |

"Refuse" holds whatever the person answers. A shell command that only reads (an allow-list: `ls`, `cat`,
`head`, `tail`, `wc`, `pwd`, `tree`, `stat`, `file`, `grep`/`rg`, `find` without `-exec`/`-delete`/`-ok`,
`git log|status|diff|show|blame|ls-files|rev-parse|branch` without arguments that write; joined only by
`|`; no redirection, `$()`, backticks, `;`, `&&`) is a read of the paths it names. Any other command is
asked; a command naming a refused path is refused. Paths are resolved first: absolute, `..` removed,
symlinks followed (the nearest existing parent for a file not yet made).

App code in `.visionboard/apps/` is written freely because an app already has its own Allow: changed
code asks again before it runs (D-047).

A remembered yes gets narrower: a write yes covers writes under that file's folder; a command yes
covers that command's first words (`npm test`, `git commit`). New scope `folder`: remembered in
`.visionboard/permissions.json` (a refused path for the agent), listed and forgettable by the person.

## How it meets the principles

| Piece | Reuses / lives in | Contract first | Words |
|---|---|---|---|
| The rules and the decision (`policy`) | a pure function in `packages/agent` (framework-free, so a host such as the plugin's can use it) beside `factsFor` | `access-rules.ts` (the one table), `Decision = allow \| ask \| refuse` | refusal reasons in `packages/agent`'s words home (`docs/specification/words.md`) |
| Claude's reads | the gate's `PreToolUse` hook (`claude-args.ts` `gateSettings`) gains Read, Glob, Grep; Claude Code's own `permissions.deny` generated from the same table as a second line | the hook's matcher | — |
| Kiro | `kiro-permission.ts` `verdictFor` asks the same `policy` | — | — |
| The server | `chat-approvals.ts` applies `policy` before any remembered yes; remembered yeses by folder or command head | chat schema: answer `scope` gains `folder`; api.md | `server/words` |
| "Allow for this folder" kept | a new `server/chat-permissions.ts` (`.visionboard/permissions.json`, written by the server only) | api.md: list and forget operations (openapi.json first) | `server/words` |
| Hold | `chat-approvals.ts` (no TTL), the adapters' turn clock paused while a question waits (`adapter.ts` session `hold(on)`), `gate.ts` / `claude-args.ts` 24 h | adapter interface | — |
| Working alongside (328) | `shell/chat-bridge.ts`, `ChatSidebar.svelte`, the chat button, the toast (`shell` toast), `packages/chat` composer | none new beyond the chat's own events | `shell/words/shell-send.ts`, chat words |
| The approval's third answer and the forget list | `packages/chat` `approval/` pattern, the chat header's menu | — | chat words |

Flags (`packages/format/src/flags.ts`, the orchestrator adds them before wave 1): `agentAccessRules`
(the loosening: reads, read-only commands and `images/`/`apps/` writes without asking; the `folder`
scope), `approvalHold` (no expiry, paused turn clock), `workAlongside` (328). The tightening (refused
paths, path resolution, narrower remembered yeses, asked outside reads) is a fix and has no flag.

New decision entry (the maintainer's yes before it is appended): **D-066 The agent's access is
decided by path rules** (points 329, 331, 334, 335), drafted by RULES_01.

## Waves

- **Wave 1** (parallel): RULES_01 (the table and `policy`, pure, new files), HOLD_01 (no expiry, the
  paused turn clock, 24 h hook), WORK_01 (328 on the page).
- **Wave 2**: WIRE_01 (the gate, Kiro, the server and the `folder` scope use `policy`; the store; the
  schema and api.md).
- **Wave 3**: ASK_01 (the approval's "Allow for this folder" and the forget list in the chat).
- **Wave 4**: VERIFY_01.

## House rules

- Worktree, branch `feat/agent-access` from main. Never port 4466. Sub-agents never commit; the
  orchestrator commits after each gate, tagged `access/wave-N`.
- Orchestrator-only: `package.json`, lock, `docs/decisions.md`, `cortex-tasks/tracker.md`, generated
  files (`npm run map`, `gen-api`), `packages/format/src/flags.ts` (a task changes only its own flag's
  description), unexpected screenshot baselines. New gallery sections go last in the gallery.
- A bug fix starts with the failing test. Tasks run unit tests, `check`, `verify`, `gen-api --check`
  and their page specs; the orchestrator runs the full suite at each gate.
- Ports (`VB_TEST_PORT`, 100 apart): RULES_01 5100, HOLD_01 5200, WORK_01 5300, WIRE_01 5400,
  ASK_01 5500, VERIFY_01 5600; the gate 4710.
- No test ever starts a real CLI against the person's account: the adapters' fake CLIs and the
  existing chat fixtures only.

## Out of scope

- The person's own editable rules file (later, from the same table).
- Network access rules for the agent.
- The plugin host's approvals (the plugin plan; `policy` is shareable for it).

## Risks

| Risk | Answer |
|---|---|
| A shell command reads a refused file in a way the checker can't see (`cat .e*`, a script) | Only allow-listed commands with plain arguments go without asking; anything else is asked, and a command naming a refused path is refused. Said plainly in chat.md and the skill |
| Grep over the folder returns `.env` lines | Claude Code's own deny rules from the same table (it applies Read rules to Grep and Glob); for Kiro, VERIFY_01 tests what its search does and reports |
| A held question keeps a CLI process alive for hours | Stop and a new message still release it; one held question per session |
| The turn clock paused forever by a stuck ask | It resumes the moment the ask settles; Stop always works |
| `permissions.json` edited by the agent to grant itself | It is a refused path for the agent; only the server writes it |

## Success criteria

- [ ] Every row of the rules table holds for Claude and for Kiro, with `..` and symlinks (unit and adapter tests)
- [ ] A remembered yes covers only its folder or command head, never a refused path
- [ ] "Allow for this folder" is kept across sessions, listed, and forgettable
- [ ] A question waits until answered, Stopped or superseded; the turn clock pauses meanwhile
- [ ] While the agent works the board shows it, the person can send more, and a reply is announced
- [ ] Every state in the gallery, light and dark; full suite green; the maintainer looks
