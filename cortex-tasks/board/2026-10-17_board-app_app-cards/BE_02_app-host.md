# BE_02_app-host: App host: manifest, process supervisor, routes, panel CSP

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the board's server host app plugins safely: read and check each app folder, serve its panel
under a strict CSP, and run its tools in a limited, supervised process per app.

## Context

PLAN.md rulings 2, 4, 6-12 and the Risks table. BE_01 has landed: read its notes, `apps.md`, the
manifest schema and the stub handlers you replace. Node here is 22.14; `--permission` with
`--allow-fs-read` is accepted (checked on 2026-10-17).

## Inputs

- **Files to create** (one job per file, about 300 lines each, folder with a public file — rule 3 of
  the architecture skill): `apps/board/server/apps.ts` (the only import other server files use) and
  `apps/board/server/apps/`:
  - `manifest.ts` — read `app.json`, validate with ajv on BE_01's schema (compile once, as
    `server/schema.ts`), resolve file names inside the folder (reject anything that leaves it).
  - `state.ts` — `appState(project, id, allowed)` → `missing | invalid | needs-approval | ready |
    broken`, with problems and tool names: **the one state function** (ruling 11).
  - `hash.ts` — SHA-256 of manifest + tools file.
  - `env.ts` — read the project's `.env` once per call site (no dependency: a small parser for
    `KEY=value` lines, quotes, comments), return only declared keys.
  - `supervisor.ts` — one process per app: start on first call, IPC request/response with ids,
    timeout → kill, crash → restart with back-off, broken after too many, idle stop, stop on hash
    change, stop all on server close and on `open_project` (project switch).
  - `runner.mjs` — the child: loads the tools module, checks its shape, answers `{id, tool, input}`
    with `{id, result}` or `{id, error}`, aborts `ctx.signal` on a cancel message, never throws out.
  - `routes.ts` — the handlers `list_apps` and `call_app_tool` (replace BE_01's stubs in
    `handlers.ts`), and `servePanel(res, id)` for the panel route.
- **Files to modify**: `apps/board/server/app.ts` (route `GET /app-panels/<id>` before static; its
  headers from ruling 4; add `frame-src 'self'` to `SECURITY_HEADERS`), `handlers.ts`,
  `project.ts` / server close (stop all app processes), `apps/board/README.md`.
- **Tests**: `apps/board/tests/fixtures/apps/` — `good` (two tools, one echoes `ctx.env`),
  `panel-only`, `invalid-manifest`, `loop` (never returns), `crash` (exits), `fs-write` (tries
  `writeFile` and `child_process.spawn`), `big-output`, `bad-input` (schema-checked); unit tests per
  module; API tests (`apps/board/tests/api-apps.test.ts`) through the real server on a temp project.
- **Patterns to follow**: `server/static.ts` `resolveStatic` (paths stay inside a root),
  `server/schema.ts` (ajv compile once), `server/problem.ts` (problems), `server/lock.ts`
  (beats and cleanup), `callers.ts` (who may call: `list_apps` agent or person; `call_app_tool` person).
- **Shared artifacts to reuse**: BE_01's `AppManifest`, `APP_ID`, `APP_SIZE`, `APP_LIMITS`, schemas, problem codes.
- **Skills**: `cortex-architecture` · `cortex-docs` (apps.md must match what you build).

## Steps

1. [x] **Tests first**, each seen failing: PLAN.md § Goal state 4c-4i at the API level (approval and
   re-approval by hash; loop → `app-timeout` then the next call works; crash → restart, 3 in 60 s →
   `broken`; fs write and spawn refused inside the tool; env holds only declared keys; id and file
   name tricks refused, including `%2e%2e` and upper case; output cap; input schema), plus the panel
   route's headers (exact CSP; declared domains added; undeclared absent; `sandbox` directive
   present; 404 for missing, invalid or flag-off), `list_apps` (every state; problems for an invalid
   manifest; agent and person may read; wrong folder → `wrong-folder` like other agent reads), and
   the page CSP now carries `frame-src 'self'`.
2. [x] Build the modules in this order (limits come from BE_01's `APP_LIMITS`): manifest, hash, env, state, runner, supervisor,
   routes, app.ts wiring.
3. [x] Resilience checks by test: the server keeps answering other routes while an app loops; a
   project switch (`open_project`) stops the old project's app processes; server close leaves no
   child process (assert by pid).
4. [x] Update `apps.md` if anything you built differs from what BE_01 wrote (the code wins only if it
   follows the rulings; say so in your notes). `apps/board/README.md` names the folder.
5. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`. **Not** `npm run test:pages`: FE_01 and T_01
   run beside you in wave 2, and page tests run one at a time; the orchestrator runs them after the
   wave.

## Validation

- [x] All gates exit 0; every safety test above exists, is named in your notes, and passes.
- [x] `ps` after the test run shows no stray runner process.

## Constraints

- No new dependency. No git commits. Only `.visionboard/apps/*` of a temp project is ever read in
  tests; never this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** Front door `apps/board/server/apps.ts`; the host in `apps/board/server/apps/`:
`manifest.ts` (`readApp`, `appIds`: id checked before any path, schema via `schema.ts`, plain file
names, real paths inside the folder, `fileBytes` cap), `hash.ts` (`appHash`), `env.ts` (`parseEnv`,
`readEnv`), `state.ts` (`appState`, the one state function), `runner.mjs` (the child: a
`module.registerHooks` resolve hook refuses every import but Node's built-ins, so the tools module is
one file), `child.ts` (`startChild`: `fork` with `--permission --allow-fs-read=<app folder>
--allow-fs-read=<runner> --max-old-space-size`, cwd the app folder, env only the declared keys, IPC by
id, load timeout, stderr tail), `tool-checks.ts` (`checkTools`, `checkInput`, `resultOf`),
`supervisor.ts` (`createSupervisor`: in flight, line, `app-busy`, timeout kill, crash back-off,
`broken` per hash, idle stop, stop on change, close), `host.ts` (`createAppHost`: per open folder,
`list`, `status`, `call`; Stop app stops the process at once), `panel.ts` (`PANEL_CSP`, `panelCsp`,
`servePanel`), `routes.ts` (`APP_HANDLERS`, replacing BE_01's stubs). Wiring: `app.ts` (route
`/app-panels/<id>` before static, `frame-src 'self'`, options `flags` and `appLimits`), `dispatch.ts`
(`Ctx.apps`), `project.ts` (`OpenFolder.apps()`, closed on a switch and on server close),
`handlers.ts`, `server.ts` (`VB_FLAGS`), `schema.ts` (`foreignSchemas`; `plainProblems` takes its
`anyOf` words). Test apps in `apps/board/tests/fixtures/apps/` (good, panel-only, invalid-manifest,
loop, crash, fs-write, big-output, bad-input, slow-load, imports); support `tests/app-support.ts`;
harness `startBoard({ flags, appLimits })`.

**Safety tests** (each seen failing first: the API ones against BE_01's stubs, the later ones by
taking their code out): `api-apps.test.ts` "4c: no tool runs before Allow…", "4d: a tool that never
returns…", "4e: a crash restarts…", "4f: the tool can read its own folder, and nothing else…", "4g:
the tool's env holds only the declared keys…", "4h: an app id with upper case, a slash or dots…",
"4i: arguments that don't fit inputSchema…", "one file: a tools module that imports another file…",
"list_apps: every folder…" (every state, agent and person), "…another folder is refused" (wrong
folder); `app-folder.test.ts` "4h: manifest file names…", "a file or the folder itself linking
outside is refused", state order, hash, `.env`, lenient tool schemas; `app-panel.test.ts` exact CSP,
declared domains only, `sandbox`, 404s (missing, invalid, id tricks, flag off), `frame-src 'self'`,
flag-off `call_app_tool`; `app-host.test.ts` busy line, idle stop, folder switch, server close (by
pid), Stop app, memory limit, a given-up call aborts `ctx.signal`. The memory test was not run
without its limit (it would use the machine's memory).

**Deviations, all inside the rulings:**
1. `list_apps` `tools` is known only once the person allowed this version and its tools first ran:
   learning a module's tools means loading it, and ruling 7 runs nothing before Allow (ruling 8: not
   before the first call). Before that `tools` is `[]`; a module that doesn't load shows as `invalid`
   with its problem once it has been tried. The schema description, apps.md and api.md 152 say so.
   FE_02 and T_02 must not expect tool names before approval.
2. Files beyond the task's list, one job each: `child.ts`, `tool-checks.ts`, `host.ts`, `panel.ts`.
3. `APP_LIMITS` gains `restartMs` (250 ms, doubling per crash in the window) and `fileBytes` (1 MiB
   per app file); apps.md § Limits has both rows (its test compares).
4. The server needs its own flag for "off" (the page's flags are per viewer): `createBoardServer({
   flags })`, read from `VB_FLAGS` in `server.ts` (same words as `?flags=`). FE_02's page tests can
   start a server with `VB_FLAGS=-appCards`.
5. At the time limit the whole process is killed at once (ruling 8), so `ctx.signal` is useful when
   the page gives up a call (the request closes); apps.md says that.
6. App tool schemas compile with a fresh, non-strict ajv per load (no `$id` clashes; unknown words
   ignored; a top-level `$schema` not read; `$ref` only inside), in `schema.ts`, still the one module
   that imports ajv.
7. A module that fails to load, or doesn't finish within `callMs`, is `invalid` until its code
   changes; a crash while loading counts as a crash.

**Known limits** (not fixed; outside this task): ajv runs an app's `pattern`s in the board's process,
so a pathological pattern in an allowed app's schema could stall the board (checking input in the
child would need ajv readable there); the one-file rule stops imports, not a tool that reads a data
file in its folder and evaluates it with `node:vm`; if the board process is killed with SIGKILL while
a tool loops, that child is left running (others exit on disconnect). `%2e%2e` in a path is resolved
away by URL parsing before routing, so it never reaches app code (tests assert 404 or no panel).

**Gates** (one after another; `npm run build` and `test:pages` not run, per the orchestrator for this
wave): `npm run check` 0; `npm test` 1417 + 7 pass; `npm run verify` 0 warnings (after `npm run map`:
the only map change is FE_01's `packages/ui` exports); `node scripts/gen-api.mjs --check` current
(after `npm run gen` for the `tools` description). `ps` shows no runner process after the runs.

**Long File Strategy**: `tests/app-support.ts` and `tests/app-panel.test.ts` were each written in one
write of over 50 lines (no connection error); every other long file was created and appended in chunks.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-security] BE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_02_app-host.md]]`
