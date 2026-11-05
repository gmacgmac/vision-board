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

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Tab lower: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_tab-lower.md]]`, ending in a newline.
