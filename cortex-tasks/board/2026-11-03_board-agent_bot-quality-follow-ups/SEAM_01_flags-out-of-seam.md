# SEAM_01: a new flag leaves the seam's fingerprint alone

**Skills**: cortex-architecture · **Model**: standard · **Point**: 398 · **Decision**: D-078 (flags are additions)

## Objective

Adding a flag to `packages/format/src/flags.ts` must not change `plugin.d.ts`'s types hash (`SEAM_TYPES`). A host sees
flag names as `string`; inside the app `FlagName` stays the checked union.

## Steps

1. Read `apps/board/bin/plugin-types.ts` (how `plugin.d.ts` is made, `typesHash`), `apps/board/plugin/seam.ts`, and
   `docs/specification/plugin.md` § The types and the seam version. Find where `FlagName` enters `plugin.d.ts`.
2. Failing test first in `apps/board/tests/plugin-types.test.ts`: the generated types name no flag (a flag name from
   `flags.ts` does not appear in `plugin.d.ts`), so adding one cannot move the hash.
3. Type flag names as `string` where they cross the seam (the smallest change: the seam's own type, not the app's).
   Unknown names a host passes are ignored as today; check that and say where in your notes.
4. `plugin.md`: one sentence that flag names are strings at the seam, so a new flag is not a seam change.
5. The hash moves once: put the new hash in your notes and `REQUESTS` (the orchestrator sets `SEAM_TYPES`; `SEAM` stays 1).

## Validation

`npm run verify`, `npm run check`, unit tests, `npm run test:plugin`; all `nice -n 15`, `VB_TEST_PORT=7110`.

## Constraints

No commits, no LOG, no PII. Your worktree only. Anything outside File Ownership goes in `REQUESTS`.

## Implementation Notes

**Done 2026-11-03.** Flag names entered `plugin.d.ts` only through `PluginEngineOptions.flags` (`Pick<EngineOptions, ... 'flags'>` opened to `flags?: FlagOverrides`, which reached `FlagName` and `FlagOverrides`). Changes:

- `apps/board/plugin/engine.ts` `PluginEngineOptions`: `Pick<EngineOptions, 'dir' | 'name' | 'warn'> & { flags?: Record<string, boolean> | undefined }`. The app's `FlagName` / `FlagOverrides` stay the checked union (no change in `packages/format`); `createBoardEngine({ flags })` takes the wider record unchanged (`npm run check` clean).
- Unknown names are ignored as before: `flagOn(name, overrides)` reads `overrides[name]` for the board's own names only, so an extra key is never read (`packages/format/src/flags.ts` `flagOn`). Not a new behaviour; no code to add.
- Test first (`apps/board/tests/plugin-types.test.ts` "a new flag leaves the types alone"): no `FLAGS` name, `FlagName` or `FlagOverrides` in the types (comments stripped, the hash ignores them). It failed before the change, passes now.
- Checked by hand: a temporary extra flag in `flags.ts` left the hash `fde5eb97...` unchanged (reverted).
- `docs/specification/plugin.md` § The engine: one sentence that flag names are strings at the seam, proved by that test.
- The hash moves once: old `327f600b...` to `fde5eb9724e5d0efbe322aeb731430e8d0b888bbe7623b3f0477fc4116d4f683`. An addition (host's `flags` still accepts what it did; `svgImages: true` compiles), so `SEAM` stays 1. `seam.ts` left as it was in the tree; I set the hash in it temporarily to run the build-dependent tests, then reverted.
- Until the orchestrator sets `SEAM_TYPES`, "the seam number cannot stay behind the types" (and the plugin build) fails by design.
- Results (with the hash set temporarily): `npm run check` ok, `npm run verify` ok, unit tests under `apps/board/tests` and `tests/plugin/*.test.ts`: 824 pass, `npm run test:plugin`: 79 pass.
