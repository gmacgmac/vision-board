---
category: board-app
status: completed
created: 2026-10-12
tracker: cortex-tasks/tracker.md#U1
---

# A shorter selection bar

> **From**: maintainer, 2026-10-12 ("the selection bar is huge … just change that to remove … zoom to
> selection could just be zoom … we don't need clear, we just click away") · **Model**: Sonnet 5.5 ·
> **Go**: given

## Rulings (maintainer; do not reopen)

1. "Remove card" / "Remove cards" reads **Remove**.
2. "Zoom to selection" reads **Zoom**.
3. **Clear** leaves the bar. Clearing stays as it is: a click on empty board, Esc, and the keys.
4. Comment, Move to and Reset places are unchanged.
5. Short visible words, full meaning for everyone else: each button's tooltip and accessible name
   still say what it does and its key ("Remove the selected cards · Delete", "Zoom to the selection
   · Z"), so screen readers and the key list lose nothing.

## Steps

1. [x] Tests first: the bar's buttons and their names/tooltips; no Clear; Esc and a click away still
   clear; the key help still lists Z and Delete; axe light and dark.
2. [x] Build (`apps/board/src/board/commands.ts`, `selection-flow.ts`, the bar in `packages/ui`);
   screenshots after viewing the diffs; the `every-node.spec.ts` axe test that closed the bar to its
   pill because the bar covered a grip: put it back if the shorter bar no longer covers it.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`). No git commits or stash. Scratch in the
  system temp folder (never the repo's `temp/`); stop only your own processes and leave none
  running; never touch `.visionboard/`; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-12

- **Commands** (`apps/board/src/board/commands.ts`): `remove` reads "Remove", `zoom-selection` reads
  "Zoom". A new `CommandDef.means` holds the full words ("Remove the selected cards", "Zoom to the
  selection"); `commandTitle` builds the tooltip from it with the key ("Zoom to the selection · Z").
  `barButtons` gives a button a `title` only when its command has `means`, so Comment, Move to and
  Reset places are exactly as before (ruling 4). `selectionButtons` words Remove's title "card" for
  one selected card, "cards" for several ("Remove the selected cards · Delete"). The `clear` command
  is deleted from the table, `SELECTION_COMMANDS` and `selection-flow.ts`: nothing else called it
  (Esc and a click on empty board clear through the selection module, unchanged).
- **Bar pattern** (`packages/ui/src/selection-bar/`): `BarButton.title`; the template draws it as
  `title` and `aria-label`, so the tooltip and the accessible name are the full words and key (each
  contains the visible word, WCAG label-in-name). Pattern description and accessibility notes updated.
- **Key help** (`key-help.ts`): rows read `listed ?? means ?? label`: "Zoom to the selection" for Z and
  "Remove cards" for Delete/Backspace (`CommandDef.listed`: the full "Remove the selected cards"
  wrapped in the list's column beside two keys, so the list says "Remove cards"). Both keys still listed.
- **Tests first**: new `apps/board/tests/commands.test.ts`; `key-help.test.ts` (rows, no `clear`
  command); `packages/ui/tests/selection-bar.test.ts` (title -> title and aria-label);
  `selection-pill.spec.ts` (BUTTONS now Comment, Move to, Reset places, Remove, Zoom; a new test for the
  tooltips and accessible names, no Clear, Esc then Esc clears, a click on empty board clears, the
  singular for one card); `zoom-and-lasso.spec.ts` (the Clear click became a click on empty board;
  Zoom found by its full name; the pan assertion allows one pixel of rounding, because the pill's width
  changed); `person-remove.spec.ts` (text "Remove").
- **every-node.spec.ts**: the Escape back to the pill (added because the bar covered a container grip)
  is removed; the axe test passes in both themes with the bar as it falls now.
- **Docs**: `docs/specification/components.md` (command table, area bar, Remove section),
  `selection-bar/pattern.json`, the gallery caption in `selection-bar-section.ts`.
- **Screenshots changed** (each viewed, actual against expected, before updating): the selection-pill
  gallery (dark, light: the bars read Remove and Zoom, no Clear; the pattern description is shorter,
  same height, so no other section moved), the key bubble open list and its gallery sample (dark,
  light: the Selection and View rows' words), and the full-page gallery (dark, light: the same two
  sections). An earlier longer pattern description grew the section by two lines and moved every
  later gallery section by a pixel; it was shortened rather than accepting 40 snapshots.
- **Gates**: `npm test`, `npm run check`, `npm run verify`, `npm run gen -- --check` and
  `npm run test:pages` all exit 0.
