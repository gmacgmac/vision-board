# FE_03_container-polish: Container polish: stack gap, two-line titles, popovers

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 6;
> board items 45-47) · **Model**: Sonnet 5.5

## Objective

Cards stacked top to bottom get room to breathe, a long container title can always be read, and
a container's popovers draw above its own buttons.

## Rulings (do not reopen)

1. **Stack gap**: `list` (`packages/layout/src/modes/grid.ts`) and `lanes` (`modes/lanes.ts`)
   stack cards `GAP` (24px) apart instead of `GAP / 2`, so the next card's tabs (about 16px with
   their halo) clear the card above. Use `GAP` itself, not a new constant. Grid, flow, radial
   and collisions are unchanged. No flag: spacing only.
2. **Titles**: the `<h2>` wraps to at most two lines (`line-clamp: 2` with the `-webkit-` form),
   then ends in "…". The head stays `REGION_HEAD` (38px); two lines of the title must still fit
   the straddle, so check the page test "a region frame keeps REGION_HEAD …" still passes.
3. **Full title**: when the title is cut, its full text shows in a small tip below the title on
   hover of the title and on keyboard focus anywhere in the label group (the grip is focusable),
   following the WCAG 1.4.13 rules the container-note preview already uses (`region-preview.ts`:
   hoverable, persistent, Esc dismisses). The `<h2>` keeps the full text in the DOM for screen
   readers. Behind a new flag `titleTip`, on by default.
4. **Popovers above the row**: `.vb-note-pop`, `.vb-mode-pop` and `.vb-region-menu` draw above
   `.vb-mode-row` in every frame width, including the ≤440px container query where the row
   becomes `position: absolute; z-index: 3`. Fix the stacking in `region.css` only, and keep the
   4px hover bridge.

## Inputs

- **Files to modify**: `packages/layout/src/modes/grid.ts`, `modes/lanes.ts`,
  `packages/ui/src/region/region.css`, `region-template.ts`, `region-note.ts` (tip behaviour, or a
  new small `region-title.ts`), `packages/ui/src/region/pattern.json` (`title-long`,
  `title-tip` states; the `narrow` text), gallery `apps/board/src/gallery/region-section.ts` and
  `fixture.ts` / `gallery.ledger.jsonl` (a long-title frame, narrow and wide)
- **Tests that pin today's behaviour** (update deliberately): `packages/layout/tests/*`
  (stack positions), `packages/ui/tests/region-template.test.ts` (label markup regex),
  `tests/pages/gallery.spec.ts` ("a narrow frame collapses …" asserts one line)

## Steps

1. [ ] Failing tests first: layout unit tests for a 24px stack in `list` and `lanes`; a page test
   that hovers Comment in a narrow frame and checks the preview is the top element at its centre
   (`document.elementFromPoint`); a page test for the title tip on hover and on grip focus.
2. [ ] Layout change; CSS clamp; tip; z-index fix; gallery samples; pattern.json.
3. [ ] Screenshots: view the diffs, then update the baselines that changed on purpose.

## Validation

- [ ] The five gates exit 0; axe passes with the tip open in both themes.

## Implementation Notes

**Status**: COMPLETED

- **Stack gap**: `list` (`modes/grid.ts`) and `lanes` (`modes/lanes.ts`) step by `GAP`; a lane keeps its `GAP / 2` padding above and below (its height formula subtracts the extra half). New `packages/layout/tests/stack-gap.test.ts`. Grid, flow, radial untouched.
- **Titles**: `h2` clamps to 2 lines (`-webkit-line-clamp` and `line-clamp`), `region.css`. The head stays `REGION_HEAD`; "a region frame keeps REGION_HEAD" passes unchanged.
- **Reusable hover tip** (FE_04: reuse it): `packages/ui/src/tip/hover-tip.ts` `bindHoverTip(host, { anchor, tip, group?, attr, needed? })` and the box style `packages/ui/src/tip/tip.css` (class `.vb-tip`; the pattern adds `top`/`left`/`right` and its own `display: block` rule while `attr` is set). It runs the WCAG 1.4.13 rules of `previewStep`/`previewShown` (region-preview.ts): hover on the anchor or the tip, focus in the group, Esc (heard on the page while open; focus stays), a tap on the anchor and a press outside on touch. `needed()` says whether there is anything to show (title is cut). Region use: `region-title.ts` `bindTitleTip`, wired in `vb-region.ts`; markup `<span class="vb-tip vb-title-tip" aria-hidden="true">` after the holders in `region-template.ts`; CSS `data-title-tip-open` raises the frame like `data-preview`.
- **Flag `titleTip`** (`packages/format/src/flags.ts`, on). The page marks `#world` with `data-title-tip` (controller.ts, one line, now 300 lines); the gallery marks `<main>` the same way; the tip checks `closest('[data-title-tip]')`.
- **Popovers**: in the <=440px query the expanded row left the flow, so `.vb-region-tools` collapsed to nothing and every popover started under the row's centre line. Fix in `region.css` only: `.vb-region-tools { min-height: 32px }` there (the row's own height) so popovers open just below the row, and `.vb-mode-pop`, `.vb-note-pop`, `.vb-region-menu` and the title tip are z 4 (row expanded is z 3). 4px bridges kept.
- **region.css split**: the container-note rules moved unchanged to `region-note.css` (imported after `region.css` in `apps/board/src/main.ts` and `gallery/main.ts`) to stay under 300 lines; `tip/tip.css` is imported there too.
- **Gallery**: new group "Long titles" (`title-section.ts`, from `region-section.ts`): wide and narrow cut titles with the tip drawn open, and a short title; three `title-*` regions appended to `gallery.ledger.jsonl` (seq 193-195, board `gallery`). `pattern.json`: states `title-long`, `title-tip`, the tip file, `data-title-tip-open`, events, narrow and accessibility text.
- **Tests**: `tests/pages/container-polish.spec.ts` (8: two-line clamp, tip on hover and hoverable, on grip focus and Esc, none for a short title, flag off, popovers topmost in a narrow frame for preview, menu and layout popover, axe with the tip open in both themes). The popover test fails with the old CSS (checked by reverting it). `region-template.test.ts` updated for the tip markup; `gallery.spec.ts` frame count 21 to 24. The task's "narrow frame asserts one line" test (`cut('h2')`, scrollWidth) still passes unchanged.
- **Baselines** regenerated after viewing the diffs: `gallery-*` (new group; content below it shifts), `agent-access-*` ("Pricing thread (hover)" title now wraps to two lines, intended), `node-size-*` and `see-through-*` (only text anti-aliasing noise from the shifted vertical position; no layout change).
- **Gates**: `npm test` (587 + 4 timing), `npm run check`, `npm run verify` (0 warnings), `npm run gen -- --check`, `npm run test:pages` (141) all exit 0.
- No deviations. No design tokens added or changed.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_03: …`).
