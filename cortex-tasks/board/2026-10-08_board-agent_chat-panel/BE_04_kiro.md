# BE_04_kiro: Kiro adapter over ACP

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 2) ·
> **Model**: Sonnet 5.5 · **Needs**: BE_02, BE_03

## Objective

The same panel talks to Kiro CLI through `kiro-cli acp`, run once to prove the interface.

## Rulings (do not reopen)

1. `packages/agent/src/kiro.ts`: JSON-RPC over stdio, our own code: initialize, session/new
   (cwd, the vb MCP server with the secret in its env), session/load to resume (register the
   update handler first; resend mcpServers), session/prompt, session/update mapped to the same
   updates, session/cancel. session/request_permission maps to the same approval request; the
   answer goes back as the chosen option. Check which Kiro generation is installed (v2 or v3
   flags differ; kiro.dev ACP docs) and say which you targeted.
2. A recorded ACP stream as the fixture; unit tests on a fake. One real round only if the
   maintainer's Kiro login works; if it doesn't, stop and report (don't spend credits retrying).

## Validation

- [x] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09 (the real round ran but both of its tool calls were refused by a bug found in it; see below)

- **Generation targeted: ACP engine v2** (kiro-cli 2.28.0's default, `kiro-cli acp`). Why: its session ids
  are lowercase UUIDs, which the chat schema's `session` takes (v3's are `sess_...`); it works with the
  person's existing login with no flags; v3 removes `--model` and changes the permission and tool-update
  shapes, and its log said `--auth=acp-callback` even with `--auth-method=cli`, i.e. the client may have to
  answer `_kiro/auth/getAccessToken`. Both generations initialise and open a session without credits
  (probed); v3 is not targeted. `session/prompt` takes `prompt: [...]` (the ACP spec's field, not `content`
  as Kiro's page shows: a `content` prompt gets no answer).
- **Files** (`packages/agent/src/`): `acp.ts` (JSON-RPC client over stdio, 124 lines, knows nothing of
  Kiro), `kiro.ts` (the adapter and session, 248), `kiro-turn.ts` (updates to `AgentUpdate`s, 123),
  `kiro-permission.ts` (permission request to the board's facts, 77). `adapter.ts`: optional
  `AgentSession.close()`; `gate.ts`: `Ask` takes an optional `AbortSignal` (so a cancelled turn ends the
  waiting approval); `index.ts` exports. Server: `chat-sessions.ts` (`DEFAULT_ADAPTERS.kiro`),
  `chat-session.ts` (`close()` calls `agent.close?.()`). No dependencies.
- **How it works**: one `kiro-cli acp` process per session, opened by `start` (`initialize`, `session/new` with
  the vb server and its `env` as name/value pairs; or `session/load` with the servers again to resume) and
  opened again with `session/load` if it has ended between turns. The adapter waits for
  `_kiro.dev/mcp/server_initialized` for each server (20 s) or ends the turn in an error. Kiro cannot
  append to the system prompt, so the instructions file leads a new session's first message. Cancel is
  `session/cancel`, then a kill after 3 s if Kiro ignores it; `close()` ends the process (server close,
  new session on the board). Usage is not reported (`done` carries zeros).
- **Approvals**: no hook to gate, so the adapter answers `session/request_permission` itself and asks the
  same route as the Claude gate (`gate.url` + run token via `askOverHttp`), so BE_03's flow, the panel's
  Allow/Deny and the session scope work unchanged. Rules: the `vb` server's tools (from the request's
  `_meta.mcpToolIdentity.serverName`) and reading (`read`, `search`, `think`) go ahead unasked; a file change
  (path, op and preview from the call's diff) or a command is asked; anything else (a web fetch, another
  MCP server's tool, a change with no file named) is refused with `reject_once`. Only the one-time options
  are ever chosen, so Kiro keeps no trust from us; Kiro's own settings stay its own. Note Kiro's request
  carries less than the call (no kind, no diff), so `KiroTurn` remembers each tool call by `toolCallId`.
- **Real round** (one, kiro-cli 2.28.0, in-process board server over a temp copy of the test project, a
  prompt asking for two cards in a new region plus a one-word `note.txt`): `whoami` showed a signed-in
  session; `initialize`, `session/new` (vb ready) and a turn worked with no credit or quota error. Kiro asked
  permission for both parallel tool calls, **including the vb MCP tool**; the first build of the adapter
  could not recognise either (the request has no `kind`; the MCP identity is in the request's `_meta`) and
  refused both, so Kiro answered "Both actions were denied". That bug is fixed from the recorded data. I did
  **not** run a second round (one allowed), so a **successful** board write over Kiro, the card numbers in
  its `tool_call_update` content and a real person-approved file write are not observed live; they are
  covered by tests built to the ACP shape (`kiro-turn.test.ts`) and by the recorded request/response
  shapes. Worth one more short real round in VERIFY_01 if wanted.
- **Fixture**: `packages/agent/tests/fixtures/kiro-denied.jsonl`, the agent's side of that real turn,
  scrubbed (session, tool-call and request ids, the project path, no secret or prompt text, noise
  notifications dropped, the modes list emptied). Fake CLI `tests/fake-kiro.ts` replays it (initialize, new,
  load with a short history, the turn with its parallel permission requests, modes `hang`, `stubborn`,
  `no-servers`).
- **Tests**: `packages/agent/tests/kiro.test.ts` (11: handshake and servers, instructions first once,
  permission answers through a real HTTP stand-in for the route, resume with `session/load`, model flag,
  process restart, cancel, kill after grace, time limit, servers never ready, CLI missing),
  `kiro-turn.test.ts` (9: text blocks, board-write summary, unseen calls, kept call facts, unknown kinds,
  stop reasons, request reading and option choice, verdicts), `apps/board/tests/api-chat-kiro.test.ts` (2: the
  whole server flow over the fake: join/grant as "Kiro chat 00000000", the file change as an
  `approval_request`, the answer reaching Kiro, valid events, the secret only in `session/new`, Stop, the
  server closing ends the process). `start_chat` with `kiro` now works whenever the adapter is configured;
  the existing 422 test stands (it injects only Claude).
- **Docs**: `packages/agent/README.md`, `docs/specification/chat.md` (Kiro section), `api.md` 108,
  `modules.md` regenerated.
- **Open for the maintainer / orchestrator**: (1) a second real round for a successful board write over
  Kiro; (2) Kiro's panel model list is empty (`MODELS.kiro = []` in `chat-panel.ts`, untouched); (3) other
  MCP servers the person has in Kiro are refused, not asked; (4) Kiro's v2 reports no usage.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] BE_04: …`).
