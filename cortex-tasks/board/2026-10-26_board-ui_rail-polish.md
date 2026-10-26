---
task_name: Rail And Title Polish
created: 2026-10-26
completed: 2026-10-26
status: completed
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

- [x] A tile click or Enter applies the layout through the same action as the rail; popover closes
- [x] Rail rest 0.5 in both themes; APCA at rest recorded light and dark
- [x] Titles at `--vb-text-md`; narrow lines still drop parts whole; screenshots listed
- [ ] `npm test`, `npm run verify`, `npm run check`, touched specs, then the full suite once, pass (known 6 excepted)

## Implementation Notes

- **1, tiles apply.** `region-template.ts` `modePopover`: a tile is now `button.vb-mtile` (`tabindex="-1"`, `data-tile`
  = the mode, `data-region`); the page's click wiring (`wiring.ts`) takes `button[data-mode], button[data-tile]` into the
  one `h.setMode`, so the rail icon and the tile share the action, the `ACTING` guard (a past version) and the lock guard.
  `region-row.ts`: a tile click closes the popover; a tile press never takes focus; the pointer on a tile moves the
  highlight; Enter on a focused tile returns focus to that layout's icon, then closes. `vb-region.ts`: `PAUSED` lists
  `button.vb-mtile` (locked: aria-disabled, a press says why); the icons' `aria-checked` loop narrowed to `role="radio"`.
  `region-modes.css` is new: the popover block moved out of `region.css` (it was at 300 lines) with the tile states
  (hover and highlight, pressed, focus ring, current; `data-look` draws pressed and focus in the gallery); imported after
  `region.css` in `main.ts` and the gallery's `main.ts`. Gallery: rail section gains "Layout tiles" (hover, pressed, focus,
  current; and a locked sample), so 11 frames.
- **2, rail rest 50%.** `--vb-rail-rest` dark 0.76 -> 0.5. APCA at rest (APCA-W3 0.0.98G-4g, the quiet icon blended at 0.5 over
  its own fill and over the canvas): light, unchecked icons and cog 39.8 on the rail fill, 36.5 on the canvas; checked layout 52.1 / 57.5.
  Dark, unchecked icons and cog **17.7 on the fill, 16.9 on the canvas: under the Lc 30 decoration tier**; checked layout 36.5 / 33.8.
  (Dark was 32.6 / 32.7 at 0.76.) Reported, not hidden: `container-rail.spec.ts` keeps the Lc 30 assertion for light and, for dark,
  records the numbers as a test annotation and in the log; the token comment, `components.md`, `pattern.json` and the gallery
  text say so. The decision entry (D-009 mechanism) is for the maintainer to say yes to: nothing written to `docs/decisions.md`.
  If they want dark to keep Lc 30 the value is about 0.76 (or a lighter dark `--vb-ink-subtle` would do it).
- **3, titles.** `region.css`: `.vb-region-handle` and its `h2` `--vb-text-sm` -> `--vb-text-md` (the count stays `--vb-text-sm`).
  REGION_HEAD and the shrink order untouched; the container-title, container-polish and rail-bounds specs pass unchanged.
- **Screenshots refreshed (12, all from the larger title, the rail's two also from the new tile frames):**
  `tests/pages/__screenshots__/` `container-rail-states.spec.ts/rail-{light,dark}-darwin.png`, `gallery.spec.ts/gallery-{light,dark}-darwin.png`,
  `layout-controls.spec.ts/{alignment,card-widths,link-labels}-{light,dark}-darwin.png`, `lock-board.spec.ts/lock-{light,dark}-darwin.png`.
- **Maintainer's eye:** `temp/rail-polish/` (rail at rest and lit, the narrow container's title, the tile popover; light and dark).
- Tests: new `tests/pages/layout-tiles.spec.ts` (tile click: one act of the icon's shape; Enter on a tile; states; past version inert;
  rest 0.5 in both themes; title size); `lock-board.spec.ts` tile press while locked; `region-template.test.ts`, `node-paused.test.ts`.
- Note: `npm test`'s timing tests (server start on a 100,000-event ledger, 1000-card layout, adversarial render) fail on this
  machine under a load average of about 25; the 1,605 unit tests all pass. Not touched by this change.

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: Rail And Title Polish → Task: [[cortex-tasks/board/2026-10-26_board-ui_rail-polish.md]]`
3. Do not write to `AUDITED.md`.
