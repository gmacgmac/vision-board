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

1. [x] **Tests first** (`packages/layout/tests/timeline.test.ts`), with `sizes` maps of mixed widths and heights:
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
2. [x] **`packages/layout/src/timeline.ts`** (new, pure): `layoutTimeline(nodes, sizes, direction) → { pos:
   Map<string, Box>, drawing: TimelineDrawing, box: Box }`, region-local from (0, 0). Constants exported beside it
   (the layout's numbers, not zoom numbers): `TIMELINE_STEM`, `TIMELINE_SIDE_GAP` (28, run 2), `TIMELINE_MIN_STEP`,
   `TIMELINE_MIN_DOT`, `TIMELINE_YEAR_ROOM` (room on the line before the first dot for the year), `TIMELINE_END_ROOM`
   (the arrow); no `TIMELINE_GAP` or `TIMELINE_STEM_AT`: the gap to the other nodes is `REGION_GAP` below, `COL_GAP` to
   the right (§ Design review 591). Widths: the container's `widthsOf` with the timeline default (run down `match`,
   across `own`) when neither the person nor the agent chose (PLAN.md decision 21, point 595). Pick values from run 2 and PLAN.md § Design review, measured from the pages; say
   which in the notes. The step is call 6's formula. Keep functions near 50 lines (split ordering, across and down).
3. [x] **`layoutRegion`** (`board.ts`): split the visible nodes into dated (`timeline` set) and the rest. With no
   dated node, take today's path untouched. Otherwise: `layoutTimeline` for the dated; the mode (`MODE_FNS`) for the
   rest with the links among the rest only; shift the rest down by the timeline's height plus `REGION_GAP`, or run down right by its width plus `COL_GAP` (and
   their lane bands with them); apply pins to the rest only, after the shift (pins stay region-local, as the page
   writes them); `makeRoom` with the timeline's box among the fixed boxes; extend the line to the content's right edge
   (across). `RegionPiece.timeline?: TimelineDrawing` (region-local); `packRegions` puts it in board coordinates on
   `RegionBox.timeline`, as it does `lanes`. Dated nodes are in `groups` (links route around them) whatever the mode;
   in `radial` the rest stay out of `groups`, as today.
4. [x] **Direction**: the timeline reads the region's `direction` (`RegionOptions.direction`, which the page already
   passes for every region from `directionOf`), whatever the mode. `downward` stays a flow's.
5. [x] **`structureOf`** (`structure.ts`): the same split. `cards`, `columns`, `links`, `crossing`, `empty` from the
   rest through the mode, as today; `LayoutStructure.timeline?: { direction, cards: { id, at, side }[] }` in line
   order (from `sortByTimeline`, the same alternation). No pixel sizes, as before.
6. [x] **`showLayout`** (`apps/board/server/engine/reads.ts`): fill the response's `timeline` (T_01's schema) from
   `structureOf`, the direction from `directionOf` as the page draws it. Test (`api-layout-timeline.test.ts`, port
   7810 if it starts a server): a container with dated and undated cards reports both, in drawn order; a container
   with none leaves `timeline` out and answers as before; the person's direction choice turns `side` to `left` and `right`, alternating.
7. [x] **Same picture**: a test that the order and sides `structureOf` reports equal those `layoutRegion` draws, for the
   same view (the structure agrees with the picture, `types.ts` `LayoutStructure`).
8. [x] **Timing**: add a case to `layout.timing.ts` (a container of 40 dated and 40 undated nodes) and report the time
   beside the existing cases; no budget is set by this task.
9. [x] **Docs** (`cortex-docs`): `docs/specification/components.md` § The timeline (layout half): the split, order,
   sides, step, years, bands, gap, pins, direction, `show_layout`; each claim names its symbol and test. FE_02 adds the
   page's half in wave 3.
10. [x] Project checks (PLAN.md § Tests). No page spec: the page joins the layout in FE_02. Report the page weight
    you measure (`npm run build` then the verify weight check) for the orchestrator; do not edit budget files.

---

## Validation

- [x] Every existing `packages/layout/tests/*` passes unchanged; `timeline.test.ts` covers step 1's list
- [x] `api-layout-timeline.test.ts` and the existing `api-layout*.test.ts` pass
- [x] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check` pass (verify: two orchestrator-owned
      failures only, `modules.md` needs `npm run map` and the page weight 202.9 KB over the temporary 201.6; `npm test`:
      2,686 of 2,687, the one failure the plugin budget, `view/board.js` 197,492 gzip over the temporary 195,900;
      `test:timing` 15 of 15)

---

## Constraints

- The layout stays a pure function: no DOM, no flag reads for the timeline (the page's flag is FE_02's gate), no clock.
- If deviation is needed, collaborate with the maintainer. No PII in examples. No git commands that change state.
  Interim files in `temp/`; writes over 50 lines in chunks.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-11-18 23:40  

### Changes Made
- `packages/layout/src/timeline.ts` (new, pure): `layoutTimeline(nodes, sizes, direction, { widths, rowGap })` returns
  `{ pos, drawing: TimelineDrawing, box }` region-local from (0, 0); split into `across`, `down`, `stemEnd`, `yearsOf`,
  `bandsOf`; `timelineOrder` (from `#format` `sortByTimeline`, with `timelineSide`), `timelineStep` (call 6),
  `timelineWidthsOf` (decision 21, point 595), `reachTimeline` (the line to the content's right edge), `shiftTimeline`
  (region-local to board). Constants: `TIMELINE_STEM` 30, `TIMELINE_SIDE_GAP` 28, `TIMELINE_MIN_STEP` 120,
  `TIMELINE_MIN_DOT` 56, `TIMELINE_YEAR_ROOM` 56, `TIMELINE_END_ROOM` 30.
- `board.ts` `layoutRegion`: splits dated from the rest; no dated node takes today's path untouched (proven against
  HEAD, below). Otherwise the mode runs on the rest with the links among the rest; `beside` moves its answer
  `REGION_GAP` below the timeline's box, or run down `COL_GAP` right of it with tops level with the line's start, lane
  bands with it; pins apply to the rest only, after the move; `makeRoom` keeps moved cards out of the timeline's band
  (`bandOf`); `reachTimeline` runs the line to the content's right edge. `RegionOptions.timelineWidths`.
  `packRegions`: `RegionBox.timeline` in board coordinates; dated nodes in `groups` in every mode (radial's rest still
  out). `layoutBoard` passes `LayoutOptions.timelineWidths`.
- `types.ts`: `RegionPiece.timeline`, `RegionBox.timeline`, `LayoutStructure.timeline`, `LayoutOptions.timelineWidths`,
  `Lane.x` (optional: where a lane band starts when a timeline runs down beside it).
- `structure.ts` `structureOf`: the same split (`arranged` is the old body, on the rest); `timeline: { direction,
  cards: { id, at, side }[] }` from `timelineOrder`.
- `index.ts`: exports `layoutTimeline`, `timelineOrder`, `timelineStep`, `timelineWidthsOf`, the six constants, `COL_GAP`.
- `apps/board/server/engine/reads.ts` `showLayout`: fills `timeline` (`n`, `at`, `side`), left out with no dated card.
- Tests: `packages/layout/tests/timeline.test.ts` (9), `timeline-region.test.ts` (11), `layout.timing.ts` (one reported
  case), `apps/board/tests/api-layout-timeline.test.ts` (3). No existing expectation changed.
- `docs/specification/components.md` § The timeline: layout (each claim names its symbol and test).

### Values chosen (from run 2, DESIGN_01 and § Design review)
- `TIMELINE_STEM` 30 (591, both forms). `TIMELINE_SIDE_GAP` 28 and `TIMELINE_MIN_STEP` 120 (call 6, DESIGN_01: the
  formula gives run 2's 154 for size s and 174 with one size m, tested). `TIMELINE_END_ROOM` 30 (DESIGN_01: the line's
  end 30px past the last dot). `TIMELINE_MIN_DOT` 56 (DESIGN_01 run 2, the orchestrator's message).
  `TIMELINE_YEAR_ROOM` 56: the start year's label (mono 11.5px, `.14em`, four figures, about 34px, plus its 8px gap and
  the dot's ring); across only, since with a 280px node the first dot is at 140 anyway (the run-2 page). Run down, the
  first node starts at the top of the content (run 2).
- Run down the same-side gap is `RegionOptions.rowGap` (the skin's: `EDGE_ROW_GAP` 40 default, `ROW_GAP` 30 Command
  Lens), `ROW_GAP` when absent.

### Issues & Resolutions
- The orchestrator's mid-task message (DESIGN_01 run 2: row gap from the option, `TIMELINE_MIN_DOT` 56, the line one
  stem from the widest node on each side, the first node at the top) applied; tests hold each.
- A card moved out of a pin's way could land beside the timeline's nodes, in its rows, where the line (run on to the
  content's edge) passes: `makeRoom` now keeps out of the timeline's band, not only its box (`bandOf`).
- Oracle: a temp script (`temp/be01-oracle/`, HEAD's `packages/layout/src` beside the new one) found `layoutBoard`
  and `structureOf` deep-equal to HEAD's on 608 boards with no dated node (the four fixtures, across and down, and 600
  seeded boards over every mode with pins, directions, widths, hidden nodes and row gaps).
- `npm run map -- --help` rewrote `docs/specification/modules.md` (the script ignores `--help`); its content was put back
  from HEAD by hand (no git command). `npm run verify` fails on modules.md until the orchestrator runs `npm run map`
  (the new exports), and on the page weight (below).

### Measured (for the orchestrator's budget raise)
- Page (`npm run build`, verify's weight check): 202.9 KB gzip, budget 201.6 (T_01 measured 201.5).
- Plugin `view/board.js` (`plugin-build.test.ts`): 197,492 gzip, budget 195,900 (T_01 measured 195,849). The layout's
  timeline code and the `#format` date grammar it imports (`sortByTimeline`, `timelineYear`) now reach both bundles.
- Timing: 40 dated and 40 undated cards, 1.7 ms across, 2.0 ms down; the 1,000-card cases unchanged (6.4, 10.3, 50.3 ms).

### Caught Beyond the Brief
- The page's layout cache (`apps/board/src/board/canvas/layout-cache.ts` `nodeKey`) keys a container on each node's
  id, kind, lane, size and pin, not its `timeline`: a date written or changed would not lay the container out again.
  FE_02 must add `n.timeline` to the key, and `timelineWidths` and the direction (already keyed) to the inputs.
- The page passes `widths` already resolved with the mode's default (`canvas/draw.ts`), so the layout cannot tell a
  person's choice from a default: `LayoutOptions.timelineWidths` carries the dated nodes' widths separately, worked
  out by the caller with `timelineWidthsOf(direction, region.widths, chosen)`.
- `show_layout`'s `widths` stays the rest's (`widthsOf`); the dated nodes' widths are not reported. Not in T_01's
  schema; left as is.

### Deviations from Plan
- None in substance. Additive beyond the step list: `Lane.x` (step 3's "lane bands with them" needs an x run down),
  `LayoutOptions.timelineWidths`/`RegionOptions.timelineWidths` (decision 21 needs the person's raw choice), and the
  band keep-out (decision 15's "out from under the line").

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
