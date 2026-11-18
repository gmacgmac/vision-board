# BE_01_timeline-layout: The Timeline in the Layout

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach the pure layout a container's timeline: dated nodes on one line across the top (or down the left), in order,
alternating, evenly spaced, with years and bands; the container's other nodes laid out below in its own mode (to the right, run down); and the
same answer from `show_layout`.

---

## Context

PLAN.md decisions 7-15 and calls 4-6 are this task's rulings. The timeline is not a mode (`MODES` is unchanged): it is a
pass beside the mode inside `layoutRegion`. T_01 made `ViewNode.timeline`, `#format` `sortByTimeline`,
`timelineYear`, and the geometry type `TimelineDrawing`; this task fills that type. FE_01 is drawing the same type from
hand-made geometry right now, in another worktree: keep the type exactly as T_01 left it; any change goes in
`REQUESTS`.

**Read previous task notes in TASK-STATUS.md before starting** (T_01's especially). Wave 2, own worktree
`.claude/worktrees/timeline-be-01` (branch `feat/timeline-be-01`; check `git branch --show-current` first),
`VB_TEST_PORT=7810`.

---

## Inputs

- **Files to modify**: `packages/layout/src/timeline.ts` (new), `board.ts`, `types.ts`, `structure.ts`, `index.ts`,
  `packages/layout/tests/` (new `timeline.test.ts`, and existing tests only to add cases), `apps/board/server/engine/
  reads.ts` (`showLayout` only), `apps/board/tests/api-layout-timeline.test.ts` (new), `docs/specification/
  components.md` (a new § The timeline).
- **Files to reference**: `packages/layout/src/board.ts` (`layoutRegion`, `packRegions`, the `headInset` precedent),
  `collide.ts` (`applyPins`, `makeRoom` with fixed boxes, as lane gutters are), `modes/flow.ts` (`direction`),
  `structure.ts` (`structureOf`), `tests/head-insets.test.ts`, `tests/no-overlap.test.ts`, `tests/structure.test.ts`;
  `apps/board/tests/api-layout-direction.test.ts`; `design/mockups/timeline/` and PLAN.md § Design review.
- **Shared artifacts to reuse**: `#format` `sortByTimeline`, `timelineYear`, `TimelineDrawing`, `TimelineDot`,
  `TimelineSide`, `directionOf` (T_01). Do not re-sort or re-parse dates anywhere.
- **Skills**: `cortex-architecture` (one job per file; a pure function), `cortex-docs` (components.md).

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Tests first** (`packages/layout/tests/timeline.test.ts`), with `sizes` maps of mixed widths and heights:
   - a container with no dated node: `layoutRegion` and `layoutBoard` return results deep-equal to today's for every
     view the existing layout tests build (run them as the "before" oracle; never change their expectations);
   - order follows `sortByTimeline` (decision 9), including a coarse and a fine value with the same start and two equal
     values (card-number order);
   - across: the first dot above, then alternating; one step for the whole line; no two nodes overlap, over random
     widths from 200 to 480 (the `no-overlap.test.ts` shape); a node above sits on its bottom edge, a node below hangs
     from its top edge, each `TIMELINE_STEM` from the line; every stem joins its dot to the node's edge at the centre;
   - down (PLAN.md § Design review 587, 594): the line down the middle of the timeline's column, nodes alternating
     `left` and `right` (the first left), packed: each dot as high as keeps its node `ROW_GAP` below the last node on
     its side and the dot `TIMELINE_MIN_DOT` below the previous dot; the stem meets the middle of the node's facing
     side; no overlap over random heights and widths; with `match` widths every dated node as wide as the widest;
   - years: one at the line's start (the first dot's year), one at each turn, halfway between the two dots; none
     between dots of the same year;
   - bands: one per run of two or more consecutive exactly-equal values, from the run's first dot to its last;
   - the other nodes: laid out by the container's mode below the timeline (`REGION_GAP` under its lowest point), or,
     run down, to its right (`COL_GAP` beyond the timeline's right edge, tops level with the line's start;
     PLAN.md decision 14, maintainer 569C), in
     every mode (`grid`, `row`, `column`, `flow` across and down, `lanes`, `radial`); their links pass to the mode,
     links touching a dated node do not; the line runs to the content's right edge when the nodes below are wider;
   - pins (decision 15): a pin on a dated node changes nothing; a pin on an undated node wins, even over the line;
     unpinned undated nodes never overlap the timeline's box;
   - only dated nodes: no gap, no rest; one dated node: one dot, no stem crossing, line with an arrow;
   - hidden nodes (`LayoutOptions.hidden`) leave the line;
   - the same inputs give the same output twice (determinism), and the inputs are never mutated.
2. [ ] **`packages/layout/src/timeline.ts`** (new, pure): `layoutTimeline(nodes, sizes, direction) → { pos:
   Map<string, Box>, drawing: TimelineDrawing, box: Box }`, region-local from (0, 0). Constants exported beside it
   (the layout's numbers, not zoom numbers): `TIMELINE_STEM`, `TIMELINE_SIDE_GAP` (28, run 2), `TIMELINE_MIN_STEP`,
   `TIMELINE_MIN_DOT`, `TIMELINE_YEAR_ROOM` (room on the line before the first dot for the year), `TIMELINE_END_ROOM`
   (the arrow); no `TIMELINE_GAP` or `TIMELINE_STEM_AT`: the gap to the other nodes is `REGION_GAP` below, `COL_GAP` to
   the right (§ Design review 591). Widths: the container's `widthsOf` with the timeline default (run down `match`,
   across `own`) when neither the person nor the agent chose (PLAN.md decision 21, point 595). Pick values from run 2 and PLAN.md § Design review, measured from the pages; say
   which in the notes. The step is call 6's formula. Keep functions near 50 lines (split ordering, across and down).
3. [ ] **`layoutRegion`** (`board.ts`): split the visible nodes into dated (`timeline` set) and the rest. With no
   dated node, take today's path untouched. Otherwise: `layoutTimeline` for the dated; the mode (`MODE_FNS`) for the
   rest with the links among the rest only; shift the rest down by the timeline's height plus `REGION_GAP`, or run down right by its width plus `COL_GAP` (and
   their lane bands with them); apply pins to the rest only, after the shift (pins stay region-local, as the page
   writes them); `makeRoom` with the timeline's box among the fixed boxes; extend the line to the content's right edge
   (across). `RegionPiece.timeline?: TimelineDrawing` (region-local); `packRegions` puts it in board coordinates on
   `RegionBox.timeline`, as it does `lanes`. Dated nodes are in `groups` (links route around them) whatever the mode;
   in `radial` the rest stay out of `groups`, as today.
4. [ ] **Direction**: the timeline reads the region's `direction` (`RegionOptions.direction`, which the page already
   passes for every region from `directionOf`), whatever the mode. `downward` stays a flow's.
5. [ ] **`structureOf`** (`structure.ts`): the same split. `cards`, `columns`, `links`, `crossing`, `empty` from the
   rest through the mode, as today; `LayoutStructure.timeline?: { direction, cards: { id, at, side }[] }` in line
   order (from `sortByTimeline`, the same alternation). No pixel sizes, as before.
6. [ ] **`showLayout`** (`apps/board/server/engine/reads.ts`): fill the response's `timeline` (T_01's schema) from
   `structureOf`, the direction from `directionOf` as the page draws it. Test (`api-layout-timeline.test.ts`, port
   7810 if it starts a server): a container with dated and undated cards reports both, in drawn order; a container
   with none leaves `timeline` out and answers as before; the person's direction choice turns `side` to `left` and `right`, alternating.
7. [ ] **Same picture**: a test that the order and sides `structureOf` reports equal those `layoutRegion` draws, for the
   same view (the structure agrees with the picture, `types.ts` `LayoutStructure`).
8. [ ] **Timing**: add a case to `layout.timing.ts` (a container of 40 dated and 40 undated nodes) and report the time
   beside the existing cases; no budget is set by this task.
9. [ ] **Docs** (`cortex-docs`): `docs/specification/components.md` § The timeline (layout half): the split, order,
   sides, step, years, bands, gap, pins, direction, `show_layout`; each claim names its symbol and test. FE_02 adds the
   page's half in wave 3.
10. [ ] Project checks (PLAN.md § Tests). No page spec: the page joins the layout in FE_02. Report the page weight
    you measure (`npm run build` then the verify weight check) for the orchestrator; do not edit budget files.

---

## Validation

- [ ] Every existing `packages/layout/tests/*` passes unchanged; `timeline.test.ts` covers step 1's list
- [ ] `api-layout-timeline.test.ts` and the existing `api-layout*.test.ts` pass
- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check` pass

---

## Constraints

- The layout stays a pure function: no DOM, no flag reads for the timeline (the page's flag is FE_02's gate), no clock.
- If deviation is needed, collaborate with the maintainer. No PII in examples. No git commands that change state.
  Interim files in `temp/`; writes over 50 lines in chunks.

---

## Implementation Notes

_To be completed by agent after task completion._

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
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md) (in `.claude/worktrees/app-window`).
3. Append your own LOG entry to `cortex/LOG.md` (in `.claude/worktrees/app-window`), one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] BE_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/BE_01_timeline-layout.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION` (with the page weight measured), `REQUESTS`, `NOTES`
   (the constants chosen and why; anything FE_02 must know).
