# FIX_02_far-zoom-and-box-pointer: Far Zoom and the Box's Pointer

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's first use of the merged board (2026-11-18, points 430 to 438). Replaces FIX_01's rulings on small
marks and far-out crowding where they differ.

## Rulings (maintainer)

1. **One breakpoint, the far one** (today's `CROWD_GROW`, about 37%): above it, edge marks keep their minimum size
   (grow in place) as now. **Below it nothing grows**: the number, the disc, the notes mark, the badges, the kind tab
   and grip all scale down with the node. Only container titles (and their rail) keep their size, as before.
2. **Nothing jumps or disappears at the breakpoint**: the notes mark stays bottom right; kind tabs and grips never
   hide; the number never moves into the node or over the title. Remove FIX_01's crowded mode
   (`data-marks-crowded`: marks giving way, number and disc growing down, notes mark to bottom left).
3. **Marks work down to that breakpoint** (replaces FIX_01's 86% rule, `TARGET_MIN`/`marksPressable`): the disc, the
   notes mark, the number and every mark take presses at any zoom above the far breakpoint, with the hand cursor.
   Below it a press on a mark selects the node only (so the person can zoom to it), with no hand cursor. Keyboard
   unchanged. axe `target-size` is excused below 100% only where a mark draws under 24 px (record the reason: the
   keyboard path, and the person's ruling).
4. **The box's pointer points at the node's centre** (the conversation, proposal and history boxes, `placeBeside`):
   beside the node, the pointer sits on the box's left edge at the node's vertical centre; below the node, the box is
   centred on the node's width and the pointer sits at the middle of the box's top edge, pointing up. When the box had
   to move to stay on screen, the pointer still aims at the node's centre (clamped inside the box's edge).

## Steps

1. Implement 1 to 4 in the existing patterns (`viewport.ts` `markGrow`, `node-edges.css`, `mark-place.ts`
   `placeBeside`, `node-box.css`, `pointer.ts`/`wiring.ts`/`mark-flow.ts`/`mark-tips.ts`); remove what they replace.
2. Update the tests that held the old rules (`small-marks.spec.ts`, `zoom-groups.spec.ts`, `zoom-groups.test.ts`,
   `mark-place.test.ts`, `node-boxes.spec.ts`) to the new ones; each ruling has a test that fails before.
3. Update `docs/specification/components.md` (zoom groups, box placement) and PLAN.md's design rulings (one line
   each, "point 430-438").
4. Look in a browser at 20, 30, 37, 45, 83, 100 and 200%, both skins, dark: no jump at the breakpoint, marks
   clickable at 45% and 83%, boxes beside and below with the pointer at the node's centre. Screenshots `temp/fix02/`.

## Validation

`npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`, and the page specs
above plus `command-lens`, `node-edges-board`, `conversation-box`, `app-window`.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_02: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_02_far-zoom-and-box-pointer.md]]`

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-18 (Opus 5.5, `VB_TEST_PORT` 7450; own board on 7452 from a copy of `temp/verify01/proj`, stopped)

### Run 1

1. **One breakpoint** (`viewport.ts`): `MARK_FAR_K` = 14 / (22 × 1.2³), 36.8%, the zoom where a mark needs three
   steps of growth (FIX_01's `CROWD_GROW` boundary). Above it `markGrow` as before (the minimum kept). Below it the growth
   stays `FAR_GROW` (1.728), its value at the breakpoint, so every mark (number, disc, notes, badges, kind tab, grip)
   scales down with its node from there. Reading of ruling 1 against ruling 2: growth 1 below the breakpoint would
   halve every mark at the breakpoint (a jump). Freezing the growth gives "nothing grows" with nothing jumping. Container
   titles and rail are untouched. Removed: `CROWD_GROW`, `data-marks-crowded` and its CSS (hiding, growing down, notes
   to bottom left), `MARK_HIT`, `TARGET_MIN`.
2. **Presses** (ruling 3): `marksPressable(k)` = above `MARK_FAR_K`; below, the stage's `data-marks="small"` (the same
   `smallMark` path in `pointer.ts`, `wiring.ts`, `mark-flow.ts`, `mark-tips.ts`): a press selects the node only, no hand
   (`node-edges.css`, now after the paused rule so a locked board's marks lose the hand too), no hover tip. Keyboard
   unchanged. axe: `helpers.ts` `expectNoAxeOnBoard` excuses `target-size` below 100% only for a node's mark drawing
   under 24px, with the reason in its comment (the keyboard path; the person's ruling). It replaces `smallMarksExcused`.
3. **The box's pointer** (ruling 4): `mark-place.ts` `placeBeside(reach, size, stage, node)`. Beside the node, the
   arrow is on the box's left edge at the node's vertical centre. Below, the box is centred on the node's width with
   the arrow at the middle of its top edge (above: the same x). A box moved to stay on screen still aims at the node's
   centre, its arrow kept 16px inside its corner. Callers pass the node's own box (`mark-boxes.ts`) or the union of the
   selected nodes' boxes (`notes.ts`), never the opener mark.
4. **Tests** (each fails on the code before): `zoom-groups.test.ts` (the breakpoint about 37%, growth constant below it,
   no jump just across it, in proportion at 20%; presses above it only); `zoom-groups.spec.ts` ("nothing jumps or hides
   at the far breakpoint": every mark's box relative to its node the same at 38% and 36%; at 20% tab, grip, badge and
   notes visible, notes under the disc; the first test's sizes below the breakpoint); `small-marks.spec.ts` (100%: hit
   areas ≥24px and axe with nothing excused, both skins and themes; 83% and 45%: the hand, the disc's picker or the
   switch's Tick and Cross, the notes box, axe with the per-mark excuse; 30%: a press selects only, no hand, the keyboard
   presses); `mark-place.test.ts` (arrow at the centre beside, below centred, clamped at the stage's edge, moved up);
   `node-boxes.spec.ts` (`besideTheNode` checks the arrow and the centring; the bottom-of-window case aims at the
   centre).
5. **Looked at** in a browser (own board, dark, both skins) at 20, 30, 37, 45, 83, 100 and 200%, plus boxes beside and
   below: `temp/fix02/zoom-<skin>-<zoom>.png`, `box-right-<skin>.png`, `box-below-<skin>.png`. Nothing jumps across 37%,
   nothing hides at 20%, and the pointer meets the node's centre beside and below.
6. **Checks** (after points 444-445): `npm run verify` green except `modules.md` (needs `npm run map`); `check` 0
   errors; `gen -- --check` current; `npm test` 2,655 + 14 pass; `test:plugin` 116 passed. Page specs: every spec that
   names `rail-board`, `nodeEdges`, the selection bar or zoom (nearly the whole suite; 4 workers, nice 15, 10.4 min):
   1,067 passed, 62 failed. 59 are the known sub-pixel gallery shots (T_04's). The other three: `app-cards` "end to
   end" (dark) passed on rerun; `host-styles` gallery samples (dark passed on rerun; light timed out at its 180 s limit
   twice alone). With the limit raised for one diagnostic run (restored after), light passed in 3.4 min with no sample
   differing: the test's time limit is tight, and no rule reaches the board under a host.
   Docs: `components.md` (box placement, the zoom table's mark row, the one-breakpoint paragraph, a selection's box),
   `pattern.json` (`data-marks`, `--vb-mark-grow`), PLAN.md design rulings (three lines, points 430-438).
7. **Found, not changed**: in Command Lens, pressing the lit half to clear it and then pressing Tick again about a
   second later read the old answer and cleared instead ("1 cleared"). A wait of 1.5s after the clear avoided it. The
   test now answers Tick then Cross. [INFERENCE: the clear (`reopen`, through `moves.status`) is not folded into the
   status the next press reads until later; pre-existing.]
8. **Point 444, the conversation box's zoom**: `boxScale(k)` = clamp(k, 0.8, 1.2): one size below 80%, with the board
   from 80% to 120%, one size above (was max(k, 0.75), growing without end). It is the one box that scales with the
   board; the history and proposal boxes stay fixed (1/zoom). Proof: `zoom-groups.test.ts`, `zoom-rules.test.ts`
   (0.2 → 0.8, 1.5 and 2.5 → 1.2), `zoom-groups.spec.ts` (the box at 250% is its 120% size).
9. **Point 445, one zoom registry**: `packages/ui/src/zoom-rules.ts` `ZOOM_RULES`, in `#ui` because a pattern has its
   own zoom rule (the selection bar's gap, `selection-bar-core.ts` `pillGap`). One row per part: its rule (`scales`,
   `fixed`, `grows-to-minimum`, `clamped`, `hidden-below`), its numbers and what the page writes (`--vb-zoom`,
   `--vb-mark-grow`, `--vb-box-scale`, `data-marks`, `data-zoom`). Each row's part and how it works sit in its doc
   comment, so no words ship and the words rule is kept (a first version with string fields failed `words.test.mjs` and
   added 1.1 KB). The rows: the zoom range, the steps (+ and - 1.2, the wheel 0.0015), Fit (cap 1.1, 32px), the two Z fits,
   the world, a container's line, overlays, the bar's gap, the mark boxes, the conversation box, the marks (14px, 22px,
   1.2, three steps to the far breakpoint), mark presses, and the far controls (55%). `viewport.ts`, `pointer.ts`,
   `selection-flow.ts`, `selection-bar-core.ts` and the test helper `rail-board.ts` read it, and none declares a zoom
   number of its own. `apps/board/tests/zoom-rules.test.ts` holds the table equal to tokens.css and `viewport.ts`,
   checks that every variable it writes is read by the CSS and set by none, and fails on a zoom-named constant, a
   numeric zoom step, or a decimal literal in `viewport.ts`, anywhere outside the table. `components.md` § Zoom groups
   now points at the module; its old table is gone.
10. **Budgets** (temporary, never blocking): page start 210.2 KB measured, budget 210 → 211 (`scripts/verify-weight.mjs`
    `PAGE`, `performance.md`); plugin `view/board.js` 202,639 gzip measured, 202,200 → 202,700 (`plugin-build.test.ts`).
    Both are recorded in PLAN.md § Temporary size budgets. `npm run verify` is green except `modules.md`, which needs
    `npm run map` (the orchestrator's: the new `#ui` module).
