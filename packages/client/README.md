# packages/client

The one module that calls the board server (rule 7, D-029): the board page, `vb` and the MCP
server all use it. `createClient({ base?, secret?, fetch? })` returns `call(operationId, input,
opts?)`. The request is built from the route table generated from `openapi.json` (never the spec
itself, so the page bundle stays small): path parameters fill the path, `input.body` is the JSON
body, every other named input goes in the query string, and a secret is sent as
`Authorization: Bearer`. A problem answer is thrown as `ApiProblem` (`code`, `status`, `detail`,
`errors`, and `ver`/`board`/`region` when sent). A missing path parameter is refused before any
request. `read_ledger` with `{ accept: 'application/jsonl' }` returns a list. `url()` and
`watch()` cover server-sent events in the browser. Works in the browser and in Node 22.

- **Depends on**: `packages/format`.
- **Used by**: `apps/board` (`src/board/io.ts`), `packages/cli` and `packages/mcp`.
- **Public API** (`src/index.ts`): `createClient`, `ApiProblem`, `buildRequest`, `urlFor`,
  `parseResponse`, `problemFrom`, and their types.
