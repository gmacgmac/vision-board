---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Visual designer for dense boards — a status mark hangs below the card's footer and never shoves the card's own controls.
---

# Bottom tabs hang lower; centred at a third on every card size (maintainer, after 444)

> **Created**: 2026-11-05 · **From**: maintainer, looking at D-091/D-092 on a small card

## Problem

On an S card the tab ("1 update · proposal", or two tabs) does not fit at the third, so it starts at 14 px (left,
against "Open") and the footer buttons (✓ ✗ note Later flag ⓘ) rise to make room (`packages/ui/src/node/node-popover.css`
`.vb-node-btabs`, the `:has(...)` rules that raise `.vb-node-actions`). The maintainer: it looks wrong; give the tab
more breathing room by hanging it a little lower, and keep it over at the third.

## Decision (maintainer, binding)

1. The bottom tabs hang lower than today on every card (more of the tab below the card's edge, still visibly
   attached to it), enough that the tab and its 24 px target never meet the footer buttons' targets, so the
   buttons never rise, on any size, with any number of tabs.
2. The tab group is centred at a third of the card's width on every size, clamped so it never starts left of 14 px
   nor runs past the card's right edge less 14 px.
3. Under `updateSignals` (as D-091); flag off = today.

## Steps

1. Failing page test first (extend `tests/pages/tab-place.spec.ts`, `one-change-tab.spec.ts`): on S, M and L with one
   tab, two tabs and the combined tab: centre within 1 px of a third (or clamped as above), the buttons level with
   "Open" every time, no target overlap, the tab still touching the card's edge; light and dark, axe.
2. CSS only, tokens only; drop the button-raising rules under the flag. Card layout spacing below a card (the gap
   to the next card) must still clear the lower tab: check a container with stacked cards.
3. Re-take screenshots it changes after checking each diff; before/after PNGs of S, M, L (one tab, combined tab,
   two tabs) and a column of stacked cards, light and dark, in `temp/tab-lower/`; list absolute paths.
4. `docs/specification/components.md`; full page suite once at the end.

## Constraints

Worktree `.claude/worktrees/tab-lower` (branch `feat/tab-lower`, from main), `VB_TEST_PORT` 8800. Never port 4466,
the repo's own `.visionboard/`, or `node_modules`. No git commits. Writes >50 lines in chunks. Time limit on every
run, `nice -n 15`, `VB_TEST_WORKERS=3`, full spec paths. Build once first.

## Implementation Notes

Done 2026-11-05 in `.claude/worktrees/tab-lower` (branch `feat/tab-lower`), uncommitted. One point open: stacked
cards (below, **Open: the gap under a card**).

- **Measured first** (CSS px from the inside of the card's border; S/M/L inner height 117, border 117–118): the footer
  buttons span 85.5–111.5 (they end 5.5px above the inside edge); the tab row was 108–128 (`bottom: -11px`), so a tab's
  24px target (3px above and below) started at 105–106, over the buttons; the next card's top tabs (number, kind, size,
  `node.css` `top: -11px`) start at 132 with the card gap `GAP` 24 (`packages/layout/src/types.ts`).
- **CSS** (`packages/ui/src/node/node-popover.css`, tokens and the file's existing px only): under `[data-update-signals]`
  the row hangs at `bottom: -18px` (proposal tab 115–135, "N updates"/combined tab 116–134: 2–3px over the border, the
  targets from 112, clear of the buttons' 111.5). The slot (14px to two thirds less 14px, spacers centring the tabs) is
  kept; the reserve that kept tabs out from under the buttons (`--vb-btabs-reserve`, the `::after` minimum) and the M/L
  overrides are gone. The flag-off raise rules are scoped `vb-node:not([data-update-signals] *)`, so flag on the buttons
  never rise and flag off is today's CSS unchanged. Result: centred at a third on S, M and L with one tab, the combined
  tab, a proposal alone and two tabs; two tabs on S (164px of tabs, slot 157px) clamp to 14px.
- **Tests first**: `tests/pages/tab-place.spec.ts` rewritten around one `placed()` check (centre within 1px of a third
  clamped to 14px from either edge; no tab over the kind icon or state word; no tab target over a button; the buttons
  level with the state word; every tab across the border's outer edge) for one tab, the combined tab (opened after the
  agent's round, tracker N50), two tabs and a proposal alone; two tabs on S at 14px; flag off; axe light and dark for
  one, combined and two. `tests/pages/one-change-tab.spec.ts` placement test: S and M centred, buttons level. Against
  the old CSS: 4 failed (combined S centre 76.5 of 278; two tabs S buttons raised; proposal alone S 79.3; one-change-tab
  S centre 78.8), the rest passed; with the new CSS 27/27.
- **Gallery words**: `gallery/updates-section.ts` and `gallery/one-tab-section.ts` said the buttons rise; with
  `updateSignals` they now say the tabs hang below the footer and the buttons stay where they are (off, as before).
- **Docs**: `docs/specification/components.md` (Tab place rewritten; One tab: the rise only with the flag off),
  `packages/ui/src/node/pattern.json` (`vb-node-btabs`).
- **PNGs**: drawn by the throwaway `temp/tab-lower/shots.ts` (scratch board, port 8790, a temp project), in the worktree:
  `temp/tab-lower/{before,after}-{update,combined,two,stack}-{light,dark}.png` (S, M, L side by side; `stack` is a
  column of five cards with the combined tab). The L card's right end is cut by the 1600px viewport in the side-by-side
  shots; its tab is in frame.
- **Full page suite** (`VB_TEST_PORT=8800`, 3 workers, 12.4 min): 972 passed, 14 failed, 10 did not run (the budgets,
  which wait on chromium; run alone after: 10 passed). All 14 were screenshots; each diff checked by pixel bands and
  crops. Changed only in the bottom tabs' rows (and the one updates-section sentence): `card-updates`, `gallery-node`,
  `gallery-updateSignals`, `parking-replies`, `proposals`, `review-list`, light and dark, re-taken (62 passed). Left
  failing on purpose, because they show the open point below: `fresh-section` and `gallery-freshCards` (a card's
  "3 updates" tab under the next card's top tabs in the section's small board) and `update-signals-replies` (the
  gallery list's box ends about 1px above the hung tab, so the element screenshot cuts its bottom edge). Those are 6
  tests (fresh-cards ×2, update-signals ×2, gallery's every-section ×2). `packages/ui` unit tests 349 passed;
  `npm run check` 0 errors; `npm run verify` ok (warnings all pre-existing).

### Open: the gap under a card (needs the maintainer)

With `GAP` 24 the hung tab (to 134–135) meets the next card's top tabs (from 132) wherever they cross, which on every
size is the kind tab (centred at a half) for a wide tab: 2–3px of overlap, and the next card's kind tab paints over the
tab's lower edge (`after-stack-*.png`). Before, the tab ended at 128, 4px clear. CSS alone cannot meet both decision 1
and this; the options:
- A. `GAP` 24 → 32 for every mode (grid, column, row, flow, lanes' pad, collision): 5px clear; every board 8px looser.
- B. 32 only between a card and the one under it (column, grid rows, flow): the same clearance, rows keep 24.
- C. Keep 24 and hang 3px less (`bottom: -15px`): the tab clears the next card, but its target meets the buttons'
  again by about 2.5px, against decision 1.
Layout is flag-free today; A or B would change flag-off boards too unless the layout is given the flag.

### Caught Beyond the Brief

- The old raise rule keyed M/L on `data-size`, but in the column container drawn for the PNGs the S cards were 462px
  wide (as wide as the L card; measured) while keeping `data-size="s"`, so they raised their buttons with room to
  spare. Gone with the flag on; flag off unchanged.

### Run 2

Two maintainer decisions: the tabs start just after the state word, left-aligned (main `d175720`, by eye), and point
445/446, option B behind `updateSignals`: first 28px, then (mid-run) 30px. Everything below is at 30px unless it says 28.

- **Merge**: `feat/tab-lower` fast-forwarded to main (no merge commit), the run-1 work re-applied; `node-popover.css`
  resolved to main's horizontal rule (`left: calc(… + 3em + var(--vb-space-2))`, `font-size: var(--vb-text-sm)`) plus
  run 1's vertical one (`bottom: -18px`; the raise rules scoped to the flag off). Main's leftover M/L overrides go
  with the raise.
- **Row gap** (`packages/layout`): `ROW_GAP` 30 beside `GAP` 24 (`types.ts`), `ModeInput.rowGap`, `RegionOptions.rowGap`,
  `LayoutOptions.rowGap` (absent: `GAP`). Used for a card and the one under it in `grid` (rows; columns keep `GAP`),
  `column`, `flow` (each column's stack and `place`) and `lanes` (a lane's stacks, `orderStacks`). `row` and `radial`
  unchanged; the collision pass round pins (`collide.ts` `makeRoom`) keeps `GAP` (not in the decision). The page
  passes it from the flag (`controller.ts`: `rowGap: on('updateSignals') ? ROW_GAP : undefined`, through `draw.ts` to
  the layout cache, whose key includes it); the gallery's mini boards the same (`gallery/mini-board.ts`). Flag off:
  24px everywhere, as before.
- **Measured clearance** (scratch board, combined tab, a column of five cards): cards 30px apart (24 before); the
  hung tab ends 4px above the next card's top tabs (combined and "N updates" tabs, 18px tall). A proposal or handover
  tab (20px tall) ends 3px above: row 115–135 against the next card's tabs from 138 (118 + 30 + 1 − 11). At 28px it
  was 2px and 1px. Main's look before this run: 3px (combined, raised row at −13px) and 5px.
- **Gallery room**: a `.g-cards` list that shows a tab gets `row-gap` `--vb-space-6` (28px while the board was at 28) and `padding-bottom` `--vb-space-5` under
  the flag (`gallery.css`, zero-specificity conditions so a list's own room still wins); the two lists that set their
  own padding inline (`update-signals-section.ts`, `one-tab-section.ts` `list`) take `--vb-space-5` at the bottom.
  Measured: tabs end 7–8px inside each list. Lists whose card is positioned under a notice or pill (the samples that
  float a card) still let the tab out by 11px; their screenshots are of the whole group, see the suite below.
- **Tests**: `tab-place.spec.ts` drops the third: the first tab 4–24px after the state word ("Open"), at the same
  place on S, M and L, never past the right edge less 14px, the rest as run 1; a new stacked-column test (`ROW_GAP`
  apart, tab ≥ 3px clear of the next card's top tabs (≥ 1 at 28); flag off 24px). `layout-controls.spec.ts` reads the
  column's gaps as `ROW_GAP` (it held 24). `one-change-tab.spec.ts` the same start check on S and
  M. `packages/layout/tests/stack-gap.test.ts`: `rowGap` in column, grid rows, flow and a lane's stack, side by side
  `GAP`; `apps/board/tests/layout-cache.test.ts`: the gap lays out every container and equals `layoutBoard`. The
  layout tests were written with the code, not before it (they call a parameter that did not exist).
- **Docs**: `components.md` Tab place (the start, the row gap and its tests), `pattern.json`, `modules.md`
  (`npm run map`: `ROW_GAP` exported).
- **PNGs** (worktree `temp/tab-lower/`): `before-*` is main's look (left-aligned, not lowered, 24px), `after-*` this
  run at 30px; `{before,after}-{update,combined,two,stack}-{light,dark}.png`. Run 1's set moved to `temp/tab-lower/run1/`.
- **Runs at 28px**: the full page suite (3 workers, 12.3 min): 953 passed, 27 failed, 16 did not run (the budgets and
  the serial app-cards tests after its first failure). 20 were screenshots of the gap and the tabs; 2 were
  `layout-controls` (the column's gaps asserted 24, and the next test that read its state); 5 were app/panel tests
  (`app-cards` ×3, `read-only-controls`, `layout-tiles`: the calculator panel's request aborted, a cursor read "grab"),
  all passing when run alone afterwards at 30px, so taken as load flakes. The unit suite (`npm test`, 2410 + 14 passed).
- **After the switch to 30px** (no full suite, by the maintainer): rebuilt; the affected specs run alone (tab-place,
  one-change-tab, layout-controls, layout-tiles, app-cards, read-only-controls, card-images: 74 passed, 6 failed, all
  screenshots); the screenshot specs (card-updates, fresh-cards, gallery, parking-replies, proposals-review,
  proposals, update-signals, card-images, layout-controls): 20 screenshot failures, each diff checked (the gap under
  cards, the tabs' new start and hang, the gallery lists' room, a 1px fit change on card-images), re-taken: 115
  passed. `packages/layout` and `apps/board` unit tests 1018 passed; `npm run check` 0 errors; `npm run verify` ok.
  The performance budgets were not run at 30px.

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Tab lower: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_tab-lower.md]]`, ending in a newline.
