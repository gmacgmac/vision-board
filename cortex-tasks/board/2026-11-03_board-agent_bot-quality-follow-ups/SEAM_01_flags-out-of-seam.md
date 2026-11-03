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

