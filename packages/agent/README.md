# packages/agent

Command-line agents behind one adapter interface (D-036), shaped after the Agent Client Protocol:
start or resume a session, send a prompt, read its streamed updates, cancel. One adapter per CLI:
Claude Code (`src/claude.ts`) and Kiro over ACP (`src/kiro.ts`). It stands alone (D-037): Node only, no
dependencies, nothing imported from this repo, so it moves into nclite as it is. How the chat panel
uses it: `docs/specification/chat.md`.

- **The interface** (`src/adapter.ts`): `AgentAdapter.start({ cwd, sessionId?, model?, mcpServers,
  instructionsFile?, allowedTools, gate, approvalHold?, strictAccess? })` returns an `AgentSession`; `prompt(text)` yields
  `AgentUpdate`s (`text` interim or final, `tool` running/done/failed with a short name and, for a
  board write, the board, cards and head; then one `done` with usage, `stopped` or `error`);
  `cancel()`, and `close()` when the CLI stays up between turns (Kiro). A tool's raw input and output never leave the adapter.
  `cwd` is the board's folder, which the access rules are relative to. `approvalHold` (the host's flag): a
  question waits for the person, so Claude's hook waits 24 hours and Kiro's permission request as long as the
  host does. `hold(on)` (optional): the host says a question is waiting (`true`) or no longer is (`false`);
  the turn's time limit then pauses and goes on with the time left (`src/turn-clock.ts`, `startTurnClock`,
  both adapters), so it counts only the agent's own working time. `strictAccess` (the host's
  `agentAccessRules` flag off): nothing the rules allow goes ahead unasked.
- **Chat events** (`src/events.ts`): `toChatEvent(update)` gives the chat schema's event
  (`packages/chat/schema/chat-event.schema.json`) without its stamp; the host adds `at`,
  `session` and `seq` and forwards it.
- **Claude** (`src/claude.ts`, `src/claude-args.ts`, `src/claude-stream.ts`): one `claude -p
  --output-format stream-json --verbose` process per prompt, the prompt on stdin; `--session-id`
  the first time, `--resume` once the transcript exists (one retry with the other flag when the CLI
  disagrees); `--append-system-prompt-file` every turn; `--mcp-config` as a private temporary file
  (a server's `env` may hold a secret) with `--strict-mcp-config`; `--permission-mode default`;
  `--allowedTools`; the person's own login (it refuses to start when `ANTHROPIC_API_KEY` is set,
  unless `allowApiKey`). It checks `system/init` reports every MCP server connected, logs an
  unknown event shape once, and treats a turn with no `result` as an error. An error result the
  agent's last text only repeats (a rate limit) is said once, as the error. Cancel is SIGTERM, then
  SIGKILL after 3 s; a turn is stopped after 10 minutes of its own working time (`hold` pauses it).
- **Kiro** (`src/kiro.ts`, `src/acp.ts`, `src/kiro-turn.ts`, `src/kiro-permission.ts`): `kiro-cli acp`, the
  Agent Client Protocol over stdio (JSON-RPC 2.0, one object per line; `acp.ts` is a small client of
  it that knows nothing of Kiro). Targets **engine v2**, kiro-cli 2.28.0's default: its session ids
  are lowercase UUIDs (the chat schema's `session`), it works with the person's existing login, and
  the flags `--agent-engine=v3 --auth-method=cli` are not needed. v3 (`sess_...` ids, a different
  permission and tool-update shape) is not targeted. One process per session, opened by `start`
  (`initialize`, then `session/new`, or `session/load` to resume) and opened again with
  `session/load` when it has ended; `session/prompt` per turn (`prompt: [{ type: 'text' }]`, not
  `content`: Kiro answers a `content` prompt with nothing); `session/cancel` to stop (killed after
  3 s if Kiro ignores it); `close()` ends the process. The board's MCP server (`vision-board`) goes in `mcpServers` with its `env` as name/value
  pairs (so the secret is only there), and again in every `session/load`. **The agent** (`src/kiro-agent.ts`,
  N34): Kiro starts as `kiro-cli acp --agent vision-board --model <model> --effort high`, the model the host
  names or `claude-opus-5.5` (never `auto`, which is refused). The agent is a file the host writes with
  `writeKiroAgent(home, skill)`: `<home>/.kiro/agents/vision-board.json`, this package's draft
  (`kiro/vision-board.agent.json`) with `prompt` as `file://<absolute skill path>`, rewritten only when its
  content differs, nothing else in `.kiro` touched. Its prompt is the skill, so no message carries the
  instructions file (that is Claude's). The draft's `resources` load the open project's own steering
  (`file://.kiro/steering/**/*.md`, always) and skills (`skill://.kiro/skills/**/SKILL.md`, on demand), relative
  because Kiro resolves them from its working folder, which in the panel is the open project (N37-context).
  Kiro starts `kiro_default` without a word when the agent is missing,
  so `session/new` must report `modes.currentModeId` `vision-board` and list the model in
  `models.availableModels` (`sessionProblem`); anything else ends the session before any prompt, saying
  why (a `session/load` is checked on what it reports). The draft's tools: `read`, `grep`, `glob`, `write`,
  `shell`, `@vision-board`; only `@vision-board` pre-approved, so every read, search, write and command
  reaches the permission request and the access rules (D-066). The adapter waits for Kiro's `_kiro.dev/mcp/server_initialized` for each server
  (20 s) and ends the turn in an error when one never starts. Updates: `agent_message_chunk` text
  (held a block, as Claude's), `tool_call`/`tool_call_update` by `toolCallId` (name from
  `_meta.kiro.toolName`; a board write names its board and, when done, its cards and head from the
  result's text: the update's `content`, or its `rawOutput`, where kiro-cli 2.28.0 puts an MCP tool's
  result as `{ items: [{ Json: { content } }] }`). Usage is not reported (`done` carries zeros). **Permissions**:
  `session/request_permission` becomes the same approval the Claude gate asks, over the same route
  and token (`askOverHttp`, ended when the turn is cancelled): the `vision-board` server's own tools
  (`_meta.mcpToolIdentity.serverName`) go ahead unasked; a read or search (`ReadFacts`), a file change
  (facts from the call's diff, which Kiro's request itself does not carry, so the turn remembers each
  call) or a command is decided by `policy` (`verdictFor`, on every path the call names: a move at both
  ends, each file of a many-file read), refused with the rule's reason, allowed, or asked; anything else
  (a web fetch, another MCP server's tool) is refused. Only
  `allow_once`/`reject_once` are ever chosen, so Kiro keeps no trust of its own from us; "for this
  session" is the board server's to remember. Kiro's own tools keep Kiro's settings. Tests use
  `tests/fake-kiro.ts` (it starts as `--agent` only when `$HOME/.kiro/agents/<name>.json` exists, and
  reports modes and models as kiro-cli 2.29.1 does; tests give it a temp home) replaying
  `tests/fixtures/kiro-denied.jsonl` (writes refused) and
  `kiro-draw.jsonl` (a successful board write), real turns (kiro-cli 2.28.0) scrubbed of ids, paths
  and the secret.
- **The gate** (`bin/gate.ts`, `src/gate.ts`, `src/approvals.ts`): an inline `--settings`
  PreToolUse hook on `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash` and the reading tools `Read`,
  `Glob`, `Grep` (`GATED_TOOLS`, `READ_TOOLS`). `factsFor` makes the facts (`WriteFacts`: op, path, a short
  preview; `CommandFacts`: the command; `ReadFacts`: Read's file, Glob's pattern's folder, Grep's path with
  `recursive`). `policy` decides first, relative to `AGENT_GATE_FOLDER` (the board's folder; never the
  hook's own `cwd`) and strict with `AGENT_GATE_STRICT=1`: a refusal is denied with the rule's reason, an
  allowed call goes ahead unasked. Only what it asks about is posted to `AGENT_GATE_URL` with
  `Authorization: Bearer $AGENT_GATE_TOKEN`, waiting up to `AGENT_GATE_WAIT_MS` (the adapter sets all of
  them on the CLI: `gateEnv`); the decision says why. Anything but a yes is a denial: an unreachable host,
  a bad answer, no folder, a tool it doesn't know, a gate that can't start (the hook command ends
  `|| exit 2`). The host's own refusal (`asked: false`, not approved) reads `RULES_REFUSAL`. The same
  settings carry Claude Code's own `permissions.deny`, from the same table (`claudeDenyRules`: each row
  refusing a read as `Read(//<folder>/<glob>)`, a write as `Edit(...)`, at the folder as given and as real;
  a row a more specific one lets through, `.env.*` and `.visionboard/**`, is left to the gate), a second
  line. Board tools are not gated. Risks and paths for a command are left
  empty for now (nclite's `command-approval.ts` patterns could fill them).
- **Access rules** (`src/access-rules.ts`, `src/policy.ts`, `src/readonly-command.ts`; agent-access PLAN,
  maintainer points 329, 331, 334): `policy(facts, folder, { reader?, strict? })` decides one tool call
  (`WriteFacts`, `CommandFacts`, or `ReadFacts` with `recursive` for a search) as `{ allow: true }`,
  `{ ask: true, scopes }` or `{ refuse: why }`. The path is resolved first (`resolveIn`): absolute, `..` on
  the real folders, symlinks followed (a dangling one by where it would create), the name as the disk
  spells it (`realpath.native`), a file not made yet by its nearest existing folder. Then `ACCESS_RULES`,
  one table relative to the folder, decides: the most specific row wins (a row naming a file beats one
  naming a folder's contents, then more named parts, then the order written), matched as written and
  ignoring case, the stricter kept. Outside the folder is asked `once` or `session` only; inside, `folder`
  is offered too; a hard-linked file is asked `once`; `strict` (the `agentAccessRules` flag off) allows
  nothing unasked. A search is allowed only when nothing under the folder is refused. A command is
  read-only (`readOnlyCommand`) when every `|`-joined part is on the allow-list with plain words
  (`shellWords`); it is then a read of every word it names, else it is asked; any command whose words
  name a refused path (by any trailing part, a glob, `$'...'`, a flag's joined value, `rev:path`) is
  refused. `commandHead` gives a command's first words, none for a compound command; `rememberedHead`
  is what a remembered yes may cover: those words (git's `-C <dir>`/`-c k=v` skipped; a script runner's
  script too, `npm run build`), never a script by its path nor a row of `NEVER_REMEMBERED` (one table
  beside `commandHead`): an interpreter, a shell or a launcher (`python3`, `sh`, `npx`, `env`), a command
  acting on whatever it targets (`rm`, `mv`, `cp`, `chmod`, `ln`, `dd`, `git reset`/`clean`/`restore`/
  `push`/`rebase`, `git checkout --`, `git branch -D`, any forced git command, `npm publish`), the network
  (`curl`, `wget`).
  `coverOf(facts, folder)` is what a remembered yes covers: a write's folder (as really reached, not its
  subfolders), a read's file, a search's folder, or a command's `rememberedHead`; null when it is never kept. The
  disk is read only through the injected `PathReader` (`NODE_READER` by default). Refusals are in
  `src/words/agent-access.ts`. Tests: `tests/policy.test.ts`, `tests/policy-command.test.ts`, on a real
  temporary folder (`tests/access-fixture.ts`). **Not covered**: a command that reads a refused file
  without naming it (a script, `python -c`, a name built at run time, `git log -p` of a committed
  secret) is asked, not refused; the person's yes is the guard there.

## Hosting it (here, or in nclite)

1. Start a session: `createClaudeAdapter().start({ cwd, mcpServers: { 'vision-board': { command, args, env } },
   allowedTools: ['mcp__vision-board__*', 'Read', 'Write', 'Edit'], gate: { url, token } })`. Keep
   `session.id` to resume after a restart.
2. Serve the gate's route: authenticate the run token, show the facts to the person, answer
   `{ approved, status, approvalId?, scope? }` (the chat schema's `outcome`) when they decide.
3. For each prompt, forward `toChatEvent(update)` with your stamp; `cancel()` on Stop.

nclite already has the matching pieces: its run door (`/api/run/approvals`) takes the same facts,
and its Claude harness (`container/harness-claude.ts`) is where these flags were measured.

- **Depends on**: nothing in this repo (its D-016 layer is empty).
- **Used by**: `apps/board` (the chat sessions, chat-panel BE_03).
- **Public API** (`src/index.ts`): the types above, `createClaudeAdapter`, `createKiroAdapter`, `writeKiroAgent`, `kiroAgentFile`, `KIRO_AGENT`, `KiroTurn`, `AcpConnection`, `ClaudeStream`,
  `buildClaudeArgs`, `gateSettings`, `toChatEvent`, `factsFor`, `refusalFor`, `decide`, `runGate`, `policy`,
  `resolveIn`, `ACCESS_RULES`, `accessFor`, `readOnlyCommand`, `shellWords`, `commandHead`, `rememberedHead`,
  `NEVER_REMEMBERED`, `coverOf`, `claudeDenyRules`, `gateEnv`, `RULES_REFUSAL`.
- **Tests**: `tests/` (arguments, the stream against two recorded real turns in
  `tests/fixtures/claude-*.jsonl` scrubbed of ids, paths and secrets, the adapters against fake CLIs
  that replay them (Claude's `fake-claude.ts`; Kiro's `fake-kiro.ts`, ACP), the gate end to end); `apps/board/tests/agent-events.test.ts` holds the mapped
  events to the chat schema.
