# 1_BE_03_openapi: The OpenAPI 3.2 document, API body schemas and the route table

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 1) ·
> **Decisions**: D-019, D-026, D-027, D-029 · **Contract**: `docs/specification/api.md` (all;
> especially 1-5, 20-22, 28-44, 52-55) · **Model**: Sonnet 5.5

## Objective

`packages/format/schema/openapi.json` defines every operation in api.md § Operations, with every
input, output, header and error, referencing the ledger schemas from 1_BE_01. A generator turns it
into a small route table, and tests prove the document is valid and current.

## Context

- **Work in the worktree** `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board-wt-be03`
  (branch `u4-openapi`, cut from `board-v3` at the 1_BE_01 commit). Another agent is editing
  `packages/actions` in the main checkout; never touch the main checkout. Run `npm ci` in the
  worktree first. Node 22.23.1 via nvm.
- Read first: `docs/specification/api.md`; `packages/format/schema/` (the ledger schemas and
  their `$id`s; use the `sent` forms for write items and the `stored` union for ledger lines);
  `apps/board/server/schema.ts` (how schemas are loaded and compiled; reuse it in tests);
  `apps/board/server.ts` and `apps/board/src/board/io.ts` (today's routes and response shapes,
  which the new shapes replace); `temp/research/u4-standards-brief.md` § 1, 3, 7.
- Out of scope: any server, client or page code. Nothing serves this spec yet.

## Steps

1. **API body schemas** in `packages/format/schema/api/`, `$id`
   `https://vision-board.invalid/schema/api/<file>`: `problem` (RFC 9457 with `errors[]`, the
   `ver`, `board`, `region` extensions, and an item form without `status`); `write-request`
   (`{ items }`, max 200; each item `oneOf` the eight sent forms with the discriminator);
   `write-result`; one response schema per read; `join-request`/`join-response`;
   `grant-request-body`/`grant-response`; `act-request` (the act `sent` form); `seen-request`.
   Shapes come from api.md; where api.md names a field without its shape, take it from the fold
   types in `packages/actions/src/fold.ts` and `packages/format/src/board-view.ts`, and list every
   such choice in your report. Closed objects, as in api.md 7.
2. **`openapi.json`**, `openapi: "3.2.0"`, `info.version` `1.0.0`, server `http://127.0.0.1:4466`.
   Security schemes `agentSecret` (HTTP bearer) and `personCookie` (apiKey, cookie `vb_person`).
   One operation per table row, with `operationId`, `x-agent`, `summary`, a `description` whose
   first sentence says what it does (under 2,048 characters; it becomes the MCP tool description,
   so write it for an agent: when to call it, what to pass, what comes back), parameters with
   limits (`after`, `limit` default 100 max 500, `wait` 0-60, `linked`, `board`), request bodies,
   every response by status with `application/problem+json` for errors, `WWW-Authenticate` on 401,
   `Allow` on 405, and one example per request and success response. `read_ledger` and
   `watch_board` use the shapes in point 44. `components.schemas` names each event after its
   `type` value (point 8).
3. **Vendored OAS schema**: fetch `https://spec.openapis.org/oas/3.2/schema/2026-08-30` once (a
   plain read) into `packages/format/schema/vendor/oas-3.2-schema-2026-08-30.json` (not
   `.schema.json`, so the loader skips it), with a README line: source URL, date, licence
   (Apache-2.0).
4. **Route table**: `scripts/gen-api.mjs` reads `openapi.json` and writes
   `packages/format/src/operations.generated.ts`: for each operation its `operationId`, method,
   path, path parameter names, `xAgent`, and `auth` (`none`, `agent` or `person`). A header line
   says it is generated. Export it from the `packages/format` front door. `npm run gen` runs the
   generator; `--check` exits non-zero if the file would change.

## Tests (write them first)

`apps/board/tests/openapi.test.ts`:
1. The document validates against the vendored OAS 3.2 schema, after replacing every
   `"$dynamicRef": "#meta"` with `"$ref": "#/$defs/schema"` in memory (ajv mishandles it; standards
   brief § 7), with ajv `addFormat` stubs for the formats it names.
2. Our own checks (point 52): unique snake_case `operationId`s matching `^[a-z][a-z0-9_]{0,39}$`;
   `x-agent` boolean on every operation and true exactly for the agent rows; every 4xx/5xx response
   is `application/problem+json` with the problem schema; every `$ref` resolves; every referenced
   schema compiles; descriptions start with a sentence and stay under 2,048 characters.
3. Every example validates against its schema.
4. Every operation in api.md's table is in the document and nothing else is (parse the table).
5. The route table is current (`gen-api.mjs --check`).

## Done when

- In the worktree: `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` exit 0.
- Commit on `u4-openapi` in the worktree (one commit, message `1_BE_03: openapi.json 3.2, API
  schemas, route table`); do not push, do not touch `board-v3`.
- Report: files added, every shape choice api.md left open, the vendored file's size, and anything
  in api.md you found unclear or wrong. Do not edit `docs/decisions.md`, steering, `AGENTS.md`,
  `CLAUDE.md`, `docs/principles.md` or `packages/tokens`. Files over 50 lines: create with the
  first section, then append in chunks.
