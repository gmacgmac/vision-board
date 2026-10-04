# 2a_FE_02_vb-region: The container becomes `<vb-region>`

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2a) ·
> **Pattern**: `docs/specification/components.md`, and `<vb-node>` (2a_FE_01) as the worked
> example to copy · **Model**: Sonnet 5.5

## Objective

The container frame is `<vb-region>`, built exactly like `<vb-node>`. The board looks and
behaves exactly as before.

## Context

`buildRegions` and `placeRegions` in `apps/board/src/board/render.ts` build `section.vb-region`
with its header, decided count, five mode buttons, "Reset places" and the empty message. Region
styles are in `apps/board/src/styles/board.css`. Cards stay in their own layer (`#cards`), not
inside regions (D-013 layering), so the element is only the frame.

## Inputs

- **Create**: `packages/ui/src/region/{region-core.ts,region-template.ts,vb-region.ts,region.css,pattern.json}`,
  `packages/ui/tests/region-core.test.ts`, `packages/ui/tests/region-template.test.ts`
- **Modify**: `packages/ui/src/elements.ts`, `packages/ui/src/index.ts`,
  `apps/board/src/board/render.ts`, `apps/board/src/styles/board.css` (region rules move out),
  `apps/board/src/main.ts`, `docs/specification/modules.md` (`npm run map`)

## Steps

1. [x] Before screenshots as in 2a_FE_01 step 1, including a region with pinned cards (Reset
   places showing) and a region whose items are all hidden by "Hide decided" (empty message).
2. [x] `region-core.ts`: `MODE_LABEL: Record<Mode, string>` (moved from `render.ts`, typed so a
   new mode fails to compile) and `regionState(r, view, s, placed: ReadonlySet<string>)` →
   `{ mode, countText, showReset, showEmpty }`, holding every rule now in `placeRegions` except
   geometry. `placed` is the set of node ids the layout drew, so the core never imports `layout`.
3. [x] `region-template.ts`: `regionTemplate(r)` returns today's header and empty-message markup
   (same classes, ids, roles and labels).
4. [x] `vb-region.ts`: `defineVbRegion()`, `render(r)` (sets `data-region`, `aria-labelledby`,
   innerHTML from the template), `update(RegionState)` (attributes and text only). Export
   `VbRegionElement`. `defineBoardElements()` also calls `defineVbRegion()`.
5. [x] `region.css`: the `.vb-region*` and `.vb-mode*` rules moved from `board.css`, selectors on
   the `vb-region` tag; set `display: block`. `main.ts` imports it.
6. [x] Page: `buildRegions` creates `vb-region` and calls `render`; `placeRegions` keeps setting
   transform, width and height and calls `update(regionState(...))`.
7. [x] Tests for `regionState` (count text, reset, empty, mode) and the template (escaping the
   title, five mode buttons with the right `aria-pressed` hooks). After screenshots match; mode
   switching, Reset places and Hide decided still work; no console errors.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify` exit 0 each (read the exit codes)
- [x] `render.ts` no longer builds region markup; `grep -n "innerHTML" apps/board/src/board/render.ts`
  finds only the wires SVG
- [x] Screenshots match; paths listed in the notes

## Constraints

As 2a_FE_01. `REGION_HEAD` in `packages/layout/src/types.ts` and the 40px header in CSS stay as
they are (2b/2d change them). No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Completed 2026-10-04 (not committed; the orchestrator verifies and commits).

**Files and symbols**
- `packages/ui/src/region/region-core.ts` (new, 42 lines): `MODE_LABEL: Record<Mode, string>` (moved
  from `render.ts`, typed on `Mode`), `interface RegionState { mode, countText, showReset,
  showEmpty }`, `regionState(r: Pick<Region, 'id' | 'mode'>, view, s, placed: ReadonlySet<string>)`.
  It holds every rule that was in `placeRegions` except geometry; it reuses `isItem` from the node
  core and never imports `layout`.
- `packages/ui/src/region/region-template.ts` (new, 19 lines): `regionTemplate(r: Pick<Region, 'id' |
  'title'>)`: the header and the empty message, byte-for-byte the markup `buildRegions` built
  (same classes, ids, roles, labels). Reuses `esc` from the node template.
- `packages/ui/src/region/vb-region.ts` (new, 48 lines): `VB_REGION_TAG`, `interface
  VbRegionElement` (`render`, `update`), `defineVbRegion()` (class `VbRegion` made inside the
  function; a second call returns early). `render(r)` sets `data-region`, `role="region"` (the
  `<section>` had this implicitly), `aria-labelledby`, `innerHTML`. `update(st)` sets `data-mode`,
  the mode buttons' `aria-pressed`, the count text and the `hidden` of Reset places and the empty
  message. Private helper is `piece` (not `part`).
- `packages/ui/src/region/region.css` (new, 23 lines): the `.vb-region*` and `.vb-mode*` rules
  moved out of `board.css`, selectors on the tag (`vb-region`, `vb-region .vb-mode`), `display:
  block` added.
- `packages/ui/src/region/pattern.json` (new): name `region`, tag `vb-region`, files, states,
  attributes, methods, events, accessibility.
- `packages/ui/src/elements.ts`: `defineBoardElements()` also calls `defineVbRegion()`.
  `packages/ui/src/index.ts`: exports the region core, region template and `type VbRegionElement`.
- `apps/board/src/board/render.ts` (135 → 91 lines): `buildRegions` creates `vb-region` and calls
  `render`, returning `Map<string, VbRegionElement>`; `placeRegions` keeps transform, width and
  height and calls `el.update(regionState(r, view, s, placed))`. Removed `MODE_LABEL` and the
  imports `MODES`, `DECIDED`, `statusOf`, `isItem`. `grep -n innerHTML` finds only the wires SVG.
- `apps/board/src/board/controller.ts`: `S.regions` is `Map<string, VbRegionElement>` (import and
  one type). `apps/board/src/main.ts`: imports `region.css` from the package.
  `apps/board/src/styles/board.css`: the `/* Regions */` block (14 rules) removed.
  `docs/specification/modules.md`: regenerated with `npm run map`.
- Tests: `packages/ui/tests/region-core.test.ts` (new, 8 tests: `MODE_LABEL` covers every mode;
  mode carried; count counts acknowledged and dropped only; count ignores non-items and is empty
  without items; count is per region; Reset places per region; empty message only when none of the
  region's nodes were drawn; an empty region). `packages/ui/tests/region-template.test.ts` (new,
  5 tests: title escaped in the heading and group label; five mode buttons in `MODES` order,
  unpressed, labelled, tied to the region; hidden Reset places, count and empty message; controls
  in a labelled group inside the header; no inline style).

**Gates** (exit codes): `npm test` 0 (95 → 108 tests, all pass), `npm run check` 0, `npm run verify`
0 (1 warning: `controller.ts` is 344 lines, unchanged from before this task).

**Screenshots** (probe `temp/probe-2a-region.mjs`, extends `probe-2a.mjs`; Playwright at 1440×900,
a clean `temp/demo` and `VB_PORT=4467` for each run): `temp/shots/2a-fe02-before/` and
`temp/shots/2a-fe02-after/`, same names: `1-dark.png`, `2-light.png`, `3-pinned.png` (prove
region with a pinned card, Reset places showing), `4-empty.png` (review region with all three
items acknowledged and Hide decided on: the empty message), `5-mode-{grid,flow,lanes,radial,
list}.png` (each mode on the decide region). Compared pixel by pixel with Pillow: all 9 pairs
are identical (0 differing pixels). The regions' `innerHTML` (saved as `regions.json` in each
folder) is identical before and after for all 4 regions. The behaviour pass ran 26/26 ok before
and after, with no console errors, page errors or failed requests: the pinned region shows Reset
places and others don't; the count reads "3/3 decided"; the empty message shows and hides with
Hide decided; each mode switches with exactly one button pressed; Enter on a mode button
switches; Reset places unpins and hides itself; the mode and the count survive a reload.

**Findings not acted on**
1. `packages/ui/README.md` still says `<vb-region>` "follows"; it was outside this task's Inputs,
   so it was left. It needs one sentence (the region pattern exists, `src/region/`, with
   `region.css` imported by the page).
2. Specificity of the region rules went from one class to tag plus class, as with `<vb-node>`;
   the screenshots are identical.
3. Lane bands and labels are still drawn by `drawWires` (the wires layer), not by the region
   element; the pattern.json `whenNotToUse` says so until `<vb-link>` arrives.
4. The `<section>` became `<vb-region role="region" aria-labelledby>`, so the landmark is kept,
   but the probe did not run an accessibility tool (page tests wait on tracker N3).
5. Port 4466 still held by an earlier `node apps/board/server.ts` not started by this task; this
   task used 4467 and stopped its own server.
