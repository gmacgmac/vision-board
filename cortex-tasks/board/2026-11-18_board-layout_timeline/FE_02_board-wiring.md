# FE_02_board-wiring: The Board Draws the Timeline

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Join BE_01's layout to FE_01's drawing on the board behind the `timeline` flag: the line drawn in the wires layer, no
drag on a dated node, Move to, links, the direction choice on a container with a timeline, a live gallery section, and
page specs that prove each.

---

## Context

PLAN.md decisions 7-18, calls 4-5 and 11, and § Design review are this task's rulings. After wave 2: the layout returns
`RegionBox.timeline` (`TimelineDrawing`, board coordinates) and lays a container's other nodes below it, or to its right run down (BE_01); the
node draws its date header, sets `data-timeline`, and `#ui` `timelineMarkup` draws a drawing (FE_01); the server stores
and reports the key (T_01). Nothing on the page uses them yet. The flag has one gate, here: with it off the board and
its screenshots are exactly as before the set.

**Read previous task notes in TASK-STATUS.md before starting** (every wave-2 note; FE_01's components.md paragraph is
in its `REQUESTS`). Wave 3, alone, in `.claude/worktrees/app-window`, `VB_TEST_PORT=8110`.

---

## Inputs

- **Files to modify**: the page's view gate (the one place the page builds the view it lays out and draws: find it
  from `apps/board/src/board/canvas/draw.ts` `createDrawing` and `apps/board/src/board/board-data.ts`; name it in the
  notes), `apps/board/src/board/links/wires.ts`, `apps/board/src/board/input/pointer.ts`, the selection drag and any
  other writer of a card `pin` (`apps/board/src/board/selection/`, `canvas/places.ts`), `apps/board/src/board/canvas/
  render.ts` and `packages/ui/src/region/` (`region-template.ts` `directionRow`, `region-core.ts`, their words in
  `packages/ui/src/words/` if a hint must change), `apps/board/src/gallery/timeline-board-section.ts` (new) and
  `main.ts`, `tests/pages/timeline.spec.ts` (new) and the screenshots of the specs in PLAN.md § Tests, the budget
  files (`scripts/verify-weight.mjs`, `apps/board/tests/plugin-build.test.ts` `BUDGET`,
  `docs/specification/performance.md`), `docs/specification/components.md` (§ The timeline, the page's half).
- **Files to reference**: `wires.ts` (`lanesOf`, `frame`, the incremental redraw), `pointer.ts` (`HANDLE`,
  `carriedFrom`), `selection/moves.ts`, `canvas/places.ts`, `canvas/layout-cache.ts` (per-region inputs),
  `apps/board/src/gallery/mini-board.ts` and `flow-section.ts`, `tests/pages/flow-direction.spec.ts`,
  `move-and-later.spec.ts`, `node-edges-board.spec.ts` (spec shapes and fixtures), PLAN.md § Design review.
- **Shared artifacts to reuse**: `#layout` `RegionBox.timeline`, `TIMELINE_*` (BE_01); `#ui` `timelineMarkup`,
  `timelineLabel`, `data-timeline`, `MarkdownOptions.entries` (FE_01); `#format` flag `timeline`, `directionOf` (T_01).
  Move to is the existing `move` action; no new action.
- **Skills**: `cortex-architecture` (one action layer, no new action; words), `cortex-docs` (components.md).

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Spec first** (`tests/pages/timeline.spec.ts`, its own temp ledger with a container of dated and undated
   cards, two equal dates, a year turn, a link from a dated card to an undated one, one icon card; `?flags=timeline`):
   - the line, one dot per dated card, dots in date order, alternating, a band behind the equal pair, the year at the
     start and at the turn, the arrow; the undated cards below in the container's layout;
   - flag off: no `.vb-timeline`, no date header, every card where the same ledger with no `timeline` keys draws it (compare
     the boxes);
   - a drag started anywhere on a dated card (its top edge, its plate in Command Lens) moves nothing and writes no
     `pin`; a selection drag of a dated and an undated card moves only the undated one; Reset places leaves the line
     as it is;
   - Move to (the selection bar's Move, and its command) moves a dated card to another container, where it joins that
     container's line;
   - the link draws and highlights as any link;
   - the container's widths control (match or own) changes the dated nodes as well as the others; run down with no
     choice the dated nodes match (PLAN.md decision 21, point 595);
   - the layout menu of a container with a timeline (a `row`) offers Across, Down and Auto; Down draws the vertical
     form, the undated cards in a second column to the line's right; Auto gives the board's or the agent's back;
   - Tab reaches the dated cards in the order the board's focus rule gives (node overhaul: "order as drawn"); if that
     rule is card-number order, say so in the notes rather than change it;
   - both skins, light and dark: a screenshot of the container; axe clean.
2. [ ] **The flag's one gate**: with `timeline` off, the view the page lays out and draws has no `timeline` on any node
   (a copy, never the stored lines); everything downstream is data-driven. One place, named in the notes and in
   components.md, so T_03 removes one thing.
3. [ ] **The line** (`wires.ts`): a `vb-timelines` group between the lane bands and the connectors, filled from each
   `RegionBox.timeline` through `timelineMarkup`, with `look` from the drawn view's nodes (kind, tone); redrawn only
   when its markup changes, as `lanesOf` is; behind frames and cards with wire layers on. It scales with the world;
   no zoom number.
4. [ ] **No drag on a dated node**: `pointer.ts` refuses a drag start inside `vb-node[data-timeline]` (the handle
   selector stays as it is for every other node); the selection drag carries undated cards only; any other path that
   writes a card `pin` (find them: grep `action: 'pin'`) skips dated cards. Each is a failing spec case first. The
   layout ignores a dated card's pin anyway (BE_01).
5. [ ] **Direction**: the layout menu's direction row shows on a container that is a flow or has a timeline (the page
   tells the region which, through `createRegionSet`'s options as it tells `direction`); its words still read right
   for a timeline (if a hint says "flow", give the row a timeline wording in the region words file).
6. [ ] **Measure**: dated cards are measured as drawn (the bigger type, `data-timeline` set before the measure); check
   with a long title and entries.
7. [ ] **Gallery** (`timeline-board-section.ts`, with the flag as the pattern says): a mini board laid out for real: a
   container with a timeline and a row below, a band, a year turn, a link; the same run down; default and Command
   Lens.
8. [ ] **Docs** (`cortex-docs`): components.md § The timeline, the page's half (the gate, the wires group, no drag,
   Move to, direction, the gallery) and FE_01's node half from its `REQUESTS`, each claim with its symbol and spec.
9. [ ] **Look** in a browser, light and dark, both skins, against the pages; zoom from 20% to 250%: the line, stems
   and dots stay joined to their cards at every zoom.
10. [ ] Project checks and the specs in PLAN.md § Tests for FE_02; `npm run test:plugin` (the hosted board draws the
    line too). Raise a temporary budget to what you measured if the work needs it, and say so (budgets never block).

---

## Validation

- [ ] `timeline.spec.ts` passes, both skins, light and dark, axe clean
- [ ] The other named specs pass with no screenshot change except the new gallery section
- [ ] `npm run test:plugin`, `npm run verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- No new action and no new record: a dated card simply never writes a `pin`.
- If deviation is needed, collaborate with the maintainer. No PII. No git commands that change state. Interim files
  in `temp/`; writes over 50 lines in chunks. Never port 4466.

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

1. Fill in Implementation Notes (screenshots renewed, budgets raised); set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FE_02_board-wiring.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (`npm run map`), `NOTES`.
