# FIX_06_open-corners: Containers with Open Corners

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's rulings (points 491, 493, 495-497, 503), drawn in `design/mockups/containers/` (DESIGN_02): a container is
a top rule broken by the title (as today), a bottom rule, and side rules that stop short of the corners by 28px
(`REGION_PAD`). The board's current spacing and line colours stay exactly (the mock-ups' brighter lines and spacing are not
copied). No token value changes.

## Rulings

1. Rest: open corners, today's line colour (`--vb-region`) and weight.
2. In use (`data-rail-hover` frame hovered, focused or `data-use`): the rules step up slightly as the rail appears.
3. Selected (`data-selected`): brighter (`--vb-ink`) and thicker (2px); the corners stay open.
4. Drop target (`data-drop`): the corners close, dashed, in ink, a soft fill.
5. Fresh (new and updated, teal) and locked as drawn, on the lines.

## Implementation Notes

- `packages/ui/src/region/region.css`: the element keeps a transparent border of the same width, so its box, the top line
  and the rail's geometry are unchanged; the rules are `vb-region::before` (top and bottom) and `::after` (sides) at
  `z-index: -1` (`isolation: isolate`), so the rail's ring and the title's gap cover them. `--vb-region-ln` and
  `--vb-region-ln-w` carry the colour and weight; `--vb-region-gap` is 28px. Drop, selected and dragging set those
  variables; `region-fresh.css` sets `--vb-region-ln` to the fresh teal; `region-rail.css` (inside the hover media query)
  steps the colour a quarter of the way from `--vb-region` to `--vb-ink` when in use and not selected, fresh, dragging or
  dropping. The template did not change.
- The drop target's line is now ink (the mock-up's), not the accent; its title takes the strong ink. Selected is a new
  page-set attribute, `data-selected`: nothing on the board sets it on a container yet (whether a container is selected on
  its own is not established), the style is ready and shown in the gallery.
- Gallery: the rail section gained "The rules: open corners" (selected and fresh frames); Later's text names the ink line.
- Computed border widths snap to device pixels, so 1.5px reads 1px at 1x (as the old border did); the spec compares with
  the rest width.
- Tests: new `tests/pages/container-rules.spec.ts` (geometry, in use, selected, drop; light and dark);
  `fresh-cards.spec.ts` reads the rule's colour from `::before`; `container-rail-states.spec.ts` frame count 14 to 16.
- Baselines renewed and looked at: `gallery.spec.ts` sections region, toolRail, freshCards, bigTitles, layout-control,
  command-lens, flow-branching, updateSignals (dark and light); `container-rail-states` rail; `fresh-cards` fresh-section;
  `big-titles`, `command-lens`, `header-tiers`, `lock-board`, `person-remove` (dark and light). Seen in the gallery that
  other baselines (app-cards, chat-attach, base, appIcon, card-history, nodeSize, node-edges, note-bubble, selection-bar)
  already differ from this machine's rendering in text alone, with no frame in them; those were left as they were.
- Size: the page measured 201.2 KB gzip (budget 201.1 to 201.3); `view/board.css` 24,901 (24,800 to 24,950); PLAN.md
  § Temporary size budgets updated, `scripts/verify-weight.mjs`, `performance.md`, `plugin-build.test.ts`.
- Screenshots: `temp/fix06/` (the board at about 100% and 40%, both skins, dark and light; the gallery rules group).
