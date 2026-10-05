# 2d_BE_01_no-overlaps: Layout never draws two things on top of each other

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2d,
> "region sizing (no overlaps)") · **Decisions**: D-011, D-030, rule 9 · **Facts**:
> `temp/research/stage-2d-2e-3-brief.md` §A6 · **Model**: Opus 5.5 · **Runs in**: its own worktree

## Objective

For any board, in every layout mode, with any mix of card widths (D-030 s/m/l) and any person
pins: no two cards in a container overlap, no card crosses its container's top line, and no two
containers overlap. Layout stays a pure function (same input, same picture).

## Known failure

A card the person moved (a pin) can land on a neighbour: `packages/layout/src/board.ts`
`layoutBoard` applies `opts.pins` after the mode with no collision check. Region packing has a
reported but unreproduced overlap (`HANDOVER-compaction.md` § Environment gotchas); the current
"regions do not overlap" test uses fixed 240x96 sizes only.

## Rulings (do not reopen)

1. A pinned card never moves: the person put it there. Unpinned cards make room, moving the
   least they can, in a deterministic order (the mode's own order). Pinned cards may overlap each
   other only if the person stacked them; do not move either.
2. The container grows to hold everything, as today. Pins stay region-local (rule 9, D-011);
   the stored coordinate format does not change, so no ledger or schema change.
3. Packing keeps `maxRowWidth` 1600 (a screen-independent picture).

## Inputs

- **Modify**: `packages/layout/src/` (`board.ts`, a new small module for the collision pass if
  it keeps files short), `packages/layout/tests/`
- **Do not touch**: `packages/ui`, `apps/board` (2d_FE_01 runs in the main checkout)

## Steps

1. [ ] Write the failing tests first: a seeded, deterministic generator (no `Math.random`
   without a fixed seed) of boards across all five modes, mixed s/m/l widths and heights, and
   0-3 pins placed on top of other cards. Assert the three no-overlap properties, plus "pinned
   cards keep their exact coordinates" and "same input gives the same output".
2. [ ] Implement the collision pass after pins; keep each function under about 50 lines.
3. [ ] If the region-packing overlap reproduces, fix it and keep the repro as a test; if it
   does not, say so.
4. [ ] Check the layout-time budget test (rule 15) still passes on the large board.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 in the worktree (read the exit codes)
- [ ] `npm run test:pages` on its own port (`VB_PORT`, as the U7 worktree did) exits 0; no
  baseline changes are expected, and any that change are listed with a reason

## Constraints

Project rules apply. No new dependency. Commit on the worktree's branch only when the gates are
green; do not merge. Probe scripts under `temp/` only, deleted after. Stop and report on any
deviation. Return: symbols changed, the collision rule in two sentences, tests added, gate exit
codes, the commit hash.

## Implementation Notes

**Status**: Not started.
