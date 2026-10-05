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

**Status**: Done. All four gates exit 0: `npm test` (434 pass), `npm run check` (0 errors),
`npm run verify` (ok, 1 pre-existing warning), `npm run test:pages` (58 pass). Nothing committed.
`packages/layout` not touched. Executed 2026-10-05 on `board-v3` @ `b19dbba`, main checkout.
This revises the first pass (which stopped at the clash in Open item 1 below) under the
orchestrator's ruling: option (a), narrow frames collapse the row.

### What was built (Steps 1-7)

1. Template and element: `div.vb-mode-row[role=radiogroup][aria-label="Layout for <title>"]`
   with five `button.vb-mseg[role=radio][aria-checked][data-mode][data-region][aria-label]`, a
   `span.vb-mode-div`, and the cog `button.vb-cog[aria-haspopup=menu][aria-expanded][aria-controls]`
   ("Settings for <title>"). Roving tabindex gives the row one Tab stop (the checked layout).
   Left/Right (and Up/Down on the layouts) move through all six stops and wrap; Home/End work too.
   Enter/Space applies a layout; ArrowDown on the cog opens its menu; Esc closes the popover or menu.
   **Collapse (ruling, orchestrator option a)**: under 440px of frame (`@container`) -- measured as
   where the full row (195px on screen) would leave under ~200px for the label side; a 480px frame
   leaves 253px, 427px leaves exactly 200px -- the row shows only the checked icon and the cog. On
   hover or focus-within it expands to all six stops as an overlay: `position: absolute; z-index: 3`
   drawn over the label side (same canvas-coloured ring, `box-shadow` plus `var(--vb-shadow-lift)`),
   moving nothing; it collapses again on leave, blur or Esc (the existing close logic). The popover
   and the settings menu, as the row's own children, follow it in both states without separate code.
2. Popover: `div.vb-mode-pop[role=tooltip]#region-<id>-modes`, five `.vb-mtile`. The current
   layout has `[data-current]` (05's `.is-cur`) and the highlighted one `[data-hover]`. The
   highlighted icon gets `aria-describedby`. Opens on mouse over or keyboard focus of a layout
   icon (works identically from the collapsed row, since expanding is pure CSS and the same
   elements exist throughout -- ruling 2). Closes on leaving the row and popover, blur, Esc, a
   pick, or hovering/focusing the cog. Foot: `agentChoiceText(view mode)` plus the key hint.
   While open, the frame is raised (`vb-region[data-open] { z-index: 4; pointer-events: none }`).
3. Cog menu: `div.vb-region-menu[role=menu]` holding `button[role=menuitem][data-reset]`
   "Reset places", `aria-disabled` with "No cards moved" when nothing is pinned; the element
   stops a click on it. Esc or a pick returns focus to the cog; an outside pointerdown closes it;
   Tab closes it. Works the same from the collapsed row (ruling 2).
4. CSS from 05, mapped to tokens (`--surface`->`--vb-surface-card`, `--shadow`->`--vb-shadow-card`,
   `--gc`->`--region`, etc.), 05's literal control sizes (28x24, 7px radius). The old 480px
   text-button collapse is gone, replaced by the icon-row collapse above. Ruling 3's compact
   popover is built: under 600px of frame each tile shows icon and name only, with one line
   under the tiles for the highlighted layout's one-liner. The count gives way before the title
   (`flex-shrink: 1000`). The row hides at `[data-zoom='far']` (ruling 7, N8 -- see Open item 5).
5. `pattern.json`: description, files, states (`row, popover, menu, reset-disabled, far`),
   `data-open`, methods (`showPanel`), events, narrow and far, accessibility.
6. Tests: see below.
7. Baselines viewed before updating: see below.
8. Ruling 8: `FLAGS.nodeSize.default = true`.

### Files and symbols

- `packages/ui/src/region/region-core.ts`: `MODE_HINT`, `agentChoiceText(mode)`,
  `RESET_NONE_HINT`. Count text "N of M decided". `RegionState.showReset` -> `canReset`.
- `packages/ui/src/region/region-template.ts`: `regionTemplate(r)` takes `mode`; `regionIds(id)`.
- `packages/ui/src/region/region-icons.ts` (new, 21 lines): `MODE_ICON`, `COG_ICON`.
- `packages/ui/src/region/region-row.ts` (new, 185 lines): `bindModeRow(host): ModeRow`
  (`open`, `close`, `sync`); unchanged by this revision -- the collapse/expand is CSS-only
  (`:hover, :focus-within`), so the same JS drives both states.
- `packages/ui/src/region/vb-region.ts`: `update` sets `aria-checked`, `[data-current]`, the
  roving stop, Reset places' `aria-disabled`/`aria-describedby`. `showPanel(what, opts)`.
- `packages/ui/src/region/region.css` (174 lines): added the `@container (max-width: 440px)`
  collapse rule inside `.vb-mode-row`.
- `packages/format/src/flags.ts`: `nodeSize.default: true`.
- `apps/board/src/gallery/region-section.ts`, `apps/board/src/gallery/gallery.css`: narrow
  samples back to 1.75 card widths (434px, ruling 4) -- see Open item 1 for why not wider.
- `apps/board/src/gallery/size-section.ts`, `docs/specification/components.md` § Node size 7:
  stale "?flags=nodeSize" wording fixed to on-by-default / `?flags=-nodeSize` (ruling 5).
- `docs/specification/modules.md`: regenerated with `npm run map`.
- `controller.ts`: still unchanged.

### Tests (added, changed, or reworked this revision)

- `tests/pages/gallery.spec.ts`: "region: a narrow frame collapses the row to the checked icon
  and the cog, expanding on hover" replaces the old "narrowest frame shows its full title" test.
  Asserts: narrowest frame < 440px; the row shows exactly 2 visible icons (checked + cog) at
  rest; the title is not ellipsized at that width (the count is -- see Open item 2, so that
  assertion is title-only, matching the ruling's wording); hovering the row expands it to 6
  visible icons; moving the pointer away collapses it back to 2.
- `tests/pages/send-access.spec.ts`: `KNOWN_AXE` removed from the regular tests (now clean -- the
  two-holder case passes at >=24px, measured 25x26 / 29x26) but kept, with its comment rewritten,
  for the one test where 3-4 holders accumulate on the same frame across the file's test order
  (Open item 3). "0 of 1 decided" wording kept from the first pass.
- All tests, baselines and gate behaviour from the first pass (region-core/template unit tests,
  flags test, board.spec.ts's row keyboard/hover/menu tests, the removed `test.fail`/`KNOWN_AXE`
  for the layout buttons) are unchanged by this revision.

### Baselines updated this revision (each viewed before updating)

- `gallery.spec.ts/gallery-{dark,light}-darwin.png`: narrow frames back to 434px with the
  collapsed row; the Node size section's corrected flag wording.
- `size.spec.ts/node-size-{dark,light}-darwin.png`: same content; the corrected flag wording.
- `board.spec.ts` and `send-access.spec.ts` baselines are unchanged from the first pass (not
  re-touched here, since nothing in this revision affects their content).

### Gate exit codes (final run, this revision)

`npm test` 0 (434 pass) · `npm run check` 0 · `npm run verify` 0 (1 pre-existing warning,
`controller.ts` 401 lines) · `npm run test:pages` **0** (58 pass).

### APCA (measured only, tokens unchanged -- ruling 6)

Using the `temp/apca-2b.mjs` formula (APCA-W3 0.0.98G-4g), both pairs reuse `--vb-ink-subtle`:

| Pair | Light Lc | Dark Lc | Tier | Pass |
|---|---|---|---|---|
| Disabled menu item + hint text, on `--vb-surface-raised` | 76.2 | 48.8 | 45 (short coloured/greyed label) | yes, both themes |
| Tile `<small>` one-liner, on `--vb-surface-card` | 76.2 | 48.8 | 30 (decoration-adjacent helper text) | yes, both themes |

(Light and dark give the same Lc because `--vb-surface-card` and `--vb-surface-raised` are both
`#ffffff` in light / `#1a1a1c` in dark, and `--vb-ink-subtle` is the only text colour in play.)

### Open (for the maintainer)

1. **Gallery narrow samples stayed at 434px (ruling 4), not widened.** At 434px the title never
   ellipsizes on either narrow sample ("Reset places showing", "Empty message showing"), so the
   collapse is exercised at a width close to the real minimum region (336px). I did not restore
   them to the 2.25-card width (558px) I'd tried in the first pass.
2. **The count can still ellipsize at 434px, title does not.** "Empty message showing" (22
   letters) leaves less room than "Reset places showing" (20) for its count: at 434px its
   `.vb-region-count` scrolls to 82px against a 74px box ("2 of 2 decided" clipped), while the
   title itself (`h2`) never clips. I scoped the new test's non-ellipsis assertion to the title
   only, matching the ruling's wording ("if the full **title** still cannot fit... report the
   measured widths"); I did not extend that guarantee to the count, and did not widen the sample
   to fix it. If the count must never clip either, the breakpoint or the sample width needs
   another look -- flagging rather than deciding it.
3. **`KNOWN_AXE` still needed for one case, not removed everywhere (ruling 3, qualified yes).**
   Two holders now pass clean at >=24px (measured 25x26, 29x26) with the collapsed row, so
   `KNOWN_AXE` is gone from every regular send-access test. One test still needs it: by its
   position in the file, 3-4 holders have accumulated on the access board's one region (none are
   revoked by earlier tests) by the time "axe passes on the board with the strip, a refusing
   note and holders" runs. At that count the buttons measured 12-13px wide -- under 24px even
   collapsed -- because the frame's width comes from its one S card (`packages/layout`), which
   does not grow for holders and which this task does not touch. I kept `KNOWN_AXE` for that one
   test only, with the comment naming the holder count and the measured widths, rather than
   editing the test's own setup to revoke holders (out of scope) or touching layout.
4. Items from the first pass's Open list not restated above (arrow-key semantics, no tile hover
   look, 05's unspecified "opens below" case, note/ledger/lasso questions) are out of this task's
   scope and still stand.
5. **N8 (tracker)**: recording here, not editing the tracker per instruction -- the layout-mode
   buttons' axe `target-size` failure is fixed. The row hides below `FAR_K` (`[data-zoom='far']`)
   exactly like the cards' own buttons, so the board's opening (fit-to-view) axe pass needs no
   exclusion for it; `tests/pages/board.spec.ts`'s "axe passes with nothing excused" asserts this
   directly (stage is far, no row visible, zero violations). The one remaining `target-size`
   exclusion (item 3 above) is a different control (holders), not the layout buttons.
