# packages/mcp

`vb-mcp`: our own stdio MCP server for the board API (D-028, api.md 45-50), configured under the
name `vision-board` (its tools are `mcp__vision-board__*` in Claude Code, `@vision-board` in Kiro). It gives an agent one
tool per `x-agent` operation of `openapi.json`, generated into `src/tools.generated.json` by
`npm run gen` (`npm run gen -- --check` fails when it is stale), and calls the board server
through `packages/client`. It speaks MCP 2026-07-28 (`server/discover`, version and capabilities on
every request's `_meta`) and still answers the 2025-11-25 `initialize` handshake. Logs go to
stderr; stdout carries only protocol messages.

Run it from the repo with `npm run mcp` (or `node packages/mcp/bin/vb-mcp.ts`); an MCP client
normally starts it for you. It needs Node 22.18 or newer, and a running board (`npm run board`).

## Settings

- `VB_SERVER`: the board server. Default `http://127.0.0.1:4466`.
- `VB_AGENT_SECRET` (optional): the secret for every call that does not pass a `secret` argument. When it is set, the
  instructions tell the agent its identity is given (no `join`, no secret to save, no `secret`
  argument). The board's chat panel sets it for each agent it starts (api.md 106).
- `VB_PROJECT` (optional): the folder this agent works in (api.md 116). Left out, it is the
  nearest folder at or above the server's working folder with a Vision Board in either layout:
  `.visionboard/ledger.jsonl`, or ledger folders, `.visionboard/<ledger>/ledger.jsonl` (`#client`
  `ledgersIn`; a client starts it in your project, or in one of its ledger folders), else none. Every
  call sends it as `VB-Project`, and the board refuses the call with `wrong-folder` when it has another
  folder open, so an agent never reads or draws on the wrong project. With none, calls are not checked.
  The chat panel sets it to the open folder (the project). The ledger is not a setting: the board has
  one open, and an agent's secret belongs to the ledger it joined (api.md 115a).

## Adding it to a client

This section is the one place the MCP set-up is written down; other docs link here.

Every MCP client takes the same entry. Use absolute paths (`which node` gives the first):

```json
{
  "mcpServers": {
    "vision-board": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/vision-board/packages/mcp/bin/vb-mcp.ts"]
    }
  }
}
```

Where it goes:

- Kiro: `~/.kiro/settings/mcp.json` (every project) or `.kiro/settings/mcp.json` (one project).
- Claude Code: `.mcp.json` in a project, or from the terminal (add `-s user` for every project):
  `claude mcp add vision-board -- /absolute/path/to/node /absolute/path/to/vision-board/packages/mcp/bin/vb-mcp.ts`
- Cursor: `~/.cursor/mcp.json` or `.cursor/mcp.json`.
- Any other client: the same `command` and `args`.

The board must be running (`npm run board`). Add `"env"` only to change a setting above.

## Identity (api.md 22)

An agent calls `join` once and gets an agent id and a secret. The secret is the agent's identity:
it should save both in its durable notes, because a context compaction loses them, and it passes
the secret as the `secret` argument of `write_board`, `request_grant`, `list_open` and
`check_responses`. An unknown secret answers `not-authenticated`: join again, ask for the grants
again, and the person approves again. A secret from a folder the board had open before answers
`wrong-folder` instead: the agent stops and tells the person, and does not join (api.md 115).
So does a secret from another ledger of the open folder, naming both ledgers (api.md 115a).
When the agent's own folder (`VB_PROJECT`) is the one now open, a secret from another folder answers
`not-authenticated` with "call join again" (api.md 124).
`join` and `list_boards` answer `project`, the folder the board has open, and `ledger`, its open
ledger, with ledger folders.

`VB_AGENT_SECRET` in the `env` above makes one identity for every chat that shares that MCP
configuration, so two chats would write as one agent and share its grants. Set it only for a
single-chat setup (or for the `vb` CLI); for several chats, leave it out and let each chat join.

- **Depends on**: `packages/format`, `packages/client`.
- **Used by**: MCP clients (Kiro, Claude Code, Cursor), through `bin/vb-mcp.ts`.
- **Public API** (`#mcp`, `src/index.ts`, D-059): `createMcpServer` (over `httpTools`, or a host's `ToolHost` such as the board engine's `tools`, whose own `instructions`, when it carries them, are the ones sent: api.md 171), `serveStdio`, `callTool`, `answerResult`, `problemResult`, `checkArgs`,
  `split`, `failureText`, `projectOf`, the generated `TOOLS`/`TOOL_FILE`, the version constants, `INSTRUCTIONS` and `INSTRUCTIONS_JOINED` (`src/instructions.ts`), `MCP_BIN`
  (the path of `bin/vb-mcp.ts`, which a Node-only module exports from its front door, D-060) and `RpcError`.
- **Tests**: `tests/` (the generated list against the spec and every client's limits, the argument
  check and stdio framing in process, and modern and legacy sessions over a spawned server against
  a real board server: the board's test support, `#board/testing`, found with `import.meta.resolve`
  and run as a child process, D-062).
