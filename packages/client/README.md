# packages/client

The one module that calls the board server (rule 7, D-029): the board page, `vb` and the MCP
server all use it. `createClient({ transport?, base?, fetch?, secret?, project? })` returns
`call(operationId, input, opts?)`. `call` is typed by the operation: its input and its answer are
the types generated from the schemas (`OperationInput`, `OperationOutput` in `#format`,
`api-types.generated.ts`), so a caller writes no response type, and a caller that disagrees with a
schema fails `npm run check` (`tests/typed-call.test.ts`). A relay that holds an operation id it
read at run time (`vb`, MCP) passes any named values (`CallInput`) and gets `unknown`.

The client holds no origin. It sends each request through a transport, `(path, init) =>
Promise<Response>`, with the path relative to the board's route prefix (`ROUTE_PREFIX`, `/api/`):
`httpTransport(origin, fetch)` is the standalone one (the page passes its own origin, `''`), and a
host passes its own `api` (`createClient({ transport })`). `base` and `fetch` build the standalone
transport for callers that have no other.

The request is built from the route table generated from `openapi.json` (never the spec itself, so
the page bundle stays small): path parameters fill the path, `input.body` is the JSON body, every
other named input goes in the query string, a secret is sent as `Authorization: Bearer`, and a
folder as `VB-Project` (`PROJECT_HEADER`). A problem answer is thrown as `ApiProblem` (`code`,
`status`, `detail`, `errors`, and `ver`/`board`/`region`/`example` when sent); its shape, the codes
and their titles come from `problem.schema.json` through `#format`. A missing path parameter is
refused before any request. `read_ledger` with `{ accept: 'application/jsonl' }` returns a list.
`url()` and `watch()` cover server-sent events in the browser (one stream, one or several named
events, each handed on with its name). Works in the browser and in Node 22.

- **Depends on**: `packages/format`.
- **Used by**: `apps/board` (`src/board/io.ts`), `packages/cli` and `packages/mcp`.
- **Public API** (`src/index.ts`): `createClient`, `httpTransport`, `ApiProblem`, `buildRequest`,
  `pathFor`, `urlFor`, `parseResponse`, `problemFrom`, `projectOf`, and their types (`Transport`,
  `CallInput`, `InputOf`, `OutputOf`, `Client`, `ClientOptions`, `CallOptions`, `BuiltRequest`).
