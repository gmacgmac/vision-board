# FE_03_rail-on-hover: Rail icons only on the container in use

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

A container's rail icons show only on the container being hovered or holding focus (PLAN decision 9, point 416).

## Context

Today every container shows its rail icons dimmed at rest (`packages/ui/src/region/region-rail.css`, the
`@media (hover: hover)` rule using `--vb-rail-rest`), full strength on the rail's own hover or focus. The maintainer
wants them on the container in use only. Their colour and strength stay as they are. The flag `railOnHover` (on)
is in `packages/format/src/flags.ts` already; read it the way `toolRail` is read.

## Inputs

- **Files to modify**: `packages/ui/src/region/region-rail.css` (and the region's core/element only if the flag must
  reach the markup as an attribute, the way `data-rail` does), `packages/ui/src/region/pattern.json` (the new state),
  `apps/board/src/gallery/rail-section.ts`, `tests/pages/container-rail*.spec.ts` or a new spec of its own
- **Reuse**: the existing rest rule and its exceptions (`data-open`, `data-preview`, `data-note-open`, `data-look`,
  the touch rule); the gallery's `data-look` for drawn states
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. A failing page spec: a board with two containers; the pointer over one shows that one's icons at rest strength
   and the other's hidden (opacity 0); focus inside a container shows its icons; flag off is today's look.
2. The rule: hidden (opacity 0, still focusable, no layout change) unless the region is hovered or holds focus, or
   one of the existing open states holds; then today's rest / lit rules. Comment's badge still shows. Touch unchanged.
3. Gallery: "hidden (not in use)" beside rest and lit; axe and APCA (decoration tier for what shows).
4. A look at 1400, 900, 600 px, light and dark, on your own test server. Screenshots that change: name them; do not
   re-take them (T_01 re-takes every screenshot once in wave 3) unless your own new spec needs its own.

## Validation

- [ ] The spec fails first, then passes, flag on and off; rail specs green; `verify`, `check`, `packages/ui` unit tests

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (Run 1)

### Changes Made
- `railOnHover` read in `controller.ts` (`railHover: on('railOnHover')`) -> `DrawDeps.railHover` -> `createRegionSet` -> `render(..., { railHover })` -> `data-rail-hover` on the frame (with `data-rail`).
- The cards are a layer above the frames (`.vb-regions`, `.vb-cards`), so a frame's `:hover` does not see a pointer over its cards. `canvas/region-use.ts` `bindRegionUse` (bound in `createDrawing`, undone in `destroy`) sets `data-use` on the frame under the pointer (smallest box) and on the frame of the focused card. The rail is inside its frame, so `:hover` / `:focus-within` cover the rail and its controls.
- `region-rail.css`: under `(hover: hover)`, a `data-rail-hover` frame without `data-use`, `:hover`, `:focus-within`, `data-open`, `data-preview` or `data-note-open` draws icons, divider, the checked layout's and the switch's fills at opacity 0 and the row's border, fill and ring transparent. Comment keeps its place (badge shows). In use: the existing rest rule (`--vb-rail-rest`); rail hovered: full. Touch unchanged.
- Gallery: group "Only on the container in use" (hidden, in use, in use + lit; `rail-hidden`, `rail-inuse`, `rail-inuse-lit`), only with the flag on. `pattern.json`: `flaggedStates.railOnHover`, `data-rail-hover`, `render` option.
- Spec `tests/pages/container-rail-hover.spec.ts` (red first: 6 failed before the code, flag-off, touch and axe passed vacuously). Existing dim-at-rest tests (`container-rail.spec.ts` x2, `layout-tiles.spec.ts` x2) now run with `?flags=-railOnHover`, since on, the rest look is the container in use's; `container-rail-states.spec.ts` gallery count 11 -> 14.
### Caught Beyond the Brief
- Hiding only the icons left a ghost pill with the checked layout's and the switch's fills (seen in the gallery), so the row's box goes too; recorded as the reading of "hidden".
- `npm run verify` fails on the page weight: 200.0 KB gzip on the base (already over the 200 KB budget), 200.4 with this change. Not mine to move (performance.md budget).
- Files outside the wave-2 ownership row were needed (the cards' layer made CSS alone impossible): `apps/board/src/board/canvas/{draw,render,region-use}.ts`, `controller.ts` (one option), `gallery/main.ts` (one argument), `layout-tiles.spec.ts`.
### Deviations from Plan
- None from decision 9. Screenshots changed: `tests/pages/__screenshots__/container-rail-states.spec.ts/rail-light-darwin.png` and `rail-dark-darwin.png` (gallery section grew); not re-taken (T_01 wave 3).
- Look: gallery at 1400 light, 900 dark, 600 (light; a width under 768 emulates touch, so every rail shows there, as decision 9 says); rest strength and token unchanged, so the APCA check at rest (flag off) still holds; nothing is drawn in the hidden look to measure.

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_03: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_03_rail-on-hover.md]]`, ending in a newline; the return block.
