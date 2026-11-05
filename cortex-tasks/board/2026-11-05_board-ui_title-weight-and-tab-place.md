---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Visual designer for dense boards — the headline reads first, and a status mark never crowds the card's own icons.
---

# Bold big title; the bottom tabs at a third of the card (points 442, tab place)

> **Created**: 2026-11-05 · **From**: maintainer, point 442 and the bottom-tab screenshot

## Decisions (maintainer, binding)

1. **442**: the big title on a structured card (D-090, `bigTitles`) is bold (the `#` weight), so it is clearly the
   headline over a bold `##`. Under `bigTitles`; plain cards unchanged.
2. **Tab place**: the card's bottom-edge tabs ("N updates", NEW, and any others in `.vb-node-btabs`) sit with their
   centre about a third of the way along the card's bottom edge, away from the card's kind icon and "Open" at the
   bottom left (today `packages/ui/src/node/node-popover.css` `.vb-node-btabs { left: 14px }`). On the smallest card
   (S) and with two tabs showing, they never cross the card's left edge (keep today's 14 px as the minimum) nor
   collide with the right-hand action icons; say what you chose where the third does not fit. Under `updateSignals`.

## Steps

1. Failing page test first (extend `tests/pages/update-signals.spec.ts` or `big-titles.spec.ts`, or a new spec):
   the big title's weight; the tab group's centre at about a third of the card's width on S, M and L, one tab and
   two; no overlap with the kind icon/"Open" or the action icons; flag off = today; light and dark, axe.
2. CSS in `node.css` / `node-popover.css`, tokens only. Re-take any screenshot it changes after checking each diff.
3. Before/after PNGs of an S, an M and an L card with "1 update" (and one with NEW plus "1 update"), and a big-title
   card, light and dark, in the worktree's `temp/tab-place/`; list absolute paths.
4. `docs/specification/components.md` (the bottom tabs and big titles passages).

## Constraints

Worktree `.claude/worktrees/tab-place` (branch `feat/tab-place`, from main), `VB_TEST_PORT` 8400. Never port 4466,
the repo's own `.visionboard/`, or `node_modules`. No git commits. Writes >50 lines in chunks. Time limit on every
run, `nice -n 15`, `VB_TEST_WORKERS=3`, full spec paths. `npm run build` once before page tests. Run the full page
suite once at the end.

## Implementation Notes

Executed 2026-11-05 in worktree `.claude/worktrees/tab-place` (branch `feat/tab-place`), no commits.

- **442, bold big title**: `packages/ui/src/node/node.css`, the `[data-big-titles] … :has(…) > .vb-node-title` rule
  gains `font-weight: var(--vb-weight-bold)` beside `--vb-text-xl`. Plain and `###`-only cards keep the medium title.
- **Tab place** (`packages/ui/src/node/node-popover.css`, all under `[data-update-signals]`): the `.vb-node-btabs` slot
  runs from 14px to two thirds less 14px (its middle is the third; the slot's edges are taken back by the flex gap),
  with `::before`/`::after` spacers that centre the tabs in it. The right spacer has a minimum that keeps the tabs
  ending before the footer's buttons: a reserve of `6 × --vb-control-target + --vb-space-3` (✓ ✗ note Later, flag, ⓘ).
  The slot is `pointer-events: none`; tabs other than NEW take the pointer back.
- **Where the third does not fit** (the choice asked for): on S a wide single tab (a proposal alone) slides left until
  it ends before the ✓ button (target included); two tabs on S do not fit between the left edge and the buttons at all
  (≈150px of tabs, ≈110px of room), so they start at today's 14px and the buttons rise (the existing raise rule).
  Measured on the board (CSS px): S one tab centred at 93 of 280 (third), M 120 of 360, L 155 of 464; two tabs on M and L
  centred at the third too.
- **Beyond the raise**: with the tabs centred, two tabs on M and L no longer reach under the buttons, so the old raise
  (buttons up 3px, tabs down 2px) left the buttons out of line with "Open" for no reason. Under `updateSignals` M and L
  with two tabs keep the buttons level and the tabs at -11px; three tabs, or two on S, still raise them.
- **Tests**: new `tests/pages/tab-place.spec.ts` (8 tests: one tab on S/M/L centred within 1px of a third; two tabs on
  M/L centred, buttons level, on S from 14px with buttons raised; a wide tab on S ends before the buttons; no tab over the
  kind icon or the state word and no tab's 24px target over a footer button; flag off at 14px; axe light and dark, one
  tab and two). Run first against the old CSS: the three geometry tests failed (S one tab centred at 42 of 278), flag-off passed. `big-titles.spec.ts`
  checks the weight on and off; its two gallery screenshots re-taken after checking the diff (only the title changed).
- **Full page suite** (`VB_TEST_PORT=8400`, 3 workers, 12.0 min): 955 passed, 12 failed, 10 did not run (the budgets,
  which wait on chromium). All 12 were gallery screenshots changed by this task (card-updates, fresh-cards, gallery
  markdown and every-section, markdown-more, update-signals; light and dark). Each diff was checked: only the tabs'
  place and the big titles' weight changed. Re-taken (also gallery-freshCards, -updateSignals and -bigTitles in the
  every-section test, checked by pixel diff: changes only in the tab rows and the title row). Then those seven specs:
  75 passed; the budgets alone (`--no-deps perf.spec.ts`): 10 passed. Unit tests of `packages/ui`: 345 passed.
  `npm run verify`: ok (warnings all pre-existing).
- **Docs**: `docs/specification/components.md` (the Big titles bullet; a "Tab place" paragraph after "Updated in amber"),
  `packages/ui/src/node/pattern.json` (`vb-node-btabs`).
- **PNGs**: `temp/tab-place/{before,after}-{s-1-update,m-1-update,l-1-update,new-and-update,proposal-and-update-s,proposal-and-update-m,big-title}-{light,dark}.png`
  in the worktree, drawn by the throwaway `temp/tab-place/shots.ts` on a scratch board (port 8390).

### Caught Beyond the Brief

- **NEW never shows beside "N updates"** on the board: `apps/board/src/board/cards/update-flow.ts` `card()` returns
  `{ new: true }` alone while a card is new. The "NEW plus 1 update" PNG is staged (NEW un-hidden in the page) for its
  width only; the real two-tab case is a proposal (or handover) with "N updates", which the tests use.
- **Possible race, not investigated**: a `propose` at version 2 written straight after the agent's version-2 change
  sometimes never showed its tab (poll 5s; about half of 6 runs). Proposing first (version 1, then the change, so "Out
  of date") was steady (3 × 8 passes). Worth a look by whoever owns `proposal-flow.ts` `refresh` / `answerable`.
- **Seen race in my own script**: a person's note act sends a seen mark; an agent reply landing before that mark is
  marked seen with it, so the "1 update" tab can vanish. The script waits for the note before replying.
- The reserve counts six footer buttons; with `cardFlag` or `cardHistory` off there are fewer, so on S a wide tab
  slides a little further left than it must. Harmless; noted.

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Title weight and tab place: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_title-weight-and-tab-place.md]]`, ending in a newline.
