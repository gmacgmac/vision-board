# 1_BE_01_ledger-v3-schemas: Ledger v3, its JSON Schemas, and ajv

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 1) ·
> **Decisions**: D-017, D-026, D-027 · **Contract**: `docs/specification/api.md` points 2, 5-18,
> 56 · **Model**: Opus 5.5

## Objective

The ledger format moves to v3 and gets its JSON Schemas, the one source for its shape. `ajv`
checks them in the server's I/O layer and in tests, and a test proves the schemas and the hand
validator give the same verdict on every fixture and on a table of broken lines.

## Context

- Repo: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`.
  Node 22.23.1 via nvm (put `$HOME/.nvm/versions/node/v22.23.1/bin` first on PATH).
- Read first: `docs/specification/api.md` (the whole contract; this task builds points 2, 5-18
  and 56), `temp/research/u4-step1-brief.md` (how the ledger is coded today, with every gap),
  `temp/research/u4-standards-brief.md` § 4 (tested ajv patterns and pitfalls).
- Code today: `packages/format/src/ledger.ts` (types), `ledger-shape.ts` (`eventProblems`),
  `ledger-index.ts` (`contextProblems`), fixtures `packages/format/fixtures/*.ledger.jsonl`,
  `apps/board/server/ledger.ts` (`stamp`, `check`, `STAMPED`), `packages/format/bin/validate.ts`.
- Out of scope (later tasks): the action registry, `validateAct` and the fold (1_BE_02); the
  OpenAPI document and API body schemas (1_BE_03); any route.

## Steps

1. **ajv.** Check npm for the latest `ajv` 8.x, its licence (MIT) and that it has no install
   script. Install it exact into `apps/board/package.json` `dependencies` (workspaces hoist it).
   Add its row to `docs/specification/dependencies.md` in the same change (rule 20), following
   the existing rows, and update the register's summary counts. No other package.
2. **Types** (`ledger.ts`, `view.ts`): `LEDGER_FORMAT = 3` and a `LEDGER_FORMATS = [2, 3]` the
   readers accept. New event types `join` (`{ label }`) and `grant-request`
   (`{ board, region, reason }`), both agent events. `ActionId` gains `grant`, `deny`, `revoke`,
   `size`, `send`; `ActEvent` gains `request?`, `holder?`, `size?` (`s|m|l|auto`). `NodeBody`
   gains `size?` (`s|m|l`). Optional `key?` on every agent-written event type. A ledger region
   type whose `center` is a number (`LedgerRegion`); the View's `Region` keeps the string.
   Fix every type error this causes.
3. **Hand validator** (`ledger-shape.ts`), so it matches the schemas exactly in verdict:
   `v` in `LEDGER_FORMATS`; on v3 `agent` matches `^a-[a-z0-9]{8}$`, on v2 any non-blank string;
   unknown keys refused at every level (replaces the `FORBIDDEN_KEYS` check inside `node`, but
   keep its "no coordinates" message for those keys); lengths in code points via one
   `codePoints()` helper; the timestamp pattern of api.md point 10 instead of `Date.parse`; every
   limit in point 10; the new event types and act actions (`grant`/`deny` need `request`;
   `deny` may have `text`; `revoke` needs `holder` (agent id), `board`, `region`; `size` needs
   `n` and `size`; `send` needs `board`; none of `grant`/`deny`/`revoke`/`send` takes `n`).
   Existing problem wording stays where tests assert it.
4. **Context** (`ledger-index.ts` `contextProblems`): `join` (the stamped agent id is new);
   `grant-request` (board and region exist); `grant`/`deny` (`request` is the `seq` of an open
   `grant-request`); `revoke` (the holder holds that container, as far as the index knows:
   creator of the region or granted and not revoked); `size` (node exists); `send` (board
   exists). Index what the fold will need: region creator, grant requests and their answers.
5. **Schemas** in `packages/format/schema/`, exactly as api.md points 5-11 say: `common`,
   `events/<type>` (each with `$defs/core`, `$defs/sent`, `$defs/stored`), `ledger-event`
   (`oneOf` + `discriminator`). The `sent` forms follow point 6 (`n` as number or `{ key }`,
   `base`, `key`); they are used by 1_BE_03, so write them now. Use `type: "object"` on every
   object schema so strict mode stays quiet.
6. **ajv module**: `apps/board/server/schema.ts` loads every schema file by `$id` with `fs`, compiles
   with `Ajv2020` (`strict` on, `allErrors`, `discriminator: true`), and exports
   `ledgerLineProblems(line): { pointer, detail }[]` plus `compileSchema(id)` for later tasks. Plain
   English `detail`s, one per ajv error, with no ajv wording leaking (for example "unknown field
   `bogus`", "`title` is longer than 200 characters"). It is the only file that imports `ajv`.
   It is not yet wired into `append`; that happens in 2_BE_04.
7. **Validate CLI**: move `npm run validate` to `apps/board/bin/validate.ts` (format may not import
   an app). It validates ledger files (`.jsonl`): each line by schema and by `eventProblems`, then
   context, and prints every problem with its line number. Delete the view-file mode. Update the
   `validate` script and any README that mentions it.
8. Bump `LEDGER_FORMAT` in the fixtures only if a test needs a v3 line; the fixtures stay v2 and
   must stay valid (point 11).

## Tests (write them first)

In `apps/board/tests/schema.test.ts` (it may import the server module and the format front door):

1. Every fixture line validates by schema and by `eventProblems`, and every fixture passes
   context.
2. A table of at least 40 broken lines, one per rule (unknown key at each level, each missing
   required field, each limit, a bad timestamp, a v3 line with a free-form `agent`, a v2 line with
   one, emoji length counted in code points, each new event and action, a coordinate key in
   `node`, `ver` on a `sent` node): schema and `eventProblems` agree on the verdict for every row.
3. Valid v3 lines for every new event type and action pass both.
4. `EVENT_TYPES`, `ACTION_IDS`, `KINDS` and `MODES` equal the schema enums (point 2).
5. Every schema file compiles; no `$ref` leaves `https://vision-board.invalid/`.
6. A malformed line gets exactly one problem from `ledgerLineProblems` (the discriminator works).
7. The validate CLI exits 0 on each fixture and non-zero on a ledger with one bad line.

Existing tests keep passing; change one only where the contract changed its rule, and list each
such change in your report.

## Done when

- `npm test`, `npm run check`, `npm run verify` and `npm run test:pages` all exit 0 (read the
  exit status, not the output).
- Your report lists: files added and changed, the ajv version installed and its licence, every
  existing test you changed and why, and anything in api.md you found unclear or wrong. Do not
  commit; the orchestrator verifies and commits. Do not edit `docs/decisions.md`, steering files,
  `AGENTS.md`, `CLAUDE.md`, `docs/principles.md` or `packages/tokens`.
- Long files: create any file over 50 lines with its first section, then append in chunks.
