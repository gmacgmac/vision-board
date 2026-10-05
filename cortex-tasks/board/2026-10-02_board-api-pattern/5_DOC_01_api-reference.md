# 5_DOC_01_api-reference: The generated API reference

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 5) ·
> **Contract**: `docs/specification/api.md` points 1, 51, 55 · **Model**: Sonnet 5.5

## Objective

`docs/specification/api-reference.md` is generated from `openapi.json`, so the human-readable
reference can never drift from the contract; and every input has a description, so `vb` help,
MCP tool schemas and the reference all explain every field.

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. The spec, `scripts/gen-api.mjs` (route table, `vb` table, MCP tools) and every
  door exist.
- Read first: `docs/specification/api.md`, `packages/format/schema/openapi.json`,
  `packages/format/schema/**`, `scripts/gen-api.mjs` and its tests, `packages/cli/README.md`.

## Steps

1. Add a `description` to every property in the schemas that lacks one and that a caller sends
   or reads (for example `join` `label`; `request_grant` `board`, `region`, `reason`). Plain
   English, written for an agent, one sentence each. Run `npm run gen` so the generated tables
   pick them up.
2. `scripts/gen-api.mjs` also writes `docs/specification/api-reference.md`: a generated-file header;
   one section per operation in table order with its `operationId`, the `vb` command and MCP tool
   names, method and path, who may call it, its description, an inputs table (name, where, type,
   required, description), the success response's top-level fields, every error status with its
   code, and the request and response examples from the spec. `--check` covers it.
3. Link it from `docs/specification/api.md` § One source (the file is already named there).

## Tests (write them first)

`scripts/gen-api.test.mjs`: the reference is current; it names every operation; a test fails if
any schema property reachable from an operation's inputs has no description.

## Done when

- `npm test`, `npm run check`, `npm run verify` exit 0 (read the exit status). No page change, so
  page tests are optional.
- Report: files changed, descriptions added. Do not commit. Do not edit `docs/decisions.md`,
  steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md` or `packages/tokens`. Files over 50
  lines: create with the first section, then append in chunks.
