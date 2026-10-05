# 3_FE_03_move-and-later: Move cards between containers, group move, the Later container

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 3;
> decisions 6 and 11; Format changes: `move`, a built-in `later` region) · **Reference**: Uplynk
> Architect, `architect-extract/` README §2 (drag, drop targets) · **Builds on**: 3_FE_01
> (kind-tab drag, `selection.ts`, pins), 3_FE_02 (selection, command table), 2d_BE_01
> (`collide.ts`) · **Contract**: `docs/specification/api.md` (person acts, versioning, drift) ·
> **Model**: Opus 5.5

## Objective

Dragging a card's kind tab onto another container moves the card there. With several cards
selected, dragging any selected card's tab moves them all. Every board has a built-in **Later**
container: putting a card there (drag, or the L key) saves it for later, and taking it out
reopens it. A card's number and id never change when it moves (rule 10).

## Rulings (do not reopen)

1. **Format first:** a new person-only act `move { n, region }` (or `nodes` for a group, as in
   3_FE_02) records that the person put a card in a container. Schema, `ledger-shape.ts`, fold,
   reads, OpenAPI, regenerated outputs, drift tests; bump the formats as `api.md` requires and
   add numbered points to `api.md`. `region` must be a container on the card's board, or the
   built-in `later`.
2. **The person's move wins.** A card's container is the person's latest `move` if there is one,
   else the region in its latest node version. An agent's later version naming its old region
   does not pull it back (as pins already work). Reads show both: `region` (where it is) and,
   when moved, `moved_from` (the agent's region), so the agent can see what the person did.
3. **Drop:** while dragging a tab, the container under the pointer highlights (tokens only). On a
   drop inside another container the card joins it at the drop point: its old pin is cleared and
   the drop point becomes a pin local to the new container (rule 9), and `collide.ts` makes room.
   A drop inside the card's own container is today's pin, unchanged. A drop outside every
   container snaps back and writes nothing.
4. **Group move:** dragging the tab of a selected card drags every selected card, keeping their
   offsets; one drop writes one `move` (with `nodes`) plus their pins. Dragging an unselected
   card's tab moves only that card and leaves the selection as it is.
5. **Later container:** every board has one, always last, titled "Later", created by the page
   from the fold (no agent writes it, never stored as a region event). Hidden while empty;
   while a card is being dragged it shows as a drop target. Its layout is the grid.
6. **Later is one thing, two ways in.** Dropping a card into Later writes `move` to `later`
   AND the existing `later` act, so its status, the "N later" count and the agent's reply stay
   as today. L (and the card's Later button) now also move it there. Dragging a card out of
   Later, or Reopen, writes `move` back and `reopen`. Reopen with no target returns the card to
   the container it came from (`moved_from`, else its node region).
7. **Not in scope:** parking with a handover bundle (D-020, the `park` event) stays in Stage 5;
   container notes and dragging containers are 3_FE_04. Agents cannot `move` (person-only, rule 8).
8. **Keyboard (rule 5):** with cards selected, `Shift+M` opens a small list of the board's
   containers (Later included); Enter moves the selection there, Esc closes it. One command in
   the 3_FE_02 command table, also a "Move to" button in the selection bar.
9. **Performance:** moving 50 cards between two containers updates exactly those 50 and lays
   out only the two containers (extend `perf.spec.ts`); a drag frame touches only the dragged
   cards and the highlighted container.

## Inputs

- **Modify**: `packages/format` (act shape, schema), `packages/actions` (fold, reads, registry,
  reply if it names containers), OpenAPI and generated outputs, `apps/board/src/board/` (pointer
  drag, a move module, `selection-flow.ts` and `commands.ts`, the layout input for the Later
  container), `packages/ui` (drop-target highlight on `<vb-region>`), the gallery (drop target,
  Later container, dark and light), `tests/pages/` and baselines, `docs/specification/api.md`,
  `docs/specification/components.md` (short section)

## Steps

Keep this list ticked as you go, so an interruption loses nothing.

1. [x] Failing tests first: format and fold for `move` and the person-wins rule (unit); page
   tests for drop into another container, snap back outside, group move, Later in and out, L
   moving to Later, Reopen returning the card, Shift+M, the counting test.
2. [x] Format and API.
3. [x] Drop targets and single-card move.
4. [x] Group move, Later container, Shift+M and the bar button.
5. [x] Gallery, axe, baselines viewed before updating.

## Validation

- [x] All five gates exit 0 (read the exit codes): `npm test`, `npm run check`, `npm run verify`,
  `npm run test:pages`, `npm run gen -- --check`
- [x] Board in dark and light: moving a card and a group by eye; ids and numbers unchanged (see
  Unsettled 5: checked through the page tests' positions and the gallery frames, not a manual look)

## Constraints

Project rules apply. No new dependency. No commits. Files over 300 lines need a reason; split
rather than grow (`controller.ts` is at 316: move code goes in its own module). Deviation from a
ruling: stop and report. Probe scripts under `temp/` only, deleted after. Use the file-edit tool
for edits (scripted edits are refused). Fill in the Implementation Notes and return: modules and
symbols, the event shape, tests added or changed and why, baselines, gate exit codes, anything
unsettled.

## Implementation Notes

**Status**: Built, all five gates green (2026-10-05). Not committed.

**Modules and symbols**
- Format (ledger v6, api.md 66-70): `ledger.ts` `LEDGER_FORMAT = 6`, `LEDGER_FORMATS` adds 6,
  `ACTION_IDS` adds `move`, `LATER_REGION = 'later'`; `ledger-shape.ts` `ON_GROUP` adds `move`,
  `GROUP_NOTE` (text only required on a group note), `move` needs `region` and `n` or `nodes`;
  `ledger-index.ts` `actContext` `move` (region on the cards' board, or `later`) and a v6 `region`
  line with id `later` refused (older lines keep theirs). Every ledger `$id` -> `/ledger/6/`,
  `openapi.json` 1.3.0; `act.schema.json` rules for `move`; api `common.schema.json`
  `nodeDetailCore.moved_from`, `openItem.moved_from`; `get-board-response` `state.moves`.
- `packages/actions/src/moves.ts` (new): `LATER`, `regionOf`, `movedFrom`, `placedView`.
  `fold.ts`: `LedgerState.moves`, `BoardState.moves` (only cards not where the agent drew them),
  `move` clears the cards' pins. `act.ts` `moveProblems` (one board, the act's board; a container
  on it or `later`; Later only for items that offer `later`). `reads.ts` `region` + `moved_from`
  on `nodeDetail`/`openItems`; `containerDetail` lists cards moved in. `grants.ts` `canWrite`:
  "current region" is the person's container; a card in Later is judged by its agent's region.
  `registry.ts` `move` (person, no confirmation). `apps/board/server/reads.ts` `state.moves`.
- Page: `moves.ts` (new: `createMoves` — `carried`, `dragStart`, `dragOver`, `drop`, `status`,
  `openMenu`; `plan` builds [move] then [status acts + pins]); `move-menu.ts` (new:
  `createMoveMenu`, role=menu, own keys); `sender.ts` (new: `createSender` — `attempt`, `record`,
  `run` batch drawn once, `held`, `idle`); `item-acts.ts` (new: `createItemActs`, the card's review
  buttons, Later/Reopen through `moves.status`); `boards.ts` (new: `createBoards`, boot and
  switch). The last three were split out of `controller.ts` (316 -> 271 lines). `pointer.ts`: a
  move gesture carries `cards` (the selection when the grabbed card is in it), `dragStart`,
  `dragMove(boxes, at)`, `dragEnd(boxes, at | null)`. `wiring.ts` `carried`/`dragStart`/`dragOver`/
  `drop`. `commands.ts` `move` (Shift+M, "Move to", in `SELECTION_COMMANDS`), `keyText`.
  `keys.ts`: a claimed Shift combination never falls through. `selection-flow.ts` `openMove`.
  `controller.ts`: `S.later`, `S.drawn`, draws `placedView(...)`, `redraw` waits while `sender.held`.
  `draw.ts` `frames`. `render.ts` `LATER_FRAME`. `App.svelte` help line: Shift+M.
- `packages/ui` region pattern: `regionTemplate(r, { fixed, empty })` (`RegionFrameOptions`,
  `EMPTY_DECIDED`), `render(r, opts)` sets `data-fixed`, `region-row.ts` `sync` falls back to the
  cog, `region.css` `[data-drop]` (dashed `--vb-accent-line`, soft `--vb-accent-soft` fill) and
  `[data-fixed]`; `pattern.json` states `drop-target`, `fixed`.
- Gallery: `later-section.ts` (Later holding two cards, an empty Later lit as drop target), a v6
  `move` line in `gallery.ledger.jsonl`. Docs: api.md 66-70, components.md § Moving cards.

**Event shape**: `{ type: 'act', action: 'move', n: 4, region: 'review' }` or
`{ type: 'act', action: 'move', nodes: [1, 2], region: 'later' }` (`ver` optional with `n`, not
allowed with `nodes`). A drop writes it, then `pin` per card (and `later`/`reopen` per card into or
out of Later) side by side.

**Tests added or changed, and why**
- `packages/actions/tests/moves.test.ts` (new, 11): shape, context, the reserved id, person wins,
  pins cleared, reads, `validateAct`, `placedView`, a legacy `later` region, `check_responses`,
  grants. `apps/board/tests/api-moves.test.ts` (new, 3): over HTTP, spec-checked.
- `schema-cases.ts`/`schema.test.ts`: v6, `ACTS.move`, 7 broken move cases, 2 valid edges,
  "unknown format" now v7. `openapi.test.ts` 1.3.0 and `/ledger/6/`; `api-notes.test.ts` `v: 6`;
  `board-data.test.ts` `asJson` carries `moves`; ui core tests' `BoardState` gains `moves`.
- `tests/pages/move-and-later.spec.ts` (new, 8): drop in another container (lit, pinned, id and
  label unchanged), snap back writes nothing, own container is a pin, group move (one move with
  nodes, offsets kept) and an unselected card alone, Later in by drag and out (reopen), L and
  Reopen and the Later button, Shift+M/Enter/Esc and the bar's Move to, axe dark and light.
- `perf.spec.ts`: dragging 50 selected cards into another container: `[50, 50, 2, 0]` updated,
  measured, laid out (exactly the two), full fetches; a drag frame `[0, 0, 0, 0]`.
- Changed for the rulings: `select.spec.ts` (a selected card's drag now moves the selection,
  ruling 4); `zoom-and-lasso.spec.ts` (the bar has Move to, ruling 8); `gallery.spec.ts` (10
  frames, two empty messages, the Later checks).

**Baselines** (each diff viewed before updating): `board-dark|light` (help line gains Shift+M
only), `gallery-dark|light` (the new "Later, and a drop target" group, Move to in the bar sample,
the region states line, everything below shifted), `agent-access-dark|light`,
`node-size-dark|light` (content identical, sub-pixel vertical shift).

**Gates** (exit codes read): `npm test` 0 (522 + 4 timing), `npm run check` 0, `npm run verify` 0
(0 warnings: `controller.ts` now 271), `npm run test:pages` 0 (109 passed, whole suite),
`npm run gen -- --check` 0.

**Unsettled**
1. Literal person-wins: a card moved back to its agent's region keeps that move, so if the agent
   later redraws it into another region the card stays where the person last put it. The reads
   omit `moved_from` (and `state.moves`) while the two agree.
2. Grants (api.md 24, written as 70): "current region" is now the person's container, so after a
   move the receiving container's holder may answer and update the card, and its author may still
   answer it but needs that container's grant to redraw it. Later falls back to the agent's region.
3. `later` is reserved only for v6 region lines; a board whose older lines drew a `later` region
   keeps it as its Later frame (rendered fixed). The shared action-test scene still has one (v3).
4. Later's drop is pinned at the drop point like any container, but in an empty Later the pin is
   relative to the frame's content, so the first card sits at its top left.
5. The "by eye" check was the gallery frames (viewed dark and light) and the page tests' positions;
   no manual look at a live drag. `show_container` for `later` is `not-found` (not a region).
6. The phase-4 new-user review sub-agent was not run (as in 3_FE_02).
