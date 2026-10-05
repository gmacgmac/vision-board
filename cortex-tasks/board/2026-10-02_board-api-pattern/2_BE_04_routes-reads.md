# 2_BE_04_routes-reads: packages/client, the spec-driven server, problem errors and the reads

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2) ·
> **Decisions**: D-016, D-019, D-026, D-029 · **Contract**: `docs/specification/api.md` points
> 1-4, 12, 28, 31-33, 37-44, 53-54 · **Model**: Opus 5.5

## Objective

The board server answers every operation in `openapi.json` through one dispatcher driven by the
generated route table, returns RFC 9457 problems, validates every line it appends against the
schema, and serves all the reads. `packages/client` is the one module that calls it, and the page
switches to it. Identity, grants and `write_board` come next (2_BE_05).

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. Done: 1_BE_01 (schemas, `apps/board/server/schema.ts`), 1_BE_02 (registry,
  fold, `canWrite`, `pendingItems`, `unseenItems`, `responsesAfter` in `packages/actions`),
  1_BE_03 (`packages/format/schema/openapi.json`, `schema/api/*`, `packages/format/src/
  operations.generated.ts`, `npm run gen`).
- Read first: `docs/specification/api.md`; `openapi.json`; `apps/board/server.ts` and
  `apps/board/server/*.ts`; `apps/board/src/board/io.ts` and its callers; `scripts/verify.mjs`
  (`LAYERS`); D-016 and D-029 in `docs/decisions.md`; `tests/pages/` (the page tests must stay
  green).
- Rulings already made: validate each write item against `write-item`, never the whole request;
  `act` requests keep `type: "act"`; an unknown secret on a scoped read is 401 (2_BE_05 wires it).

## Steps

1. **Layers** (D-029): `LAYERS` gains `client: ['format']` and `mcp: ['format', 'client']`, and
   `cli` gains `client`; update `scripts/verify.mjs`, its tests and `npm run map`.
2. **`packages/client`** (`src/index.ts` front door; `package.json` only if the workspace needs
   one): `createClient({ base, secret?, fetch? })` returning `call(operationId, input)`. It builds
   the request from the route table (path params, query, JSON body, `Authorization` when a secret
   is set, `credentials: 'same-origin'` in the browser), and returns the parsed body or throws an
   `ApiProblem` carrying the problem's fields and the status. Works in the browser and in Node 22
   with the global `fetch`. No other module may call the server.
3. **Dispatcher** (`apps/board/server/`, split by job, about 300 lines a file): match the method
   and path against `OPERATIONS`; unknown path → `not-found`; known path, wrong method →
   `method-not-allowed` with `Allow`. One handler per `operationId` in a handler table; a test
   fails if the table and the route table differ (point 53). `server.ts` keeps only startup.
4. **Problems**: one `problem(code, detail, extras?)` helper producing api.md 38-40 exactly,
   `application/problem+json`; every existing error path uses it (guard, bad ids, unknown board,
   body limits, 500). Exact media-type parsing (point 28: `application/json`, optional
   `charset=utf-8`). Errors never leak internals; a 500 logs the stack to stderr only.
5. **Append path**: the ledger module validates each stamped line with `ledgerLineProblems`
   before `eventProblems` and context, and refuses with `invalid` plus pointers. This closes the
   "extra fields are stored" gap; add the regression test (an `act` carrying an extra `title`).
6. **Reads**: `list_boards` (each board's own last `seq`, plus `head`), `get_board`, `show_node`
   (with `linked`), `show_container`, `list_open`, `check_responses` (`after`, `limit`, and `wait`:
   hold the request until a `send` or a grant answer arrives, the wait ends, or the client goes
   away; a timed-out wait returns `{ responses: [], head }`), `read_ledger` (JSON, and
   `application/jsonl` by `Accept`), and `watch_board` as today. Shapes exactly as the response
   schemas in `schema/api/`. Use the `packages/actions` functions; no fold logic in the server.
   Bearer scoping waits for 2_BE_05: for now reads are unscoped.
7. **The page**: `apps/board/src/board/io.ts` becomes a thin wrapper over `packages/client`
   (`get_board`, `list_boards`, `act` with `type: "act"`), reading `head` and problem errors.
   Behaviour and look stay the same; `npm run test:pages` must pass unchanged.

## Tests (write them first)

- `apps/board/tests/api.test.ts` (and split files as needed): start the server on a free port
  with a temporary project seeded from a fixture; call every implemented operation through
  `packages/client`; validate each response's status, body and headers against `openapi.json`
  with ajv (point 54). Cover: every read's happy path; `after`/`limit`/`more`; `wait` returning on
  a `send` act and on timeout (use a 1-second wait); jsonl `read_ledger`; 404, 405 with `Allow`,
  415, 413, 400 bad id; an `act` with an extra key refused with `invalid` and a pointer.
- `packages/client/tests/`: request building from the route table, problem parsing, a missing
  path parameter refused before any request.

## Done when

- `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the exit
  status).
- Report: files added, changed and deleted; every existing test changed and why; anything in
  api.md or openapi.json you found unclear or wrong. Do not commit. Do not edit
  `docs/decisions.md`, steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md` or
  `packages/tokens`. Files over 50 lines: create with the first section, then append in chunks.
