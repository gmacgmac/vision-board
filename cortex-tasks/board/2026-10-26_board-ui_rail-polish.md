---
task_name: Rail And Title Polish
created: 2026-10-26
completed:
status: pending
categories: [board-ui]
type: implementation
model: standard
skills: [cortex-architecture]
tracker:
---

# Task: Layout tiles apply on click, a quieter rail, larger container titles

> **Source**: maintainer, chat 2026-10-26 (points 154-156; 155 ruled: "try 50%, test it, then write it
> as a ruling") · **Branch / worktree**: `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail`.
> Runs after `2026-10-26_board-ui_hover-tip-reachable.md` (it touches the shared hover rules).

## Design

1. **A tile applies its layout.** In the layout popover (`packages/ui/src/region/region-template.ts`
   `modePopover`, `.vb-mtile`), a click on a tile sets that layout exactly as the rail's icon does: the
   same action through the action layer (rule 8; find what the rail's `data-mode` click calls in the
   page's click wiring and reuse it, no second path). Tiles become real buttons (keyboard: they already
   move with ← →, Enter applies), with hover, pressed, focus and current states. The popover closes after
   applying. Read-only boards (past version, locked) keep tiles inert, as the rail is.
2. **Rail at 50% at rest in dark too.** `--vb-rail-rest` (`packages/tokens/src/tokens.css`) dark value
   0.76 -> 0.5 (light is already 0.5). Approved as a trial: measure the rest icons' APCA, light and dark,
   and record them; a value under Lc 30 is reported, not hidden. If the maintainer keeps it, a decision
   entry (D-009 mechanism) is drafted for their yes; do not write `docs/decisions.md` yourself.
3. **Container titles one step larger.** The title handle (`region.css` `.vb-region-handle`, now
   `--vb-text-sm`) takes `--vb-text-md`. Keep the line's height (`REGION_HEAD` 38) and the narrow-line
   shrink order (holders, then title to "…", then count); re-check the container-title and rail bounds
   specs and refresh only the screenshots this changes, listing them.

## Steps

1. Tests first: a page test that a tile click (and Enter on a tile) changes the container's layout and
   writes one act; tiles inert on a past version; the rail's rest opacity reads the token; the title's
   computed size is `--vb-text-md`.
2. Build 1-3. Gallery: the popover shows the tile states.
3. Run the region, rail, title, layout-controls and gallery specs; the full page suite once at the end.
4. Screenshot the rail at rest and lit and a narrow container's title, light and dark, into the task's
   notes folder `temp/rail-polish/` for the maintainer to judge 2 and 3 by eye.

## Constraints

- Tokens: only `--vb-rail-rest`'s dark value changes. No ledger or schema change. No git commits.
- Page tests on `VB_TEST_PORT=4630` under `temp/pages.lock`; never port 4466. Files under 300 lines. No PII.

## Success Criteria

- [ ] A tile click or Enter applies the layout through the same action as the rail; popover closes
- [ ] Rail rest 0.5 in both themes; APCA at rest recorded light and dark
- [ ] Titles at `--vb-text-md`; narrow lines still drop parts whole; screenshots listed
- [ ] `npm test`, `npm run verify`, `npm run check`, touched specs, then the full suite once, pass (known 6 excepted)

## Implementation Notes

_To be completed by agent after task execution._

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: Rail And Title Polish → Task: [[cortex-tasks/board/2026-10-26_board-ui_rail-polish.md]]`
3. Do not write to `AUDITED.md`.
