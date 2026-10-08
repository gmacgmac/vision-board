# FE_02_container-finder: Container finder

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 2) ·
> **Tracker**: N18 · **Builds on**: FE_01 (toolbar layout) · **Model**: Sonnet 5.5

## Objective

A toolbar dropdown lists every container on the board; choosing one zooms to it.

## Rulings (do not reopen)

1. A "Containers" dropdown in the toolbar after the version dropdown, listing `view().regions` in
   board order with each one's card count; choosing one calls `vp.fit` on its `layout.regions`
   box (as `selection-flow.ts` `zoom-selection` does) and focuses its title line.
2. Later is always the last entry: "Later · 0 items", greyed and not choosable when empty (Later
   is absent from the layout then; `placedView` in `packages/actions/src/moves.ts`).
3. Works in a past version (FE_01) too: zooming is not an act.
4. Keyboard: the dropdown is reachable by Tab; a key to open it is added to `commands.ts` only if
   one is free and obvious (else none).

## Steps

1. [x] Failing page test: choosing a container puts its frame in view and centred; Later with no
   cards is listed and disabled; with a card in Later it can be chosen; axe both themes.
2. [x] The dropdown component (Svelte, in `apps/board/src/shell/`), the zoom call through the
   controller, gallery sample if the dropdown is a pattern.

## Validation

- [x] The five gates exit 0; looked at in a browser.

## Implementation Notes

**Status**: Completed

- `apps/board/src/board/finder.ts`: `containerRows(view, layout)` (rows from the placed view, Later always last; usable = has a frame in the layout, and Later only with a card), `rowText` ("Ideas · 3 items") and `zoomToContainer` (`vp.fit` on the `layout.regions` box, then focus the title heading, tabindex -1 set from code). No Later is drawn when empty (`placedView`), so "Later · 0 items" is a disabled option.
- Toolbar: a native `<select id="containers">` after the version dropdown, labelled "Containers", acting as a menu (choosing calls `ongo` and resets to its name, so choosing the same container twice works). Tab reaches it. `shell.containers` is set in `controller.ts` `renderCounts`; `Board.goToContainer`.
- Flag `containerFinder` (on; `?flags=-containerFinder`), rule 12. Board screenshot test now also turns it off (toolbar only differs); `finder.spec.ts` covers it on.
- Works in a past version (rows follow the past board; no request sent). CSS: `.vb-select-menu` fixed width, and the board picker alone may shrink (`#board { min-width: 0 }`) so the toolbar still fits at 1280 (it truncated the long roadmap title anyway before; at 1100 it now fits too, where it overflowed by 93px before).
- No key added: no obvious free one (a command id would also touch the selection flow's exhaustive switch); Tab reaches it. No gallery entry: a plain toolbar select, like the picker (not a new pattern).
- `controller.ts` stays at 300 lines (header comment and imports condensed).
- Gates: check, npm test (644), verify, gen --check, test:pages (163) all 0; perf.spec passed in the full run.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_02: …`).
