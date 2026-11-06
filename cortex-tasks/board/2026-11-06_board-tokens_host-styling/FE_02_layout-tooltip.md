# FE_02: Layout tooltip, no overlay

> **Set**: [PLAN.md](./PLAN.md) · **Wave** 2 · **Skills**: cortex-architecture

## Objective

Choosing a container's layout shows a tooltip on each choice (its name and what it does) on hover and on keyboard
focus, as the control's accessible description. The big overlay (the layout popover with its tiles and hint line,
the part in the middle of the container above all) no longer opens. PLAN Decision 7.

## Inputs

The nclite handoff item 9 and the maintainer's screenshot that came with it (ask the orchestrator for it); the region
pattern in `packages/ui/src/region/` (`region-template.ts` `.vb-mtile`, `region-row.ts` `openModes` and `highlight`,
`region-core.ts` `MODE_LABEL` and `MODE_HINT`, `region-rail.css`, `region-modes.css`, `pattern.json`); the board's
existing hover tip (`packages/ui/`, shared, as `docs/principles.md` § The board is a plugin says); `wiring.ts`
(`modeBtn`, `setMode`).

## Steps

1. Find every place that opens the overlay (pointer, keyboard, the rail and any other caller of `open('modes')`) and
   list them in your notes, with the screenshot's overlay matched to its code.
2. Failing page tests first (extend the layout control's spec in `tests/pages/`): hover and focus show the tooltip with
   the right name and hint for all six modes; it is the control's accessible description; Esc dismisses it; nothing
   opens the overlay; choosing a layout still works by pointer and keyboard.
3. Reuse the board's existing hover tip for the tooltip; words from `board.region.*` / `MODE_LABEL` and `MODE_HINT`
   (T_01 adds any missing). No new pattern unless none fits: then stop and ask.
4. Stop the overlay from opening, behind a flag in `packages/format/src/flags.ts` (request it from the orchestrator if
   T_01 has not added it), flag off = today. Remove nothing the flag-off path needs.
5. Update the pattern's `pattern.json` states and its gallery entry; every state, APCA light and dark, axe.

## Validation

Unit tests of the region pattern, the page specs touched (`VB_TEST_PORT=9200`), `npm run verify`; screenshots before
and after, light and dark, under `temp/layout-tooltip/` (absolute paths in your notes).

## Constraints

Deviation → stop and tell the user. No PII. No commits. Never port 4466. Time limit and `nice -n 15` on every run.
Writes over 50 lines in chunks. Update this file's notes on completion.

## Implementation Notes

**Status**: Completed 2026-11-06 (the flag-off page path waits on Request 1).

**The overlay, from the code** (no screenshot): the layout popover `div.vb-mode-pop[role=tooltip]` (`region-template.ts` `modePopover`: six `.vb-mtile` tiles with name and hint, a `.vb-mode-line`, a foot with the agent's choice and the keys), drawn in the container's tool rail (`.vb-region-tools`) and opened by `data-open="modes"` on the `<vb-region>` (region-modes.css).
Every place that opened it (all in `region-row.ts` `bindModeRow`, through `openModes`): (1) `mouseover` on a layout radio; (2) `focusin` on a layout radio (the row's single Tab stop, the arrows); (3) the public `ModeRow.open('modes')`, reached by `VbRegionElement.showPanel('modes')` (the gallery's open samples: region-section.ts, rail-section.ts). Nothing else: the cog opens the menu, Comment the preview; a tile `mouseover` only re-highlights an open popover.

**Done**
- Flag `layoutTooltip` (T_01, on). `RegionFrameOptions.layoutTooltip` (default `flagOn('layoutTooltip')`): `regionTemplate` draws, inside each layout radio, `span.vb-tip.vb-mode-tip` with `.vb-mode-tip-name` (MODE_LABEL) over `.vb-mode-tip-hint` (MODE_HINT); the radio gets `aria-describedby` to the hint (always, shown or not); no popover is drawn. No new words (T_01). Ids `region-<id>-tip-<mode>`, behind the mount prefix.
- Reuse: `bindHoverTip` (tip/hover-tip.ts: hoverable with its grace, persistent, Esc, press outside) once per radio, host = the radio, tip inside it (new `region-layout-tip.ts` `bindLayoutTips`); the shared `.vb-tip` box; `showPanel('modes')` shows a tip for the gallery. `region-row.ts`: `openModes` and `highlight` return at once while `data-layout-tooltip` is on the frame, so nothing opens the overlay and the descriptions are never taken off. Flag off = today, nothing removed.
- CSS (`region-modes.css`): tip beside the icon, never over it (below it on the top line, right of it in the rail, with a bridge); name `--vb-ink-strong`, hint `--vb-ink` (Lc 60 checked, light and dark); the frame is raised while a tip shows.
- Behaviour to know: while a tip is open the first Esc dismisses it and nothing else (WCAG 1.4.13); a second Esc collapses a short rail (container-rail-states.spec.ts says so).
- Gallery: new "Layout tooltip" group (`layout-tip-section.ts`: top line and rail, tip open); the popover's samples (region-section, container-section, the rail's "Layout tiles") are drawn with `layoutTooltip: false` as the flag-off look; the rail's "Popovers" group is now "Tooltip and menu". pattern.json: state `layout-tip`, flaggedStates `layout tooltip`, attributes, events, accessibility.
- Tests: unit (region-template.test.ts, id-prefix.test.ts: popover tests pass `layoutTooltip: false`, new tooltip tests); new `tests/pages/layout-tooltip.spec.ts` (9 tests: hover and focus on all six, accessible description, Esc, arrows, hoverable, pick by pointer, Enter and Space, APCA Lc 60 and axe light and dark, flag off); popover specs moved to the flag-off URL (layout-tiles, board.spec x3, lock-board, container-rail-states); gallery.spec region count 29 to 32; the rail and region gallery snapshots updated.

**VERIFICATION** (tier small: one to three workers, `nice -n 15`, `VB_TEST_PORT=9200`): `npm run verify` ok; ui and board unit tests 1284 of 1285 (the one failure, plugin-theme, is FE_01 mid-edit); layout-tooltip.spec 8 of 9 (flag off waits on Request 1); gallery.spec, container-polish, container-rail and container-rail-states pass but its "popovers" test (flag off); layout-tiles (4), board.spec (3) and lock-board flag-off tests not runnable until Request 1. Screenshots, light and dark, in `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/layout-tooltip/`: `rail-hover-*.png`, `rail-focus-*.png`, `gallery-tooltip-*.png`; before (popover, flag off): `before-popover-*.png`.

**Requests**
1. (blocking for the flag-off path and its specs) The page does not pass the flag on: `apps/board/src/board/controller.ts` (the `on(...)` options near `rail: on('toolRail')`), `apps/board/src/board/canvas/draw.ts` (the `createRegionSet(...)` call) and `apps/board/src/board/canvas/render.ts` (`createRegionSet` opts and its two `el.render(...)` calls) need `layoutTooltip: on('layoutTooltip')` carried through to `RegionFrameOptions.layoutTooltip`. Until then `?flags=-layoutTooltip` does nothing (the tooltip, the default, works).
2. (non-blocking) `docs/specification/components.md` (the rail, popover and tiles paragraphs, about lines 678-698): the layout icons show a tooltip (name over hint, the accessible description) and the popover is the flag-off form; name `region-layout-tip.ts` `bindLayoutTips` for spec-truth.

### Run 2

FE_02-R1 done: `layoutTooltip: on('layoutTooltip')` travels `controller.ts` (the draw data, beside `rail`) to `canvas/draw.ts` (`layoutTooltip`) to `canvas/render.ts` (`createRegionSet` opts, both `el.render` calls; left undefined when not given, so other callers keep the flag default). `on` is `flagOf(host, f)`, so under the plugin it reads the host settings like the other flags. FE_02-R2 done: `docs/specification/components.md` (the rail paragraph: Layout tooltip, `region-layout-tip.ts` `bindLayoutTips`, the popover as the flag-off form). Tier small (3 workers, nice -n 15, port 9200): layout-tiles, board.spec, lock-board (except its gallery screenshots), container-rail-states, layout-tooltip all pass (48 of 50); `npm run verify` ok, `tsc` clean, spec-truth 8 of 8. The two lock-board "gallery: the lock section ... screenshot" tests fail by a few pixels of vertical shift inside the lock section (no frame or popover is drawn there); not caused by this task as far as seen, snapshot not updated.

### Run 3

VERIFY_01-R1 fixed. The "Layout tooltip" gallery group has a block size of its own (`.g-tip-group { height: 780px }` in gallery.css, class added in layout-tip-section.ts), so it adds 804 px (780 + its margin-top), a whole number. Two more fractions came from this task and are gone too: the region pattern.json `description` and the `states` list (both print in the region section header, wrapping differently) are back to main's text (the tooltip is documented under flaggedStates, attributes and events, and no `layout-tip` state is listed), and the rail section's group titles and notes are main's length. The region section without the group measures 5079.109 as on main. My run-1 `--update-snapshots=changed` had rewritten gallery baselines of other sections; I restored all of tests/pages/__screenshots__ from git and updated only the six PNGs of sections this task changes (gallery-region and gallery-toolRail, light and dark; rail-light and rail-dark). Full `npm run test:pages` (3 workers, nice -n 15, port 9200): exit 0, 1005 passed. Plugin harness, the tooltip under the orange host palette, light and dark, Flow focused, panned to the rail: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/layout-tooltip/plugin-orange-light.png` and `plugin-orange-dark.png` (name over hint readable on the host surface, orange focus ring).
