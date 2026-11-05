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

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Tab lower: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_tab-lower.md]]`, ending in a newline.
