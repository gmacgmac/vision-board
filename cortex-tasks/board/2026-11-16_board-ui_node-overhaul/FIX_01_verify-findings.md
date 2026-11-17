# FIX_01_verify-findings: Fix What VERIFY_01 Found

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Fix VERIFY_01's must-fix and should-fix findings (its Run 1 report in `VERIFY_01_testing.md`) so T_04 can turn the
set on. Everything stays behind the set's flags until T_04.

## Orchestrator's rulings (2026-11-17; the maintainer may overrule at the T_04 gate)

- **Small targets far out (finding 2)**: below the zoom where a mark's hit area draws under 24 px on screen, marks
  take no pointer press (a click there selects the node, as on its body); keyboard reach is unchanged. Page specs
  excuse axe `target-size` only below that zoom, with the reason in the spec. At 100% every mark's target is at least
  24 px, in both skins (fix "Bookmark item 24").
- **H (finding 8)**: H opens History on a focused or selected node; Hide answered moves to Shift+H (key help, words).
- **A press on a locked board (finding 12)**: the popover only, no toast.
- **Flows in the header (finding 3)**: shown at full width; folds into "⋯" at the half and third tiers; tier widths
  remeasured with it, and `header-tiers.spec.ts` run with `flowDirection` on.
- **Command Lens plate marks (finding 6)**: unchanged, no minimum (awaiting the maintainer).

## Steps

1. Must-fix 1: make `bookmark-retire.spec.ts` and `person-remove.spec.ts` pass every time (the aborted calculator
   panel request after a gallery navigation): fix the harness, not by hiding real errors.
2. Must-fix 2 and 3 per the rulings.
3. Should-fix 5 (marks at 20% overlap each other and the container title), 7 (a box near the window's bottom must
   stay on screen: flip up or clamp, keep top alignment when it fits), 8, 9 (Command Lens boxes on the plate/glass
   tokens, if any part is still the default skin's), 10 (app title bar at 360 px: the name keeps priority; the state
   shortens to an icon with its words in the tip), 11 (Flows menu: closes on choosing the chosen option; consistent
   labels "Flows: Across / Down / Auto"; words at full width), 12, 14 (Esc returns focus to the mark that opened the
   menu or box).
4. Should-fix 13: the plugin bot's `node.icon` input description (`apps/board/server/words/plugin-tools.ts`) names no
   tool it lacks. Run `npm run eval:bot -- --dry`.
5. Should-fix 16: tidy `TASK-STATUS.md` Shared Foundations and File Ownership rows (owners and files there, notes in
   the notes blocks) and the six notes blocks still saying Pending.
6. Leave for T_04: finding 4 (app window to Later) and 15 (gallery sections with the old footer).

## Validation

- `npm run verify`, `npm run check`, `npm run gen -- --check`, `npm test`, `npm run test:plugin`, and the page specs
  for each fix, plus `bookmark-retire`, `person-remove`, `header-tiers` (flags on and off), axe specs with the flags on.
- A look in a browser for each visible fix, both skins, dark and light.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_01: [what you fixed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FIX_01_verify-findings.md]]`

## Implementation Notes

**Status**: Pending
