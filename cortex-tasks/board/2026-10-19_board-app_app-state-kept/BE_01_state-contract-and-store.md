# BE_01_state-contract-and-store: State contract, route and store

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Define how a panel saves and restores its state — contract first — and build the server's store and
route for it.

## Context

PLAN.md § Key Changes 2. Rules 6 (one source per contract), 7 (one I/O layer, validate every read
and write), 18 (localhost, Origin/Host, JSON only, sanitised ids). **Read previous task notes in
TASK-STATUS.md before starting.**

## Inputs

- **Files to modify / create**: `packages/format/src/apps.ts` (message name constant,
  `APP_LIMITS.stateBytes = 64 * 1024`, `hostContext.state`), schemas under
  `packages/format/schema/` (the panel message params, the route's request / response),
  `packages/format/schema/openapi.json` (the route), the server's I/O and route modules
  (`apps/board/server/` — find where app routes and the I/O layer live: `apps.ts`, `apps/`,
  `reads.ts`, `writes.ts`, `dispatch.ts`, `guard.ts`), `packages/client/src/client.ts` (the page's
  call), generated artifacts (`npm run gen`, `npm run map`), `docs/specification/apps.md`
  (§ The panel protocol, § Host context, the "keep state in a tool" line), `api.md`
- **Patterns to follow**: an existing person-only write route (how the flag or `seen` is written and
  guarded), the image route's path sanitising (`images.ts`), the existing app schemas
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

## Steps

1. [x] **Standard first.** Check the MCP Apps spec the protocol follows (`APP_PROTOCOL_VERSION`,
   the `ext-apps` repo / spec on the web) for a state or widget-state mechanism. Record what you
   found, with the URL, in notes. If one exists, use its names and shape. If not, name a board-own
   request that cannot collide with a future MCP Apps method (state the naming rule in apps.md).
2. [x] **Contract**: the panel request (params `{ state }`, any JSON value up to
   `APP_LIMITS.stateBytes` serialised), its answer, and `hostContext.state` (the last saved value,
   absent when none). The route the page uses to read and write a card's state, naming the card by
   board and number (D-041; the server translates to the identity at its edge). Schemas first, then
   openapi, then constants, then generated files.
3. [x] **Store**: `.visionboard/app-state/<identity>.json`, written atomically (temp file + rename),
   read and written only through the server's I/O layer, validated both ways. Person only: agent
   routes and every agent read never return it. A card that is retired keeps its file (no deletes).
4. [x] **Route guards**: refuse non-JSON, oversize (413-style problem per api.md § Errors), unknown
   board or card, a card that is not an app card, foreign Origin/Host. Problems use the existing
   problem codes / shapes.
5. [x] **Client**: one function in `packages/client` for read and write; nothing else calls the route.
6. [x] **Tests first**: schema tests (valid, oversize, wrong shape), server tests for each guard and
   for round trip, atomic write, agent reads without state (extend `api-flag.test.ts`-style checks),
   openapi test. Docs: apps.md (replace "keep state in a tool" with the save/restore rule; frozen
   panels note is FE_01's), api.md.

## Validation

- [x] `npm test`, `npm run gen -- --check`, `npm run verify` pass
- [x] The research result is recorded with its source

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose, don't edit.
- The maintainer's board on port 4466: never stop, restart or kill it, or any process you didn't
  start. Page tests under the lock: `until mkdir temp/pages.lock 2>/dev/null; do sleep 10; done; …; rmdir temp/pages.lock`.
- Use the Bash tool's working directory rather than `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19

### Research (step 1)
- MCP Apps has **no** state mechanism. `specification/2026-01-26/apps.mdx` and `specification/draft/apps.mdx`
  (https://github.com/modelcontextprotocol/ext-apps) list "State persistence and restoration" under future
  work; no `ui/*` method or `hostContext` field saves or restores view state. Open issue
  https://github.com/modelcontextprotocol/ext-apps/issues/417 ("View state persistence") names no method.
  ChatGPT's `window.openai.setWidgetState` is a host-specific extension, not MCP Apps. Checked 2026-10-19.
- So a board-own request: `vision-board/save-state` (`PANEL_SAVE_STATE`). Naming rule (apps.md § The panel
  protocol): the board's own methods start with `vision-board/`, its `hostInfo.name` (`APP_HOST_NAME`); MCP
  Apps' start `ui/`, MCP's are `tools/call`, `ping`, so none can collide. `ui/notifications/escape` predates it.

### Changes Made
- Contract: `packages/format/schema/app/panel-state.schema.json` (one source: root = the kept file
  `{ v, app, state }`; `$defs` value, save = panel params and PUT body, saved = panel answer `{}`, read = GET
  answer `{ state? }`, written = PUT answer `{ bytes }`). `packages/format/src/apps.ts`: `APP_LIMITS.stateBytes`
  (64 KiB), `APP_HOST_NAME`, `PANEL_SAVE_STATE` (in `PANEL_METHODS` as a request), `APP_STATE_DIR`,
  `APP_STATE_FORMAT`, `AppStateValue`, `AppStateFile`, `appStateBytes`, `appStateProblem` (one size/JSON check
  for server and frame).
- Route: `openapi.json` 1.29.0, `GET|PUT /api/boards/{board}/nodes/{n}/panel-state` = `get_panel_state`,
  `put_panel_state`, `x-agent: false`, `personCookie`. Generated: `operations.generated.ts`, `tools.generated.json`
  (version only), `api-reference.md`.
- Store: `apps/board/server/apps/panel-state.ts` (`PANEL_STATE_HANDLERS`, `readPanelState`), wired in
  `apps/routes.ts` `APP_HANDLERS`. Card by board number -> identity (`cardOn`), file `.visionboard/app-state/<identity>.json`;
  write validated (schema + `appStateProblem`) then atomic; read validated (O_NOFOLLOW, size, schema, size) and
  only for the app the card names now; folder must be real and inside `.visionboard` (no link out).
- New `apps/board/server/atomic-file.ts` `writeFileAtomic`: promoted the four identical temp+rename copies
  (`agents.ts`, `chat-index.ts`, `recent.ts`, `lock.ts`) to it (rule 1), behaviour unchanged.
- Page I/O: `apps/board/src/board/io.ts` `panelState(board, n)`, `savePanelState(board, n, state)` over
  `packages/client` (the client is generic `call(id)`; the page's per-operation functions live in io.ts, like
  `callAppTool`).
- Tests: `apps/board/tests/api-panel-state.test.ts` (8+1: round trip by identity, person only and agent reads
  unchanged, limit + 413/422/415/400, unknown board/card/not-app/bad n, removed card keeps file, another app
  gets nothing, bad file/link/folder out, foreign Origin/Host, flag off, openapi security);
  `atomic-file.test.ts`; `schema-apps.test.ts` (panel state schema + numbers); `packages/format/tests/apps.test.ts`
  (`appStateProblem`, naming rule); `route-table.test.ts`, `openapi.test.ts` (version), `api-harness.ts` PERSON_OPS.
- Docs: apps.md (sources, the panel paragraph's last sentence, protocol step 4 + naming rule, Panel-to-board row,
  Host context `state`, Errors -32602, Limits `stateBytes`, new § Saving the panel's state, Kept true by);
  api.md (operations rows, too-large row, point 157, frontmatter).

### Issues & Resolutions
- Until FE_02 wires the bridge, `app-frame-core.ts` routes `vision-board/save-state` into its `tools/call`
  branch (answers -32602 "tools/call needs the name of a tool"). FE_02 must handle it (and may use
  `APP_HOST_NAME` for `hostInfo.name`).
- `io.ts` is now 302 lines (verify warns over 300).
- A body over 2 x `stateBytes` gets body.ts's generic too-large words ("Split the items...").

### Deviations from Plan
- Client functions are in the page's I/O layer `io.ts` (over `packages/client`), not in `packages/client`
  itself, which has no per-operation functions.
- `hostContext.state` kept as planned; note it is not prefixed, so a future MCP Apps `hostContext.state` with a
  different meaning would collide (the method name can't). Maintainer may prefer a namespaced key.
- Extra beyond plan: the kept file records the app id, so a card redrawn with another app does not get the old
  app's state; operations named `get_panel_state` / `put_panel_state` (not "app state", which already means
  `list_apps` states); locked/archived boards still take a save (person's own value).

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and your notes section in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append **one** line to `cortex/LOG.md` (ending in a newline):
   `[[YYYY-MM-DD HH:MM]] [board-format] BE_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/BE_01_state-contract-and-store.md]]`
