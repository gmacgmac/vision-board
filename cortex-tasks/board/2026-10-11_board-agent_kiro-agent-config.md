---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#N34
---

# Kiro agent configuration for the chat panel (research)

> **From**: tracker N34, maintainer chat 500 · **Research only**: no code or settings changed ·
> **Checked on**: kiro-cli 2.29.1 (the tracker says 2.28.x; `kiro-cli --version` says 2.29.1), engine v2,
> 2026-10-11, with real `kiro-cli acp` sessions driven by a small script in the scratchpad (test
> agents lived in a scratch workspace's `.kiro/agents/`; nothing was written to `~/.kiro`).
> Doc pages: D1 = https://kiro.dev/docs/custom-agents/configuration-reference/ (CLI V3 / IDE 1.0),
> D2 = https://alpha.us-east-2.kiro.adc.aws.dev/docs/cli/custom-agents/configuration-reference
> (the CLI 2.x text), D3 = https://kiro.dev/docs/cli/acp/. "Tested" = observed in a session by us.

## Question

How should the board's chat panel start Kiro so that (a) the Vision Board skill is Kiro's own
instructions, not the first message, (b) the model is a deliberate choice that can match Claude's,
and (c) Kiro's chat words stay short (tracker N34)?

## Findings

**Agent files**

1. **Where agents are looked up.** Local `.kiro/agents/` (only from that folder or below) and global
   `~/.kiro/agents/`; local wins on a name clash (D2, "Locations and precedence"). Tested: an agent in a
   scratch workspace's `.kiro/agents/` was found by `kiro-cli acp --agent <name>` when the process ran in
   that folder, and not found from another folder.
2. **`--agent` takes a name only, and a miss is silent.** `--agent <path to .json>` and
   `--agent nonexistent` both started `kiro_default` with no error (tested: `session/new` answered
   `modes.currentModeId: "kiro_default"`). The adapter must check that `currentModeId` equals the
   wanted agent and fail loudly otherwise.
3. **Fields** (D1, D2; `~/.kiro/agents/agent_config.json.example`): `name` (default: file name),
   `description`, `prompt`, `mcpServers`, `tools`, `allowedTools`, `toolAliases` (2.x only),
   `toolsSettings`, `resources`, `hooks`, `includeMcpJson`, `model`, `welcomeMessage`, and (new in
   V3 and written by `agent upgrade`) `permissions.rules[]` with `capability`, `match`, `effect`.
4. **`prompt` accepts a `file://` URI, resolved from the agent file's folder** (D2: "Relative paths resolve
   from the agent config file's directory"). Tested in v2: `file://../../skills/vision-board/SKILL.md` from
   `<ws>/.kiro/agents/` loaded the skill (the model quoted "Quiet while you work"); the same path read
   from the working folder did not.
5. **`resources` `file://` paths are resolved from the working folder, not the agent file** (tested: with the
   agent file in `<ws>/.kiro/agents/`, `file://skills/vision-board/SKILL.md` loaded, `file://../../skills/...`
   did not, an absolute `file:///...` loaded). D2 does not say this. For the panel the working folder is the
   person's project, so a `resources` entry would need an absolute path. `skill://` loads only the
   name and description up front and the body on demand (D2), which is the wrong shape for always-on rules.
6. **Validator.** `kiro-cli agent validate --path <file>` checks JSON types only and always exits 0:
   it printed "invalid type: string "x", expected a sequence" for a bad `tools`, and said nothing for an unknown
   field or an unknown model (tested). There is no `schema` subcommand (`kiro-cli agent --help`: list, create,
   edit, validate, migrate, upgrade, set-default). Do not use its exit code as a check.
7. **`kiro-cli agent upgrade <dir>`** rewrites 2.x agents to a "universal format both engines load" (it adds a
   `permissions` block; `--dry-run`, `.json.bak` backups). Tested on a scratch copy: `allowedTools: ["read","@vb"]`
   became `permissions.rules` `fs_read allow` and `mcp ["vb/*"] allow`. The draft already carries that block.
   D1: V3 skips a profile that has `allowedTools` and no `permissions`.

**Models**

8. **Model list** (`kiro-cli chat --list-models`, `-f json-pretty`): `auto` (default, 1.00x), `claude-opus-5.5`
   (2.00x), `claude-sonnet-5.5` (1.30x), `claude-opus-5` (2.2x), `claude-sonnet-5` (1.3x), `claude-opus-4.8`,
   `4.7`, `4.6` (2.2x), `claude-sonnet-4.6`, `claude-opus-4.5`, `claude-sonnet-4.5`, `claude-sonnet-4`
   (end of life 2026-10-14), `claude-haiku-4.5` (0.4x). So Opus 5.5 and Sonnet 5.5 exist, with those exact ids
   (no date suffix; `claude-opus-5.5`, `claude-sonnet-5.5`). The default is `auto` ("models chosen by task").
   `session/new` also returns the same list as `models.availableModels` plus `models.currentModelId`
   (tested), so the picker can be filled from the session instead of a hard-coded list.
9. **`--model` beats the agent's `model`.** Tested: no flags gave `currentModelId` "auto"; the draft agent alone
   gave `claude-opus-5.5`; the agent plus `--model claude-sonnet-5.5` gave `claude-sonnet-5.5`.
10. **Unknown model ids are not checked up front.** `--model bogus-1` and an agent with `"model": "bogus-9"`
    both opened a session with that `currentModelId`; the first `session/prompt` then failed with "The model
    'bogus-9' is not available" (tested). D2 says an unavailable model "falls back to the default"; D1 says the
    first prompt can fail. D1 matches what we saw. The picker must only offer ids from `availableModels`.
11. **Effort.** `acp --effort low|medium|high|xhigh|max` works on the v2 engine: the session record holds
    `overrides.output_config.effort` with the value given (tested for low and max). `_kiro.dev/metadata`
    reports per model: `reasoning.support` and `effortLevels`. Tested: `claude-opus-5.5` and
    `claude-sonnet-5.5` "alwaysOn" with all five levels; `claude-opus-4.8` "toggleable"; `auto`,
    `claude-sonnet-4.5`, `claude-haiku-4.5` "unavailable" (no levels). The default when nothing is set is
    `high` (the model's schema, in the session record).
12. **`chat.modelDefaults`** = `{"claude-opus-5.5":{"output_config":{"effort":"high"}}}` is set only in the
    repo's own `.kiro/settings/cli.json` (`kiro-cli settings list` shows "(workspace)"; from `/tmp` it lists
    nothing, and `~/.kiro/settings/cli.json` is `{}`). So it applies only when Kiro runs with this repo as its
    working folder, not for another project the panel is opened on. Pass `--effort` instead. (How
    `--effort` and `modelDefaults` rank against each other is not established.)

**How the prompt and tools reach the model**

13. **The agent prompt is context in the conversation, not a hidden system prompt** `[INFERENCE]`: asked
    about an inline prompt, the model answered that it was not in a system prompt but "your first message in
    this conversation says: ..." (tested); the saved session shows only the person's turn. D1 calls the prompt
    "similar to a system prompt". Either way it is part of every turn's context and the model follows it.
14. **MCP servers from `session/new` and from the agent combine.** Both start (`_kiro.dev/mcp/server_initialized`
    for each) (tested). If an agent's `mcpServers` and `session/new` use the same name, the `session/new` one
    was used (tested with two fake servers; the answer came from the ACP one). Two servers that expose the
    same tool name leave only one visible to the model (tested); the real `vb` tool names do not collide with
    anything built in.
15. **An ACP-supplied server is usable even if the agent's `tools` does not list it** (tested with `tools:
    ["read"]`), but then each call asks for permission. With `allowedTools: ["@vb"]` there is no prompt
    (tested: 0 permission requests against 4 to 5 with the default agent). The board's adapter allows its own
    server either way (`kiro-permission.ts`, `verdictFor`).
16. **Writes and shell still ask.** With `write` and `shell` in `tools` and not in `allowedTools`, Kiro sent
    `session/request_permission` for `Creating hello.txt` (`rawInput` command/path/content) and `Running: echo
    done`, with `allow_once`, `allow_always`, `reject_once` (tested), which `kiro-permission.ts` already turns
    into the board's Allow or Deny. Tool names in `_meta.kiro.toolName`: `read`, `grep`, `glob`, `write`,
    `shell`, and the MCP tool's own name with `mcpServerName`.
17. **Engines.** `acp` defaults to `v2`; `--agent-engine v3` refuses `--agent` ("arguments not supported with
    --agent-engine=v3: --agent", tested), and D3 says `session/set_model` is v2-only. Stay on v2.

**Does the agent fix the long chat words?**

18. **No: the model does, in our small test.** Same scripted turn (a Send message, fake `vb` tools, the real
    skill), looking at text written between tool calls: with `auto` (today's panel) Kiro narrated in 3 of 3
    runs that had the skill (1 with the skill leading the first message, 2 with the agent) and in the 1 run
    without the skill ("I'll start by reading the two cards..."); with `claude-opus-5.5` it wrote only the
    closing text in 2 of 2 runs without the agent and 2 of 2 with it; with `claude-sonnet-5.5` the same in 2 of 2
    without and 2 of 2 with. Small samples and fake tools: the direction is clear, the rate is not. The closing
    text was one to three short sentences.
19. **What the agent does change:** no permission round trip for `vb` tools (finding 15), the skill becomes the
    agent's own prompt (no first-message lead to keep in sync, and it is still there after a resumed session), the
    model is pinned in one place, and the tool set is explicit.

## The draft agent

`packages/agent/kiro/vision-board.agent.json` (passes `kiro-cli agent validate`, though finding 6 says that
proves little; loaded and ran in a scratch workspace with its `prompt` path rewritten for that location).

| Field | What it does |
|---|---|
| `name` | `vision-board`; what `--agent` takes |
| `description` | Shown in Kiro's agent list |
| `prompt` | `file://../../../skills/vision-board/SKILL.md`, relative to the agent file; the skill already holds the panel rules (quiet turns, one or two closing lines, the Send message, no `join`). One source, no copy |
| `resources`, `mcpServers` | Empty: the board passes `vb` in `session/new` (finding 14) |
| `includeMcpJson` | `false`: keep the person's other MCP servers out of the panel |
| `tools` | `read`, `grep`, `glob`, `write`, `shell`, `@vb`. No web, no delegate, no todo, no knowledge, no other MCP |
| `allowedTools` + `permissions` | Pre-approve reading and the `vb` tools; `write` and `shell` are left to ask, so they reach the board's Allow or Deny (finding 16) |
| `model` | `claude-opus-5.5`; the panel's `--model` overrides it (finding 9) |

Not in the draft, on purpose: `hooks`, `toolsSettings`, `toolAliases`, `welcomeMessage`.

**Install** (not done; the draft must not be edited by hand into `~/.kiro` from here):
1. Copy it to `~/.kiro/agents/vision-board.json` and change `prompt` to the absolute
   `file:///<repo>/skills/vision-board/SKILL.md` (a global file cannot reach the repo by a relative path). Or
2. have the board write that file itself at start (path filled in) and check it, so a moved repo cannot leave a
   stale path; or
3. put it in a project's `.kiro/agents/` (found only when Kiro runs in that folder; writes into the person's
   project, so not recommended).
Kiro looks only in those two folders; there is no path option (finding 2).

## Recommendation

1. **Start Kiro with `--agent vision-board --model <chosen>`** and keep the skill out of the first message
   when that agent is confirmed. Confirm with `session/new`'s `modes.currentModeId === "vision-board"`; if
   not, stop with a clear error ("The vision-board agent is not installed; run ...") instead of silently
   running `kiro_default` (finding 2). Keep today's first-message lead as the fallback only if the maintainer wants a
   no-install path.
2. **Model choices in the picker** (from `models.availableModels`, so ids are never stale): `claude-opus-5.5`
   (default, matches Claude's Opus 5.5), `claude-sonnet-5.5` (matches Sonnet 5.5, cheaper at 1.30x), and
   `auto` shown as "Kiro chooses" and not the default, because it narrated in every run.
   Offer older ids only behind a "more" entry or not at all. Never send an id the session did not list (finding 10).
3. **Effort:** pass `--effort high` for the two 5.5 models (the same as Kiro's default and the repo's setting) and offer
   low to max only for models whose `_kiro.dev/metadata` reports `effortLevels`; hide the control for `auto` and Haiku.
4. **Quiet turns** stay a skill matter plus the model choice; the agent alone did not stop `auto` narrating. If it
   still shows up on the 5.5 models in real use, the "steps" fold the tracker mentions is the remaining lever.
5. Keep v2 (`--agent-engine` unset), `write` and `shell` out of `allowedTools`, and the board's own Allow or Deny as
   the only approval.

## Open questions

1. **Install route:** global file written by the board at start, or a manual copy documented in the README? Either
   writes into `~/.kiro`, which needs the maintainer's yes.
2. **Does a resumed session (`session/load`) keep the agent and model?** Not tested. The adapter starts a new process with the
   same flags, which should, but it is not established.
3. **Does `auto` ever pick a model that is quiet?** It narrated in every run (4 of 4). Not established why; Kiro does not say what `auto` chose.
4. **Panel rules in the agent as well as the skill?** The prompt can hold only one `file://` target, so the panel rules live
   in the skill's "In the board's chat panel" section. A generated prompt file (panel rules + skill) is possible if the skill
   and the panel ever diverge.
5. **Effort when `chat.modelDefaults` and `--effort` disagree**: not established. `session/set_model` (v2) for switching model
   mid-session: documented (D3), not tested.
6. **Test traces:** about 20 short sessions from this research remain in `~/.kiro/sessions/cli/` (titles starting "Reply ok",
   "Without tools", "The person updated the board"). They can be removed with `kiro-cli chat -d <id>` if wanted.
