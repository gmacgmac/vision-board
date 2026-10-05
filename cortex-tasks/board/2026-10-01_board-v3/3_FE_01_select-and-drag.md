# 3_FE_01_select-and-drag: Select cards, move by the kind tab, pan on backgrounds

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 3,
> maintainer rulings 2026-10-05) · **Tracker**: U5 · **Reference**: Uplynk Architect,
> `prototypes/board-v3-design/architect-extract/` (README §2 points 7, 13; `interactions.js`) ·
> **Spec**: mockup 05 `.card.is-sel` (README revision 13: 1.5px in the card's colour) ·
> **Facts**: `temp/research/stage-2d-2e-3-brief.md` §C (written before N12 split `controller.ts`:
> re-read `apps/board/src/board/` as it is now) · **Model**: Opus 5.5

## Objective

Cards can be selected the way Architect does it, the board never selects text by accident, card
text can be selected and copied on purpose, and a card moves only when you drag its kind tab.
This is step 1 of Stage 3; the lasso, zoom, group notes and moving between containers follow in
3_FE_02 and 3_FE_03, so build seams for them, not the features.

## Rulings (maintainer, do not reopen)

1. **Click** a card selects it alone. **Shift-, Cmd- or Ctrl-click** adds or removes it.
   **Click on the board's or a container's background** clears the selection. **Esc** closes an
   open bubble first, else clears the selection.
2. **Selected look:** 05's `.card.is-sel`, 1.5px in total in the card's own colour (`--kind`),
   with its soft glow. Selection is not focus: the focus ring still shows for the keyboard.
3. **Keyboard (rule 5):** the existing focus route stays (J/K and arrows). **Space** toggles the
   focused card in the selection. Shortcuts that act on "the card" (A, X, C, M, L, O, R) keep
   acting on the focused card in this step.
4. **Moving a card:** ONLY by dragging its kind tab (the grip dots on the top border, already
   styled as the handle in `node.css`). The drop is a pin, as today. Alt+arrows keep nudging.
   Dragging a selected card's tab moves only that card in this step (group move is 3_FE_03).
5. **Inside a card,** a drag selects text so it can be copied (title, body, notes; Markdown code
   blocks included) and never pans. Footer buttons, the size control, the pin and tabs are not
   selectable text. Restore `user-select` accordingly (today `vb-node` is `user-select: none`).
6. **Panning:** a plain drag on the board's background or a container's background (including its
   top line outside its controls) pans. Middle-button drag pans anywhere. While a pan runs,
   nothing on the page gets text-selected (U5); a page test drags across a container's title and
   asserts the document selection is empty afterwards.
7. **Shift+drag on a background is reserved for the lasso** (3_FE_02): in this step it does
   nothing and does not pan, so the gesture is free when the lasso lands.
8. **Selection is view state,** not a ledger event (nothing is decided by selecting). It lives in
   one page module with a small API (`selected()`, `select(ids, mode)`, `clear()`, a change
   event) that 3_FE_02's lasso and selection bar will call. It survives a redraw and drops ids
   that leave the board.
9. **Accessibility:** the selection is perceivable without colour: an accessible state on each
   card (choose a pattern axe accepts for this board's roles and say which) plus a polite live
   region announcing "3 cards selected" / "Selection cleared".
10. **Performance (rule 15, `performance.md`):** selecting touches only the cards whose state
    changed; extend the counting page test (`perf.spec.ts`) so selecting 50 cards updates 50 and
    lays out none.

## Inputs

- **Modify**: `apps/board/src/board/` (pointer, keys, wiring, a new selection module),
  `packages/ui/src/node` (selected state in the core and CSS, `user-select`, `pattern.json`
  states), the gallery (a selected sample, dark and light), `apps/board/src/shell/App.svelte`
  (the help line: "drag the tab to move · drag the background to pan · Shift+click to select
  more"), `tests/pages/` and baselines
- **Do not touch**: ledger formats and schemas (no format change in this step)

## Steps

1. [ ] Failing page tests first: click / Shift-, Cmd-, Ctrl-click / background click / Esc;
   Space on the focused card; drag the kind tab moves and pins; drag on a card body selects text
   and does not move or pan; drag on background pans; drag across a container title leaves no
   selection (U5); Shift+drag on background does nothing; the live region text.
2. [ ] The selection module and the node's selected state; gallery samples.
3. [ ] Pointer rules; `user-select` per ruling 5.
4. [ ] Counting test (ruling 10); axe passes; view baselines before updating.

## Validation

- [ ] All five gates exit 0 (read the exit codes)
- [ ] Board in dark and light: selection matches 05 by eye; text in a card can be selected and
  copied; tracker U5 can be closed

## Constraints

Project rules apply. No new dependency. No commits: the orchestrator reviews and commits. Files
over 300 lines need a reason. Deviation from a ruling: stop and report. Probe scripts under
`temp/` only, deleted after. Fill in the Implementation Notes and return: modules and symbols,
the accessible pattern chosen, tests added or changed and why, baselines, gate exit codes,
anything unsettled.

## Implementation Notes

**Status**: Not started.
