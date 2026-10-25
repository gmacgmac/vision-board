---
task_name: Container Tool Rail
created: 2026-10-25
completed: 2026-10-25
status: completed
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

- [x] A narrow frame shows its whole title (or as much as the full line allows), centred; no tool on the top line
- [x] Rail bounds met at 100, 90, 80, 70, 60, 56% (measurement table in Implementation Notes)
- [x] Rest / lit / collapsed / expanded / popover states work by mouse, keyboard and touch; Esc closes
- [x] APCA: icons at rest Lc >= 30, lit as today, light and dark (numbers recorded)
- [x] Flag off reproduces today's row exactly (existing specs pass with the flag off)
- [ ] New tests failed first; `npm test`, `npm run test:pages`, `npm run verify` pass (all but: test:pages 600 passed, 6 failed: send-access x4, the OPEN item under Issues; size.spec gallery screenshot x2, 3-6px antialiasing noise in a section the rail does not touch)
- [x] Gallery, `pattern.json` and `components.md` updated; task file updated with completion notes

---

## References

- `cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/FE_02_container-title.md` (the title line's grid, rule 15 reasoning)
- `cortex-tasks/board/2026-10-16_board-ui_review-polish-round-2.md` (the row's narrow forms)
- `tests/pages/apca.ts` (APCA helpers) · `.kiro/steering/svelte-conventions.md`

---

## Implementation Notes

**Completed**: 2026-10-25 (time in the LOG entry)

### Changes Made
- `packages/ui/src/region/region-template.ts` `regionTemplate`, `RegionFrameOptions.rail`: the tools group
  (unchanged markup and order) goes into `.vb-region-rail` after `</header>` when `rail` is set; the top
  line keeps the label alone. Later's rail holds only the cog.
- `packages/ui/src/region/vb-region.ts` `render`: `data-rail` from the option.
- `packages/ui/src/region/region-row.ts` `onRowKey` / `onMenuKey`: in the rail Right on the cog opens its
  menu (Down moves on, wrapping), Left in the menu closes it back to the cog; Esc closes the layout
  popover and collapses a short frame's rail (`data-shut` on the row; cleared when the pointer comes back
  or focus moves). Flag off, the keys are as before.
- `packages/ui/src/region/region-rail.css` (new, 126 lines): label-only top line centred; the rail's room
  (`.vb-region-rail`, counter-scaled by `--vb-zoom`, a size container named `vb-rail`, frame-on-screen
  height, line width so the 568px compact popover query is unchanged); the strip (30px, `--rail-out`
  20px, 2px canvas ring, 24px buttons); badge on the outer side; popovers to the right, top-aligned with
  the layouts, Comment and the cog; rest dim; the forms by rail room (275/249px, 112px) with a collapsed
  rail anchored by its foot so it expands upward; frame raised while the rail is hovered or focused;
  `data-look` hook for the gallery.
- `packages/ui/src/region/region-narrow.css`: the row's top-line forms scoped to `vb-region:not([data-rail])`
  (kept for the flag off; see Deviations). `region.css` untouched (300 lines).
- `packages/tokens/src/tokens.css`: `--vb-rail-rest` 0.5 light, 0.76 dark (per-theme number via
  `prefers-color-scheme` and `data-theme`).
- `packages/format/src/flags.ts` `toolRail` (default on); plumbed `controller.ts` -> `draw.ts` `rail` ->
  `render.ts` `createRegionSet({ rail })` (Later too).
- Gallery: `apps/board/src/gallery/rail-section.ts` (rest, lit, collapsed, expanded, narrowest with and
  without badge, layout popover, menu, Later), `gallery.css` `.g-rail-frames`, `main.ts` (CSS import, section
  behind the flag). Existing gallery samples keep the top-line row (same as the widths/remove precedent).
- `pattern.json` (`flaggedStates.rail`, `data-rail`, render options, keys, styles list);
  `docs/specification/components.md` "The tool rail" ruling and a flag-off qualifier on the top-line paragraph.
- Tests: `packages/ui/tests/region-template.test.ts` (+3), `packages/format/tests/flags.test.ts` (+1);
  `tests/pages/container-rail.spec.ts` (placement, line, bounds, dim, APCA x2, flag off),
  `tests/pages/container-rail-states.spec.ts` (collapse/expand/Esc, popovers, keys, axe x2, touch, gallery
  screenshot x2), helpers `tests/pages/rail-board.ts`. Updated: `container-title.spec.ts` (tools-overlap is a
  box intersection; the sliding-label test pinned to `?flags=-toolRail`; the sliver sweep runs both ways),
  `container-polish.spec.ts` (overlap as box intersection), `board.spec.ts` (hover the rail before a hidden
  layout; pointer parked for the keyboard test; menu key by `data-rail`), `person-remove.spec.ts` and
  `lock-board.spec.ts` (same, by `data-rail`).

### Measurements
Measurement pass by a Sonnet sub-agent (own server, Playwright, screen px, ring-inclusive; frames: one-card
p/q side by side, lanes l, tall t, retired-marker r, s, Later; with and without Comment's badge). All 84
frame/zoom/badge rows pass.

| zoom | inside reach (bound 13.4) | outside, no badge / badge (bound 28.8) | min gap to card | min gap to lane label | rail reach to left neighbour (frame gap) | rail top - head bottom |
|---|---|---|---|---|---|---|
| 100 | 11.5 | 22.5 / 25.5 | 16.5 | 12.5 | 33.5 / 30.5 (56.0) | 1.2 |
| 90 | 11.6 | 22.5 / 25.5 | 13.7 | 10.0 | 28.0 / 25.0 (50.4) | 1.3 |
| 80 | 11.6 | 22.4 / 25.4 | 10.8 | 7.6 | 22.4 / 19.4 (44.8) | 1.4 |
| 70 | 11.7 | 22.4 / 25.4 | 8.0 | 5.1 | 16.9 / 13.9 (39.2) | 1.5 |
| 60 | 11.7 | 22.3 / 25.3 | 5.1 | 2.7 | 11.3 / 8.3 (33.6) | 1.5 |
| 56 | 11.7 | 22.3 / 25.3 | 4.0 | 1.7 | 9.1 / 6.1 (31.4) | 1.6 |

Forms: one- and two-card frames collapsed at 80-100%, narrowest at 70% and below (Comment kept with a
badge); the lanes frame full at 80-100%, collapsed below; tall frames full; Later cog only. The rail's
bottom stays at least 12.2px inside the frame at rest. The rail's top never overlaps the label.

APCA (as drawn, icon colour at its opacity over its own fill / over the canvas):

| theme | state | unchecked layout | checked layout | cog |
|---|---|---|---|---|
| light | rest (0.5) | 39.8 / 36.5 | 52.1 / 57.6 | 39.8 / 36.5 |
| light | lit | 95.1 / 98.6 (hovered) | 89.3 / 98.6 | 76.3 / 70.3 |
| dark | rest (0.76) | 32.7 / 32.6 | 63.9 / 63.6 | 32.7 / 32.6 |
| dark | lit | 93.8 / 95.7 (hovered) | 92.5 / 95.7 | 48.8 / 49.6 |

Lit, the quiet icon is as before (`--vb-ink-subtle` at full strength: 76.2 light, 48.8 dark on the fill).

### Issues & Resolutions
- A collapsed rail that expanded downward moved Comment and the cog from under the pointer between
  hover and click (board.spec, containers.spec failed): a collapsed rail is now placed by its foot and
  expands upward, as the top-line row expanded leftward from its fixed right end.
- Expansion keyed on the row's hover collapsed the rail while the pointer was on a popover (the popover
  jumped away): expansion now keys on the rail's (tools') hover and focus.
- Esc on a focused layout first only closed the popover; in the rail one Esc now closes it and collapses.
- board.spec's "outside click closes the menu" clicked at (800, 980), where decide's rail Column button
  now sits, so it switched decide to column and broke move-and-later.spec and notes.spec later in the run
  (found by diffing the roadmap ledger after board.spec with the flag on and off). The click now goes to
  an empty point at the stage's right edge, asserted free first. layout-controls.spec hovers a short
  frame's rail before pressing a hidden layout or the widths switch (only when `data-rail` is set).
- OPEN (needs the maintainer): `send-access.spec.ts` "axe passes on the board with the strip..." fails
  with the rail on: axe target-size on the card's `.vb-size-trig` (27.5 x 22px, so it needs 24px of free
  space) against a holder button that has wrapped out of sight under the top line (FIX_48: a holder with
  no room wraps to the slot's clipped second line, stays focusable and in the accessibility tree). With the
  label centred on the whole line, that clipped holder now sits at x 837-941, y 498 (board at 110%), just
  above the size trigger at x 899, y 508. Flag off the wrapped holder lands elsewhere, so the test passed.
  Not fixed here: it is the label's wrap-out-of-sight pattern (FIX_48) meeting the node pattern's
  under-24px size trigger, both outside this task. The two send-access tests after it fail only because
  the failed test leaves its access request pending.
- Unrelated to this task: board.spec's screenshot baseline holds toolbar chips from a full-suite run order
  (v153, "6 boards updated"), so it fails when that spec runs alone; the gallery screenshot showed
  15-2,500 px of text-antialiasing noise outside the region sections before the rail section was added.

### Deviations from Plan
- Design 2 says remove the collapsed-row forms from `region-narrow.css`; they are kept and scoped to
  `vb-region:not([data-rail])`, because the success criterion requires flag off to reproduce today's row
  exactly. Delete them when the flag is retired.
- Design 4 does not say which way a collapsed rail expands; it expands upward (from its foot) so Comment
  and the cog stay put (see Issues). It may reach above the frame as an overlay.
- The existing gallery region samples keep the top-line row (rendered without `rail`, as the widths and
  remove samples are); the rail has its own gallery section behind the flag.
- The lane bands (`rect.vb-lane`, 8 board units inside the frame) run under the rail's inner 3.5-7.2px;
  the lane labels stay clear (1.7px at 56%). Not a Design 3 bound; noted for the maintainer.

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] Completed: Container Tool Rail → Task: [[cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md]]
   ```
3. Do not write to `AUDITED.md`.
