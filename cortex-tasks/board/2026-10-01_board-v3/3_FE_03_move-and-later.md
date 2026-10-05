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

1. [ ] Failing tests first: format and fold for `move` and the person-wins rule (unit); page
   tests for drop into another container, snap back outside, group move, Later in and out, L
   moving to Later, Reopen returning the card, Shift+M, the counting test.
2. [ ] Format and API.
3. [ ] Drop targets and single-card move.
4. [ ] Group move, Later container, Shift+M and the bar button.
5. [ ] Gallery, axe, baselines viewed before updating.

## Validation

- [ ] All five gates exit 0 (read the exit codes): `npm test`, `npm run check`, `npm run verify`,
  `npm run test:pages`, `npm run gen -- --check`
- [ ] Board in dark and light: moving a card and a group by eye; ids and numbers unchanged

## Constraints

Project rules apply. No new dependency. No commits. Files over 300 lines need a reason; split
rather than grow (`controller.ts` is at 316: move code goes in its own module). Deviation from a
ruling: stop and report. Probe scripts under `temp/` only, deleted after. Use the file-edit tool
for edits (scripted edits are refused). Fill in the Implementation Notes and return: modules and
symbols, the event shape, tests added or changed and why, baselines, gate exit codes, anything
unsettled.

## Implementation Notes

*(filled in by the builder)*
