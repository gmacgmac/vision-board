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

1. [ ] Before screenshots as in 2a_FE_01 step 1, including a region with pinned cards (Reset
   places showing) and a region whose items are all hidden by "Hide decided" (empty message).
2. [ ] `region-core.ts`: `MODE_LABEL: Record<Mode, string>` (moved from `render.ts`, typed so a
   new mode fails to compile) and `regionState(r, view, s, placed: ReadonlySet<string>)` →
   `{ mode, countText, showReset, showEmpty }`, holding every rule now in `placeRegions` except
   geometry. `placed` is the set of node ids the layout drew, so the core never imports `layout`.
3. [ ] `region-template.ts`: `regionTemplate(r)` returns today's header and empty-message markup
   (same classes, ids, roles and labels).
4. [ ] `vb-region.ts`: `defineVbRegion()`, `render(r)` (sets `data-region`, `aria-labelledby`,
   innerHTML from the template), `update(RegionState)` (attributes and text only). Export
   `VbRegionElement`. `defineBoardElements()` also calls `defineVbRegion()`.
5. [ ] `region.css`: the `.vb-region*` and `.vb-mode*` rules moved from `board.css`, selectors on
   the `vb-region` tag; set `display: block`. `main.ts` imports it.
6. [ ] Page: `buildRegions` creates `vb-region` and calls `render`; `placeRegions` keeps setting
   transform, width and height and calls `update(regionState(...))`.
7. [ ] Tests for `regionState` (count text, reset, empty, mode) and the template (escaping the
   title, five mode buttons with the right `aria-pressed` hooks). After screenshots match; mode
   switching, Reset places and Hide decided still work; no console errors.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 each (read the exit codes)
- [ ] `render.ts` no longer builds region markup; `grep -n "innerHTML" apps/board/src/board/render.ts`
  finds only the wires SVG
- [ ] Screenshots match; paths listed in the notes

## Constraints

As 2a_FE_01. `REGION_HEAD` in `packages/layout/src/types.ts` and the 40px header in CSS stay as
they are (2b/2d change them). No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Not started
