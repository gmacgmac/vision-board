# ARCH_01_module-front-doors: One Front Door Per Module

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Code outside a module reaches it only through its one public file, by the module's name, and
`verify` fails on any other way in.

## Context

Review §1: ~500 imports like `'../../../../packages/ui/src/index.ts'`; 19 package CSS files imported
by internal path in `apps/board/src/main.ts` and again in `src/gallery/main.ts`; `index.html` and
`gallery.html` link `packages/tokens/src/tokens.css`; the server finds files with
`new URL('../../../…')` (`server/schema.ts` `SCHEMA_DIR`/`CHAT_SCHEMA_DIR`, `server/spec.ts`
`OPENAPI_FILE`, `server/chat-access.ts` `VB_MCP`/`INSTRUCTIONS_FILE`); tests deep-import
(`tests/pages/app-gallery.spec.ts` → `ui/src/node/node-app.ts`, `tests/pages/rail-board.ts` →
`layout/src/types.ts`). `scripts/verify.mjs` `IMPORT` misses side-effect imports and `new URL`, and its
`ROOTS` skip `tests/` and `skills/`.

**Maintainer's ruling (point 224): modules, not npm packages.** No `package.json` per module, nothing
published. Each module is named once, in the root `package.json` `imports` map (Node subpath imports:
`"#ui": "./packages/ui/src/index.ts"`, `"#ui/styles.css": …`), which Node, Vite and TypeScript all read.

## Inputs

- **Files to modify**: root `package.json` (`imports` only), `tsconfig*.json` (resolution only, if
  needed), every file whose imports change, `apps/board/index.html`, `apps/board/gallery.html`,
  `apps/board/vite.config.*`, `scripts/verify.mjs`, `scripts/verify.test.mjs`, the server files above,
  each module's `src/index.ts` (asset path exports) and a new `src/styles.css` per module that has CSS.
- **Files to reference**: `docs/principles.md` § Architecture we adopt; `docs/decisions.md` D-016
  (layers, front doors); `packages/agent` `GATE_BIN` (an asset path exported as a constant).
- **Skills**: `cortex-architecture` (rules 1-3, `references/contracts.md`).

## Steps

1. [ ] **Prove it first on one module** (`#format`): Node type-stripping (server and scripts), Vite
   (page and gallery, dev and build), `npm run check` (svelte-check, tsc) and Playwright specs all
   resolve `#format`. Also prove a consumer outside this repo can import the board's code by path
   (a scratch Vite page and a Node script in `temp/`, as nclite would: PLAN § The Plugin Contract), with
   `#` names resolved against this repo's `package.json`. If any cannot, STOP and report what fails;
   do not work around it.
2. [ ] **Names**: one `#<module>` per folder under `packages/`, pointing at `src/index.ts`; one
   `#<module>/styles.css` for modules with CSS (one CSS file that imports that module's sheets in their
   current order); asset paths (schemas, the OpenAPI file, the MCP bin, instructions) exported as
   constants from the owning module, computed there from `import.meta.url`.
3. [ ] **Codemod** every cross-module import, side-effect CSS import, `<link>` and `new URL` to the
   names. One CSS import list, shared by `main.ts` and the gallery (no second copy).
4. [ ] **Verify** fails on: a relative import that leaves its module; a side-effect import or
   `new URL(…)` into another module; any of these in `tests/` or `skills/` too (`ROOTS`). Tests for each
   in `scripts/verify.test.mjs` (failing first).
5. [ ] **Decision entry**: draft "D-0xx Modules are named in the root imports map" (decision, why,
   rejected: npm packages per module, tsconfig paths alone) in your notes and as a `REQUEST` to the
   orchestrator. Do not write `docs/decisions.md`.
6. [ ] Update `docs/principles.md` § Architecture we adopt only if the mechanism needs a line (it names
   the rule already) → as a `REQUEST` (protected).

## Validation

- [ ] `grep` finds no `packages/[a-z]+/src/` path outside its own module (code, CSS, HTML, tests)
- [ ] `npm test`, `npm run verify`, `npm run check`, `npm run build`, `gen --check`; the specs for the
      page and gallery on your port; no screenshot changes

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Blocked (Step 1 STOP)  
**Completed**: — (stopped 2026-10-27)  

### Changes Made
- None kept. `"imports": { "#format": … }` was added to the root `package.json` for the proof and
  reverted; probe files in `apps/board/` removed. Probes kept in `temp/arch01/` to re-run.

### Issues & Resolutions
- **Step 1 proof fails for everything under `apps/board/`.** `apps/board/package.json` (the
  workspace `@vision-board/board`) is its own package scope. Node, Vite and TypeScript resolve a
  `#name` against the importer's *nearest* `package.json`, so a root `imports` map is invisible to
  `apps/board/src`, `server`, `bin` and `tests` (most of the ~430 files with deep imports).

  | Resolver | Root scope (`packages/`, `scripts/`, `tests/pages/`, `skills/`) | `apps/board/` scope |
  |---|---|---|
  | Node 24 type-stripping | resolves | `ERR_PACKAGE_IMPORT_NOT_DEFINED` ("not defined in package apps/board/package.json") |
  | Vite 8 (Rolldown) build | resolves | `failed to resolve import "#format" from "apps/board/src/…"` |
  | svelte-check (`apps/board/tsconfig.json`) | — | `Cannot find module '#format'` |
  | tsc (root `tsconfig.json`) | resolves | resolves only from TS's resolution cache ("package.json scope 'apps/board' has no imports defined", then a cache hit): not reliable |
  | Playwright | resolves | — |
  | Outside consumer (own `package.json`, imports a root-scope file of this repo by path; Node script and Vite page) | resolves (`#` resolves against this repo's `package.json`) | not tried; would fail as above |

- No in-scope fix: an `imports` target must stay inside its own package (a `../` target is invalid),
  so `apps/board/package.json` cannot point at `packages/*`. Working around it (tsconfig `paths` +
  Vite alias + a Node loader hook) is a second naming mechanism, which the task rejects. Per Step 1,
  stopped and reported.
- **Options for the maintainer** (decision needed before re-running ARCH_01):
  - **A (recommended): one package scope for the repo.** Fold `apps/board/package.json` into the
    root: its dev dependencies (`@sveltejs/vite-plugin-svelte`, `svelte`, `svelte-check`, `vite`) and
    `ajv` move to the root (exact versions); root scripts call `vite build --config
    apps/board/vite.config.ts` and `svelte-check --tsconfig apps/board/tsconfig.json`; `vite.config.ts`
    sets `root` to its own folder; `workspaces` drops `apps/*` (and `packages/*`, which has no
    `package.json`). Fits point 224: the app is a module, not an npm package. Needs `package.json`
    beyond `imports`, a regenerated `package-lock.json` and an install (orchestrator-only).
  - B: keep the workspace and give `apps/board` its own copy of the board's names. Not possible with
    `imports` alone (targets cannot leave the package); would need the modules linked into
    `node_modules`, i.e. npm packages, which point 224 rejected.

### Caught Beyond the Brief
- `tsc` passing is not proof: it resolved `apps/board` imports through its cache only because a
  root-scope file resolved the same name first. Step 1 must be proved with svelte-check and Node,
  not tsc alone.
- An outside consumer (nclite) resolves `#` names against this repo's `package.json` only when it
  imports the board's files in place. If nclite ever copies the files into its own tree, the names
  resolve against nclite's `package.json` instead: worth a line in the plugin contract.

### Deviations from Plan
- Stopped at Step 1, as the step instructs. Steps 2-6 not started.

### Run 2

**Status**: Completed  
**Completed**: 2026-10-27 01:00  

After ARCH_01-R1 (D-059: one package scope, `apps/board/package.json` gone).

#### Step 1, re-proved (`temp/arch01/` probes)
- `#format` from `apps/board/server` and `apps/board/src`: Node runs it; Vite builds it; svelte-check
  passes (and a `#nope` control fails); tsc's trace shows "Found 'package.json' at 'package.json'.
  Using 'imports' subpath '#format'" (no cache hit); Playwright resolves it in a spec that imports
  an `apps/board/src` file. An outside consumer (own `package.json`) imports `packages/ui`,
  `packages/format/src/files.ts`, `packages/mcp` and `apps/board/src/styles/page.ts` by path, in Node
  and in a Vite build: the names resolve against this repo's `package.json`.

#### Changes Made
- **Names** (root `package.json` `imports`): `#actions`, `#agent`, `#chat`, `#cli`, `#client`,
  `#format`, `#layout`, `#mcp`, `#ui` → each `src/index.ts`. CSS: `#ui/styles.css` (new
  `packages/ui/src/styles.css`, the 19 sheets in main.ts's order), `#chat/styles.css` →
  `src/chat.css` and `#tokens/styles.css` → `src/tokens.css` (each already the module's one sheet,
  so no wrapper file). Node-side file paths: `#format/files` (new `files.ts`: `SCHEMA_DIR`,
  `OPENAPI_FILE`, `FIXTURES_DIR`) and `#chat/files` (`CHAT_SCHEMA_DIR`), kept out of `#format`/`#chat`
  because the page loads those and `node:url` must not reach the page bundle. `packages/mcp` is
  Node-only, so `MCP_BIN` is on its front door (`info.ts`), as `GATE_BIN` is on `#agent`'s. Test
  support: `#agent/testing` → the existing `packages/agent/tests/support.ts` (`FAKE_CLAUDE`, `DRAW`,
  `REFUSED`, `FAKE_KIRO`, `KIRO_DENIED`).
- **Codemod** (`temp/arch01/codemod.mjs`): 732 relative paths to a `src/index.ts` became `#name`
  (apps, packages, tests, skills, scripts). The generator emits `#format` in
  `commands.generated.ts` (`scripts/gen-api.mjs`), which also reads the schemas through
  `#format/files`/`#chat/files`. Two deep test imports go through front doors (`#ui` `APP_CARD_STATES`;
  `#layout` `REGION_GAP`, now exported).
- **CSS**: one list per surface, `apps/board/src/styles/page.ts` (tokens, board, `#ui/styles.css`,
  shell; imported by `main.ts` and the gallery) and `styles/chat.ts` (`#chat/styles.css`,
  `chat-host.css`; imported lazily by `board/chat-view.ts` and by the gallery). The tokens `<link>`
  left `index.html` and `gallery.html`; the tokens come first in `page.ts`.
- **Gallery patterns**: the gallery's `import.meta.glob` into `packages/ui` became `#ui` `PATTERNS`
  (`packages/ui/src/patterns.ts`, the seven `pattern.json` by JSON import), used by
  `gallery/main.ts` and `tests/pages/gallery.spec.ts`; `packages/ui/tests/patterns.test.ts` fails
  when a pattern folder is missing from it (the property the folder scan gave).
- **File paths**: server `schema.ts`, `spec.ts`, `chat-access.ts` (`MCP_BIN`) and every test that
  built a path into another module (`new URL`, `path.join(ROOT, 'packages/…')`) use the names.
  `images.test.ts`'s "images.ts is pure" check moved into `packages/format/tests/images-pure.test.ts`
  (it reads that module's source).
- **verify** (`scripts/verify.mjs` `checkReferences`, `referencesOf`, `targetOf`, `namesOf`;
  `ROOTS` + `tests`, `skills`): a path into another module fails from code, CSS (`@import`), HTML
  (`href`/`src`), `new URL` (a template's static start), `import.meta.glob` and side-effect/dynamic
  imports; an unknown `#name`, a module's own name, and a name against `LAYERS` fail; only test code
  (`tests/`, a skill's `*.test.*`) may import an app. A package importing a file outside every module
  by path warns. The map counts imports by name. `/pkg/` (unused) is gone. Tests in
  `scripts/verify.test.mjs`; the old `checkImports` missed all six back-door shapes
  (`temp/arch01/old-misses.mjs`). The D-029 layer test, which sat nested inside another test, is its own.

#### Verification
- Build: CSS byte-identical (same content hashes `chat-rules-BBpGitid.css`, `gallery-BDDxv4Nj.css`,
  `B9J0l9AI.css`; the chat chunk is now named `chat-*` after `styles/chat.ts`); board JS 79,285 →
  79,275 B; no `pattern.json` text in the board bundle; gallery CSS order unchanged.
- `npm test` 1620 + 10 pass; `npm run check` 0 errors; `gen-api --check` current; `npm run build` ok;
  `verify` fails only on `docs/specification/modules.md` (out of date, orchestrator's `npm run map`);
  with the map regenerated it is `verify: ok`.
- Page specs on 4710: gallery, app-gallery, board, chat-lazy, chat-panel, container-rail,
  container-rail-states, perf, app-states, card-images, card-image-states, same-picture:
  138 passed, no screenshot changed.

#### Issues & Resolutions
- The map gains true edges it could not see before: `apps/board` → `packages/mcp`, `packages/tokens`;
  `scripts` → `packages/format`, `packages/chat`.
- `apps/board/tests/schema.test.ts` is 301 lines (one import line): a warning, left for ARCH_06.
- With `tests/` and `skills/` in `ROOTS`, the length check now warns on 10 long page specs and the
  calculator's `panel.html` (warnings only).

#### Caught Beyond the Brief
- Back doors the review did not list: the gallery's `import.meta.glob` into `packages/ui`; tests
  reading another module's files by `path.join(ROOT, 'packages/…')` (route-table, schema, openapi,
  api-harness, app-icon, chat-fixture, Playwright's `VB_SEED`); a test reading `images.ts`'s source
  from the app.
- Left, and why: `packages/{actions,layout}/tests/*.timing.ts` import `tests/pages/perf-ledger.ts`
  (verify warns; TEST_01's test-support move); `packages/{cli,mcp}/tests` spawn
  `apps/board/tests/serve-fixture.ts` by `new URL` and `skills/…/calculator.test.mjs` imports the
  board server's `compileSchema` (test code reaching the app it tests; ENGINE_01's engine is their
  front door); `chat-access.ts` reads `skills/vision-board/SKILL.md` by path (`skills/` is not a
  module and has no name); generators write module files by path (`gen-api.mjs` `OUT`,
  `COMMANDS_OUT`, `TOOLS_OUT`). Paths named in comments and one error sentence stay (citations).

#### Deviations from Plan
- `#chat/styles.css` and `#tokens/styles.css` point at the existing `chat.css` and `tokens.css` (each
  already the module's one sheet) rather than a new one-line `styles.css` each.
- Names beyond `#<module>` and `#<module>/styles.css`: `#format/files`, `#chat/files`,
  `#agent/testing`, proposed for the decision below.
- Step 5: D-059 (orchestrator) already records the imports map. Drafted addition, as a new entry:
  "D-0xx A module's names. `#<module>` is its front door (`src/index.ts`); `#<module>/styles.css`
  its one stylesheet; `#<module>/files` the file paths Node reads from it (schemas, fixtures), only
  for a module the page loads, so `node:` stays out of the page bundle (a Node-only module exports
  them from its front door: `GATE_BIN`, `MCP_BIN`); `#<module>/testing` its test support. `verify`
  fails on any other way in. Why: one way in per kind of use, each visible to `verify` and the map.
  Rejected: a wildcard `#ui/*` (every file a door); file paths on the front door (`node:url` in the
  page bundle); a `styles.css` wrapper for a module with one sheet."
- Step 6: no `docs/principles.md` change needed (§ Architecture we adopt and § Dependencies already
  name the rule and D-059).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] ARCH_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_01_module-front-doors.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
