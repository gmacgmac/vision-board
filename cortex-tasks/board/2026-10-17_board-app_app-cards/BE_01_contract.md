# BE_01_contract: Contract: kind, ledger v17, manifest, operations, D-047

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Put every shape the app card needs into the one contract first (rule 6), so BE_02, FE_01 and T_01
build against it in parallel.

## Context

PLAN.md rulings 2, 3, 5, 6, 7, 11, 12, 13, 18 and § Current State. Follow the ledger v16 footprint
(api.md point 141, commit `bc5c3ff`) and "Adding an operation" (api.md point 57).

## Inputs

- **Files to modify**:
  - `packages/format/src/view.ts` (`KINDS`, `ViewNode.app`), `ledger.ts` (`NodeBody.app`, `LEDGER_FORMAT`
    17, `LEDGER_FORMATS`, `ACTION_IDS` + `app-allow`/`app-revoke` with their act shapes, the v17
    doc paragraph), `node-types.ts` (`app: tells('App')`), `ledger-shape.ts` (`NODE` + act shapes),
    `validate.ts`, `flags.ts` (`appCards`, on), a new `packages/format/src/apps.ts` (`APP_SIZE`,
    `APP_LIMITS` — timeout 10 s, output 256 KiB, 4 in flight, queue 16, 3 crashes per 60 s, idle 5 min,
    memory 128 MB, panel messages 50 per second — `AppRef`, `AppManifest` type, `APP_ID` = the
    existing id pattern) exported from `index.ts`.
  - Schemas: `common.schema.json` (`kind` enum, `$defs.appRef`, `stamp` enums), `events/node.schema.json`
    (`app` in `$defs.body`, required when `kind` is `app`, refused otherwise, via a v17 `rules`
    piece), `events/act.schema.json` (the two acts), every `schema/ledger/16/` id → 17,
    `api/view.schema.json`, `api/common.schema.json`, new `schema/app/manifest.schema.json`, new
    API schemas for `list_apps` and `call_app_tool` (request/response), the problem codes.
  - `packages/format/schema/openapi.json`: `info.version` 1.27.0; `list_apps` (`GET /api/apps`,
    `x-agent: true`, agent secret or person cookie, `VB-Project` header); `call_app_tool`
    (`POST /api/apps/{app}/calls`, person cookie, body `{tool, arguments}`, response
    `{content, structuredContent?, isError}` in MCP's tool-result shape); an `appPath` parameter.
  - `packages/actions/src/registry.ts` (`ACTIONS['app-allow'|'app-revoke']`: person,
    `needsConfirmation: true`, labels "Allow app" / "Stop app"), `references.ts` (`REFERENCE_KINDS`
    + `app`, its `REFERENCES` row, `ACT_SCOPES` rows), and anything the compiler then requires
    (`fold.ts` keeps allowed hashes per app: `LedgerState.appAllowed: Map<appId, hash>`, one fold).
  - `packages/ui/src/node/node-icons.ts` `KIND_ICON.app`; `packages/tokens/src/tokens.css`
    `--vb-kind-app` (light and dark, APCA measured; approved by the go).
  - `apps/board/server/handlers.ts`: stub handlers `list_apps` (returns `{apps: []}`) and
    `call_app_tool` (`not-found`) so the table stays complete; `apps/board/server/schema.ts`
    `LEDGER_EVENT_ID`.
  - Tests named in PLAN.md § Current State (openapi, route-table auth map, schema, schema-cases,
    api-schemas, mcp tools, cli commands, contract-walk) and `gallery-fixture.test.ts` /
    `tests/pages/gallery.spec.ts` (`TELLS` gains `app`; the gallery's `kinds` region gets an `app` node
    so every kind still appears once; it may draw as the "missing app" state until FE_02).
  - Docs: `docs/decisions.md` (append D-047 verbatim from PLAN.md), new `docs/specification/apps.md`,
    `docs/specification/api.md` § "Ledger v17: app cards" (numbered points after the last one) and
    the operations and Errors tables, `docs/specification/components.md` § The node-type registry
    (the `app` row), `packages/format/README.md` (format number).
- **Patterns to follow**: the v16 bump; `tells()`; one `$defs/rules` piece per version; problem codes
  as in `server/problem.ts` `PROBLEMS`.
- **Skills**: `cortex-architecture` (contract chain, registries) · `cortex-docs` (apps.md, api.md).

## Steps

1. [x] **Tests first**: schema cases (a valid v17 `app` node; `app` missing on an app node; `app` on
   another kind; size outside `APP_SIZE`; bad app id; the two acts valid and invalid), the manifest
   schema (valid; unknown field; file names with `/` or `..`; csp domains not https or wildcard),
   operations in the route table and api.md table, generated MCP tool `list_apps`, CLI `list-apps`.
2. [x] Format and schemas, then `npm run gen` and `npm run map`.
3. [x] Actions: registry, references, the fold of allowed hashes (unit tests: allow, revoke, a new
   hash replaces the old, retire of the card keeps the app's allow).
4. [x] `apps.md` — the agent-facing and builder-facing contract, written once, from the rulings:
   folder, manifest fields (point to the schema), panel protocol (every message: method, params,
   result, errors; host context fields; escape; theme change), tools module shape (`run(input, ctx)`,
   `ctx.env`, `ctx.signal`, what errors look like), limits (`APP_SIZE`, `APP_LIMITS`), approval, states (ruling 10), the panel CSP, and a minimal example.
5. [x] D-047 appended; api.md section; components.md row; README.
6. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0 (screenshots
   that change only because the gallery gained the `app` node: view each diff, then update).

## Validation

- [x] All gates exit 0; every new test was seen failing first.
- [x] `grep "^## D-047" docs/decisions.md` finds the entry; `apps.md` covers every bullet of step 4.

## Constraints

- If deviation is needed, follow TASK-STATUS.md instruction 5. No PII in examples. No git commits.
- Fill Implementation Notes; update your row and section in TASK-STATUS.md (name every new symbol in
  Shared Foundations if it differs from the table).

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** Ledger v17 (`LEDGER_FORMAT` 17, every ledger `$id` at `.../ledger/17/`), OpenAPI
1.27.0. Kind `app` (`NODE_TYPES.app = tells('App')`, `KIND_ICON.app`, `--vb-kind-app`), `node.app`
(`appRef` with `appWidth`/`appHeight` from `APP_SIZE`, `appHash`), acts `app-allow {app, hash}` and
`app-revoke {app}` (`APP_ACTIONS`; registry "Allow app" / "Stop app", person, confirm). The fold
keeps `LedgerState.appAllowed` (`packages/actions/src/apps.ts` `foldAppAct`); reference row `app`;
`namedApps`/`appCards`/`appOf`. `packages/format/src/apps.ts` (the one table: `APP_SIZE`,
`APP_LIMITS`, `APP_STATES`, `APP_FILES`, patterns, the panel protocol constants, types, `appSize`),
`src/app-shape.ts` (the hand twin), `schema/app/manifest.schema.json` (with `$defs/tool`), API
schemas `list-apps-response`, `app-call-request`, `app-call-response`; `list_apps` and
`call_app_tool` in `openapi.json` with six problem codes; stub handlers in `server/handlers.ts`.
Docs: D-047 (verbatim), `docs/specification/apps.md`, api.md 150-153 + Errors and Operations rows,
components.md registry bullet, format and actions READMEs.

**Deviations, all inside the rulings:**
1. The app rule (an app card names `app`, no other card does, no `size` word on an app card) holds
   on every line, not only v17: simpler, and no older line can name kind `app`.
2. App acts are on the app, not a board (`ACT_SCOPES` none): they move no head, never reach
   `check_responses`, and pass a board lock (`passesLock`). The lock walks were updated
   (`lock.test.ts`; `api-lock-person.test.ts` walks them in their own test while locked).
3. Problem codes: the ruling's five plus `app-busy` (503) for a full queue or the panel message cap
   (ruling 8 says "too-large/busy problem"); an answer over the output cap reuses `too-large`.
4. `list_apps` "agent secret or person cookie" needed a new route-table auth, `agent-or-person`
   (`gen-api.mjs` `authOf`, `spec.ts`, `callers.ts`): Bearer names an agent; else the cookie (stale:
   `forbidden`, so the page reloads); neither: 401. `contract-walk.ts` `agentOnly` now means "an
   agent needs its secret".
5. **One-file tools module**: it imports Node built-ins only, so the ruling-7 hash (manifest + tools
   file) covers all of an app's code (apps.md § The tools module, api.md 151). **BE_02**: enforce it
   in the runner (e.g. a module resolve hook refusing any specifier but `node:` built-ins), and state
   it in `list_apps` problems. **T_01**: put the parser inside `tools.mjs` (export it by name for the
   parser test), not in a sibling `calculator-parser.mjs`.
6. `list_apps` also lists `missing` apps (named by a live card, no folder; `namedApps` gives them in
   one pass), `changed: true`, and problems as `{ file, pointer?, detail }`.
7. Act rules: allowing a hash already allowed, or stopping an app not allowed, is refused; the
   person's `size` act on an app card is refused. **BE_02**: don't make `app-allow` require the app
   folder, or update `api-lock-person.test.ts` (it allows `calculator` on a project with no apps).
8. `write_board`'s description was trimmed (the `item` and `list` history, "kept in its history") to
   fit "Kind `app`" under MCP's 2,048-character limit.
9. `validateAct` now says "an app" (was "a <kind>" for every kind).

**Panel protocol** (apps.md; FE_01 implements): `PANEL_METHODS`, `HOST_NOTIFICATIONS`,
`PANEL_ERRORS` (-32000 carries `data.problem`), host context `theme`, `containerDimensions`,
`styles.variables` (`APP_STYLE_VARIABLES`, MCP Apps names mapped to board tokens), `platform`.

**Token**: `--vb-kind-app: light-dark(#0b7fa6, #4ec3e6)`, APCA Lc 71.2 on the light card and 52.3 on
its kind tab, 61.5 and 58.9 dark (label tier 45).

**Gallery**: four `app` samples in `kinds` (ledger 142-145: open, replied, answered by the agent,
later); `gallery-light/dark` screenshots updated after viewing both diffs (only the App column and
the selected app card changed); `gallery.spec.ts`, `review-colours.spec.ts` and
`gallery-fixture.test.ts` count the eighth kind.

**Gates** (one after another): `npm run check` 0; `npm test` 1322 + 7 pass; `npm run verify` 0
warnings; `node scripts/gen-api.mjs --check` current; `npm run build` 0; `npm run test:pages` 478
passed, 2 failed only on the versions banner screenshot (the gallery's latest past version is now
v331, from the new app samples): both diffs viewed (the banner text only), then updated with the two
gallery screenshots.

**Long File Strategy**: four early files were written in one write of over 50 lines (no connection
error); every later long file was created and appended in chunks.

## On Completion

Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-format] BE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_01_contract.md]]`
