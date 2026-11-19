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

1. [x] **Spec first** (`tests/pages/timeline.spec.ts`, its own temp ledger with a container of dated and undated
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
2. [x] **The flag's one gate**: with `timeline` off, the view the page lays out and draws has no `timeline` on any node
   (a copy, never the stored lines); everything downstream is data-driven. One place, named in the notes and in
   components.md, so T_03 removes one thing.
3. [x] **The line** (`wires.ts`): a `vb-timelines` group between the lane bands and the connectors, filled from each
   `RegionBox.timeline` through `timelineMarkup`, with `look` from the drawn view's nodes (kind, tone); redrawn only
   when its markup changes, as `lanesOf` is; behind frames and cards with wire layers on. It scales with the world;
   no zoom number.
4. [x] **No drag on a dated node**: `pointer.ts` refuses a drag start inside `vb-node[data-timeline]` (the handle
   selector stays as it is for every other node); the selection drag carries undated cards only; any other path that
   writes a card `pin` (find them: grep `action: 'pin'`) skips dated cards. Each is a failing spec case first. The
   layout ignores a dated card's pin anyway (BE_01).
5. [x] **Direction**: the layout menu's direction row shows on a container that is a flow or has a timeline (the page
   tells the region which, through `createRegionSet`'s options as it tells `direction`); its words still read right
   for a timeline (if a hint says "flow", give the row a timeline wording in the region words file).
6. [x] **Measure**: dated cards are measured as drawn (the bigger type, `data-timeline` set before the measure); check
   with a long title and entries.
7. [x] **Gallery** (`timeline-board-section.ts`, with the flag as the pattern says): a mini board laid out for real: a
   container with a timeline and a row below, a band, a year turn, a link; the same run down; default and Command
   Lens.
8. [x] **Docs** (`cortex-docs`): components.md § The timeline, the page's half (the gate, the wires group, no drag,
   Move to, direction, the gallery) and FE_01's node half from its `REQUESTS`, each claim with its symbol and spec.
9. [x] **Look** in a browser, light and dark, both skins, against the pages; zoom from 20% to 250%: the line, stems
   and dots stay joined to their cards at every zoom.
10. [x] Project checks and the specs in PLAN.md § Tests for FE_02; `npm run test:plugin` (the hosted board draws the
    line too). Raise a temporary budget to what you measured if the work needs it, and say so (budgets never block).

---

## Validation

- [x] `timeline.spec.ts` passes, both skins, light and dark, axe clean
- [x] The other named specs pass with no screenshot change except the new gallery section
- [x] `npm run test:plugin`, `npm run verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- No new action and no new record: a dated card simply never writes a `pin`.
- If deviation is needed, collaborate with the maintainer. No PII. No git commands that change state. Interim files
  in `temp/`; writes over 50 lines in chunks. Never port 4466.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-18 23:46  

### Changes Made
- **The flag's one gate**: `apps/board/src/board/board-data.ts` `datedView(view, timeline)`, applied once in
  `controller.ts` `redraw` where `S.data` is built (`dating = on('timeline')`). On, a node keeps `timeline` only where
  `#ui` `datedOf` draws it (never an app card), so layout, node and pointer agree; off, no node has one. A copy where a
  key goes; returns the same view when nothing drops. T_03 removes this one call.
- **Layout inputs** (requests 1, 2): `layout-cache.ts` `nodeKey` holds `n.timeline`; `LayoutInputs.timelineWidths` is in
  the container's key and passed to `layoutRegion`; `draw.ts` `lay` passes `timelineWidthsOf(direction, r.widths, the
  person's choice)` per container.
- **The line** (`links/wires.ts`): a `vb-timelines` group between lanes and connectors; `timelinesOf` writes each
  `RegionBox.timeline` through `timelineMarkup` inside `<g data-region>`, only when the markup changes, then
  `applyTimelineLook` (request 4); dot looks from `draw.ts` `lookOf` (kind, tone of the drawn view, indexed once per
  view). Lane bands start at `Lane.x - (REGION_PAD - 8)` when set (request 3).
- **No drag**: `pointer.ts` `DATED` (`vb-node[data-timeline]`) refuses a move start anywhere on a dated node (plate
  included; `HANDLE` unchanged); `moves.ts` `placeable` filters `carried` and a drop's pins; `places.ts` `pin`
  (Alt+arrows) writes nothing for a dated node. No new action.
- **Direction**: `RegionState.timeline` (`region-core.ts`), set by `render.ts` from the layout's region;
  `vb-region.ts` `applyLayoutControl` shows the direction row on a flow or a timeline (the button's name keeps the
  direction for a flow only, "Layout: Row" on a row with a timeline); `region-template.ts` comment; region
  `pattern.json`. No word changed: Across "Left to right", Down "Top to bottom", Auto "The way the agent drew it" read
  right for a timeline.
- **Entries** (request 6): `markdown/entries.ts` `boldLead` drops one closing colon from the name (`**Name:**`), failing
  test first (`markdown-entries.test.ts`); markdown `pattern.json`.
- **Gallery**: `timeline-board-section.ts` (new): a launch plan as a row, six dated (a band, a year turn, an icon and a
  tone) and two not, a link from a dated card to an undated one; across and down, default and Command Lens, laid out by
  the board's drawing; `main.ts` appends it last with `?flags=timeline`. `mini-board.ts` gained `edges?: SkinDef`.
- **Docs** (request 5): `components.md` § The timeline: the node and the page (13 claims, each with its symbol and
  test); the layout section's pointer to it.
- **Tests**: `tests/pages/timeline.spec.ts` (16 tests); `apps/board/tests/layout-cache.test.ts` (a date in the random
  walk; a date written, changed, dropped, a direction and dated widths each lay out exactly their container);
  `board-data.test.ts` (`datedView`); `packages/ui/tests/markdown-entries.test.ts`.
- **Budgets raised** (temporary, measured): page 205.5 KB (measured 205.4; `verify-weight.mjs`, `performance.md`);
  plugin `view/board.js` 199,700 (measured 199,683; `plugin-build.test.ts`). `view/board.css` 25,519 within 25,550.
- **Screenshots**: no existing baseline renewed. New baselines (first run writes them) in
  `tests/pages/__screenshots__/timeline.spec.ts/`: `timeline-{default,command-lens}-{across,down}-{dark,light}-darwin.png`
  and `timeline-gallery-{dark,light}-darwin.png` (10, not git-added).

### Verification
- `timeline.spec.ts` 16/16 (both skins, light and dark, axe clean at fit and at full size; the gallery section axe
  clean). The named specs (`gallery`, `move-and-later`, `flow-direction`, `layout-control`, `wires`, `reset-places`,
  `select`, `node-edges-board`, `same-picture` + `timeline`): 101 passed, no screenshot change.
- `npm run check` 0 errors; `npm run verify` ok (45 warnings; `timeline.spec.ts` 339 lines warns); `gen -- --check`
  current; `npm test` 2,716/2,717 before the plugin budget raise, the one failure that budget; `plugin-build.test.ts`
  10/10 after; `npm run test:plugin` 116 passed.
- Looked at in a browser (dark, both forms) and at every spec screenshot (both skins, light and dark, across and down,
  the gallery); zoom 20% to 250% held by a spec (every stem within 2 screen px of its card's facing edge's middle).

### Issues & Resolutions
- A new hash alone does not switch the page's board: `open()` to a second board in one test kept the first. The spec
  opens from `about:blank` (`openOn`), which also made the "flag off" comparison real (the first run compared one board
  with itself).
- axe's `target-size` at full size, run down: zoom is about the middle, so the first cards' number buttons sat under the
  page header. The spec pans the board down before that axe run; not a timeline finding.
- Pin lines carry the card's identity, not its number: the spec counts actions instead.

### Caught Beyond the Brief
- **Tab order is card-number order** (`card-numbers.ts` `readingOrder`), not "as drawn": on a timeline it is not date
  order (the spec proves card 1, 2, 3, 4 while the line reads 2, 3, 1, 4). Left as is, per the brief.
- **The widths switch does not show the dated nodes' default**: it shows `widthsOf` of the mode (a row: off), so run
  down with no choice it reads off while the dated nodes match (point 595); on a grid across it reads on while they
  keep their own. Ruling as written; the maintainer may want the switch to say what the dated nodes do.
- **A link can run behind a card**: the link from a dated card above the line to an undated card below runs down
  behind the card on the other side (both skins; visible through see-through cards with wire layers). Out of scope
  (no special link routing, § Design review (5)); for VERIFY_01's judgement.
- **The line does not hide while cards glide** (`.vb-wires.settling` hides connectors only): for the 380 ms of a
  relayout the line is at its new place before the cards; lane bands behave the same. A one-line rule in `board.css`
  (not owned) if wanted.
- A drag on a dated node selects text, as a drag on any card's content does: the expected "press" gesture.
- The hosted board goes through the same controller, so the gate and the line apply there [INFERENCE: no plugin test
  turns the flag on; `test:plugin` passes unchanged].

### Deviations from Plan
- `apps/board/src/gallery/mini-board.ts` (a file to reference): one optional `edges` option, so the gallery's Command
  Lens board is drawn by the skin's row. Additive.
- `RegionState.timeline` is set in `render.ts` `place` from the layout's region rather than through a new
  `createRegionSet` option: the layout already says which containers have a line.
- `npm run map`: not needed (`verify` passes; no new module edge).

### Run 2

**Status**: Completed, (a) and (b); (c) stopped for the maintainer  
**Completed**: 2026-11-19 00:03  
**Brief**: the orchestrator's three fixes, PLAN.md § Design review "After FE_02". Both run-1 deviations accepted.

#### (a) Widths: one rule, the switch shows what is in force
- The one place: `#format` `view.ts` `widthsOf(mode, own?, chosen?, timeline?)`: with no choice, on a container with a
  timeline (its direction), the timeline's default (`match` run down, `own` across) replaces the mode's, for every
  node of the container. Callers pass the direction when a dated node is drawn: `#layout` `layoutRegion` and
  `structureOf`, the page's `draw.ts` `lay`, the server's `showLayout` (`reads.ts`), and `#ui` `regionState` (from the
  laid-out box's `timeline.direction`, so the switch shows what is in force).
- Removed as now redundant: `#layout` `timelineWidthsOf`, `LayoutOptions.timelineWidths`, `RegionOptions.timelineWidths`,
  the page's `timelineWidths` input and its cache key. Dated nodes take the container's `widths`.
- Tests first, each failing before: `packages/format/tests/widths.test.ts`, `packages/layout/tests/timeline-region.test.ts`
  (rewritten widths test; the "rest" test now compares with the mode run at the container's widths),
  `packages/ui/tests/region-widths.test.ts` (new), `apps/board/tests/api-layout-timeline.test.ts` (`show_layout`
  `widths`), `timeline.spec.ts` (the switch reads off across, on run down with no choice, on for a grid without a
  timeline, off for a grid with one). `timeline.test.ts` lost its three `timelineWidthsOf` lines.
- Docs: `components.md` (layout item 6; page items 6, 11), `api.md` (widths in effect), the `show_layout` `widths`
  description (`show-layout-response.schema.json`, `npm run gen`: `api-reference.md`).

#### (b) Glide
- `links/timelines.ts` (new, `createTimelines`): each container's bands, line, arrow and years in a
  `g.vb-timeline[data-region]` in its own coordinates, placed at the container's origin; each dated node's stem and dot
  in a `g.vb-timeline[data-node]` in the node's coordinates, placed at the node's box. Groups persist from draw to
  draw (keyed by container and by node, so a dot moved to another container glides too), markup rewritten only on
  change, place set through CSSOM. `board.css` `.vb-timelines > g` takes the cards' transform transition
  (`--vb-motion`, `--vb-ease`), so they glide with the cards and frames; `.vb-world.no-anim` turns it off as for cards.
  `wires.ts` calls it in place of `timelinesOf`.
- `#ui` `timeline-template.ts`: `timelineLineMarkup` and `timelineDotMarkup` exported, `timelineMarkup` built from them
  (output unchanged: `timeline-template.test.ts` passes as it was); `pattern.json`. `#layout` exports `shiftTimeline`.
- Test: `timeline.spec.ts` "during the relayout glide": motion on, every frame for 700 ms after the widths switch, every
  stem on its card, every dot on its stem and on the line. With the transition rule removed it fails (worst 96 px);
  with it, under 2 px. Known limit: when a container's line itself changes length or its years move, that part of the
  line changes at once; its place still glides.

#### (c) A link shows through a card: stopped, a recorded decision
- Measured on the spec's board in Command Lens light: the wires layer is `z-index: -1` (beneath frames and cards,
  `board.css` `[data-wire-layers]`), so it is not layering. The card's fill is 70% opaque
  (`linear-gradient(... / 0.7)`): `--vb-card-fill: 70%` (`tokens.css`), applied to every card under the wireLayers flag
  by `board.css` (`--vb-card-surface`). That is **D-032**: "Cards are 30% see-through ... so a connector behind a card
  shows faintly". It is the same in both skins, light and dark, on every board.
- Second cause: the route itself crosses card 4's box (a sampled point of the path inside the card), although dated
  nodes are in `groups` (the router is meant to route around them).
- Not changed: making cards opaque reverses D-032 (an existing decision entry) and edits `tokens.css`, both protected.
  Options for the maintainer: A, cards opaque (`--vb-card-fill: 100%` or the see-through fill dropped), a new decision
  amending D-032, every board's look changes; B, keep D-032 and make the router keep links off cards' boxes (a
  `#layout` route task; § Design review (5) put routing around the line out of scope, but this is around a card).
  No test was written, since a test that fails before would pin a ruling not yet made.

#### Verification (run 2)
- `timeline.spec.ts` 17/17 with the named specs: 102 passed. Screenshots renewed: `timeline-gallery-dark-darwin.png`
  and `timeline-gallery-light-darwin.png` only (the widths switch in the two run-down boards' rails now reads on, (a)); the
  eight board baselines are unchanged. No other spec's baseline changed.
- `npm run check` 0 errors; `npm run gen -- --check` current; `npm test` 2,718/2,719 before the plugin budget raise,
  `plugin-build.test.ts` 10/10 after; `npm run test:plugin` 116 passed; `npm run verify`: one failure,
  `modules.md` out of date (`npm run map`, orchestrator's: `timelineWidthsOf` gone, `shiftTimeline` exported).
- Budgets raised (measured): page 206.0 KB (205.9); `view/board.js` 200,200 (200,168); `view/board.css` 25,528 within
  25,550.
- Tab order unchanged (card-number order), as asked.

### Run 3

**Status**: Completed  
**Completed**: 2026-11-19 00:14  
**Brief**: the orchestrator's ruling on run 2's (c): option B, D-032 stands, the route is the defect.

#### Cause
- The router (`#layout` `route/route.ts` `lineFor`) searches free routes only between the facing sides `sidesFor` picks,
  and only through gutters that lie between the two ports (`search.ts` `threeRuns`, `fiveRuns`). Above and below a
  line the cards are staggered: for the spec's link (card 5 above, its left side, to card 8 below and left, its right
  side) card 4 covers every x between the ports, so no free route was found and the link fell back to the plain elbow
  (`path.ts` `elbow`), straight under card 4. Not `groups` (dated nodes are in them), not the shifted positions, not
  the boxes the page hands over: `layoutBoard` alone reproduces it (`M 724 138.6 … L 668 545.6 …` through card 4 at
  550-830 × 248-408).
- Measured before the fix: 260 of 6,888 links from a dated card ran under a third card (41 size seeds, across and down,
  row gaps 30 and 40).

#### Fix
- `route/ports.ts` `otherSides(a, b, sa)`: the other pair of facing sides (top and bottom for left and right, and back),
  each port in the middle of its side. `route.ts` `lineFor` tries the plan's sides, then these, before the elbow
  (`freeLine` holds the search once). Links that found a free route before route exactly as before.
- A port leaning aside (0.25 from the middle) was tried first and dropped: the search then took the line's own band,
  the only free one, and ran 240 px along the line. In the middle, the link leaves a dated node where its stem does and
  crosses the line at the node's own dot.

#### Tests (failing first)
- `packages/layout/tests/timeline-routes.test.ts` (new): every link from each dated card to every other card, 41 seeds
  (seed 0 the page's sizes), across and down, row gaps 30 (Command Lens) and 40 (default): 260 under a card before, 0
  after. `routing.test.ts` and every other layout test pass unchanged.
- `tests/pages/timeline.spec.ts` "never runs through a card": the link's path sampled every 4 px on screen, both skins,
  across and down: card 4 before (checked with HEAD's `route.ts` swapped in, no git state changed), none after.

#### Screenshots renewed (only these, by this run)
- `timeline-default-across-{dark,light}-darwin.png`, `timeline-command-lens-across-{dark,light}-darwin.png` (the link
  now leaves card 5's bottom and runs down beside card 4, not through it), `timeline-gallery-{dark,light}-darwin.png`
  (the same link in the gallery's across boards). The four run-down baselines and every other spec's are unchanged.

#### Verification (run 3)
- Named specs with `timeline.spec.ts` (18 tests): 103 passed, no other baseline changed. `npm test` 2,719/2,720 before
  the plugin JS raise; `plugin-build.test.ts` 10/10 and `npm run test:timing` 15/15 after. `npm run test:plugin` 116
  passed. `check` 0 errors; `gen -- --check` current; `verify` ok but `modules.md` (`npm run map`).
- Budgets: page within 206.0 KB (verify passes; measured 206.0 by a sum of the start assets); `view/board.js` raised to
  200,300 (measured 200,296); `view/board.css` 25,528 within 25,550.

#### Caught Beyond the Brief (run 3)
- A link may still run along the timeline's band when it is the only free one, and from a dated node's facing side it
  crosses the line at that node's dot (the wires draw above the timeline group, so the link passes over the dot).
  Routing round the line stays out of scope (§ Design review (5)); for VERIFY_01.

---

## On Completion

1. Fill in Implementation Notes (screenshots renewed, budgets raised); set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FE_02_board-wiring.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (`npm run map`), `NOTES`.
