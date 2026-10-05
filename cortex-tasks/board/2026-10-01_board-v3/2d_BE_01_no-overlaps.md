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

**Status**: Done in the 2d-layout worktree (2026-10-05), committed on branch `2d-layout`, not merged.

**Collision rule.** After the pins land, every unpinned card that a pinned card overlaps moves to
the nearest spot (straight-line distance) that is GAP (24) clear of every other card and of the
lane gutters, never above or left of the region content's top-left; cards are handled in the
mode's own order, and a card no pin covers stays exactly where the mode put it. Pinned cards never
move, including when the person stacked them on each other.

**Changed.** `packages/layout/src/collide.ts` (new, 69 lines): `applyPins`, `makeRoom`, private
`nearestFree` and `axis`. `packages/layout/src/board.ts` `layoutBoard`: the inline pin loop is
replaced by `applyPins` then `makeRoom` (lane gutter boxes passed as keep-out). Public API, the
pin format, the ledger and the schema are unchanged; `npm run map` output is unchanged.

**Why the top-left floor.** The frame's origin is derived from the content bounds, so a card
pushed up or left would shift the origin and with it every pinned card on screen (ruling 1). With
the floor, the collision pass only ever grows the frame right or down (ruling 2). Moving the least
is therefore "least among spots that keep the origin".

**Search.** The closest free spot always has each coordinate either unchanged or flush with an
obstacle side, so only those candidates are tried, nearest first, with early exit. The large-board
budget test with 3 pins per region runs in about 5ms.

**Region packing (step 3).** Not reproduced: 300 seeded boards with no pins, all five modes, s/m/l
widths and heights 72-320, give no card or frame overlap. The packer advances `x` by the frame's
full width plus REGION_GAP, so frames cannot overlap in layout. The reported overlap is likely
on the page (the header's mode buttons overflowing a narrow frame, the 2d_FE_01 icon row), not in
`packages/layout`. The no-pin generator test is kept as the guard.

**Tests added.** `packages/layout/tests/no-overlap.test.ts`: seeded (mulberry32) generator; "no
pins" (300 boards), "0-3 pins on other cards" (300 boards: cards apart unless both pinned, inside
the frame and below its top line, frames apart, pins exact), "same input gives the same output",
"a card under a pin moves to the nearest free spot; the rest and the frame stay", "stacked pins
both stay; cards no pin covers do not move". `layout.test.ts`: "layout of a large board with cards
pinned on others stays under budget". The pin tests failed before the change and pass after.

**Open (for the maintainer, not changed).**
1. In lanes mode a moved card can end up in a neighbouring lane's band, or below the last lane:
   the rulings say least movement and say nothing about lanes.
2. The existing origin quirk (brief A6) remains: a pin above or left of the mode's content still
   moves the origin, so unpinned cards and the frame shift. Not in this task's rulings.
3. `packages/layout/README.md` still reads correctly but does not name the collision pass; it is
   outside this task's allowed files.

**Gates** (exit codes read directly): `npm test` 0 (436 pass), `npm run check` 0, `npm run verify` 0
(the existing controller.ts length warning only), `VB_TEST_PORT=4492 npm run test:pages` 0 (54
passed, no screenshot baseline changed). The config reads `VB_TEST_PORT` and passes it to the
server as `VB_PORT`.
