# 4_BE_07_mcp: The MCP server, generated from the spec

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 4) ·
> **Decisions**: D-019, D-027, D-028, D-029 · **Contract**: `docs/specification/api.md` points
> 22, 40-50, 55 · **Model**: Opus 5.5

## Objective

`packages/mcp` is a stdio MCP server, our own, that gives an agent every `x-agent` operation as a
tool, generated from `openapi.json`, calling the board server through `packages/client`. It
speaks MCP 2026-07-28 and still answers clients on the 2025-11-25 handshake.

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. Done: the whole HTTP API (2_BE_04, 2_BE_05), `packages/client`, `vb`
  (3_BE_06, which extended `scripts/gen-api.mjs`).
- Read first: `docs/specification/api.md` § MCP (points 40-50) and § Callers (22);
  `temp/research/u4-mcp-brief.md` (cited facts on the 2026-07-28 spec and client limits);
  `temp/research/u4-contract-review.md` findings 18-21 (the modern wire fields); the spec pages
  themselves when a detail matters: https://modelcontextprotocol.io/specification/2026-07-28
  (/basic, /basic/versioning, /server/discover, /server/tools, /changelog), read-only.
- No MCP SDK (D-028). If you hit something that truly needs it, stop and report.
- Layers: `mcp` may import `format` and `client` only.

## Steps

1. **Generator**: `scripts/gen-api.mjs` also writes `packages/mcp/src/tools.generated.json`, one
   tool per `x-agent` operation: `name` (the `operationId`), `title`, `description` (from the
   operation; `write_board`, `join` and `request_grant` also mention the `secret` argument),
   `inputSchema` per point 47 (path + query + body merged into one plain object; every `$ref`
   inlined; composed objects flattened to `properties` + `additionalProperties: false`; no root
   `oneOf`; `$id`, `$schema`, `discriminator`, `x-*` stripped; write tools add an optional
   `secret` string), `outputSchema` (the success response, flattened the same way), and
   `annotations` per point 49. Deterministic order. `--check` covers it.
2. **Server** (`packages/mcp/src/`, one job per file; `bin/vb-mcp.ts` entry; root script
   `"mcp": "node packages/mcp/bin/vb-mcp.ts"`): newline-delimited JSON-RPC 2.0 on stdin/stdout,
   logs to stderr.
   - Modern (2026-07-28): `server/discover` (supported versions `2026-07-28` and `2025-11-25`,
     capabilities `{ tools: {} }`, `serverInfo`, and `instructions`: join once and save your id and
     secret in your notes; write with keys; ask for a grant when told; then `check_responses`);
     `tools/list` (with `ttlMs` and `cacheScope: "public"`); `tools/call`. Read the version and
     capabilities from each request's `_meta`; an unknown or missing version on a modern request
     gets `UnsupportedProtocolVersionError` (-32022). Every result carries
     `resultType: "complete"` and `serverInfo` in `_meta`. No `notifications/message` unless the
     request set a log level.
   - Legacy (2025-11-25): `initialize` (answer `2025-11-25` and the same capabilities and
     instructions), `notifications/initialized`, `ping`, then the same `tools/*`.
   - `tools/call`: validate arguments against the tool's `inputSchema` with a small check of your
     own over the flattened schema (types, required, enums, `additionalProperties`), split them back
     into path, query and body by the generated table, call `packages/client` with the secret from
     the argument or `VB_AGENT_SECRET`, and return `structuredContent` plus a short text block;
     a problem becomes `isError: true` with the problem as text only (point 48); per-item
     failures stay `isError: false` unless every item failed. Unknown tool → JSON-RPC error.
     A board server that is not running → `isError: true` with "start it with `npm run board`".
   - Base URL from `VB_SERVER` (default `http://127.0.0.1:4466`).
3. `packages/mcp/README.md`: how to add it to Kiro, Claude Code and Cursor (`command`, `args`,
   `env`), and the identity note of point 22.

## Tests (write them first)

`packages/mcp/tests/`: the generated file is current; every tool name matches
`^[a-z][a-z0-9_]{0,39}$`, every description's first sentence ends with a full stop and the whole
is under 2,048 characters, no `$ref`/`$id`/`discriminator`/`x-` key anywhere, no two merged
inputs share a name, every `inputSchema` and `outputSchema` compiles as JSON Schema 2020-12; a
modern session (`server/discover`, `tools/list`, `tools/call`) and a legacy one (`initialize`,
`notifications/initialized`, `tools/list`, `tools/call`, `ping`) over a spawned child process
against a real board server on a free port, covering `join`, `request_grant`, `write_board`
(with a needs-grant item), `check_responses`, `show_node`; the -32022 refusal; a problem as
`isError: true` with no `structuredContent`.

## Done when

- `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the exit
  status).
- Report: files added and changed, anything in api.md or the MCP spec you found unclear. Do not
  commit. Do not edit `docs/decisions.md`, steering, `AGENTS.md`, `CLAUDE.md`,
  `docs/principles.md` or `packages/tokens`. Files over 50 lines: create with the first section,
  then append in chunks.
