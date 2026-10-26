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
   resolve `#format`. If any cannot, STOP and report what fails; do not work around it.
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

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] ARCH_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_01_module-front-doors.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
