# PLUGIN_RO_01_plugin-read-only: Read-only for a plugin host

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A plugin host can open the board read-only: an optional engine option, every write answered `read-only`, every read
marked `readOnly`, the view showing the state from the reads. A host built for `SEAM` 1 still works. The types
fingerprint is set again and whether `SEAM` moves is decided by the rule, not by habit.

## Context

PLAN decision 18. READONLY_01's notes first: it adds `readOnly` to `EngineOptions` (standalone's) and the gate.
Research, 2026-11-03: `apps/board/plugin/engine.ts` `PluginEngineOptions = Pick<EngineOptions, 'dir' | 'name' | 'warn'>
& { flags?: Record<string, boolean> }`; a standalone-only `EngineOptions` member stays out of the seam (as `ledger` and
`onSend` do). `apps/board/plugin/seam.ts` `SEAM` 1, `SEAM_TYPES` (a sha256), `TYPES_FILE`; `apps/board/bin/plugin-types.ts`
(`SEAM_ENTRIES`, `pluginTypes`, `typesHash`, `seamProblem`); `apps/board/tests/plugin-types.test.ts` ("the seam number
cannot stay behind the types…", "a new flag leaves the types alone…"). `docs/specification/plugin.md` § The engine
(member table, proven by `tests/plugin/engine-hooks.spec.ts`), § The types and the seam version, § Standalone's own.
Check whether the new problem code reaches `plugin.d.ts` through `ProblemCode`: if it does, that is part of this
task's types decision.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (PLUGIN_RO_01, wave 5)
- **Shared artifacts to reuse**: READONLY_01's engine option, gate, problem and `readOnly` on reads
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** in `tests/plugin/` (the fake host): an engine created read-only answers every write tool
   `isError` with `read-only` and writes nothing; reads carry `readOnly`; the mounted view disables its write controls
   with the reason; a host that never passes the option sees no change.
2. **The option**: `PluginEngineOptions` gains `readOnly?: boolean` (a host flips it by recreating the engine, or a
   function if READONLY_01's shape is one; say which in plugin.md). Rebuild (`npm run build:plugin`), `plugin.d.ts`
   regenerates; set `SEAM_TYPES` with the build's hash; decide `SEAM` by plugin.md's rule (an optional member a host
   may leave out is additive: expected 1), and write the reasoning in your notes.
3. **Docs** (`cortex-docs`): `plugin.md` § The engine (the option, its promise, the test that proves it), § The types and
   the seam version if anything about the rule was learned; `docs/specification/plugin.md` § Open points if a host
   needs more (for example a lock of its own), as a point, not a build.

## Validation

- [ ] `npm run test:plugin` green (port 6800); `plugin-types.test.ts` green with the new hash; `npm test`, `verify`, `check` green
- [ ] The built folder's `manifest.json` `seam` matches the decision in your notes

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] PLUGIN_RO_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
