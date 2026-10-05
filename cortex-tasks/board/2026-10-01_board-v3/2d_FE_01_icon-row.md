# 2d_FE_01_icon-row: The container's layout icon row, popover and settings cog

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2d) ·
> **Decisions**: D-015, D-024 · **Spec**: mockup `05-final-spec.html` sections 1 and 3
> (`.mode-row`, `.mseg`, `.mode-pop`, `.mtile` in `mockups/spec.css`), README pick 1 and 2 ·
> **Facts**: `temp/research/stage-2d-2e-3-brief.md` §A · **Model**: Opus 5.5

## Objective

Each container's top line ends in 05's compact icon row: five layout icons (Grid, Flow, Lanes,
Radial, List), a divider and a cog. Hovering an icon, or opening the row from the keyboard,
shows the popover tiles with their one-line meanings. The cog opens the container's settings,
which for now hold only "Reset places". The title no longer gets squeezed, and the row passes
the 24px target-size check (N8, region half).

## Inputs

- **Modify**: `packages/ui/src/region/{region-template.ts,region-core.ts,vb-region.ts,region.css,pattern.json}`,
  `packages/ui/tests/region-*.test.ts`, `apps/board/src/board/controller.ts` (only the stage
  click delegate, if the attributes change), `apps/board/src/gallery/region-section.ts`,
  `tests/pages/{board,gallery,send-access}.spec.ts` and their baselines
- **Reuse**: tokens only; existing `data-mode` / `data-region` / `data-reset` click wiring
  (keep those attributes so `controller.ts` needs no new handlers); the existing icon set if
  one is already imported, else inline SVG symbols taken from 05 (no new package)
- **Do not touch**: `packages/layout` (2d_BE_01 runs alongside in a worktree), card files

## Rulings already made (do not reopen)

1. Icon row, not a pill: README pick 1 replaces PLAN's word "pill".
2. Tile one-liners are 05's: Grid "A numbered set to work through in order"; Flow "Connected
   steps and where they branch"; Lanes "Several flows side by side, one per lane"; Radial "One
   subject, everything related around it"; List "Dense reading, one row each". Foot: "The agent
   chose <Mode> for this container." plus the key hint. Put the one-liners in ONE place
   (`region-core.ts` next to `MODE_LABEL`) so the agent skill can reuse them later.
3. The popover is an overlay: it may extend past a narrow container and is drawn above
   neighbours; it never resizes or moves anything (README pick 5). It keeps 05's look; below
   about 600px of free width the tiles may drop to a compact layout (icon + name, one-liner
   underneath on hover/focus) — your call, show it in the gallery.
4. The cog opens a small menu anchored to the row. Its only item today is "Reset places",
   shown enabled only when the container has moved cards (today's `showReset`), otherwise shown
   disabled with a hint "No cards moved". Reset places leaves the top line entirely.
5. Count wording is 05's: "2 of 7 decided" (empty when there are no items). Update the core,
   its unit tests and the three page tests that assert "1/2 decided" / "0/1 decided".
6. Container colour stays neutral (`regionColour` default); the active icon uses the same
   neutral mix 05 uses with `--gc`.
7. N8: the row hides below `FAR_K` like the card buttons (`[data-zoom='far']`), so the row can
   keep 05's 28x24 size. Remove `test.fail` and the `KNOWN_AXE` note for the layout buttons in
   `board.spec.ts` once axe passes; leave the other specs' `KNOWN_AXE` if they still need it,
   and say which.
8. Card sizes are on by default (maintainer, 2026-10-05, chat 666): in
   `packages/format/src/flags.ts` set `nodeSize.default` to `true` (the flag stays, so
   `?flags=-nodeSize` turns it off). Update the tests and baselines this changes, after viewing
   them.

## Steps

1. [ ] Template and element: `div.vb-mode-row[role=radiogroup][aria-label="Layout for <title>"]`
   with five `button[role=radio][aria-checked][data-mode][data-region][aria-label=<Mode>]`
   icon buttons, a divider, and the cog `button[aria-haspopup=menu][aria-expanded]`
   (`aria-label="Settings for <title>"`). Roving tabindex: one Tab stop for the row, arrow
   keys move between layouts, Enter/Space applies, Esc closes the popover or menu.
2. [ ] Popover: `role=tooltip` tied with `aria-describedby` to the hovered or focused icon;
   current layout marked as in `.mtile.is-cur`. Opens on hover or keyboard focus, closes on
   leave, blur, Esc or a pick.
3. [ ] Cog menu: `role=menu` with one `menuitem` "Reset places" (`data-reset`), disabled state as
   ruling 4. Esc and outside click close it; focus returns to the cog.
4. [ ] CSS from 05's `.mode-row` / `.mseg` / `.mode-pop` / `.mtile`, translated to our tokens
   (no literals the verify guard rejects). Remove the 480px container-query collapse and its
   gallery test ("a narrow frame shows only its pressed mode..."); replace it with a test that a
   narrow frame shows its full title (no ellipsis) for the gallery's narrowest sample.
5. [ ] `pattern.json`: states and events updated (row, popover open, menu open, reset disabled).
   Gallery: a sample with the popover open and one with the menu open, dark and light.
6. [ ] Tests: unit tests for the new template/core (one-liners, count text, reset enabled or
   disabled); page tests for keyboard use of the row (arrows, Enter, Esc), hover shows tiles,
   the cog menu resets a moved card, axe passes on the board without the layout-button excuse.
7. [ ] View every changed baseline by eye before updating it; list the paths.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the
  exit codes, do not grep)
- [ ] Gallery and board in dark and light match 05's row and popover by eye
- [ ] "Formats and decisions" on `npm run dev` shows its full title

## Constraints

Project rules apply (`.kiro/steering/vision-board-proj.md`). No new dependency. No commits: the
orchestrator reviews and commits. Files over 300 lines need a reason; split rather than grow.
Any deviation from a ruling above: stop and report, do not work around it. Write probe scripts
under `temp/` only and delete them. Return: files and symbols changed, tests added or changed
(and why), baselines updated, gate exit codes, anything you could not settle.

## Implementation Notes

**Status**: Not started.
