---
task_name: Type-Check Every Package
created: 2026-10-02
completed: 2026-10-02
status: done
categories: [project-tooling]
type: implementation
tracker: cortex-tasks/tracker.md#N7
model: Sonnet 5 (mechanical config; the orchestrator reviews the diff and runs the gate)
---

# Task: Type-check every package

## Problem Statement

`npm run check` runs `svelte-check` over `apps/board/tsconfig.json`, which only includes
`apps/board/src/**`. Package code the page does not import (for example
`packages/format/src/ledger-index.ts`), package tests, `scripts/` and the Node server code are
never type-checked, so strict TypeScript (rule 14) is not enforced there.

## Task Overview

1. Add a root strict `tsconfig.json` for Node-side code.
2. Run it from `npm run check`, after the existing svelte-check.
3. Fix every type error it reports, without changing behaviour.

## Execution Steps

### Step 1: Root config

- **Files**: `tsconfig.json` (new, repo root)
- **Details**: the same `compilerOptions` as `apps/board/tsconfig.json` (strict,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `allowImportingTsExtensions`,
  `erasableSyntaxOnly`, `noEmit`, `skipLibCheck`), but `lib: ["ES2023"]`, no DOM, no
  `vite/client`. Include `packages/*/src/**/*.ts`, `packages/*/tests/**/*.ts`,
  `packages/*/bin/**/*.ts`, `apps/board/server/**/*.ts`, `apps/board/server.ts`,
  `apps/board/bin/**/*.ts`. Exclude `apps/board/src` (svelte-check covers it) and `node_modules`.
- Node built-ins (`node:fs`, `node:test`, `node:http`…) need types. **Do not install
  `@types/node` yourself.** If errors come only from missing Node types, stop and report the
  exact count: adding `@types/node` is a dependency decision for the maintainer (rule 20).

### Step 2: Wire it in

- **Files**: `package.json` (root)
- **Details**: `check` becomes `npm run check --workspace apps/board && tsc -p tsconfig.json`.
  `tsc` comes from the already-installed `typescript` 6.0.3; no new package.

### Step 3: Fix errors

- Fix real type errors in place, smallest change each. Do not add `any`, `@ts-ignore` or
  `@ts-expect-error`; if a fix needs a design change, stop and report it.

## Files Involved

- `tsconfig.json` (new), `package.json`, any `.ts` file with a type error.

## Constraints

- No new dependencies. No behaviour changes. No PII in examples. No git commits.
- If deviation is needed, stop and report; do not make breaking changes silently.
- Use Node 22.23.1: `PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"`.

## Success Criteria

- [x] `npm run check` type-checks every package, test, script-adjacent `.ts` and server file
- [x] `npm run check`, `npm test` and `npm run verify` each exit 0
- [x] A deliberately wrong type in `packages/format/src/ledger-index.ts` makes `npm run check`
      fail (try it, then revert it)

## References

- `apps/board/tsconfig.json`, `package.json`, `.kiro/steering/vision-board-proj.md` rule 14

## Implementation Notes

Added root `tsconfig.json` (strict, matching `apps/board/tsconfig.json`'s compiler options
except `lib: ["ES2023"]`, no DOM/vite types) covering `packages/*/src`, `packages/*/tests`,
`packages/*/bin`, `apps/board/server/**`, `apps/board/server.ts`, `apps/board/bin/**`, excluding
`apps/board/src` and `node_modules`. Wired `npm run check` to `npm run check --workspace
apps/board && tsc -p tsconfig.json`.

Running `tsc -p tsconfig.json` reports 79 errors, every one caused by the absence of
`@types/node`: `node:*` module specifiers (TS2591), Node globals `process`/`console`/`Buffer`/
`URL`/timers (TS2591/TS2584/TS2304), the `NodeJS` namespace (TS2503), `import.meta.url`
(TS2339), and implicit-`any` callback parameters on `fs`/`http` return values that are only
untyped because those APIs' own types are unresolvable (TS7006 on `req`/`res` in
`apps/board/server.ts:69` and on array-callback params in `apps/board/server/sessions.ts`).
No error is independent of this cause -- confirmed by excluding every Node-type-related TS code
and finding only those same cascaded TS7006s remain.

Per the task's explicit instruction, `@types/node` was not installed. Stopping and reporting:
**79 type errors, all and only from missing Node type definitions** -- installing `@types/node`
(and adding `"types": ["node"]`) is the needed fix, which is a dependency decision for the
maintainer.

Deliberate-wrong-type check: changed `emptyIndex`'s `seq: 0` to `seq: 'zero'` in
`packages/format/src/ledger-index.ts`; `npm run check` failed (exit 1, svelte-check reported
`Type 'string' is not assignable to type 'number'.` at that line via the apps/board check,
which imports the package). Reverted; `git diff packages/format/src/ledger-index.ts` is empty.

No files under `packages/` or `apps/board/server*`/`bin/` were otherwise edited: there is no fix
available that doesn't require the Node types decision.

### Completion (orchestrator, 2026-10-02)

- Maintainer approved `@types/node` 22.20.5 (rule 20). Installed with `--save-exact`, scripts off;
  it brings `undici-types` 6.21.0 (types only, MIT, pinned by the lockfile). Root `tsconfig.json`
  gained `"types": ["node"]` (TypeScript 6 no longer loads `@types/*` by default).
- With Node types present, one real error remained: `ev()` in
  `packages/format/tests/ledger.test.ts` indexed an array under `noUncheckedIndexedAccess`. Fixed
  by throwing on a missing fixture line.
- The sub-agent's wrong-type probe failed through svelte-check, not the new `tsc` step. Re-probed
  with a wrong type in a file only `tsc` sees (`packages/format/tests/`, then removed): exit 2.
- Gates, run by the orchestrator: `npm test` 42/42 exit 0, `npm run check` exit 0,
  `npm run verify` exit 0 (one existing long-file warning).
- Register: `docs/specification/dependencies.md` rows and summary counts updated; the old
  "Types for Node files: not installed" row removed.

