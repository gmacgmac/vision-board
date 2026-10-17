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

1. [ ] **Tests first**, each seen failing: PLAN.md § Goal state 4c-4i at the API level (approval and
   re-approval by hash; loop → `app-timeout` then the next call works; crash → restart, 3 in 60 s →
   `broken`; fs write and spawn refused inside the tool; env holds only declared keys; id and file
   name tricks refused, including `%2e%2e` and upper case; output cap; input schema), plus the panel
   route's headers (exact CSP; declared domains added; undeclared absent; `sandbox` directive
   present; 404 for missing, invalid or flag-off), `list_apps` (every state; problems for an invalid
   manifest; agent and person may read; wrong folder → `wrong-folder` like other agent reads), and
   the page CSP now carries `frame-src 'self'`.
2. [ ] Build the modules in this order (limits come from BE_01's `APP_LIMITS`): manifest, hash, env, state, runner, supervisor,
   routes, app.ts wiring.
3. [ ] Resilience checks by test: the server keeps answering other routes while an app loops; a
   project switch (`open_project`) stops the old project's app processes; server close leaves no
   child process (assert by pid).
4. [ ] Update `apps.md` if anything you built differs from what BE_01 wrote (the code wins only if it
   follows the rulings; say so in your notes). `apps/board/README.md` names the folder.
5. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`. **Not** `npm run test:pages`: FE_01 and T_01
   run beside you in wave 2, and page tests run one at a time; the orchestrator runs them after the
   wave.

## Validation

- [ ] All gates exit 0; every safety test above exists, is named in your notes, and passes.
- [ ] `ps` after the test run shows no stray runner process.

## Constraints

- No new dependency. No git commits. Only `.visionboard/apps/*` of a temp project is ever read in
  tests; never this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-security] BE_02: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_02_app-host.md]]`
