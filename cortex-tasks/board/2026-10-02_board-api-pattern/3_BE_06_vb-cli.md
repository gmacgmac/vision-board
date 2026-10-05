# 3_BE_06_vb-cli: `vb`, one command per agent operation

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 3) ·
> **Decisions**: D-019, D-029 · **Contract**: `docs/specification/api.md` points 1, 22, 51, 55 ·
> **Model**: Sonnet 5.5

## Objective

`vb <command>` gives a terminal (and any agent with a shell) every `x-agent` operation, generated
from `openapi.json`, calling the server through `packages/client`.

## Context

- **Work in the worktree** `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board-wt-cli`
  (branch `u4-cli`, cut from `board-v3`). Another agent is changing `apps/board/server/*` in the
  main checkout; never touch the main checkout. Run `npm ci` first. Node 22.23.1 via nvm. Run page
  tests, if at all, with `VB_TEST_PORT=4479 npm run test:pages`.
- Read first: `docs/specification/api.md`; `packages/format/schema/openapi.json`;
  `packages/format/src/operations.generated.ts`; `scripts/gen-api.mjs` (extend it, do not write a
  second generator); `packages/client/src/*`; `apps/board/bin/reply.ts` (the existing CLI style);
  D-016 and D-029 (`cli` may import `format`, `actions`, `agent`, `client`).
- `join`, `request_grant` and `write_board` answer `not-found` on this branch; their server side
  lands in the main checkout at the same time. Test their argument handling against a stub
  server, and test the real round trip only for reads.

## Steps

1. `scripts/gen-api.mjs` also writes `packages/cli/src/commands.generated.ts`: for each `x-agent`
   operation the command name (`operationId` with hyphens), its summary, and its inputs (path,
   query, body) with type, required flag and description. `--check` covers it.
2. `packages/cli/src/` (front door `index.ts`, one job per file): argument parsing with no
   dependency (`--name value`, `--flag`, `--json-body <file or ->` for a whole request body,
   numbers and booleans typed from the generated table); `vb help` and `vb <command> --help` from
   the table; the call through `createClient({ base, secret })` with base from `--server` or
   `VB_SERVER` (default `http://127.0.0.1:4466`) and the secret from `--secret` or
   `VB_AGENT_SECRET`; output is the JSON response by default and `key: value` lines with `--text`,
   from one generic formatter; a problem prints `detail` and each error's pointer and detail to
   stderr and exits 1; bad arguments exit 2.
3. `packages/cli/bin/vb.ts` (executable entry) and `"vb": "node packages/cli/bin/vb.ts"` in the
   root scripts; `bin` in `packages/cli/package.json` if the workspace needs one.
4. A short `packages/cli/README.md`: what it is, examples for `list-boards`, `show-node`,
   `check-responses --wait 60`, `join`, `write-board --json-body items.json`.

## Tests (write them first)

`packages/cli/tests/`: parsing (types, required, unknown flag, `--json-body -` from stdin), help
output from the table, the generic formatter, exit codes 0/1/2, the generated table current, and a
real round trip of `list-boards`, `get-board`, `show-node` and `read-ledger` against a server
started on a free port with a fixture project (reuse the API test harness in
`apps/board/tests/api-harness.ts` if the layers allow; otherwise start the server as a child
process).

## Done when

- In the worktree: `npm test`, `npm run check`, `npm run verify` exit 0.
- Commit once on `u4-cli` (`3_BE_06: vb commands from the spec`); do not push.
- Report: files added, every existing file changed, anything unclear. Do not edit
  `docs/decisions.md`, steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md` or
  `packages/tokens`. Files over 50 lines: create with the first section, then append in chunks.
