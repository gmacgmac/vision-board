# 3_FE_02_lasso-and-zoom: Lasso, selection bar, group notes, zoom

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 3;
> decisions 3 and the 2026-10-05 rulings) · **Tracker**: U6 · **Reference**: Uplynk Architect,
> `architect-extract/` README §2 points 8-14 (`interactions.js`: lasso, `updateSelbar`, `openNote`
> with `nodes`, zoom buttons; `architect.css` `.lasso`, `.selbar`) · **Builds on**: 3_FE_01
> (`apps/board/src/board/selection.ts`, the reserved Shift+drag) and 2e (note bubble, note events)
> · **Contract**: `docs/specification/api.md` (person acts, versioning, drift) · **Model**: Opus 5.5

## Objective

Shift+drag on a background draws a lasso that selects the cards it touches. A selection bar above
the selection offers **Comment** and **Zoom to selection**. Comment opens one note on the whole
group, saved once and pinned on every card in it. The board header gets zoom out, fit and zoom in.

## Rulings (do not reopen)

1. **Lasso:** Shift+drag on the board's or a container's background draws Architect's dashed
   accent box (tokens only). On release the cards it touches replace the selection;
   Shift+Cmd/Ctrl+drag adds them instead. A lasso that touches no card offers only "Zoom to this
   area" (this is the "draw a box to zoom" half of U6). No area rectangle is stored: a note
   targets cards, never coordinates (rule 9).
2. **Selection bar:** Architect's glass bar, centred above the selection's screen box (below it
   when there is no room above), drawn above cards, moving nothing: "N selected · Comment · Zoom
   to selection · Clear". Shown whenever the selection is not empty and no bubble is open; follows
   pan and zoom.
3. **Group note:** Comment with two or more cards selected opens the 2e note bubble beside the
   selection's box, headed "Note on 3 cards: 12, 14, 15". Saved as ONE note naming all of them
   (the format change below), with the same pin number on each card and the note shown in each
   card's "Your note" block. Editing and removing work as in 2e (`note-edit`, `note-remove` name
   the note by its `seq`), on any of its pins. The one-unsent-note-per-card rule applies to
   single-card notes; a card may also belong to an unsent group note. With one card selected,
   Comment is the card's own note (2e).
4. **Format first:** a `comment` or `context` act may carry `nodes` (two or more item numbers) in
   place of `n`. Schema, `ledger-shape.ts`, fold, reads, reply text, `check_responses` (the agent
   sees one note with all its numbers, once), OpenAPI and regenerated outputs, drift tests; bump
   the formats as `api.md` requires. Every named node must be an item on one board.
5. **Zoom:** zoom out, Fit and zoom in buttons in the board header (Fit exists: group the three),
   and Zoom to selection fits the selection's box with the existing margin. These are view
   commands, not ledger events: ONE page command table drives the buttons, the bar and the keys,
   so nothing is wired twice.
6. **Keys (rule 5):** N or C with two or more selected opens the group note; Z zooms to the
   selection; F fits; + and - zoom (exist); Esc closes the bar's note, then clears. The keyboard
   route to a group is the 3_FE_01 Space toggle.
7. **Performance:** a lasso over 50 cards updates exactly those 50 and lays out none (extend
   `perf.spec.ts`); the bar and lasso redraw without touching cards.

## Inputs

- **Modify**: `packages/format` (act shape, schema), `packages/actions` (fold, notes, reads,
  pending, reply, registry), OpenAPI and generated outputs, `apps/board/src/board/` (pointer:
  the reserved gesture; a lasso module; a selection-bar module; the command table; notes flow for
  groups), `packages/ui` (pin and note block for group notes; a bar pattern if it is reusable),
  `apps/board/src/shell/Toolbar.svelte`, the gallery (lasso, bar, group bubble, group pins, dark
  and light), `tests/pages/` and baselines, `docs/specification/components.md` (short section)

## Steps

1. [ ] Failing tests first: format and fold for group notes (unit); page tests for lasso
   replace/add, empty lasso offers Zoom to this area, the bar's three actions, group note saved
   once with pins on every card, edit and remove from any pin, keys N/C/Z/F/Esc, header zoom
   buttons, the counting test.
2. [ ] Format and API.
3. [ ] Lasso and bar; command table; header buttons.
4. [ ] Group notes on the board.
5. [ ] Gallery, axe, baselines viewed before updating.

## Validation

- [ ] All five gates exit 0 (read the exit codes)
- [ ] Board in dark and light: lasso and bar match Architect's look by eye; tracker U6 can close

## Constraints

Project rules apply. No new dependency. No commits. Files over 300 lines need a reason; split
rather than grow. Deviation from a ruling: stop and report. Probe scripts under `temp/` only,
deleted after. Use the file-edit tool for edits (scripted edits are refused). Fill in the
Implementation Notes and return: modules and symbols, the event shape, tests added or changed and
why, baselines, gate exit codes, anything unsettled.

## Implementation Notes

**Status**: Not started.
