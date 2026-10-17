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

1. [ ] **Tests first**: schema cases (a valid v17 `app` node; `app` missing on an app node; `app` on
   another kind; size outside `APP_SIZE`; bad app id; the two acts valid and invalid), the manifest
   schema (valid; unknown field; file names with `/` or `..`; csp domains not https or wildcard),
   operations in the route table and api.md table, generated MCP tool `list_apps`, CLI `list-apps`.
2. [ ] Format and schemas, then `npm run gen` and `npm run map`.
3. [ ] Actions: registry, references, the fold of allowed hashes (unit tests: allow, revoke, a new
   hash replaces the old, retire of the card keeps the app's allow).
4. [ ] `apps.md` — the agent-facing and builder-facing contract, written once, from the rulings:
   folder, manifest fields (point to the schema), panel protocol (every message: method, params,
   result, errors; host context fields; escape; theme change), tools module shape (`run(input, ctx)`,
   `ctx.env`, `ctx.signal`, what errors look like), limits (`APP_SIZE`, `APP_LIMITS`), approval, states (ruling 10), the panel CSP, and a minimal example.
5. [ ] D-047 appended; api.md section; components.md row; README.
6. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0 (screenshots
   that change only because the gallery gained the `app` node: view each diff, then update).

## Validation

- [ ] All gates exit 0; every new test was seen failing first.
- [ ] `grep "^## D-047" docs/decisions.md` finds the entry; `apps.md` covers every bullet of step 4.

## Constraints

- If deviation is needed, follow TASK-STATUS.md instruction 5. No PII in examples. No git commits.
- Fill Implementation Notes; update your row and section in TASK-STATUS.md (name every new symbol in
  Shared Foundations if it differs from the table).

## Implementation Notes

**Status**: Pending

## On Completion

Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-format] BE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_01_contract.md]]`
