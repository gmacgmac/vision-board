# FIX_04_dots-above-links: A Timeline's Dots Draw Above Links

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The maintainer's look (2026-11-19): a link crossing a timeline draws over the line and over the dots. The dots (and
their rings) draw above every link; the line and the stems stay beneath links, as now.

## Steps

1. Test first (`tests/pages/timeline.spec.ts` or a unit test on the wires layer's order): at a link crossing a dot, the
   dot is the topmost wire-layer element (e.g. `elementFromPoint` at the dot's centre is the dot, both skins).
2. Fix in the wires layer's paint order (`apps/board/src/board/links/timelines.ts`, `wires.ts`): the dots go in a group
   painted after the links, keeping their per-node groups and their glide (FE_02 run 2); no z-index on SVG.
3. Renew only the baselines this changes; say which.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8310`. Page specs with
`--config tests/pages/playwright.config.ts`. Never git-add anything. A try-out board runs on 6611: leave it.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_04: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_04_dots-above-links.md]]`

## Implementation Notes

**Status**: Completed
**Completed**: 2026-11-19

### Changes Made
- Test first: new `tests/pages/timeline-layers.spec.ts` (`timeline.spec.ts` is at its 500-line limit). The wires layer ignores the pointer, so `elementFromPoint` cannot answer; it reads the layer's own paint order: every `.vb-timeline-dot` after every `.vb-wire` and label, the line and stems before the links. Failed before (dot at child 13, last link at 22), passes after.
- `links/timelines.ts` `createTimelines(host, above, look)`: per dated node a stem group (in `vb-timelines`, beneath links) and a dot group (in the new `vb-timeline-dots` group), both `g.vb-timeline[data-region][data-node]`, kept from draw to draw, placed at the node, markup written only on change. `arrange` orders each group.
- `links/wires.ts` `frame`: a fifth child `<g class="vb-timeline-dots">` after the labels, so no z-index on SVG. `board.css`: the glide transition also on `.vb-timeline-dots > g`.
- `tests/pages/timeline.spec.ts`: selectors for dots now read `.vb-timeline-dots` (`dots`, `missesIn`, gallery count, `markup` covers both groups).
- Docs: `components.md` § The timeline 7 (groups, FIX_04, the new spec).
- Budgets raised to measured: page 206.2 KB (206.19; `scripts/verify-weight.mjs`, `performance.md`), `view/board.js` 200,600 (200,554; `plugin-build.test.ts`).
- Baselines renewed (only these, tiny pixel diffs where a link crosses a dot): `timeline-{default-across,command-lens-across}-{dark,light}`, `timeline-default-down-{dark,light}`, `timeline-gallery-{dark,light}` under `tests/pages/__screenshots__/timeline.spec.ts/`.
- Gates: check 0 errors, verify ok, gen --check current, `npm test` 2,724 pass, test:plugin 116; pages: timeline, timeline-layers, gallery, move-and-later, flow-direction, layout-control, wires, reset-places, select, node-edges-board, same-picture: 108 passed.

### Caught Beyond the Brief
- The focused card's own links are repeated in the `vb-wires-top` SVG above the cards (D-032, `top`); a dot of a focused card's link is drawn under that hot link while it is focused. Not changed (a separate layer); say if the dots should rise above it too.

### Deviations from Plan
- None
