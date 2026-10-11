---
task_name: Field report batch 3 - layout
created: 2026-10-11
status: in-progress
tracker: cortex-tasks/tracker.md#M2
---

# Field report batch 3 - Task Status

> **Plan**: [PLAN.md](./PLAN.md). Go given (538).

| # | ID | Task | Model | Status | Notes |
|---|-----|------|-------|--------|-------|
| 1 | BE_01 | Contract | Opus 5.5 | Done (contract; 1 gate red until BE_03) | `widths` (v13), `show_layout`, `LayoutStructure`; api.md 132-134 |
| 2 | BE_02 | Layout engine | Opus 5.5 | Done (1 gate red until BE_03, as BE_01) | Layered lanes, gutter routing with tracks, label places, align and widths inputs, `structureOf` |
| 3 | BE_03 | Server and actions | Opus 5.5 | Done (all five gates green) | `show_layout` handler, `widths` folded, `state.widths`, act rule; api-layout and widths tests |
| 4 | FE_01 | Page | Opus 5.5 | Done (all five gates green) | Labels and markers, Centre cards, Match card widths switch, widened-card height, bubble clear of footers, gallery |
| 5 | T_01 | Skill | Opus 5.5 | Planned | |
| 6 | VERIFY_01 | By hand | Orchestrator | Planned | |

## Implementation Notes

### BE_01

**Status**: contract done 2026-10-11. One thing is red, as briefed: `show_layout` is in the route
table with no server handler yet (BE_03), so `check` has 1 tsc error (`apps/board/server/handlers.ts`
`HANDLERS` lacks `show_layout`) and `npm test` 1 failure (`api-errors.test.ts` "the handler table has
exactly one handler per operation"). Nothing else of BE_02/BE_03/FE_01 was done beyond compiling.

**Built (api.md 132-134).**
- Format: `LEDGER_FORMAT` 13 (`LEDGER_FORMATS` 2-13); every ledger `$id` at `/ledger/13/`; OpenAPI
  1.18.0. `view.ts`: `WIDTHS` (`match`, `own`), `Widths`, `DEFAULT_WIDTHS` (by mode, the one place:
  match for grid and column, own for flow, row, lanes, radial), `widthsOf(mode, own?, chosen?)`
  (person, then region, then the shown mode's default), `Region.widths`. `ledger.ts`: `ACTION_IDS`
  + `widths`, `ActEvent.widths`. `ledger-shape.ts`: region and act `widths`; a `widths` act needs
  board, region, widths (like `mode`). `ledger-index.ts` `actContext`: the container must exist.
- Schemas: common `widths` (+ stamp `v` 13); region `widths`; act `widths` (action, field, rule);
  view region `widths`; `get_board` `state.widths` (person's choice per region, optional); new
  `api/show-layout-response.schema.json` (`head, board, region, mode, widths, lanes?, columns,
  cards[{n, lane?, column, row}], links, crossing, empty`).
- OpenAPI: `show_layout` `GET /api/boards/{board}/regions/{region}/layout`, x-agent, same errors as
  `show_container`; `write_board` and `act` descriptions name widths. `npm run gen` (route table,
  MCP tool `show_layout`, `vb show-layout`, api-reference).
- Actions (to compile): registry `widths` (person, `onItem` false, label "Card widths");
  `references.ts` `ACT_SCOPES.widths = onContainer`.
- Layout: `types.ts` `CardCell`, `LayoutStructure` (node ids; no mode, widths or board: the
  server adds them). Exported through `type *`.
- Tests: `packages/format/tests/widths.test.ts` (3); `schema-cases.ts` at v13 with a valid `widths`
  act and 5 broken widths lines, `unknown format v14`; `schema.test.ts` (WIDTHS = schema enum, a
  region with widths, sent forms); `openapi.test.ts` 1.18.0; `route-table.test.ts` auth;
  `references.test.ts` `act:widths`; four API tests expecting stored `v` 12 now 13.
- Docs: api.md 132-134, the operations row, front matter; format and layout READMEs.

**Gates.** `verify` ok (0 warnings); `gen --check` current; `check`: svelte-check 0, tsc 1 (above);
`npm test` 1063, 1062 pass, 1 fail (above), so `test:timing` did not run (layout untouched);
`test:pages` 360 passed.

**Hand-off to BE_02 (layout engine).**
1. Produce `LayoutStructure` (types.ts) with a pure function, e.g. `structureOf(region, nodes,
   links, mode)` in its own file, exported from `index.ts`; same arrangement as the mode draws
   (rulings 1-3), so the picture and the answer agree. `cards` in the order given (the server sends
   card order); `id` = node id. `columns`: columns used (rings in radial, centre = 1). `row`: from 1
   at the top; in lanes the place in the lane's stack in that column; radial the place round the
   ring. `links`: links joining two of the cards; `crossing`: how many of them cross at least one
   other (a count of links, not of crossing points). `empty`: cells with no card inside the
   columns x rows used (lanes: lane x column cells, a stack counts as one cell); 0 in radial.
2. Widths as an input: `LayoutOptions.widths` (region id -> `Widths`) and `layoutRegion`'s opts,
   resolved by the caller with `widthsOf`; under `match` every card in a column takes the column's
   widest width (grid and column today already line columns up by widest; `size` w changes).
   Alignment (ruling 4) is a page-only input (no format type), top for horizontal, left for vertical.

**Hand-off to BE_03 (server and actions).**
1. `show_layout` handler in `apps/board/server/reads.ts` (`READS`): the same board/region checks as
   `show_container` (unknown board or region, `later`, and a retired container: `not-found`); the
   cards in the container now (`placeOf`, retired out) in card order as View nodes; links between
   them; mode = the person's (`s.modes`) else the region's; widths = `widthsOf(mode, region.widths,
   person's)`; call BE_02's function; answer board numbers (`n = Number(id)` of the View node id),
   `lanes` only in lanes mode. Fixes the tsc error and the api-errors test.
2. Fold the `widths` act like `mode`: `fold.ts` `widths: Map<board, Map<region, Widths>>`; `get_board`
   `state.widths` (left out when none); `pending.ts` `concerns` and `response-order.ts` `placeIn`
   treat `widths` as `mode` (reported to agents that may answer in the container, sorted at its
   lowest card); `numbers.ts`/`eventOut` if it lists act fields. The View's region already carries
   `widths` (`boardView` spreads the stored region).
3. Tests: an API test per answer (spec-checked), two boards (board numbers), a moved-in card, a
   retired card left out; a `widths` act through `act` and `check_responses`.

**For FE_01.** The widths control in the container toolbar sends `act { action: 'widths', board,
region, widths }`; the shown value is `widthsOf(mode shown, region.widths, state.widths[region])`.

**Readings for the maintainer** (each easy to turn):
1. "How many links cross" = `crossing`, how many links cross at least one other (with `links` beside
   it), not the number of crossing points.
2. `show_layout` on a retired container is `not-found` (nothing is arranged), unlike `show_container`.
3. The person's widths choice outlives a mode change; without one, the default follows the shown mode.
4. No decision entry: v13 only adds, and widths, `show_layout` and per-viewer alignment are the
   maintainer's rulings 4-6 in PLAN.md (D-019 already covers a new operation).
### BE_02

**Status**: done 2026-10-11. Still red only from BE_01: `check` 1 tsc error and `npm test` 1 failure
(`HANDLERS` lacks `show_layout`, BE_03).

**Built** (`packages/layout`, pure, deterministic; every file under 300 lines).
- **Lanes** (`modes/lanes/`: `lanes.ts`, `columns.ts`, `order.ts`, `untangle.ts`; old `modes/lanes.ts`
  gone). Columns by link depth (`laneColumns`): every link moves on a column, and so does any card
  that follows an earlier card of its own lane by any path; no source is pulled towards its
  successor (flow still does), so a lane's cards wait only for what they depend on; cycles broken
  deterministically (`layers.ts` `acyclic`, depth-first in card order); a card with no links fills
  its lane's leftmost free cell in the columns used, else its shortest stack, never widening (a
  container with no links: each lane a row in card order). Stack order: barycentre sweeps
  (`order.ts`), then `untangle` swaps neighbours in a stack when the routed lines then cross at fewer
  points (bounded: 30 links, stacks of 8, 40 tries). Lanes are `LANE_PAD` (= GAP, was GAP / 2) above
  and below their cards, so the gutter between lanes is 48 px, room for tracks.
- **Routing** (`route/`: `route.ts`, `ports.ts`, `frame.ts`, `free.ts`, `search.ts`, `tracks.ts`,
  `crossings.ts`, `labels.ts`, `path.ts`; old `route.ts` gone). `routeLinks(links, boxes, groups?)`:
  a link between two cards of one container (`groups`, now `BoardLayout.groups`; every mode but
  radial) runs through free space, at least 6 px from any card (`free.ts`): three runs through a
  gutter, else five through a gutter, a band between rows or lanes and a gutter (`search.ts`, one
  direction, `frame.ts` turns the others into it). Short links first; each takes the cheapest free
  route once each crossing with the lines already placed costs 150 px, counting runs that would
  share a line as the crossings parting them will cost (a port stub that shares counts 1). Then
  `tracks.ts`: runs closer than 10 px whose lengths overlap get their own tracks, 10 px apart (down to
  2 px, lending half the clearance, in a crowded gutter), in the order that crosses least (exact for
  clusters of 6 or fewer), never outside their own free stretch. A side's only port leans towards
  the far end (source 0.12, target 0.06), so two crossing handoffs between cards side by side cross
  cleanly instead of running along one line. Links between containers, in radial, or with no free
  route keep the plain elbow (no `groups`: every link an elbow, as before).
- **Labels** (`labels.ts`): `Route.labelAt { x, y, fits }`. The label's box (`labelSize(text)`:
  6.5 px a character + 2 x 6 px, 18 px high; the page should draw it no wider) is centred on the line
  on the first stretch from the source that holds it 14 px clear of the port without covering a card
  or an earlier label (`fits: true`); otherwise `fits: false` and (x, y) is a point on the line 18 px
  from the source, for the marker. `Route.mid` is now the point halfway along the line.
- **Alignment and widths**: `Align` (`start` | `center`), `ModeInput.align`, `ModeInput.widths`,
  `LayoutOptions.align`, `LayoutOptions.widths` (region id -> `Widths`), `layoutRegion` opts `align`,
  `widths` (absent: `widthsOf(mode, region.widths)`, so the defaults show with no page wiring).
  `start` is top for row, flow and lanes (flow's barycentres now line up tops), left for column;
  grid top-left; `center` centres; radial unchanged. `match`: every card in a column takes the
  column's widest width (grid, column, flow and lanes columns; row unchanged, each card its own
  column).
- **`structureOf(region, nodes, links, mode?, widths?)`** (`structure.ts`): runs the mode on cards of
  one size (280 x 120) and the same router; `cards` in the order given, `lanes` only in lanes,
  `columns`, `links` (joining two of the cards, self-links out), `crossing` (`crossingLines`), `empty`
  (lane x column in lanes, a stack once; column x row elsewhere; 0 radial). Modes now return
  `cells` (column, row, lane), which is what it reads.
- **Page, as far as the defaults need** (FE_01 owns the controls): `layout-cache.ts` `LayoutInputs`
  `widths?`, `align?` (in each container's key; align in every key); `cards.ts` `place(layout,
  sizes)` writes `style.width` where the layout's width differs from the card's own and `measure`
  clears it first (measured at its own width); `wiring.ts` and `container-drag.ts` route drags with
  `layout.groups`.
- **Tests (tests first where a bug was found)**: `lanes-layered.test.ts` (the field-report shape;
  leftmost-column property on 60 seeded boards with cycles; cycle in a lane; lanes with no links;
  alignment; match), `routing.test.ts` (200 seeded boards in five modes: no line under a card off
  the fallback, fallback under 2%, right angles, no shared stretch; three tracks; determinism;
  elbows between containers, in radial, without groups), `labels.test.ts`, `align-widths.test.ts`,
  `structure.test.ts`, `route-checks.ts` (shared checks), a dense-links timing case in
  `layout.timing.ts`, a widths/align case in `apps/board/tests/layout-cache.test.ts`;
  `stack-gap.test.ts` stacks lanes by links now (unlinked cards make a row).
- Docs: `packages/layout/README.md`; `performance.md` (the dense-links check under the same 100 ms
  budget, today's numbers); api.md 133 (structure at one card size); `modules.md` (`npm run map`).

**Field report round 1** (`lanes-layered.test.ts`; the board itself is not in the repo, so a
reconstruction with its counts: 5 lanes, 16 cards, 16 links, 8 handoffs; content made up), 280 x 120
cards, before (commit 7da73cc) / after: columns 6 / 6 (the chain forces 6); width 2208 / 2208 px;
height 1074 / 1194 px (lane gutters); crossing 0 / 1 point (2 links); lines under a card 0 / 0;
links on a shared trunk 7 / 0; card 12 (starts Services' work alone) column 3 / 1. The one crossing
is the price of card 12 staying in column 1 (pulled next to card 9, as before, its link is short).

**Measured on 50 seeded field-sized lanes boards** (scratch, not kept), before / after per board:
owners (each lane a chain, 8 forward handoffs): crossing points 6.1 / 9.6, links crossing 6.9 / 8.8,
lines under a card 3.9 / 0, links on a shared trunk 5.2 / 0.04, width 2824 / 2816 px; random links
(some backwards): crossing points 10.0 / 11.7, lines under a card 5.3 / 0, shared 5.3 / 0.04.
Crossings plus lines under a card: 10.1 / 9.6 and 15.3 / 11.7. So the brief's "far fewer crossings"
did not come out: a line that went under a card now goes round it, and packing lanes left (no pull)
lengthens links from sources. Pulling sources again took about 1.5 crossing points per board off.

**Gates.** `verify` ok (0 warnings); `gen --check` current; `check`: svelte-check 0, tsc 1 (BE_01's);
`npm test` 1100, 1099 pass, 1 fail (BE_01's); `test:timing` 7 pass (layout 1,000 cards 3.1 ms, 6.2 ms
with pins, 32 ms with 1,179 links); `test:pages` 360 passed.

**Screenshots** (viewed, light and dark): `board.spec.ts` board-light/dark: the "Prove the idea" flow
row lines up by its tops (ruling 4), the lanes container's lanes are taller (48 px gutters), its
links run in the gutters, ports lean; the fitted zoom moves slightly with the bounds. Updated. No
other screenshot changed. `notes.spec.ts` "axe passes with the bubble open": the bubble beside card 4
covers card 5, and with the row top-aligned card 5's More context button now sits at the bubble's
edge, which axe reports as a small target (the full run only); the test now opens the bubble on card
6 (clear board to its right), with the reason in a comment.

**Readings for the maintainer** (each easy to turn):
1. A handoff to another lane moves on one column (`columns.ts` `HANDOFF = 1`, ruling 1's "link
   depth"). 0 would let a handoff drop straight down into the same column: much narrower boards,
   but drops into a stack go round the cards above (tried; it looked worse).
2. No source is pulled next to its successor in lanes (the brief: no lane pushed right by another
   lane's chain). Pulling costs that, and saves about 1.5 crossing points a board (one line in
   `columns.ts`).
3. A card with no links in a lanes container with links fills a free cell, else stacks; in one
   with no links at all each lane is a row.
4. Lines keep 6 px from cards; a crowded gutter (a grid's 24 px gap) packs tracks down to 2 px.
5. Links between containers still take the plain elbow and can cross cards (PLAN out of scope).

**Hand-off to BE_03.** `structureOf(region, nodes, links, mode, widths)` from `packages/layout`
(index). Pass the container's cards now as View nodes in card order (it keeps that order), any
links (it keeps those joining two of the cards, no self-links), the mode shown and `widthsOf(...)`
(it does not change the structure; cards are one size). Map `cards[].id` to `n`. `lanes` comes back
only in lanes mode. An empty container: columns 0, empty 0 (and `lanes` in lanes mode).

**Hand-off to FE_01.**
1. Labels: draw from `route.labelAt` (`fits`: the label centred on (x, y), on the line, no wider than
   `labelSize(label).w`, a background so the line does not show through; else a marker at (x, y),
   label floating on hover and focus). `wires.ts` still draws at `mid`. `LABEL_H`, `labelSize` exported.
2. Alignment: pass the viewer's `align` in `LayoutInputs` (`layout-cache.ts`); every container lays
   out again when it changes.
3. Widths: pass `widths` (region id -> `widthsOf(mode shown, region.widths, state.widths[region])`)
   in `LayoutInputs` once BE_03's `state.widths` lands; without it the page shows the region's or the
   mode's default. A widened card is drawn at the layout's width (`cards.ts`), but its height is the
   one measured at its own width, so a wider card that wraps less leaves a little more room below it
   (grid rows line up by the tallest anyway; in column mode the gaps grow). Measuring widened cards
   at the column width needs a second measure pass: yours if it shows.
4. The note bubble beside a card covers the next card, now including its footer buttons in a
   top-aligned row (see Screenshots): worth placing it clear of the next card's controls.

**For T_01.** Lanes placement changed: a lane's cards sit at the leftmost column their links allow
(no pull towards a successor), unlinked cards fill free cells, stacks are ordered to cut crossings,
and lines never run under a card. SKILL.md's "one shared column grid" still holds; NOTES.md's
dated description of the old placement stays history.
### BE_03

**Status**: done 2026-10-11. All five gates exit 0; BE_01's red gate (the missing `show_layout`
handler) is closed.

**Built.**
- `show_layout` (`apps/board/server/reads.ts` `showLayout`, in `READS`): the board check of every
  read (`requireBoard`); the container from the drawn view's regions, so an unknown one, the built-in
  Later and a retired one are `not-found` (a retired one says so: "was retired, so nothing is
  arranged in it"). The cards in it now: `placedView(boardView, boardState)` (the person's moves
  count, retired cards are out of `boardView`), in card order; every link of the view
  (`structureOf` keeps those joining two of its cards). Mode = the person's (`state.modes`) else the
  region's; widths = `widthsOf(mode, region.widths, state.widths)`. Cards answered as `n` =
  `Number(id)` of the View node; `lanes` only when `structureOf` gives them (lanes mode).
- `widths` folded like `mode`: `fold.ts` `LedgerState.widths` (board -> region -> `Widths`),
  `applyAct` case `widths`; `board-state.ts` `BoardState.widths` (a retired container's left out,
  one helper for modes and widths); `get_board` `state.widths` (left out when none); `pending.ts`
  `concerns` and `response-order.ts` `placeIn` treat `widths` as `mode`.
- **Found and fixed**: `act.ts` `validateAct` had no rule for `widths`, so the act fell to the node
  rules and every `widths` act was refused ("n: unknown node"). Now `RULES.widths` and `RULES.mode`
  share `onContainer` (a region on the board the act was sent to).
- `BoardState` gained a required field, so the 8 `packages/ui/tests` that build a `BoardState`
  literal by hand got `widths: new Map()` (each repeats the same literal: a shared fixture would
  stop the next field touching 8 files; not done here, out of scope).
- Tests (tests first): `packages/actions/tests/widths.test.ts` (3: checked like mode, folded with the
  latest winning and a retired container left out, reported to the agents that may answer in the
  container at its lowest card); `apps/board/tests/api-layout.test.ts` (7, every answer
  spec-checked): a lanes and a flow container each equal to the cells read back from `layoutBoard`
  over the placed view with mixed card sizes (280/360/464 wide, 96-180 high), a card moved in, a
  retired card left out, a `widths` act through `act` and `check_responses` and into `get_board`
  and `show_layout`, the person's mode wins and widths follow the shown mode's default, a second
  board's numbers (pricing), and the refusals (unknown board or container, Later, retired; and
  `show_container` still answering the retired one).

**Gates.** `npm test` 1110 pass, 0 fail, `test:timing` 7 pass; `check` svelte-check 0, tsc 0;
`verify` ok (0 warnings); `gen --check` current (`npm run map` no change); `test:pages` 360 passed.

**Readings for the maintainer** (each easy to turn):
1. `show_layout` answers the arrangement whatever the viewer hides (decided cards hidden by "Hide
   decided" are in it): the agent sees every card in the container now.
2. A moved-in card with no `lane` (or one the lanes don't name) goes in the first lane, as the page
   draws it (`laneOf`).

**Hand-off to FE_01.**
1. `data.state.widths` (`BoardState.widths`, region id -> the person's choice) is there now; pass
   `widths` in `LayoutInputs` as region id -> `widthsOf(mode shown, region.widths,
   state.widths.get(region))`, the same expression the server uses for `show_layout`.
2. The toolbar control sends `act { action: 'widths', board, region, widths }`; `validateAct`
   accepts it now (it did not before BE_03). Registry label "Card widths"; not an answer, so Send
   does not wait for it.

**For T_01.** `show_layout` answers as api.md 133 says; on a retired container it is `not-found`
with "was retired" in the detail. In lanes mode a card's `row` is its place in the lane's stack
in that column. `empty` in a lanes container counts lane x column cells, so a lane no card uses
adds a whole column count (the test's 3-lane, 3-column container with an unused lane: `empty` 5).
### FE_01

**Status**: done 2026-10-11. All five gates exit 0.

**Built.**
- **Flags** (`packages/format/src/flags.ts`, on by default): `linkLabels`, `alignSetting`, `widthsControl`;
  read once in `controller.ts` and passed down (components.md § Feature flags).
- **Labels (ruling 3)**: `wires.ts` draws from `route.labelAt` through `link-labels.ts`: where it fits,
  a canvas-coloured tag (`labelSize` wide, `LABEL_H` high) with the text centred, squeezed by
  `textLength` only if the page's font runs it wider (measured once per text, after the writes);
  the top layer repeats it for the focused card. Where it does not fit, `link-marks.ts`: a 24 px
  button (a ring on the line) in its own layer `#link-marks` (App.svelte; outside the aria-hidden
  SVG), named "Link from 4 to 5: <label>", Tab after the cards, its label in the shared hover tip
  (`bindHoverTip`: hover, focus, Esc closes, hoverable) at z 5, above open frames and cards.
  Off: the old text at `mid`.
- **Found and fixed in the layout** (`packages/layout/src/route/labels.ts` `markerAt`, test first in
  `labels.test.ts`): two markers from neighbouring ports sat 18 px apart, one 24 px target over the
  other (axe target-size). A marker now takes the first point along its own line, from near the
  source, whose 24 px target (1 px spare) covers no card, label or earlier marker.
- **Alignment (ruling 4)**: "Centre cards", a `menuitemcheckbox` in the "⋯" menu after Hide decided
  (ToolbarMenu.svelte, new `align` icon), off by default; `shell.align`, kept in this browser as
  `vb.align` (`src/shell/align.ts` over `kept.ts`); App.svelte's effect calls `board.relayout()`;
  `DrawDeps.align` -> `LayoutInputs.align` (`start` with the flag off, whatever is kept).
- **Widths (ruling 5)**: `draw.ts` passes `widths` per region =
  `widthsOf(modes.get(r) ?? r.mode, r.widths, state.widths.get(r))` (the server's expression). The
  switch: `button.vb-widths[role=switch]` "Match card widths" in the mode row after the divider,
  before Comment (region-template `widths` option, never in a fixed frame); `aria-checked`, title
  "Card widths: Match | Own" (`widthsTip`), the checked look and the match/own icon; one of the
  row's roving stops (arrows reach it, Space/Enter press it); `RegionState.widths` (region-core).
  A press sends `act { action: 'widths', board, region, widths }` (wiring.ts -> places.ts
  `setWidths`; io.ts `NAMES_BOARD` + `widths`). States: idle, hover, focus, pressed (the row's
  segment looks), on/off; an error is the act's error toast, as the mode's; read-only past version:
  the guarded handler does nothing, as the mode's. In a frame under 440 px the switch hides with the
  unchecked layouts until the row expands, and an expanded row's icons are 24 px wide, so it stays
  a target's room clear of the grip (found by the containers and send-access axe tests).
- **Widened card height (BE_02 note 3)**: the gap showed (a widened card wraps less). `cards.ts`
  measures each card's own width and its height at the width it was last drawn at;
  `remeasure(layout, sizes)` measures again any card the layout now draws at another width, and
  `draw.ts` lays the board out once more when a height changed (counted in `work`). Converges in
  one extra run (widths depend on widths only). `same-picture.spec.ts` now sends `widths` acts as
  often as mode acts, so a fresh page must agree.
- **Note bubble (BE_02 note 4)**: `placeBubble(card, bubble, stage, avoid)`: keeps clear of the
  strips in `avoid` by moving up or down its side (arrow still on the card), then the other side,
  then below the card; covers them only when nothing is clear (tests first, note-bubble.test.ts).
  `bubble-clear.ts` `footersNear` gives the footer strips of the cards within reach (layout boxes,
  footer offset read from the card). `notes.spec.ts`'s axe test is back on card 4.
- **Gallery** (`layout-section.ts`, `mini-board.ts`: the board's own `createDrawing` on one container
  of a new fixture board `layout`, 22 lines at v13 with a person's `widths` act): Link labels (fits +
  two markers; a marker floating), Card alignment (top; centred), Card widths (match, focused; own,
  hovered). Region pattern.json `flaggedStates.widths`.
- **Tests**: unit (region-core, region-template, note-bubble, labels, kept); page
  `layout-controls.spec.ts` (17: tag size and centring, flag off; marker hover/focus/Esc and name;
  Centre cards centres, is kept over a reload, off again, flag off ignores a kept centre; widths
  switch states, a click and the keyboard send the act, column at 464 with 24 px gaps under match
  and own; flag off; bubble beside card 4 clear of card 5's footer; axe light/dark with the switch
  focused and the menu open; three gallery sections axe + screenshots; sections only with flags);
  toolbar.spec (the menu's rows), notes.spec (zoomed out to fit, the bubble on card 4 now opens on
  the left: its right had no clear place), gallery.spec (full-page screenshot with the three flags off).

**APCA**: no new pair. Label text `--vb-ink-subtle` on the tag's `--vb-surface-canvas` (the pair the
label had): Lc 70.3 light, 49.6 dark (short-label tier 45). Marker ring `--vb-wire` on canvas: 55.8 /
32.8 (decoration 30); hot `--vb-wire-hot` (accent): 66.1 / 48.5. Tip, switch and menu row use
existing pairs.

**Screenshots** (each diff viewed first):
- `board.spec.ts` board-light/dark: each frame's mode row gains the switch; "informs" moved from
  mid-line to its tag near its source. No card or frame moved.
- `toolbar.spec.ts` toolbar-light/dark: the open menu has Centre cards after Hide decided (and the
  caption says so).
- New: `layout-controls.spec.ts` link-labels, alignment, card-widths (light and dark).
- Not changed: the full gallery screenshot (taken with the three flags off).

**Gates.** `verify` ok (0 warnings); `gen --check` current; `check` svelte-check 0, tsc 0; `npm test`
1116 pass, `test:timing` 7 pass (layout 1,000 cards 4.0 ms); `test:pages` 377 passed.

**Readings for the maintainer** (each easy to turn):
1. The switch reads "Match card widths" (a switch, on = match) with the title "Card widths: Match |
   Own", rather than a two-option control: one 24 px segment in an already long row.
2. Centre cards is one checkbox row (off = top and left), like Hide decided; with the toolbarMenu
   flag off there is no menu, so no alignment control (the layout keeps top and left).
3. A marker is named with the card ids of the page ("Link from 4 to 5: ..."), which are the board
   numbers; the gallery's second copies carry a suffix.
4. The bubble may now open below a card (over the next container's title line) when neither side
   is clear of footers; in the roadmap's "Prove the idea" row at full zoom that is what card 4 does.

**For T_01.** Nothing in the skill depends on the page; labels the agent writes now show on the line
only when short enough for the stretch (about 4 characters between flow columns), else as a marker.
### T_01
### VERIFY_01
