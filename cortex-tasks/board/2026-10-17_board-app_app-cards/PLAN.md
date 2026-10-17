# App cards: agent-built apps that run inside a card - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Created**: 2026-10-17 · **Branch**: `feat/app-cards` (created; every commit of this set goes there)
> **From**: maintainer, 2026-10-16/17 (chat 223-232 and the hand-over message): "a node that can
> basically be an iframe where you can draw MCP apps … the agent can own the code in the node and
> they can own the code that is attached to an MCP server … add tools … API calls to a different
> system … we own the MCP server … build an example plugin and an example UI component that is
> using that MCP … scalable, robust, resilient, modular." · **Go**: given in full, maintainer
> unavailable during the run ("I won't be approving anything beyond here"). The rulings below are
> therefore the maintainer's and binding; the executor does not ask, it follows them.
> **Run mode**: autonomous under `/goal` with `cortex-task-exe`. The done-state is § Goal state.

---

## Problem Statement

Agents and the person design something on the board, then say "go build it". Today the result can
only come back as text on cards. We want the agent to build a small working app (its controls and
its backend) and show it **inside a card**, where the person can use it, with the board owning the
card, the safety rules and the server, and the agent owning the app's code.

---

## Current State

(From a full code map, 2026-10-17; paths and symbols checked.)

- **Kinds** are listed in `packages/format/src/view.ts` `KINDS` (7), `packages/format/src/ledger.ts`
  (`NodeBody`, `LEDGER_FORMAT = 16`, `LEDGER_FORMATS`, `NODE_SIZES`), `packages/format/src/node-types.ts`
  `NODE_TYPES` (`asks()`/`tells()`), `packages/format/schema/common.schema.json` `$defs.kind`,
  `schema/events/node.schema.json` `$defs.body` (closed), `schema/api/view.schema.json`, the hand twin
  `packages/format/src/ledger-shape.ts` `NODE`, `validate.ts` `validateView`, and compiler-keyed UI
  tables (`packages/ui/src/node/node-icons.ts` `KIND_ICON`, `--vb-kind-<kind>` tokens).
  `board-view.ts` `viewNode()` spreads the node body, so a new body field reaches the View once
  `ViewNode` and `view.schema.json` declare it.
- **Ledger bump pattern**: `docs/specification/api.md` § "Ledger v16" (point 141) and commit `bc5c3ff`
  (every `schema/ledger/16/` `$id`/`$ref`, `stamp.v.enum`, `apps/board/server/schema.ts`
  `LEDGER_EVENT_ID`, `apps/board/tests/openapi.test.ts`, `schema.test.ts`, `route-table.test.ts`,
  `packages/format/README.md`, regenerated files).
- **Contract chain**: JSON Schema → `packages/format/schema/openapi.json` (OpenAPI 3.2, `info.version`
  1.26.0, 29 operations, `x-agent`) → `npm run gen` (`scripts/gen-api.mjs`: `operations.generated.ts`,
  `packages/cli/src/commands.generated.ts`, `packages/mcp/src/tools.generated.json`,
  `docs/specification/api-reference.md`) → drift tests (`openapi.test.ts`, `route-table.test.ts`
  auth map, `schema.test.ts`, `packages/mcp/tests/tools.test.ts`, `packages/cli/tests/commands.test.ts`,
  `apps/board/tests/contract-walk.ts`). Adding an operation: api.md point 57; handlers are
  `apps/board/server/handlers.ts` `Record<OperationId, Handler>`.
- **Server**: `apps/board/server/app.ts` `createBoardServer` (security headers `SECURITY_HEADERS`,
  CSP `default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
  base-uri 'none'`, no `frame-src`), `guard.ts` (Host/Origin), `dispatch.ts` (`ROUTES` from
  `OPERATIONS`), `body.ts` (JSON only, limits), `static.ts` (`resolveStatic`, extension allowlist),
  `callers.ts` (`vb_person` cookie, `Path=/api`; agent Bearer), `ledger.ts`, `lock.ts`, `project.ts`.
  The server reads only fixed files under `<project>/.visionboard/`.
- **MCP**: `packages/mcp` is stdio only and proxies every tool to the board's HTTP API via
  `packages/client` (`createClient(...).call`). Tools are generated (`tools.generated.json`); the
  server's capabilities are `{tools:{}}`.
- **Page**: `packages/ui/src/node/vb-node.ts` / `node-template.ts` (`nodeTemplate`) / `node-core.ts`;
  cards are measured by the page (`apps/board/src/board/cards.ts`) and laid out by the pure
  `packages/layout` from measured sizes; widths come from `data-size` (D-030) and `sizeTier`
  (`packages/layout/src/size.ts`); off-screen cards are cheap (`offscreen.ts`). Markdown never
  renders HTML (D-023). Gallery: `apps/board/src/gallery/` (`main.ts` `SAMPLES`, `node-section.ts`,
  `gallery.ledger.jsonl`), checked by `apps/board/tests/gallery-fixture.test.ts` and
  `tests/pages/gallery.spec.ts` (hard-codes `ASKS`/`TELLS`).
- **Registries**: `packages/actions/src/references.ts` `REFERENCES` (`REFERENCE_KINDS`),
  `conditions.ts` `CONDITIONS` (`CONDITION_KINDS`), `registry.ts` `ACTIONS`, `permissions.ts`
  `PERMISSIONS`. Flags: `packages/format/src/flags.ts` `FLAGS`.
- **Checks**: `scripts/verify.mjs` (`LAYERS` per D-016, front doors, 300/500 lines, exact versions +
  `docs/specification/dependencies.md`, `modules.md` current, page weight 150 KB gzip).
- **Nothing exists** yet for iframes, sandboxing, `postMessage`, `ui://`, MCP Apps or plugins
  (only `packages/ui/tests/markdown-adversarial.ts` asserts Markdown never emits `<iframe`).
- **MCP Apps** (spec `modelcontextprotocol/ext-apps`, `specification/2026-01-26/apps.mdx`): the host
  draws the app's HTML in a sandboxed iframe; a web host must isolate it on another origin; the panel
  speaks JSON-RPC 2.0 over `postMessage` (`ui/initialize`, `ui/notifications/initialized`,
  `tools/call`, …); default CSP `connect-src 'none'`, widened only by the server's declared
  `_meta.ui.csp.connectDomains` / `resourceDomains`. The Uplynk plugin plans "Vision Board renders
  plugin panels as nodes" (`uplynk-plugin/docs/vision.md`, roadmap item 7).
- **Node here is 22.14** (`node --version`); `--permission` with `--allow-fs-read` works (checked).
  The steering file says 24.14 on the maintainer's other machine. Both support it.

---

## Rulings (maintainer's go; binding, do not reopen)

**The model**

1. **Who owns what.** The board owns the card, the frame it draws, the app host (the board's own
   server), the rules and the approvals. The agent owns everything inside an app's folder: the panel
   (its HTML, CSS and script) and the app's tools (its backend code), and may add, change or remove
   tools whenever it likes. The board never writes inside an app folder.
2. **Where apps live.** In the open project's `.visionboard/apps/<app-id>/` (one folder per app,
   `<app-id>` matching the existing id pattern `^[a-z0-9][a-z0-9-]{0,63}$`). Each folder holds:
   - `app.json` — the manifest: `id`, `title`, `version`, `panel` (file name, default `panel.html`),
     optional `tools` (file name, default `tools.mjs`; absent = a panel-only app), optional `size`
     `{w, h}` default, optional `env` (names of keys the tools may read), optional `csp`
     `{connectDomains, resourceDomains}` for the panel (MCP Apps field names).
   - the panel file: one self-contained HTML document (inline script and style allowed inside it).
   - the tools file: an ES module whose default export is `{ tools: Tool[] }`, each
     `{ name, description, inputSchema, outputSchema?, run(input, ctx) }` (MCP tool shape plus `run`).
     `ctx` gives `env` (only the declared keys) and `signal` (aborted on timeout). The exact contract
     is written once in `docs/specification/apps.md` (BE_01) and the manifest is a JSON Schema in
     `packages/format/schema/` (contract first, rule 6).
3. **A new card kind `app`.** A node with `kind: "app"` carries `app: { id, w?, h? }`: which app, and
   the panel size the **agent** defines (px; default from the manifest's `size`, else 360×320). Limits
   are one table in `packages/format` (`APP_SIZE`: `w` 280-960, `h` 120-800); the schema and the page
   both read it. The card's width is the panel's `w` plus the card's own padding; the person's S/M/L
   size act does not apply to app cards (the size control is hidden on them). `app` **tells** (no ✓/✗):
   it offers a note and Later, carries a number, and shows no status word (D-045/D-046 unchanged).
4. **The panel runs in a sandboxed frame, isolated from the board.** The page draws an `<iframe>`
   with `sandbox="allow-scripts"` (never `allow-same-origin`, `allow-top-navigation`, `allow-popups`
   or `allow-forms`), `src` = the board server's panel route `/app-panels/<app-id>` (outside `/api`),
   a `title` naming the app, and the panel's size. Without `allow-same-origin` the panel has an
   opaque origin: it cannot read the board's DOM, cookies or storage, nor call `/api`. The panel route
   answers with its own headers: `Content-Security-Policy: sandbox allow-scripts; default-src 'none';
   script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:;
   connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'`, with
   `connect-src`, `img-src`, `font-src` and `style-src` widened only by the manifest's `csp` domains
   (https only, exact hosts, no wildcards). The board page's own CSP gains `frame-src 'self'`.
   This meets the MCP Apps isolation goal (another origin) without a second proxy frame; D-047 says so.
5. **The panel talks only by messages, in MCP Apps' shape.** JSON-RPC 2.0 over `postMessage`:
   the panel sends `ui/initialize`; the board answers with host context (`theme` light|dark, the
   panel's `size`, a small set of resolved design-token colours and font so the panel can match the
   board); the panel sends `ui/notifications/initialized`; then `tools/call {name, arguments}` and
   gets the tool's result. The page accepts a message only when `event.source` is that card's frame
   (origin is `"null"`), validates every message, and answers unknown methods with a JSON-RPC error.
   A panel written for this works in an MCP Apps host with an adapter later (out of scope here).
6. **Tool calls go through the board's server, never straight to the app.** The page forwards a
   panel's `tools/call` to a new person operation `call_app_tool` (`POST /api/apps/{app}/calls`,
   person cookie, JSON only) through the page's one I/O layer. The server validates the input against
   the tool's `inputSchema` (ajv, as everywhere), runs the tool in the app's process, validates the
   output against `outputSchema` when given, and answers. Errors are problem codes (new codes in the
   api.md Errors table: `needs-approval`, `app-not-found`, `app-invalid`, `app-failed`,
   `app-timeout`; reuse existing codes where one fits).

**Safety and resilience**

7. **Approve once, per version of the code.** A panel-only app needs no approval. An app with tools
   runs nothing until the person presses **Allow** on its card. Allow is a person act `app-allow
   {app, hash}`, where `hash` is the SHA-256 of the manifest plus the tools file; `app-revoke {app}`
   takes it back. When the agent changes either file the hash changes and the card asks again
   ("The app's code changed · Allow"). Both acts are in the action registry (`needsConfirmation`,
   person only; agents can never allow, rule 8) and the ledger (ledger v17).
8. **Each app runs in its own process, under limits.** The host (`apps/board/server/apps/`) starts an
   app's process on its first call (`child_process.fork` of one runner module), never at board start:
   Node `--permission` with `--allow-fs-read` for the app folder and the runner only (no fs write, no
   child processes, no workers, no addons), `--max-old-space-size=128`, `cwd` = the app folder, an
   `env` holding only the manifest's declared keys read from the project's `.env` (rule 19; nothing
   else from the board's environment). Network access stays open: the app's own code may call other
   systems (that is the point); the board itself makes no third-party call (rule 18; D-047 records
   this). Per call: 10 s timeout (the process is killed and restarted on the next call), output cap
   256 KiB, at most 4 calls in flight per app (more queue, then `too-large`/busy problem). A crash
   restarts on the next call with back-off; 3 crashes in 60 s mark the app broken until its code
   changes. An idle process stops after 5 minutes. A changed hash stops the old process. All numbers
   are one table, `APP_LIMITS` in `packages/format/src/apps.ts` (BE_01), which the host and the
   page's frame both import.
9. **Nothing from a request reaches a path unchecked.** `<app-id>` is checked against the id pattern
   before any path is built; manifest file names are plain names inside the app folder (no `/`,
   `..` or absolute paths); every resolved path must stay inside the app folder (as `resolveStatic`).
   Only `.visionboard/apps/*` is ever read for apps.
10. **The board stays usable when an app is not.** Every app card state is drawn, never a blank or a
    thrown error: loading; panel ready; tools need approval (the panel shows, calls answer
    `needs-approval`, the card shows Allow); code changed (Allow again); app missing (the card says
    "App <id> not found"); manifest invalid (the problems, for the agent to fix); app broken
    (crashed too often; "Restart" retries after the code changes); far zoom or off screen (a light
    placeholder with the app's title, no frame); past version (placeholder, read-only, no frame).

**Fit with the board**

11. **Registries, not local checks.** A reference row `app` (card → app; an app card whose app is gone
    is an orphan that says why, re-adding the folder heals it). The app's state (missing, invalid,
    needs-approval, ready, broken) is computed fresh by **one** function in the host and served by
    `list_apps`; the page and agents read that, never their own copy.
12. **Agents can see and check apps.** A new read `list_apps` (`GET /api/apps`, `x-agent: true`,
    agent secret or person cookie): every app folder with id, title, state, manifest problems, tool
    names, hash and whether the current hash is allowed. Agents use it to see their manifest errors
    and whether the person has allowed the app; it becomes an MCP tool and a `vb` command by
    generation. Agents do **not** call app tools through the board (they can run their own code
    directly); only the person's panel calls them.
13. **Behind a flag.** `appCards` in `packages/format/src/flags.ts`, **on** by default (rule 12). Off: an
    app card draws as a plain card saying "App cards are off", and the panel route and
    `call_app_tool` answer `not-found`.
14. **Performance (rule 15).** A frame is created only when its card is on screen and the zoom is at
    or above `FAR_K`; it is removed when the card leaves the screen for good (the panel restarts when
    it comes back). No app code is in the page bundle; the page-weight budget holds.
15. **Accessibility (rule 5).** The frame has a `title`; the card stays keyboard reachable; Tab moves
    into and out of the panel; Esc inside the panel returns focus to the card (the board handles it
    from the frame's message `ui/notifications/escape`, documented). Axe passes light and dark on every
    app card state. The example panel is accessible on its own (labels, roles, contrast).
16. **The example.** One example app ships with the skill: `skills/vision-board/examples/apps/calculator/`
    (`app.json`, `panel.html`, `tools.mjs`). The panel is a calculator (digits, + − × ÷, parentheses,
    `%`, `=`, clear, keyboard input) styled from the host context's tokens in light and dark. Its
    `=` sends `tools/call evaluate {expression}` and the plugin computes the result with a small
    **safe parser** (no `eval`, no `Function`, length and depth limits, clear errors for bad input).
    A second tool `history` returns the last calculations of this process (shows state kept in the
    plugin). This repo's own board gets a copy at `.visionboard/apps/calculator/` and one app card,
    so the maintainer sees it on return: drawn through the API by a server on a spare port with
    `VB_PROJECT` = this repo, only if no live server holds this repo's `.visionboard/lock` (never
    port 4466); otherwise TASK-STATUS.md says how to draw it in one line. Tests copy the example into a temp project; there is one
    source of the example's code (the skill folder).
17. **The skill teaches it** (rule 17): skill v3.8 explains when to build an app, the folder, the
    manifest, the panel protocol, the tools module, sizes, approval, `list_apps`, and drawing the
    `app` card; points at the example. Scenarios with Claude Code and Kiro prove an agent can build a
    new small app from the skill alone.
18. **D-047** is appended (BE_01) with the text in § D-047 below, status Accepted (maintainer's go).

Notes on the rulings: the board posts to a panel with `frame.contentWindow.postMessage(msg, '*')`
(an opaque origin cannot be named as a target; the message carries no secret and goes to the window
the board holds). The host context's token values are read from the page's computed styles, so the
panel follows the board's light/dark switch (a `ui/notifications/host-context-changed` message on a
theme change).

### D-047 (append verbatim to `docs/decisions.md`; BE_01)

```
## D-047 App cards: agent-built apps in a sandboxed frame, hosted by the board
- **Date**: 2026-10-17 · **Status**: Accepted · **From**: maintainer (chat 223-232; go to plan and
  build without further review)
- **Decision**: A new card kind `app` shows an agent-built app inside the card. The app lives in the
  project's `.visionboard/apps/<id>/` (manifest, panel, optional tools module) and the agent owns it;
  the board owns the card, the host and the rules. The panel runs in a sandboxed frame with an opaque
  origin and its own strict CSP, talks to the board only by JSON-RPC messages in MCP Apps' shape, and
  calls the app's tools through the board's server, which runs each app's tools in its own
  permission-limited process with timeouts, limits and restarts. Tools run only after the person
  allows that version of the code. The app's own code may reach the network; the board itself makes
  no third-party call (rule 18).
- **Why**: the person and the agent design on the board; the agent can now build the thing and the
  person can use it in place, without giving agent code any reach into the board.
- **Rejected**: raw HTML in a card (D-023 stays: Markdown never renders HTML); a second proxy frame
  on another port (an opaque-origin sandbox gives the same isolation on one server); the board
  starting servers the agent wrote (the board hosts plugin modules instead).
- **Task**: cortex-tasks/board/2026-10-17_board-app_app-cards/PLAN.md
```

---

## Goal state (the `/goal` done-condition; the orchestrator checks every line)

The set is done only when **all** of these hold, each checked by running or reading, not assumed:

1. **Tasks**: every row in TASK-STATUS.md is `Completed` (including any FIX_NN rows the run added),
   the frontmatter is `status: completed` with today's date, and no row is `Blocked`.
2. **Gates**: one sequential run on `feat/app-cards` after the last change, each exit code 0:
   `npm run check`, `npm test` (with `test:timing`), `npm run verify` (0 warnings), `node scripts/gen-api.mjs --check` (no difference),
   `npm run build`, `npm run test:pages`. Paste the counts into
   TASK-STATUS.md § Goal check.
3. **End to end, proven by a page test** (`tests/pages/app-cards.spec.ts`), on a temp project holding
   a copy of the example: an agent joins and draws an `app` card for `calculator` with `w: 360,
   h: 440` → the card shows the panel at that size → the panel shows "needs approval" for tools →
   the person presses Allow → the person types `12*3=` in the panel → the panel shows `36`, computed by
   the plugin's `evaluate` tool (the test asserts the server call happened) → `history` lists it.
   Light and dark, axe clean, no console errors, no failed requests.
4. **Safety, proven by tests** (unit or API or page, each named in TASK-STATUS.md):
   (a) the panel cannot read the board's cookie, DOM or `/api` (opaque origin);
   (b) a panel `fetch` to a domain the manifest did not declare is blocked;
   (c) a tool call before Allow answers `needs-approval`; after a change to `tools.mjs` it answers
   `needs-approval` again;
   (d) a tool that loops forever times out, the process is killed, and the next call works;
   (e) a tool that crashes is restarted; 3 crashes in 60 s mark the app broken;
   (f) a tool that tries to write a file or start a process is refused by the permission model;
   (g) the tool's `env` holds only the declared keys;
   (h) app ids with `..`, `/`, `%2e` or upper case, and manifest file names with paths, are refused;
   (i) output over the cap, and input that fails `inputSchema`, are refused with problem codes;
   (j) messages from any window other than the card's frame are ignored.
5. **Contract**: ledger v17 (kind `app`, node field `app`, acts `app-allow`/`app-revoke`); manifest
   JSON Schema; OpenAPI bumped to 1.27.0 with `list_apps` (x-agent) and `call_app_tool` (person);
   generated MCP tool `list_apps` and `vb list-apps` exist; every drift test green.
6. **Card states**: each state in ruling 10 has a gallery sample and a page test (light and dark, axe).
7. **Docs**: D-047 appended; `docs/specification/apps.md` (the app contract: folder, manifest,
   panel protocol, tools module, limits, states); `api.md` section "Ledger v17: app cards";
   `components.md` § App card; `packages/format/README.md` format number; all claims match the code.
8. **Example**: `skills/vision-board/examples/apps/calculator/` works as in line 3; this repo's own
   board holds a copy in `.visionboard/apps/calculator/` and one app card drawn through the API (or,
   when a live server held the lock, the one-line instruction in TASK-STATUS.md, per ruling 16).
9. **Skill**: v3.8 released; the app scenario(s) in `scenarios.md` pass with Claude Code and with Kiro
   (each run recorded with the model that ran); an agent built a *new* app (not the calculator) from
   the skill alone in at least one run.
10. **By hand**: VERIFY_01 completed on a scratch board with screenshots looked at; every finding
    inside the rulings fixed (FIX_NN) and re-verified; findings outside the rulings recorded as
    proposed tracker rows in TASK-STATUS.md.
11. **Committed**: every change committed on `feat/app-cards` (orchestrator commits after each wave and
    at the end; sub-agents never commit); `git status` clean apart from files the run never touched;
    one LOG line per task plus the set's line.

---

## Proposed Solution

Contract first, then the server host and the frame pattern side by side, then the page wiring with
the example, then the skill, then a check by hand and a fix loop until § Goal state holds.

### Key Changes (task → what, and the existing pattern each reuses)

1. **BE_01 Contract** (`packages/format`, `packages/actions`, docs): ledger v17 following the v16
   footprint; `KINDS` + `NODE_TYPES.app = tells('App')` + every compiler-keyed table (`KIND_ICON`,
   `--vb-kind-app` token added in `tokens.css` with APCA measured, approved by the go);
   `NodeBody.app` / `ViewNode.app` / schema `$defs.appRef`; `APP_SIZE`; the manifest schema
   `schema/app/manifest.schema.json` and its TS type; acts `app-allow`/`app-revoke` in
   `ACTION_IDS`, `ACTIONS` (registry), `ACT_SCOPES` (references); reference kind `app`; OpenAPI
   operations `list_apps` and `call_app_tool` with request/response schemas and the new problem codes;
   `npm run gen`; every drift test; flag `appCards`; D-047; `docs/specification/apps.md`; api.md
   section. Handlers for the two operations are stubs answering `not-found` until BE_02 (the
   handler table is `Record<OperationId, Handler>`, so they must exist).
2. **BE_02 App host** (`apps/board/server/apps/`, front door `apps/board/server/apps.ts`): manifest
   reader + validation (ajv on BE_01's schema, as `server/schema.ts`), `appState()` (the one state
   function), hash, the supervisor (`APP_LIMITS`, process per app, queue, timeout, restart, back-off,
   idle stop), the runner module (loads the tools module, answers calls over the IPC channel), `.env`
   reader (only declared keys), the `list_apps` and `call_app_tool` handlers, the panel route
   `/app-panels/<id>` in `app.ts` with its CSP (ruling 4), and `frame-src 'self'` added to the
   page's `SECURITY_HEADERS`. Tests with fixture apps under `apps/board/tests/fixtures/apps/`
   (good, panel-only, invalid manifest, loop, crash, fs-write, env, big output, path tricks).
3. **FE_01 Frame pattern** (`packages/ui/src/app-frame/`, framework-free, rule 16): `vb-app-frame`
   element + DOM-free `app-frame-core.ts` (the JSON-RPC protocol: handshake, host context, method
   table, validation, `event.source` check, errors) with an injected `callTool` and `onEscape`;
   `node-template.ts` draws the frame slot for `kind: app` and the state views of ruling 10;
   `app-frame.css` from tokens; `pattern.json`; unit tests of the protocol (fake windows).
4. **T_01 Example app** (`skills/vision-board/examples/apps/calculator/`): manifest, panel (uses the
   protocol exactly as `apps.md` says; tokens from host context), tools (`evaluate` with a safe
   parser + its unit tests, `history`). No board code.
5. **FE_02 Page wiring** (`apps/board/src/board/`): app cards on the board (width from `app.w` via
   CSSOM, no size control), frame creation tied to `offscreen.ts` and `FAR_K`, `callTool` → the page
   I/O layer (`io.ts`) → `call_app_tool`, Allow/Revoke through the action layer (`item-acts`/`act`),
   app state from `list_apps` (refreshed on `watch` lines and after Allow), Esc back to the card,
   theme changes forwarded; gallery section (states, with a gallery panel served from the gallery's
   own fixture project); the end-to-end page test of § Goal state line 3 and the safety page tests
   (4a, 4b, 4j); this repo's own `.visionboard/apps/calculator/` copy and one app card.
6. **T_02 Skill v3.8** (`skills/vision-board/`): the app chapter, scenarios (one: draw the calculator
   card from the example; one: build a new small app, e.g. a unit converter, with a tool), runs with
   Claude Code and Kiro on scratch boards.
7. **VERIFY_01 By hand**, then **FIX_NN** tasks the orchestrator adds for findings inside the rulings,
   until § Goal state holds.

---

## Orchestrator guide (for `cortex-task-exe` under `/goal`)

- Work on branch `feat/app-cards`. Before wave 1: `git switch feat/app-cards` and check the tree is
  clean.
- Run the waves in TASK-STATUS.md order. Dispatch each task with the model column (`strong` = the
  strongest model; `standard` = the cheaper one). Pass PLAN.md, TASK-STATUS.md and the task file.
- **After each wave**: run the gates once yourself, one after another (`npm run check`, `npm test`,
  `npm run verify`, `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages`), record the result in TASK-STATUS.md § Goal check, and commit
  the wave on the branch: `git add -A -- . ':(exclude).visionboard/ledger.jsonl'` then commit
  "App cards: wave N (<task ids>)" ending with the co-author line. Sub-agents never commit.
  (This repo's own `.visionboard/apps/` and its ledger lines from FE_02 are committed at the end, see
  FE_02.)
- A sub-agent's DEVIATION that stays **inside** the rulings (a better file seam, an extra test file):
  accept it, note it, go on. One that would **change** a ruling: do not change the ruling; choose the
  option closest to the rulings, record it in TASK-STATUS.md § Decisions taken during the run with
  the reason, and go on. Never stop to ask: the maintainer is away.
- A BLOCKED task (cannot be done at all, e.g. a tool missing on the machine): record it, finish
  everything else, and leave § Goal state line 1 unmet with the reason written next to it.
- **Fix loop**: after VERIFY_01, for each finding inside the rulings add a row `FIX_NN` (wave after
  VERIFY_01, model `strong`) with a task file in this folder, run it, then run VERIFY_02 (a copy of
  VERIFY_01 limited to the findings and § Goal state lines 3-4). Repeat until no finding is open.
- Finish with § Goal state: tick each line in TASK-STATUS.md § Goal check with its evidence (a
  command and its result, a test name, a file path), set the frontmatter, append the set's LOG line,
  and make the final commit **including** `.visionboard/ledger.jsonl` (it holds FE_02's app card on
  this repo's board and any board use since; the maintainer asked for board activity to be committed).
- Do not merge `feat/app-cards` into `main` and do not push; the maintainer reviews the branch.

---

## Dependencies

- BE_01 first: everything reads its contract (kind, node field, manifest schema, operations, flag,
  reference row, `apps.md`).
- BE_02, FE_01 and T_01 in parallel (wave 2): disjoint files; each reads only BE_01's outputs.
  T_01 follows `apps.md`; it does not need BE_02's code (its own unit tests run the tools directly).
- FE_02 after wave 2: it wires FE_01's element to BE_02's routes and uses T_01's example.
- T_02 after FE_02 (its scenarios need a working board). VERIFY_01 last.
- No new npm packages. Node's built-ins only (`child_process`, `crypto`, `fs`, `path`). ajv is
  already in use.

---

## Out of Scope

- Showing these apps in other MCP Apps hosts (Claude, VS Code), or the board consuming third-party
  MCP servers' `ui://` panels: later adapters on the same message shape.
- Agents calling app tools through the board; the board starting arbitrary servers.
- The person resizing an app card by hand; free-form layout of the panel.
- Images on cards (still after everything else).
- The Uplynk plugin itself.

---

## Risks & Considerations

| Risk | Mitigation |
|---|---|
| Node's permission model differs between 22 and 24 | BE_02 tests (4f) run on this machine's Node; flags kept to ones both accept (`--permission`, `--allow-fs-read`); if a flag is refused, record it and keep process isolation |
| Agent code is untrusted | opaque-origin frame, strict CSP, approval per hash, separate process with fs read-only to its folder, limits, no board env |
| A panel floods messages | the frame core caps messages per second and in-flight calls (from the shared `APP_LIMITS`) |
| Many app cards on a big board | frames only on screen and near zoom; processes start lazily and stop when idle |
| Ledger v17 breaks old readers | additive only, v2-v16 stay valid (the v16 pattern) |
| A file over 300 lines | split along a seam (`apps/` folder with a public `apps.ts`), never squeeze |
| Screenshots churn | every diff viewed light and dark before updating, as in previous sets |

---

## References

- `docs/decisions.md` D-015, D-016, D-023, D-026, D-028, D-029, D-030, D-032, D-033, D-040, D-045, D-046
- `docs/specification/api.md` § Ledger v16 (point 141), § Adding an operation (point 57), § Drift tests
- `docs/specification/components.md` § The node-type registry (D-015), § Node size, § Feature flags
- `.kiro/steering/vision-board-proj.md` rules 1-20
- `.claude/skills/cortex-architecture/SKILL.md` and `references/contracts.md`, `references/registries.md`
- MCP Apps spec: `https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx`
- Uplynk plugin: `~/Dropbox (Personal)/Developer/web-apps/uplynk-plugin/docs/vision.md`
- Previous sets for style: `cortex-tasks/board/2026-10-15_board-actions_answer-model/`,
  `cortex-tasks/board/2026-10-15_board-ui_review-polish/`
