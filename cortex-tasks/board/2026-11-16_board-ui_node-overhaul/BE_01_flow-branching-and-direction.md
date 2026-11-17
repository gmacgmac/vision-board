# BE_01_flow-branching-and-direction: Flow Branching and Direction

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make a linked sequence inside a container branch into rows instead of sending its links round the cards, and draw
a `flow` across or down as the board's record says: set by whoever draws it, changed by the person.

---

## Context

PLAN.md § Decisions 19, 20, 25 and § Planner's calls 7, 16 (tracker N51, N52). Direction is in the ledger, not a
page preference: an agent sets `direction` on a region with any redraw, the person changes it with the `direction`
act (`auto` clears their choice), and T_01's `directionOf` gives the one answer every reader uses (the ledger
review § 4 O5). The maintainer's example: a container "From
idea to production line" with seven cards in one line and a side branch from the second card; the links run over
and under the cards to reach cards further along. What is known (`CODE-MAP.md` § 9): `row` and `column` place
cards in card order and ignore links; `flow` layers by links, left to right only, and stacks a fork's branches in
the next column; the router goes round cards only inside one container. So the picture is most likely a `row`
container with links. Layout is a pure function; keep it one.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/layout/src/` (`modes/`, `board.ts`, `types.ts`, `layers.ts`, `route/`),
  `packages/layout/tests/`, `packages/format/src/flags.ts` (one flag for the branching rule),
  `apps/board/src/board/canvas/` (pass the options), `apps/board/src/board/chrome/` (the toolbar control),
  `apps/board/src/board/io/acts.ts` (the `direction` act's sender, if it needs a line),
  `apps/board/src/board/words/`, `apps/board/tests/`, `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 9; `packages/layout/src/route/frame.ts` (one direction, mirrored or
  rotated); `packages/layout/src/structure.ts` (`show_layout`'s answer); T_01's `directionOf`, `Region.direction`
  and the `direction` act (`widthsOf` and the `widths` act are the same pattern); `.kiro/steering/svelte-conventions.md`
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Reproduce first**: a layout test with the example's shape (seven cards in card order; links 1→2, 2→3,
       3→4, and a branch 2→5, 5→6, 6→7 that rejoins 4) in `row`, `column` and `flow`. Record in your notes what
       each draws and where a link passes round a card. This failing picture is the test.
2. [ ] **The rule** (behind its own flag, off): in `row` and `column`, when the cards' links are more than a
       simple chain in card order, the container is laid out by the flow rules in that direction, so a fork
       continues as parallel rows (or columns) and links run in the gaps between them. A `row` or `column` with no
       links, or a plain chain, draws exactly as today. If your findings point to a different cause or rule, stop
       and report before building.
3. [ ] **In `flow`**: each branch of a fork keeps its own straight row to its end; a branch that rejoins comes back
       with one clean link. Fix what the reproduction shows; routing round a card remains only where no gap
       exists.
4. [ ] **Direction** (flag `flowDirection`): each `flow` container is laid out `across` or `down` by
       `directionOf` for that container (the person's choice for it, else theirs for the board, else the region's,
       else `across`). `flow` in `down` layers top to bottom. The router and labels work in both. With the flag off
       every `flow` is `across`, as today.
5. [ ] **The board's choice**: a toolbar control, Across, Down or Auto, that writes the `direction` act with no
       `region` through the one sender (Auto clears the person's board-wide choice). It redraws in place. A
       container's own choice is FE_07's, in its layout control. On a read-only board it is disabled with its
       reason.
6. [ ] `show_layout`'s answer to an agent is worked out from the same fold and stays true for what is drawn, in
       both directions.
7. [ ] Tests: the reproduction now passes; no-overlap, routing and timing tests in both directions; the precedence
       of `directionOf` as the layout sees it; a page spec for the control. Update `components.md`.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` (with `test:timing`) pass
- [ ] With both flags off every layout test and page screenshot is unchanged
- [ ] With them on: in the example no link crosses or rounds a card, and the same view always draws the same
      picture (determinism test)
- [ ] A `flow` region an agent wrote `down` draws down; the person's Across wins; Auto brings the agent's back; the
      same board read by another page draws the same (tests)

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-17 18:40  

### Changes Made
- **Reproduction** (step 1; `packages/layout/tests/flow-branches.test.ts` "the reproduction, flags off"): the example in
  `row` and `column` lays the seven cards in one line in card order; 2>5 and 7>4 skip cards, so the router sends them
  round the line (six-point routes over and under it). That is the maintainer's picture. In `flow` the fork splits
  above and below the trunk (3 above 2, 5 below), so 1, 2 and 4 sit between the branches and every link bends. The
  cause is as the brief guessed: row and column ignore links; flow's barycentre places a fork around its parent.
- **Branches on rows** (flag `flowBranches`, `packages/format/src/flags.ts`): `packages/layout/src/modes/branches.ts`
  (`branchRows`, `plainChain`): chains, the main line following each card's first link in card order; a branch takes
  the nearest row (below, then above) free over its whole run; a rejoining branch keeps its row to the column before
  the card it rejoins; unlinked groups are separate bands. `modes/flow.ts` keeps the rows unless their links, routed as
  the board routes them, cross more than the stacked flow's (straight strokes above `ROUTE_WEIGH` = 30 links).
- **Row and column** (`modes/grid.ts`): with `flowBranches`, links that are more than a chain in card order lay a `row`
  out as a flow across and a `column` as a flow down; no links or a plain chain is byte-for-byte as before (test).
- **Down** (flag `flowDirection`): `flow.ts` `down` turns the cards a quarter, runs across, turns back; cells read as
  drawn; `ModeOutput.down` -> `BoardLayout.downward`; `route/ports.ts` `sidesFor(a, b, down)` leaves by the bottom and
  top first and `offCentre` keeps top/bottom ports off the kind tab; `routeLines`/`routeLinks` take `downward`.
- **Inputs** (`types.ts`, `board.ts`): `ModeInput.direction/branching`, `RegionOptions.direction/branching`,
  `LayoutOptions.directions/branching`; `structureOf(..., drawn)`. The page: `canvas/draw.ts` (`DrawDeps.direction`,
  `branching`), `canvas/layout-cache.ts` (both in a container's key); `show_layout`: `server/engine/reads.ts`
  `showLayout` reads `directionOf` and both flags.
- **The board's choice** (step 5): the "⋯" menu's Flows rows (`chrome/ToolbarMenu.svelte`, `menuitemradio` Across,
  Down, Auto; disabled with `READ_ONLY_PERSON` on a read-only ledger or a past version), `controller.ts` `setDirection`
  (one `direction` act, no `region`, through `attempt`), `status.ts` `direction`, `io/acts.ts` names its board; words in
  `words/toolbar.ts`; icons `across`, `down`, `auto` in `ButtonIcon.svelte`.
- **Room for edge marks** (orchestrator's addition): `types.ts` `EDGE_ROW_GAP` = 40 (bottom marks 11px below, disc 14px
  above, ring 5px, about 10px clear); `draw.ts` uses it as the least row gap while the skin's marks are `edges`. Flag
  off, unchanged. No mark overhangs a node's sides (number 14px in, disc and notes 20px in), so side gaps stay `GAP`.
- **Gallery** `apps/board/src/gallery/flow-section.ts` (before, rows, down, edge gap, Flows rows), shown only with either
  flag; `mini-board.ts` takes `direction`, `branching`, `edges`.
- **Docs**: `components.md` § Flow branching and direction; `api.md` 133; `plugin.md` § The engine (two flag rows,
  required by `engine-switches.test.ts`).
- **Tests**: `flow-branches.test.ts` (10), `layout.timing.ts` (branches across and down, about 50 ms of 100),
  `apps/board/tests/flow-direction-layout.test.ts` (precedence as drawn, another page, the cache),
  `api-layout-direction.test.ts` (`show_layout` both ways, flags off as before), `tests/pages/flow-direction.spec.ts`
  (8: rows, act, redraw, Auto, another page, read-only, branching row, edge gap, gallery, axe dark and light).

### Issues & Resolutions
- First rows version doubled crossings on seeded merge-heavy flows (459 v 182 over 300 boards). Bands per linked group,
  nearest-row search and the routed weigh bring it to 143 v 182; rows never cross more (test). Weighing by routing all
  containers took the 1,200-link timing to 98 ms; above 30 links the weigh uses straight strokes (50 ms).
- In a down flow the arrowheads were hidden under the kind tab at top centre: `ports.ts` `offCentre`.
- Pre-existing at HEAD (checked on an export of HEAD, not caused here): `layout-controls.spec.ts` gallery screenshots
  (linkLabels, alignSetting, widthsControl) and `node-edges.spec.ts` "matches its screenshot" fail by a sub-pixel text
  shift, dark and light.

### Caught Beyond the Brief
- Port spreading puts a small jog in a straight main line where its card has a second link on the same side (2>3,
  3>4 in the example): the trunk port is moved off the centre for the branch. A trunk-first port rule would make it
  dead straight; router work, not done here.
- `show_layout` takes every card at 280 by 120, so where the routed weigh is close the page (real sizes) and the answer
  may pick different arrangements; an existing limit of `structureOf`, now with one more decision in it.
- A source card that joins a flow late (no predecessors) is pulled next to its first successor by `layersOf`, then gets
  its own row; on dense graphs the stacked flow sometimes wins the weigh, so a container can switch between rows and
  stacked as links are added. Deterministic, but worth a look in use.

### Deviations from Plan
- None in behaviour. Files outside the list, each minimal: `controller.ts` (3 lines), `controller/board-types.ts`,
  `mount.ts`, `status.ts`, `input/wiring.ts` and `selection/container-drag.ts` (pass `downward` to a drag's reroute),
  `server/engine/reads.ts`, `gallery/main.ts`, `gallery/mini-board.ts`, `docs/specification/plugin.md`, `api.md`.
  `npm run map` needed (orchestrator's file; only the `EDGE_ROW_GAP` export changes).

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] BE_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/BE_01_flow-branching-and-direction.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
