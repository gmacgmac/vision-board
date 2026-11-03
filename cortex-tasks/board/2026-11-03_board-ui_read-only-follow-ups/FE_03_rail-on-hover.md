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

**Status**: Pending

### Changes Made
-
### Caught Beyond the Brief
-
### Deviations from Plan
-

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-ui] FE_03: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_03_rail-on-hover.md]]`, ending in a newline; the return block.
