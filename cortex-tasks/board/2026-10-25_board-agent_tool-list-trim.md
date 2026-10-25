---
task_name: Tool List Trim And Rename
created: 2026-10-25
completed: 2026-10-25
status: completed
categories: [board-agent]
type: implementation
model: strong
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Cut the MCP tool list to what an agent needs, and name the server `vision-board`

> **Source**: maintainer, chat 2026-10-25 (points 43-50, approved) · **Checkpoint**: tag
> `checkpoint/before-tool-trim` (commit 4099067) · **Branch / worktree**: `feat/tool-rail-and-examples`
> in `.claude/worktrees/tool-rail`

---

## Problem Statement

`tools/list` is 107,076 characters for 11 tools (compact JSON): output schemas 75,097 (70%), input
schemas 21,779 (`write_board` alone 18,133), descriptions 10,200. A client that loads tools up front
pays all of it. The text is written as if for a person. The reader is a model: say it in the fewest
words that carry the meaning. Separately, the server is configured as `vb`; name it `vision-board`
(it already reports `SERVER_INFO.name = 'vision-board'`, `packages/mcp/src/info.ts`).

---

## Design (approved)

1. **Examples live in the skill and in refusals, not in tool descriptions.** Revert the
   `requestExample` append in `scripts/gen-mcp.mjs` `describe` (commit 4099067) and its
   `tools.test.ts` tests. Keep: schema `examples`, refusals carrying `example`
   (`apps/board/server/examples.ts`), client / MCP / CLI failure text. SKILL.md § Writing cards gets
   one compact worked example: a region, two nodes, a link by key.
2. **No output schemas in the tool list.** MCP allows a tool without `outputSchema`; keep returning
   `structuredContent` and its JSON text (`packages/mcp/src/call-tool.ts`). Each description says what
   comes back in a few words. The HTTP API (`openapi.json` responses) is unchanged: that stays the contract.
3. **Terse descriptions for a model reader, at the source.** Rewrite the 11 `x-agent` operation
   descriptions in `packages/format/schema/openapi.json` and the property descriptions that reach
   `write_board`'s input (the `$defs/sent` forms and `common.schema.json`): what it does, what it needs,
   what it refuses, what comes back. No reasons, history, ruling numbers or human phrasing. Restore,
   tersely, what the checkpoint cut from `write_board` (`append`, `retire`, region `widths`, kind `app`,
   grants). Every fact an agent needs survives; only words go.
4. **A size budget test** in `packages/mcp/tests/tools.test.ts`: the whole tool list (compact JSON)
   under a cap, and each tool under a cap. Set both from the trimmed result plus about 10% headroom and
   record the numbers here. Keep the per-description 2,048 test.
5. **Rename the MCP server `vb` → `vision-board`** everywhere this repo names it: the board's chat
   panel wiring (`packages/agent/src/adapter.ts`, `claude-stream.ts`, `packages/agent/kiro/vision-board.agent.json`
   (`@vb`, `vb/*`)), `apps/board/server/chat-access.ts`, their tests, `packages/mcp/README.md`,
   `packages/agent/README.md`, SKILL.md / NOTES.md wherever they mean the MCP server. Tool names
   become `mcp__vision-board__*` in Claude Code. The `vb` CLI keeps its name. Run
   `grep -rn "\bvb\b"` and judge each hit: MCP server → rename; CLI or `vb-region` / `vb-` CSS → leave.
6. **Protected file.** `.kiro/steering/vision-board-proj.md` § Running the board names the server `vb`.
   Do not edit it: write the exact replacement lines in Implementation Notes for the maintainer's yes.
7. **The maintainer's own configs** (Claude Code `vb` entry, `~/.kiro/settings/mcp.json`) are changed
   after merge, not by this task: list the exact commands in Implementation Notes.

---

## Steps

1. Measure first (per tool: description, input, output; compact JSON) and record the table.
2. Tests first: the size budget (fails now), no `outputSchema` in any tool, no `Example:` in descriptions,
   renamed server in the agent wiring tests.
3. Generator (`scripts/gen-mcp.mjs`): drop `outputSchema` and the example append; `npm run gen`.
4. Rewrite descriptions at the source (Design 3); `npm run gen`; measure again; set the caps.
5. Rename (Design 5); update tests.
6. Skill: the compact worked example (Design 1); bump `status` to v3.12 with one line; update scenario 34's
   "A good run": right shape on the first call, or after one refusal that carries the shape. Run scenario 34
   once with a fresh `sonnet` agent through the MCP on a test port (as the examples task did), and record it.
7. Docs via `cortex-docs`: `docs/specification/api.md` (tools carry no output schema; examples live in the
   skill and refusals; the server name), regenerated `api-reference.md`.

---

## Files Involved

| File | Purpose |
|------|---------|
| `scripts/gen-mcp.mjs`, `packages/mcp/src/tools.generated.json` (generated) | No output schema, no example |
| `packages/format/schema/openapi.json`, `schema/events/*.schema.json`, `schema/common.schema.json` | Terse descriptions |
| `packages/mcp/tests/tools.test.ts` | Budget, shape tests |
| `packages/agent/**`, `apps/board/server/chat-access.ts`, their tests | Server rename |
| `skills/vision-board/SKILL.md`, `NOTES.md`, `scenarios.md` | Worked example, v3.12, scenario 34 |
| `docs/specification/api.md`, `packages/mcp/README.md`, `packages/agent/README.md` | Docs |

---

## Constraints

- **DO NOT** change what any schema accepts or what any operation returns; descriptions only.
- **DO NOT** touch the rail task's files (`packages/ui`, `packages/tokens`, `apps/board/src`, `tests/pages`,
  `packages/format/src/flags.ts`); it is still running in this worktree.
- **DO NOT** edit protected files or the maintainer's configs (Design 6, 7). Never touch port 4466.
- No git commits. Bash: never `cd path &&`. Writes over 50 lines in chunks. No PII in examples.
- **STOP** and report if cutting the list below about 30,000 characters would drop a fact an agent needs.

---

## Success Criteria

- [ ] Tool list measured before and after; total and per-tool caps set and tested
- [ ] No output schemas or examples in tool descriptions; refusals still carry the shape
- [ ] Descriptions terse; nothing an agent needs is lost (list what was cut vs kept)
- [ ] Server named `vision-board` in all repo wiring; steering lines and config commands written for the maintainer
- [ ] Skill v3.12 with one worked example; scenario 34 run and recorded
- [ ] `npm test`, `npm run verify`, `npm run check`, `node scripts/gen-api.mjs --check` pass

---

## Implementation Notes

_To be completed by agent after task execution._

**Completed**: 2026-10-25 13:10

### Measurements
Compact JSON (`JSON.stringify`), characters. Before = checkpoint 4099067; after = this task.

| Tool | Description before → after | Input before → after | Output before → after | Whole before → after | Cap |
|---|---|---|---|---|---|
| list_boards | 474 → 326 | 62 → 62 | 1,244 → 0 | 1,934 → 526 | 600 |
| get_board | 846 → 582 | 194 → 194 | 15,401 → 0 | 16,603 → 922 | 1,050 |
| show_node | 476 → 415 | 422 → 422 | 18,855 → 0 | 19,920 → 988 | 1,100 |
| show_container | 332 → 275 | 311 → 311 | 13,759 → 0 | 14,579 → 747 | 850 |
| show_layout | 519 → 446 | 311 → 311 | 2,878 → 0 | 3,881 → 914 | 1,050 |
| list_open | 764 → 603 | 298 → 298 | 3,122 → 0 | 4,340 → 1,041 | 1,150 |
| check_responses | 1,598 → 1,434 | 796 → 773 | 8,053 → 0 | 10,619 → 2,363 | 2,600 |
| join | 1,040 → 983 | 262 → 262 | 622 → 0 | 2,126 → 1,427 | 1,600 |
| request_grant | 920 → 748 | 825 → 732 | 1,195 → 0 | 3,191 → 1,699 | 1,900 |
| write_board | 2,030 → 1,713 | 18,103 → 13,916 | 6,969 → 0 | 27,397 → 15,816 | 17,350 |
| list_apps | 1,020 → 915 | 165 → 165 | 2,799 → 0 | 4,149 → 1,229 | 1,350 |
| **`{ tools }`** | 10,019 → 8,440 | 21,749 → 17,446 | 74,897 → 0 | **108,761 → 27,694** | **30,400** |

Caps (`LIST_CAP`, `TOOL_CAPS` in `packages/mcp/tests/tools.test.ts`): the trimmed size plus 10%,
rounded up to 50. The task's 107,076 was measured slightly differently; this table re-measured the
checkpoint with the same script as the result.

### Changes Made
- Generator (`scripts/gen-mcp.mjs`): no `outputSchema`, no `Example:` append (`describe`), shorter
  secret wording; dead `objectRoot` removed from `scripts/mcp-schema.mjs` with its test; `ToolDef`
  has no `outputSchema` (`packages/mcp/src/tools.ts`).
- Descriptions at the source: the 11 `x-agent` operations in `openapi.json` (each ends with what
  comes back; `write_board` restores append, retire, `widths`, kind `app`, grants, and now says to
  choose a new board's id), and the write item's property words in `common.schema.json`,
  `api/write-item.schema.json`, `events/{node,region,retire,grant-request}.schema.json`, two
  `check_responses` parameters; `ITEM_REMOVED` and `LIST_RENAMED` (`packages/format/src/ledger.ts`)
  shortened with them. `nodeRef`'s branches got their own short words. Nothing a schema accepts
  changed (annotations only).
- Tests: `tools.test.ts` (no output schema, every description says what it returns, no example,
  the size budget; the example tests removed); `session.test.ts` holds every `structuredContent` to
  the operation's success response in `openapi.json`; `write-examples.test.ts` holds the skill's
  worked example to the schema and writes it; `api-chat-kiro.test.ts` holds `MCP_NAME`, `CHAT_TOOLS`
  and the Kiro draft to `vision-board`; `node-types.test.ts` follows the new `ITEM_REMOVED`.
- Rename: `chat-access.ts` `MCP_NAME` (`CHAT_TOOLS` from it; `vbServer` → `boardMcpServer`),
  `chat-sessions.ts`, `packages/agent/kiro/vision-board.agent.json`, agent test fixtures and tests,
  comments; `packages/mcp/README.md`, `packages/agent/README.md`, `apps/board/README.md`.
  The `vb` CLI, `vb-mcp.ts`, `VB_*` variables and `vb-` CSS keep their names; NOTES.md history and
  `docs/decisions.md` (protected) were left as written.
- Skill v3.12: one worked `write_board` call in Writing cards; scenarios.md v3.12, scenario 34's
  "A good run"; NOTES.md records it and the run.
- Docs: `docs/specification/api.md` 45, 47, 48, 106, 108, 116, 117; `api-reference.md` regenerated.
- What was cut: every output schema (74,897); the description examples; history and storage
  details (ledger v11/v12 wording, how `propose`/`append` are stored, "the old More context" kept
  only where an agent still meets `context`); repeated phrasing (the card-number and retry-key
  words that repeat 10 and 20 times); HTTP framing ("Bearer secret") in the MCP text; the example
  path `~/projects/example`. What was kept: every field, enum, bound, pattern and schema `examples`;
  every refusal code an agent acts on (`locked`, `needs-grant`, `conflict`, `not-authenticated`,
  `wrong-folder`, 423); the answer model (✓ `check`, ✗ `cross`, a note never answers); the read
  rules of `check_responses`; what each tool returns.
- Scenario 34: run once live (sonnet sub-agent, MCP instructions and tool list only, port 4593,
  temp project and home): one `write_board`, five items, all `ok`, no refusal. Recorded in NOTES.md.

### For the maintainer (steering lines, config commands)
- **Steering (protected, not edited)**: in `.kiro/steering/vision-board-proj.md` § Running the board,
  replace the first two lines of the MCP bullet:
  ```
  - MCP server `vb` (any client): command `/usr/local/bin/node` (check `which node` on another
  ```
  with
  ```
  - MCP server `vision-board` (any client; tools `mcp__vision-board__*` in Claude Code,
    `@vision-board` in Kiro): command `/usr/local/bin/node` (check `which node` on another
  ```
  and the Claude Code line
  ```
    Claude Code: `claude mcp add vb --env VB_SERVER=http://127.0.0.1:4466 -- <node>
  ```
  with
  ```
    Claude Code: `claude mcp add vision-board --env VB_SERVER=http://127.0.0.1:4466 -- <node>
  ```
  The rest of the bullet stays (`vb-mcp.ts` keeps its file name).
- **Your configs, after merge** (`<repo>` = the main checkout's absolute path):
  - Claude Code: `claude mcp remove vb -s user` (or without `-s user` if it was added per project),
    then `claude mcp add vision-board -s user --env VB_SERVER=http://127.0.0.1:4466 -- /usr/local/bin/node <repo>/packages/mcp/bin/vb-mcp.ts`.
    Any allow rule naming `mcp__vb__*` in your Claude Code settings becomes `mcp__vision-board__*`.
  - Kiro: rename the key in `~/.kiro/settings/mcp.json`:
    `jq '.mcpServers["vision-board"] = .mcpServers.vb | del(.mcpServers.vb)' ~/.kiro/settings/mcp.json > ~/.kiro/settings/mcp.json.new && mv ~/.kiro/settings/mcp.json.new ~/.kiro/settings/mcp.json`;
    any agent of your own naming `@vb` or `vb/*` becomes `@vision-board` / `vision-board/*`.
    `~/.kiro/agents/vision-board.json` is rewritten by the board at its next start.
- **Page specs to rename once the rail task is done** (in `tests/pages`, not touched here):
  `chat-send.spec.ts` and `chat-context.spec.ts` read `given.mcpConfig.mcpServers.vb!`; both become
  `given.mcpConfig.mcpServers['vision-board']!`. Until then those two page tests fail.

### Deviations from Plan
- `npm test` passed in full at the end (1,582 + 10 timing; an earlier run failed only the rail
  task's `flags.test.ts`, since fixed by that task). `npm run verify`, `npm run check` and
  `gen-api --check` pass. Page tests (`npm run test:pages`) were not run; two of them need the
  one-line rename above.
- `ITEM_REMOVED` / `LIST_RENAMED` live in `packages/format/src/ledger.ts` (not listed in Files
  Involved): they are the schema words for `item` and mode `list` and a test holds them equal, so
  they changed with the schemas. `node-types.test.ts` no longer asks for "v11" in that message.
- After the scenario 34 run, `write_board`'s description gained one sentence (choose a new board's
  id, start with a `board` item), a gap two runs have named; the run itself saw the text without it.
- `objectRoot` (`scripts/mcp-schema.mjs`) removed: with no output schemas nothing used it.

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] Completed: Tool List Trim And Rename → Task: [[cortex-tasks/board/2026-10-25_board-agent_tool-list-trim.md]]
   ```
3. Do not write to `AUDITED.md`.
