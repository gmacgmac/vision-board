---
task_name: Type-Check Every Package
created: 2026-10-02
completed:
status: pending
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

- [ ] `npm run check` type-checks every package, test, script-adjacent `.ts` and server file
- [ ] `npm run check`, `npm test` and `npm run verify` each exit 0
- [ ] A deliberately wrong type in `packages/format/src/ledger-index.ts` makes `npm run check`
      fail (try it, then revert it)

## References

- `apps/board/tsconfig.json`, `package.json`, `.kiro/steering/vision-board-proj.md` rule 14

## Implementation Notes

_(filled in on completion: what changed, errors fixed, the exact gate exit codes)_
