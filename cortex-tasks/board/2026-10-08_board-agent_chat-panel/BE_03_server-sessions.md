# BE_03_server-sessions: Server sessions, gate and board access

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 5, 7,
> 8, 9) · **Model**: Opus 5.5 · **Needs**: BE_01, BE_02

## Objective

The board server runs chat sessions through `packages/agent` and serves BE_01's routes.

## Rulings (do not reopen)

1. **A chat module** in `apps/board/server/` (its own files; one job each, under 300 lines):
   sessions, the event stream, approvals. The server is the only thing that starts a CLI.
2. **Sessions:** one per board at a time in this version. The index (session id, board, agent,
   model, created) is kept in `.visionboard/chat-sessions.json` (git-ignored, written through the
   one I/O layer with validation, rule 7), so a reload or a restart resumes it. The transcript
   is the CLI's own. New session replaces the board's current one.
3. **Board access** (ruling 8): on a new session the server joins as an agent labelled with the
   CLI's name and the session, records the person's board grant to that agent (the person's click
   started it), and starts the vb MCP server with the secret in its environment. `packages/mcp`
   gains an environment default for the secret (e.g. `VB_AGENT_SECRET`) so tool calls carry no
   secret; the MCP's own instructions no longer tell this agent to save one when it is set.
4. **Approvals:** the gate route (run token) records a pending approval, sends an
   approval_request event, and answers the hook when the person answers or after 120 s (denied,
   "no answer"); scope `session` remembers that kind of change for the rest of the session.
   A Stop or a new message releases pending approvals as denied.
5. **Prompt:** a message with chips becomes the agent's prompt: the text, then the chips spelled
   out (note text and the cards they are on, card numbers and titles), then the board id. It
   also records the board's Send act (the round), as the board's Send does.
6. Every CLI process is stopped on Stop, on a new session and on server exit; the lock (U8)
   already guarantees one server per ledger.
7. Instructions file: `skills/vision-board/SKILL.md` (T_01 rewrites it later; pass the path).

## Steps

1. [x] Failing tests first (with BE_02's fake `claude`): start, message, events streamed in order,
   resume after restart, new session, stop, approval allowed / denied / timed out / session
   scope, the grant written, the secret absent from every event and the MCP args.
2. [x] Build; api.md if a detail changed; `npm run map`.

## Validation

- [x] The five gates exit 0. One real round with the real `claude` on a scratch project.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

- **Files** (`apps/board/server/`, one job each): `chat.ts` (the seven handlers, replacing BE_01's
  placeholders), `chat-sessions.ts` (`openChats`: start, list, current, lazy load/resume, `byToken`,
  `close`; the only code that starts a CLI; `DEFAULT_ADAPTERS` = Claude; `ChatAdapters` injectable),
  `chat-index.ts` (the only I/O for `.visionboard/chat-sessions.json`: entries `{ ...session, agentId }`
  checked against `chat-session.schema.json` on read and before write, atomic, 0600, `ignoreInGit`),
  `chat-session.ts` (one live session: stamps `at`/`session`/`seq` from 1, in-memory events and
  listeners, one turn at a time, run token, Stop, close), `chat-approvals.ts` (pending asks, 120 s ->
  `expired`, `released`, first answer wins, `session` yes kept per facts kind `write`/`command`, an
  unasked yes `{ asked: false }`), `chat-access.ts` (join `<CLI> chat <id[0..8]>`, `grant-request` +
  the person's `grant`, `rekey` after a restart, the vb server config with `VB_SERVER` and
  `VB_AGENT_SECRET` in `env` only, `CHAT_TOOLS`, `INSTRUCTIONS_FILE` = `skills/vision-board/SKILL.md`),
  `chat-prompt.ts` (text, "Attached from the board:" lines, `Board: <id>`; chips with labels;
  `invalid` for a note or card not on the board).
- **Wiring**: `dispatch.ts` `ServerEnv`/`Ctx` gain `chats`; `app.ts` opens chats lazily (base from the
  listening port), takes `chat: { adapters?, approvalTtlMs? }`, and stops every CLI on server `close`
  and on process `exit` (listener added only once chats exist, removed on close). Small exports:
  `body` (writes.ts), `bearerOf`/`REALM` (callers.ts).
- **Choices within the rulings** (api.md 105-107 records them): a session from before a restart is
  loaded on first use of any of its routes and its agent gets a fresh secret (secrets are never
  stored; one more hash in agents.json); events are in memory and numbered from 1 per server start,
  so `watch_chat` with an `after` past the latest starts over; a message while busy releases the
  waiting approvals and is a `conflict` (ruling 4 and the 409 contract together); an older session
  takes no message (`conflict`); `kiro` answers `invalid` on `/agent` until BE_04 adds its adapter;
  the gate's connection closing releases its ask; allowed tools are `mcp__vb__*`, `ToolSearch`,
  `Read`, `Glob`, `Grep` and the gated five (the gate decides those).
- **vb MCP**: `INSTRUCTIONS_JOINED` (packages/mcp `info.ts`) when `VB_AGENT_SECRET` is set: no `join`,
  no secret to save, leave `secret` out; README updated.
- **Tests**: `apps/board/tests/chat-approvals.test.ts` (allowed, denied, expired, session scope,
  released, schema-valid events and outcomes), `api-chat-sessions.test.ts` (start + join + grant +
  index file, message with chips + Send + prompt + ordered valid events, secret only in the MCP env
  and it authenticates as the session's agent, stream `after`, busy 409, Stop kills the CLI, new
  session replaces and kills the old CLI, restart resumes with `--resume` as the same agent),
  `api-chat-approvals.test.ts` (the gate over HTTP: allow, deny, session scope, wrong token/bad
  body/cookie, a new message and Stop release, token dead after the turn), support
  `chat-support.ts` (BE_02's fake CLI); harness `startBoard({ chat })`, `project`. MCP:
  `args-stdio.test.ts` joined instructions. Tests were written alongside the code, not strictly first.
- **Real round** (Claude Code 2.1.295, sonnet, scratch server on port 4597 in the system temp
  folder, stopped by PID): start -> join/grant lines; a Write paused for approval (facts `create`,
  the path, preview), allowed through `answer_approval`, file created; ToolSearch; `write_board`
  drew card 18 in a new region with no grant request (the board grant covered it); reply; `Done.`
  Ledger showed no `join` by the agent itself. The CLI left a transcript under `~/.claude/projects/`
  for the scratch folder (harmless).
- **For FE_01/FE_02**: events restart at 1 after a server restart (pass `after`; the server starts
  over when it is past the latest). `start_chat` is 422 `invalid` when the adapter refuses to start
  (e.g. `ANTHROPIC_API_KEY` set).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] BE_03: …`).
