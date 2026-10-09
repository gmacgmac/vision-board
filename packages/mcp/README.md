# packages/mcp

`vb-mcp`: our own stdio MCP server for the board API (D-028, api.md 45-50). It gives an agent one
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

## Adding it to a client

Use absolute paths: a client does not start the server from this folder, and may not have your
shell's `PATH` (with nvm, give the full path to `node`). The server name `vb` keeps tool names
short (`mcp__vb__write_board` in Claude Code), well inside every client's limits.

Kiro (`.kiro/settings/mcp.json` in a project, or `~/.kiro/settings/mcp.json`), Cursor
(`.cursor/mcp.json` or `~/.cursor/mcp.json`) and Claude Code (`.mcp.json` in a project) all take
the same entry:

```json
{
  "mcpServers": {
    "vb": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/vision-board/packages/mcp/bin/vb-mcp.ts"],
      "env": { "VB_SERVER": "http://127.0.0.1:4466" }
    }
  }
}
```

Claude Code can also add it from the terminal:

```sh
claude mcp add vb --env VB_SERVER=http://127.0.0.1:4466 -- /absolute/path/to/node /absolute/path/to/vision-board/packages/mcp/bin/vb-mcp.ts
```

## Identity (api.md 22)

An agent calls `join` once and gets an agent id and a secret. The secret is the agent's identity:
it should save both in its durable notes, because a context compaction loses them, and it passes
the secret as the `secret` argument of `write_board`, `request_grant`, `list_open` and
`check_responses`. An unknown secret answers `not-authenticated`: join again, ask for the grants
again, and the person approves again.

`VB_AGENT_SECRET` in the `env` above makes one identity for every chat that shares that MCP
configuration, so two chats would write as one agent and share its grants. Set it only for a
single-chat setup (or for `vb`); for several chats, leave it out and let each chat join.

- **Depends on**: `packages/format`, `packages/client`.
- **Used by**: MCP clients (Kiro, Claude Code, Cursor), through `bin/vb-mcp.ts`.
- **Public API** (`src/index.ts`): `createMcpServer`, `serveStdio`, `callTool`, `checkArgs`,
  `split`, `failureText`, the generated `TOOLS`/`TOOL_FILE`, the version constants and `RpcError`.
- **Tests**: `tests/` (the generated list against the spec and every client's limits, the argument
  check and stdio framing in process, and modern and legacy sessions over a spawned server against
  a real board server).
