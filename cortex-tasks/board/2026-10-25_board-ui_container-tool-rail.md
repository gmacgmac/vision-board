---
task_name: Container Tool Rail
created: 2026-10-25
completed:
status: pending
categories: [board-ui]
type: implementation
model: strong
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Container tools move to a rail on the left edge

> **Source**: maintainer, chat 2026-10-25 (points 1-15) · **Branch / worktree**: `feat/tool-rail-and-examples`
> in `.claude/worktrees/tool-rail` (the maintainer's board runs from the main checkout on 4466)

---

## Problem Statement

A narrow container's top line holds both the title and the tool row (six layout icons, Match card
widths, Comment, Settings). The row takes about 260px, so the title is cut to a few letters and the
two crowd each other. Move the row, unchanged in content, to a vertical rail on the frame's left
edge. The top line then holds only the label, centred, with the whole line for the title. The rail
is dimmed at rest and full strength on hover, focus or while one of its popovers is open.

---

## Current State

- `packages/ui/src/region/region-template.ts` `regionTemplate`: `.vb-region-head > .vb-region-bar >`
  `[.vb-region-label][.vb-region-tools > .vb-mode-row + .vb-mode-pop + .vb-note-pop + .vb-region-menu]`.
- `region.css` (300 lines, at the limit): `.vb-region-bar` is a 3-column grid (lead, label, tools);
  the head is counter-scaled to screen size (`scale(1 / --vb-zoom)`) and is the query container.
  Popovers open under the row (`top: calc(100% + 3px); right: 0`).
- `region-narrow.css`: the row's collapsed forms by line width (408px, 568px with a retired marker,
  226px / 261px), expanding over the label on hover / focus; the retired marker's narrow form (290px).
- `region-row.ts`: the row's keys. Up and Down already move like Right and Left, except Down on
  the cog opens its menu.
- Outside the pattern, `.vb-region-tools` is read by `apps/board/src/board/pointer.ts` (`INTERACTIVE`),
  `apps/board/src/styles/board.css` (read-only hides it) and `[data-zoom='far']` (hides it).
- Geometry (`packages/layout/src/types.ts`): `REGION_PAD = 28`, `REGION_GAP = 56`, `REGION_HEAD = 38`;
  `apps/board/src/board/viewport.ts` `FAR_K = 0.55` (below it the tools hide).

---

## Design (agreed in chat; keep it)

1. **Same controls, same markup, new place.** `regionTemplate` renders the existing `.vb-region-tools`
   (row, popover, note preview, menu) in a rail element after the `<header>`, not inside the bar.
   Keep the class `.vb-region-tools` so `pointer.ts`, `board.css` read-only and far zoom keep working
   untouched. The row's button order stays: layouts, divider, widths, Comment, cog.
2. **Top line = label only.** `.vb-region-bar` keeps the label centred; the tools' column goes. The
   label's shrink order (holders, title to "…", count) and the title tip stay as they are. Remove
   the collapsed-row forms from `region-narrow.css`; keep the retired marker's narrow form.
3. **Rail geometry.** Vertical, across the left border, starting just under the top line. Screen-sized
   like the head: absolutely placed, height `calc(<room on the frame> * var(--vb-zoom))`, counter-scaled
   by `scale(1 / var(--vb-zoom))`, `container-type: size`, so its forms follow its on-screen height
   with nothing measured in JS (rule 15). Buttons 24 x 24 (WCAG 2.5.8 minimum), so the rail is about
   30px across. Hard bounds, on screen, at every zoom from 100% down to `FAR_K` (55%):
   - inside the frame it reaches at most `REGION_PAD x 0.55 - 2` = about 13px (incl. its ring), so it
     never covers a card;
   - outside it reaches at most `REGION_GAP x 0.55 - 2` = about 28px, so it never touches the next
     container. Offset the rail outward to meet both; no change to `packages/layout`.
4. **Short frames.** Three forms by the rail's own height, mirroring today's row: full; collapsed (the
   checked layout, Comment, cog); narrowest (cog, plus Comment while its badge shows). Collapsed forms
   expand as an overlay over the cards on hover or focus, moving nothing; collapse on leave, blur, Esc.
5. **Dim at rest.** A new token in `packages/tokens/src/tokens.css` (approved in chat, point 4): the
   rail's rest opacity, light and dark. Full strength on `:hover`, `:focus-within`, `[data-open]`,
   and under `@media (hover: none)`. The Comment badge is never dimmed. At rest every icon still
   measures APCA Lc >= 30 against the canvas (rule 3, decoration tier); choose the token value from
   the measurement, not by eye alone, and report the numbers.
6. **Popovers open to the right of the rail**, top-aligned with the button that opened them, over the
   cards (z 4 as now; `vb-region[data-open]` stays). The layout popover keeps its compact form (568px
   query) driven by the frame's on-screen width.
7. **Keyboard.** Up and Down move through the rail (already supported in `region-row.ts`); on the cog,
   Right opens its menu (Down moves on in a vertical rail). Tab order: grip, rail, note block, cards.
8. **Flag.** `toolRail` in `packages/format/src/flags.ts` (rule 12), on by default. Off: the row stays
   on the top line exactly as today (the template picks the placement; CSS for the rail is scoped to
   `vb-region[data-rail]` or the world's flag attribute, whichever the existing flags use).
9. **Fixed frames (Later)** get a rail with only the cog. Far zoom hides the rail (existing rule).

---

## Steps

1. **Tests first** (page, `tests/pages/container-rail.spec.ts`), failing before the change: the rail is
   on the left edge, the title centred with the full line; bounds of Design 3 at 100%, 80%, 60%, 56%;
   rest vs lit (hover, focus, open popover); collapse and expand on a short frame; popovers open right
   of the rail and inside the viewport; Up / Down / Right-on-cog; flag off = today's row. Unit:
   `packages/ui/tests/region-template.test.ts` for the new markup.
2. **Template and element**: `region-template.ts` `regionTemplate` (rail placement by option, as `fixed`
   and `widths` are passed today via `RegionFrameOptions`), `vb-region.ts` / `region-row.ts` key change.
3. **Styles**: new `packages/ui/src/region/region-rail.css` (rail, forms, dim, popover anchoring), loaded
   after `region-narrow.css`; trim `region.css` / `region-narrow.css` of what moves. Tokens only.
4. **Measurement pass (sub-agent, model `standard`, accuracy brief)**: in a browser on its own port,
   measure every bound in Design 3 and 4 at 100, 90, 80, 70, 60, 56% for: a one-card frame, a tall
   frame, a lanes frame (`LANE_GUTTER` labels), a frame with a retired marker, Later, and two frames
   side by side at `REGION_GAP`. Report a table of rail box vs nearest card / neighbour / title in
   screen px, and APCA at rest and lit, light and dark. It reports numbers only; fixes come back here.
5. **Update existing specs** that assert the row on the top line: `container-title`, `container-polish`,
   `containers`, `board`, `zoom-level`, `gallery`, `person-remove`, `versions`. Refresh only the
   screenshots whose frames changed, and list them.
6. **Gallery and docs**: the region gallery section shows rail rest, lit, collapsed, expanded, popover
   open; `pattern.json` states; `docs/specification/components.md` (the title line and the rail, a
   component ruling superseding mockup 05's row placement), via `cortex-docs`.
7. Look at it yourself in a browser at three zooms, light and dark, before reporting done.

---

## Files Involved

| File | Purpose |
|------|---------|
| `packages/ui/src/region/region-template.ts` | Rail placement (`regionTemplate`, `RegionFrameOptions`) |
| `packages/ui/src/region/region-rail.css` (new) | Rail, its forms, dim, popover anchoring |
| `packages/ui/src/region/region.css`, `region-narrow.css` | Remove the tools column and collapsed-row forms |
| `packages/ui/src/region/region-row.ts`, `vb-region.ts` | Right on the cog; flag attribute |
| `packages/format/src/flags.ts` | `toolRail` flag |
| `packages/tokens/src/tokens.css` | Rail rest-opacity token (light and dark) |
| `packages/ui/src/region/pattern.json`, `apps/board/src/gallery/*-section.ts` | States, gallery |
| `tests/pages/container-rail.spec.ts` (new), the specs in Step 5, `packages/ui/tests/region-template.test.ts` | Tests |
| `docs/specification/components.md` | Title line and rail ruling |

---

## Constraints

- **DO NOT** change `packages/layout` (padding, gaps) or any schema; the bounds are met by the rail's size and offset.
- **DO NOT** touch the agent-examples task's files (`scripts/gen-*.mjs`, `packages/mcp`, `apps/board/server`,
  `packages/format/schema`, `skills/`); it runs in parallel in this worktree.
- **DO NOT** edit protected files (`.kiro/steering/vision-board-proj.md`, `docs/decisions.md`, `docs/principles.md`).
- Page tests on `VB_TEST_PORT=4560` under `temp/pages.lock`. Never touch port 4466. No git commits.
- Files over 300 lines warn, 500 fail: split, never squeeze. Writes over 50 lines in chunks.
- **STOP** and tell the maintainer if a bound in Design 3 can't be met without a layout change, or if
  the rest opacity can't keep Lc 30.
- No PII in examples or fixtures.

---

## Success Criteria

- [ ] A narrow frame shows its whole title (or as much as the full line allows), centred; no tool on the top line
- [ ] Rail bounds met at 100, 90, 80, 70, 60, 56% (measurement table in Implementation Notes)
- [ ] Rest / lit / collapsed / expanded / popover states work by mouse, keyboard and touch; Esc closes
- [ ] APCA: icons at rest Lc >= 30, lit as today, light and dark (numbers recorded)
- [ ] Flag off reproduces today's row exactly (existing specs pass with the flag off)
- [ ] New tests failed first; `npm test`, `npm run test:pages`, `npm run verify` pass
- [ ] Gallery, `pattern.json` and `components.md` updated; task file updated with completion notes

---

## References

- `cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/FE_02_container-title.md` (the title line's grid, rule 15 reasoning)
- `cortex-tasks/board/2026-10-16_board-ui_review-polish-round-2.md` (the row's narrow forms)
- `tests/pages/apca.ts` (APCA helpers) · `.kiro/steering/svelte-conventions.md`

---

## Implementation Notes

_To be completed by agent after task execution._

**Completed**: YYYY-MM-DD HH:MM

### Changes Made
-

### Measurements
-

### Issues & Resolutions
-

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] Completed: Container Tool Rail → Task: [[cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md]]
   ```
3. Do not write to `AUDITED.md`.
