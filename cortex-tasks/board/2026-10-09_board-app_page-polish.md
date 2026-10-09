---
task_name: Page Polish
created: 2026-10-09
completed: 2026-10-09
status: completed
categories: [board-app, board-ui]
type: implementation
tracker:             # part of board v3 (cortex-tasks/tracker.md U1); no row of its own
---

# Task: Page polish (proposals notice border and number, the last board, the selection pill gap)

> **Written retroactively** after the work, from the maintainer's rulings in chat (2026-10-09).
> **Follows**: `cortex-tasks/board/2026-10-09_board-app_proposals-notice.md` (revisions 1-2,
> already gated; not reopened) · **Model**: Opus 5.5

---

## Problem Statement

Three small things on the board page. The proposals notice's buttons sat too close together, its
outline did not read as an attention element, and its number jumped when the pill opened into the
notice. Reopening the page with no board in the URL always opened the first board, not the one the
viewer was looking at. The "N selected" pill sat on the selected card's top tabs (number, kind), so
a press near them hit the pill instead of grabbing the card, worse when zoomed in, because the
tabs scale with zoom and the pill does not.

---

## Rulings (maintainer; do not reopen)

**A. Proposals notice.**
1. A bigger gap between the Review and Accept all buttons.
2. The pill ("1") and the open notice both have a border in the same pink accent the page uses for
   its primary and attention elements (an existing token; `tokens.css` is protected).
3. **The number must not move** when the pill opens into the notice: the "1" in the pill and the
   count in the open notice sit in exactly the same place (same top left, same inset, same text
   position), so opening only grows the box down and to the right. If the pill needs more padding
   to line up, add it to the pill. A page test measures the number's box before and after opening
   and requires it unchanged (within 1px).

**B. Remember the last board.** Keep the board last looked at in localStorage through
`apps/board/src/shell/kept.ts` (a key in the `vb.` family). Opening the page with no board in the
hash opens it if it still exists; a board in the hash always wins.

**C. Selection pill gap.** The pill does not scale with zoom but the card's header does. Measure at
three zoom levels (zoomed out, 1, zoomed in) and make the gap between the pill's bottom and the tab
row scale between a small minimum zoomed out and a larger value zoomed in, so it never overlaps.
One definition (a small pure function, `pillGap(zoom)`), unit tested at the three levels; the rule
recorded in the selection bar's `pattern.json` and its spec doc.

---

## Task Overview

1. A: the notice's step between buttons, the accent border, the number in one place (CSS, markup,
   `barWords`), page tests, APCA for the border, screenshot baselines after viewing the diffs.
2. B: a pure `startBoard` choice and the kept key, wired into `boards.ts`; unit and page tests.
3. C: `pillGap` in the selection bar's core, used by the board and the gallery; unit and page
   tests at three zooms; `pattern.json` and `components.md`.
4. The five gates.

---

## Files Involved

| File | Purpose |
|------|---------|
| `apps/board/src/styles/proposals.css` | A: accent border, button step, pill padding = the notice's inset |
| `apps/board/src/shell/ProposalsBar.svelte` | A: the number as `.vb-proposals-n` in the count and the pill |
| `apps/board/src/board/proposals.ts` | A: `barWords` gains `noun` |
| `apps/board/src/board/start-board.ts` (new) | B: `startBoard`, `LAST_BOARD_KEY` |
| `apps/board/src/board/boards.ts` | B: keeps the opened board, opens `startBoard(...)` |
| `apps/board/src/shell/kept.ts` | B: header names the new use (code unchanged) |
| `packages/ui/src/selection-bar/selection-bar-core.ts` | C: `pillGap`, `TAB_RISE`, `TAB_CLEAR_*`, `placeBar(…, gap)` |
| `apps/board/src/board/selection-flow.ts` | C: the bar placed with `pillGap(vp.k)` over cards |
| `apps/board/src/gallery/selection-bar-section.ts` | C: the gallery samples at zoom 1 use `pillGap(1)` |
| `packages/ui/src/selection-bar/pattern.json`, `docs/specification/components.md` | C: the rule recorded |
| `apps/board/tests/start-board.test.ts` (new), `apps/board/tests/proposals.test.ts`, `packages/ui/tests/selection-bar.test.ts` | Unit tests |
| `tests/pages/proposals-notice.spec.ts`, `tests/pages/last-board.spec.ts` (new), `tests/pages/pill-gap.spec.ts` (new) | Page tests |

---

## Constraints

- No git commits or stash. Protected files (`docs/decisions.md`, `docs/principles.md`, steering,
  `AGENTS.md`, `CLAUDE.md`, `packages/tokens/src/tokens.css`) not edited; `.visionboard/` untouched.
- Tokens only; one job per file, under 300 lines; `controller.ts` at its limit, so not grown.
- Do not revert the proposals notice revisions 1-2 in the same files.

---

## Success Criteria

- [x] A: Review and Accept all 8px apart (was 4px); accent border on the notice and the pill, light
  and dark; the number's box unchanged within 1px when the pill opens and closes.
- [x] B: no hash opens the last board (also after a reload); a hash wins; a gone board falls back.
- [x] C: the pill clear of the tabs at zoom 0.3, 1 and 2.5, the clear space growing with zoom.
- [x] APCA for the border (decoration tier, Lc 30), light and dark.
- [x] Screenshot diffs viewed before any baseline was updated.
- [x] The five gates exit 0.

---

## References

- `cortex-tasks/board/2026-10-09_board-app_proposals-notice.md` (the notice, revisions 1-2)
- `packages/ui/src/node/node.css` (`.vb-node-num`, `.vb-node-kind`: `top: -11px`, the tabs' rise)
- `apps/board/src/board/viewport.ts` (`MIN_K` 0.2, `MAX_K` 2.5), `apps/board/src/board/pointer.ts` (Ctrl+wheel zoom)
- `cortex-tasks/tracker.md` U1 (board v3)

---

## Agent Notes

### Execution Log
- [x] Started: 2026-10-09 (first agent; interrupted mid-way, its session ended)
- [x] Resumed: 2026-10-09 ~15:00 by a second agent from the uncommitted working tree
- [x] Completed: 2026-10-09 15:10

### Changes Made

**Resumed after an interruption.** The first agent's partial edits were in the working tree. Found
done: B's `startBoard` and its unit tests and the `boards.ts` wiring; C's `pillGap` with its unit
tests and its use in `selection-flow.ts` and the gallery; A's button step and an accent border on
the pill only. Not done: A's border on the open notice, the number staying put, every page test,
APCA, baselines, the pattern and spec records, this file and the LOG line. The second agent judged
the finished parts sound, kept them, and did the rest; it renamed the code comments' ruling numbers
(1-3) to the letters A-C used here. The revisions 1-2 changes in the same files were left as they
were.

**A. The notice** (`styles/proposals.css`, `shell/ProposalsBar.svelte`, `board/proposals.ts`).
- Step: `.vb-proposals > .vb-btn + .vb-btn { margin-top: var(--vb-space-1) }`, so Review and Accept
  all are 8px apart (the rows' 4px gap plus 4px); the gap above Review stays 4px.
- Border: `.vb-proposals` is `1px solid var(--vb-accent)` (was the line-strong hairline), so the open
  notice and the pill (the same section, collapsed) carry the same pink, as the pressed buttons,
  the open Chat button and the key bubble's open button do. The pill button has no border of its own.
- The number in one place: the count is `<span class="vb-proposals-n">{n}</span> {noun}` and the pill
  is `<span class="vb-proposals-n">{n}</span>` (`barWords` now returns `noun` as well; `count` is
  still `n noun`, so the heading reads as before). The count's line and the pill share one `font`
  (bold `--vb-text-sm`, normal line height) and tabular numbers. The pill is `display: block`,
  filling the collapsed section, with padding `calc(--vb-space-1 + --vb-space-1) --vb-space-3`: the
  notice's top padding plus the text's, and its left padding. So the number is 13px from the left
  edge and 9px from the top in both states, and opening only grows the box down and to the right.
  The pill is now about 33 by 33px (it was 26px high).

**B. The last board** (`board/start-board.ts`, `board/boards.ts`).
- `startBoard(boards, hash, last)`: the hash's board if it is in the list, else the last board if it
  is, else the first. `LAST_BOARD_KEY = 'vb.lastBoard'`.
- `boards.ts` `switchTo` keeps the opened board (`keep(LAST_BOARD_KEY, id)`), and the first open
  picks `startBoard(list, hash, kept(LAST_BOARD_KEY))`. Through `shell/kept.ts`, so a refused storage
  just opens the first board as before.

**C. The pill gap** (`packages/ui/src/selection-bar/selection-bar-core.ts`).
- `pillGap(k) = TAB_RISE * k + clamp(TAB_CLEAR_PER_K * k, TAB_CLEAR_MIN, TAB_CLEAR_MAX)` with
  `TAB_RISE` 10 (the tabs sit at `top: -11px` inside the card's 1px border), 8 per unit of zoom,
  minimum 4, maximum 16: 6px at 0.2, 18px at 1, 41px at 2.5 (screen pixels from the selection's top
  edge to the bar's bottom; the clear space above the tabs is 4, 8 and 16).
- `placeBar(box, bar, stage, gap = BAR_GAP)` takes the gap above; below still uses `BAR_GAP`.
- `selection-flow.ts` passes `pillGap(d.vp.k)` over cards and `BAR_GAP` for the area bar;
  `gallery/selection-bar-section.ts` passes `pillGap(1)` (its cards are at zoom 1).
- Recorded in `pattern.json` (`files.core`, a new `placement` entry) and `components.md` § The lasso,
  the selection bar and view commands, point 3.

### Tests
- Unit: `apps/board/tests/start-board.test.ts` (5: hash wins, no hash, a hash naming no board, a gone
  or missing last board, the key); `packages/ui/tests/selection-bar.test.ts` (`pillGap` at 0.2, 1 and
  2.5 and growing; `placeBar` with a gap); `apps/board/tests/proposals.test.ts` (`barWords` `noun`).
- Page: `tests/pages/proposals-notice.spec.ts` (+3: the step between the buttons; per theme, the
  accent border on the notice and the pill equals the resolved `--vb-accent`, and the number's box
  x, y, width and height unchanged within 1px on hide and on open, the top left unchanged, the pill
  24px+); `tests/pages/last-board.spec.ts` (3: no hash reopens the last board, after a reload too; a
  hash wins and becomes the last; a gone last board opens one that exists);
  `tests/pages/pill-gap.spec.ts` (1: Ctrl+wheel zoom to 0.3, 1 and 2.5 at the selected card; the pill
  above, its clear space to the tabs about 4, 8 and 16px, never negative, growing). Axe light and
  dark with the notice and the pill: the existing "axe passes with the notice and with the pill"
  tests (the pill's look changed); the selection pill's own axe tests cover its new position.

### Contrast (APCA-W3 0.0.98G-4g, scripted from the token values; light / dark)
The border (`--vb-accent`, decoration tier, Lc 30) against what lies beside it: the canvas
66.1 / -48.5, a card 72.0 / -47.7, the glass over the canvas 69.0 / -48.1, the glass over a card
72.0 / -47.7. All pass. Not met, reported: over an Accept fill (the accent itself) the border has no
contrast; it is decoration there and the notice's own glass and text still separate it.

### Screenshots
Viewed the actual, expected and diff images first (light and dark). Only the gallery's "The notice"
and "The pill" samples differed: the accent border on both, Review and Accept all 4px further apart,
the pill square and larger with the number where the notice's count sits. Updated on purpose:
`tests/pages/__screenshots__/proposals.spec.ts/proposals-{light,dark}-darwin.png` only. No other
baseline changed (the gallery's notice stage has a fixed height, so nothing after it moved).

### Gates (all exit 0)
`npm test` (890 + 6), `npm run check` (0 errors, 0 warnings), `npm run verify` (0 warnings),
`npm run gen -- --check`, `npm run test:pages` (276 passed).

### Issues & Resolutions
- The first agent's session ended mid-way (see above); resumed from the working tree, nothing reverted.
- `board/boards.ts` imports `shell/kept.ts`, as it already imports `shell/shell.svelte.ts`; `verify`'s
  layer check passes.

### Follow-up (not done)
- The agent API helpers (`join`, `write`, `draw`) are copied again in the two new page specs; a shared
  test helper would remove them (already noted in the proposals-notice task).
