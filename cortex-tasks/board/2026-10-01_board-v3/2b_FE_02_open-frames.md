# 2b_FE_02_open-frames: Containers become open frames

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2b) ·
> **Decision**: D-024 · **Spec**: mockup `05-final-spec.html` (`fieldset.fs`, `legend`,
> `.band-name`, `.meta`) · **Worked example**: 2b_FE_01 · **Model**: Sonnet 5.5

## Objective

`<vb-region>` is an open frame in its own colour, with its title and decided count on the top
line, on the dot-grid canvas, as in mockup 05. The five layout buttons stay as text buttons on
the right of the top line; Stage 2d replaces them with the icon row and cog.

## Inputs

- **Modify**: `packages/ui/src/region/{region-template.ts,region.css,pattern.json}`,
  `packages/ui/tests/region-*.test.ts`, `packages/layout/src/types.ts` (`REGION_HEAD`),
  `tests/pages/` baselines
- **Reuse**: tokens only; the frame colour comes from `--region` (default
  `var(--vb-line-strong)` mixed toward the region colour as in `.fs`)

## Steps

1. [ ] Frame: no fill, a 1.5px border mixed from `--region` and `--vb-line`, large radius. The
   title (mono, uppercase, letter-spaced) and count sit in a gap in the top border on the left;
   the layout buttons and Reset places sit in a gap on the right. The gap uses the canvas colour.
2. [ ] The region colour: every region uses the neutral default for now. Leave a `--region`
   hook the element sets (from the default only) so a later region colour is one property.
3. [ ] `REGION_HEAD` becomes the height the top line takes inside the frame; it stays one
   constant in `layout`, and the frame's CSS padding reads the same number from a comment, not
   a second constant. Layout tests must stay green; update a test only if it hard-codes 40, and
   say so.
4. [ ] Lane bands keep drawing inside the frame; check every mode in the gallery and the board.
5. [ ] View and update the baselines; list the paths.

## Validation

- [x] All four gates exit 0
- [x] Gallery and board in dark and light match 05's frames by eye; no card overlaps a frame's
  top line in any mode

## Constraints

As 2b_FE_01. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Completed 2026-10-04. Not committed.

**Files and symbols**
- `packages/layout/src/types.ts`: `REGION_HEAD` 40 -> 38 (05's top padding), with a comment saying
  it is the room under the top line and that `region.css` states the same number.
- `packages/ui/src/region/region-core.ts`: `REGION_COLOUR_DEFAULT` (`var(--vb-line-strong)`) and
  `regionColour(r)`: the one place a later region colour goes.
- `vb-region.ts`: `render()` sets `--region` from `regionColour(r)` through the CSSOM.
- `region-template.ts`: the header is now `div.vb-region-label` (`h2` + `span.vb-region-count`) and
  `div.vb-region-tools` (`div.vb-modes` + Reset places). Same classes, attributes and text as before.
- `region.css` (rewritten): no fill; `1.5px` border mixed 70% `--region` / `--vb-line`;
  `--vb-radius-lg`; `padding-top: 38px` (REGION_HEAD); the head is absolutely placed, straddles
  the border (`top: calc(var(--region-line-w) / -2)`, `translateY(-50%)`), and its two groups
  carry `--vb-surface-canvas` as the gaps. Mono, uppercase, `0.22em` title; count in
  `--vb-ink-subtle`. `container-type: inline-size`, and under 480px only the pressed mode button
  shows (the group opens on hover or `:focus-within`). Count ellipsizes before the title.
- `pattern.json`: description, `files`, state `narrow`, `--region` attribute, `render()` wording.
- `apps/board/src/styles/board.css`: new `.vb-ground` (the dot grid, moved off `.vb-stage`);
  wire-label halo now `--vb-surface-canvas` (regions no longer have a fill).
  `apps/board/src/shell/App.svelte`: stage also has `vb-ground`.
- Gallery: `region-section.ts` frames container has `vb-ground`; `gallery.css` sets frame
  min-height, padding and gaps, and makes the `frame-pinned` sample 1.75 cards wide so the narrow
  state is drawn (with Reset places).
- Tests: `region-template.test.ts` (+1: label and tools groups), `region-core.test.ts` (+1:
  `regionColour`), `board.spec.ts` (+1: padding-top equals `REGION_HEAD`, head straddles the
  border), `gallery.spec.ts` (+1: narrow frame shows only the pressed mode until hovered).

**Gates**: `npm test` 0 (116 -> 118), `npm run check` 0, `npm run verify` 0 (controller.ts length
warning, as before), `npm run test:pages` 0 (21 -> 23; the two expected-failure axe tests still fail as designed).

**Existing tests modified**: `tests/pages/board.spec.ts` "each layout mode draws every region":
`placement()` also returns the top line's box and `problemsOf()` fails if a card starts above the
top line's bottom (the "no card overlaps the top line" check); and it hovers the mode group before
clicking a mode button, because narrow frames hide the unpressed buttons until hover. No layout
test hard-coded 40, so none changed. Baselines re-recorded after viewing:
`tests/pages/__screenshots__/board.spec.ts/board-{dark,light}-darwin.png`,
`tests/pages/__screenshots__/gallery.spec.ts/gallery-{dark,light}-darwin.png`.

**Screenshots**: `temp/2b-fe02/gallery-region-dark.png`, `temp/2b-fe02/gallery-region-light.png`,
`temp/2b-fe02/board-dark.png`, `temp/2b-fe02/board-light.png`.

**Differences from 05 kept**
- Radius `--vb-radius-lg` (14px); 05 uses 18px (no token).
- Frame line 70% `--region` (05: 42% of a group colour) because the neutral default is faint.
- Count reads "1/2 decided" (05: "2 of 7 decided"); the text is the core's and tested.
- Five text layout buttons and Reset places instead of 05's icon row and cog (Stage 2d); the
  frame collapses them to the pressed mode under 480px (not in 05).
- Gap is a canvas-coloured patch, not a cut border, so it hides the dot grid under the pill.

**Open**
- Narrow frames with Reset places showing still ellipsize the title (board: "Formats and decisions"
  shows ~"FORMATS…"). Goes away with the icon row (2d).
- Row widths in `layout` (`MIN_W`) unchanged; a one-card region is 336px wide.
- N8 (axe `target-size` on `.vb-mode`) still open, as before.
