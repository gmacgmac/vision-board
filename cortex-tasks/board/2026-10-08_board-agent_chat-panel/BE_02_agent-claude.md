# BE_02_agent-claude: Agent package and the Claude adapter

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 2-6) ·
> **Model**: Opus 5.5 · **Needs**: BE_01

## Objective

`packages/agent`: one adapter interface and the Claude adapter, standing alone so it moves into
nclite.

## Rulings (do not reopen)

1. **Stands alone** (D-037): imports nothing from this repo; Node only. Set its `LAYERS` entry in
   `scripts/verify.mjs` to `[]`. Front door `src/index.ts`.
2. **`AgentAdapter`** (`src/adapter.ts`), shaped after ACP: `start({ cwd, sessionId?, model?,
   mcpServers, instructionsFile?, allowedTools, gate })` returns a session; `prompt(text)`
   yields `AgentUpdate`s (text interim/final, tool call started/finished with name and a safe
   summary, done with usage, error); `cancel()`. The adapter emits chat events in BE_01's shapes
   (a small mapper), so the server only forwards.
3. **Claude adapter** (`src/claude.ts`), per PLAN ruling 3 and the spike: one process per
   prompt; `--session-id` the first time, `--resume` once the transcript exists (as nclite's
   `createClaudeHarness` decides); `--append-system-prompt-file` every turn (resume drops it);
   the gate as an inline `--settings` PreToolUse hook on Write, Edit, MultiEdit, NotebookEdit and
   Bash; `--permission-mode default`; never `--bare`; refuses to start if `ANTHROPIC_API_KEY`
   is set unless asked. Parses stream-json line by line: `system/init` (checks the vb server
   connected, else a clear error), `assistant` text and tool_use, `user` tool_result,
   `result`. Unknown event shapes are logged once, not fatal; a missing `result` is an error.
   Cancel: SIGTERM, then SIGKILL after 3 s (nclite `KILL_GRACE_MS`); a turn time limit (10 min).
4. **The gate hook** (`bin/gate.ts`, run by the CLI): reads the hook input from stdin, POSTs the
   facts (BE_01 shapes) to the URL and run token in its environment, waits for the answer, prints
   the PreToolUse decision (allow, or deny with the reason). If the server can't be reached it
   denies. The spike proved this path (309).
5. **Tests:** a recorded stream from the real `claude` (two short turns: draw on a scratch board,
   then a refused write), saved as `tests/fixtures/claude-*.jsonl` with secrets, paths and ids
   replaced; a fake `claude` script replays it, so the unit tests never call the real CLI.

## Steps

1. [x] Record the fixture (real CLI, scratch board server, a few turns only).
2. [x] Failing tests first: arg building (new vs resume), parsing (text vs tool calls, raw inputs
   never surfaced, the board write's cards and head extracted), cancel, time limit, gate hook
   allow/deny/unreachable.
3. [x] Build; LAYERS; README for the package (what it is, how nclite would host it).

## Validation

- [x] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

- **Package** `packages/agent` (LAYERS `agent: []`, front door `src/index.ts`, README): `adapter.ts`
  (`AgentAdapter`, `AgentSession`, `AgentUpdate` = text interim/final | tool running/done/failed with
  board/cards/head | done with `Usage` | stopped | error; `StartOptions` as ruled), `approvals.ts`
  (`WriteFacts`, `CommandFacts`, `ApprovalAnswer`, `ApprovalOutcome`, `factsFor` from the hook input,
  `refusalFor` after nclite), `events.ts` (`toChatEvent`: unstamped chat events; done/stopped/error
  become `system` with `turn`), `claude-args.ts` (`buildClaudeArgs`, `gateSettings`,
  `transcriptExists`, `isWrongSessionFlag`), `claude-stream.ts` (`ClaudeStream` parser), `claude.ts`
  (`createClaudeAdapter`), `gate.ts` + `bin/gate.ts`.
- **Claude**: `-p --output-format stream-json --verbose`, `--session-id`/`--resume` (transcript stat,
  checked under the real path too; one retry with the other flag on "already in use"/"no conversation
  found"), `--model`, `--append-system-prompt-file` every turn, `--mcp-config <private 0600 temp file,
  removed after the turn>` (so `VB_AGENT_SECRET` in a server's `env` never reaches argv),
  `--strict-mcp-config`, `--permission-mode default`, inline `--settings`, `--allowedTools` last
  (variadic). Prompt on stdin. Refuses at `start` when `ANTHROPIC_API_KEY` is set unless
  `allowApiKey`. Init check: every configured MCP server `connected`, else kill + clear error. Text is
  held back one block (interim once anything follows; the last is the reply, else `result.result`).
  Cancel SIGTERM then SIGKILL after 3 s; 10-minute limit -> error. One turn at a time per session.
- **Gate**: hook matcher `^(Write|Edit|MultiEdit|NotebookEdit|Bash)$` (anchored; measured working),
  command `'<node>' --no-warnings '<gate.ts>' || exit 2` (a gate that can't start blocks), `timeout`
  600 s; the gate gives up at 585 s (denies) so the CLI never times it out (which would fail open).
  Route and token reach it as `AGENT_GATE_URL`/`AGENT_GATE_TOKEN` on the CLI's environment. Posts
  with node:http (fetch stops waiting for headers at 300 s). Body = the facts (BE_01's shape); 200 +
  `outcome` read; anything else denies. Command `risks`/`paths` are empty for now.
- **Recorded** with Claude Code 2.1.295 (sonnet) against a scratch board server and a scratch deny
  route in the system temp folder: turn 1 ToolSearch + one `write_board` (cards [1,2], head 5), turn 2
  resumed, a Write the gate refused (the agent was told; `permission_denials` listed it; file not
  created). Saved scrubbed as `tests/fixtures/claude-draw.jsonl`, `claude-refused.jsonl` (ids, paths,
  plugins, skills, rate-limit details replaced). Event types seen: system init/post_turn_summary/
  task_summary, assistant, user, rate_limit_event, result; user events also carry `tool_use_result`
  (raw output), never read.
- **Tests**: `tests/claude-args.test.ts`, `claude-stream.test.ts` (fixtures; raw inputs never
  surfaced), `claude.test.ts` (fake CLI `tests/fake-claude.ts`: new/resume, flag retry, API key,
  one turn at a time, cancel, SIGKILL after grace, time limit, spawn failure, init failure),
  `gate.test.ts` (facts, decisions, http, bin allow/deny/unreachable/unconfigured, `|| exit 2`);
  `apps/board/tests/agent-events.test.ts` (mapped events and facts valid against the chat schema).
  Tests were written alongside the code rather than strictly first.
- **For BE_03**: pass `gate: { url: <base>/api/run/approvals, token }`; the gate's body is the facts,
  its answer the schema's `outcome`. Keep `session.id` (a UUID) as the chat session id. `done` carries
  usage, which `toChatEvent` drops. A `ToolSearch` call shows as an ordinary tool line. The real
  run left a CLI transcript under `~/.claude/projects/` for the scratch folder (harmless).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] BE_02: …`).
