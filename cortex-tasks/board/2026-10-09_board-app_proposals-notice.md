---
category: board-app
status: completed
completed: 2026-10-09
created: 2026-10-09
tracker: cortex-tasks/tracker.md#U1
---

# Proposals notice: a floating, see-through notice instead of a full-width bar

> **Follows**: Stage 5 FE_01 (`cortex-tasks/board/2026-10-08_board-app_proposals-seen-parking/`,
> the proposals bar) · **From**: maintainer, 2026-10-09 (chat after Stage 6) · **Model**: Opus 5.5

## Problem

The proposals bar ("1 proposal from the agent · Review · Accept all") takes a whole row under the
toolbar and pushes the board down (`--vb-proposals-h` in the stage and chat sidebar insets). It
is opaque and wastes the row.

## Rulings (maintainer; do not reopen)

1. **A floating notice at the top left of the board**, over the board, not a row: it no longer
   pushes the stage or the chat sidebar down (drop `--vb-proposals-h` from their insets). Same
   content: "1 proposal from the agent · 1 out of date", Review, Accept all (its confirm list
   unchanged).
2. **See-through:** background about 50% opaque (a `color-mix` of an existing surface token,
   like the selection bar does) with a gentle background blur, small radius (about 4-6px), so
   the board shows through. Nothing heavy on the GPU: one element, no animated blur. Text and
   buttons still meet their APCA tiers over a busy board (measure over the worst case: a card
   behind it, light and dark; D-035 tiers).
3. **Hide and show:** a hide button on the notice collapses it to a small pill in the same place
   ("1 proposal"); clicking the pill brings the notice back. The choice is kept per viewer
   (localStorage, guarded, rule: per-viewer convenience). New proposals arriving while hidden
   update the pill's count; the polite live region still announces them.
4. Keyboard: the notice, its buttons, hide and the pill are reachable and labelled; Esc on the
   notice hides it. Off while a past version shows (as now). The `proposals` flag still turns the
   whole thing off.
5. It must not cover the container finder or the version dropdown's menus, nor the requests
   strip; when the requests strip shows, the notice sits below it.

## Steps

1. [x] Failing tests first: page test (floating, the stage not pushed down, see-through
   background, hide to pill and back, kept after reload, Review and Accept all unchanged,
   keyboard, axe light and dark); unit tests for any state module.
2. [x] Build (`ProposalsBar.svelte`, `proposals.css`, the insets in `board.css` and
   `chat-sidebar.css`); gallery entry with the notice and the pill; update screenshot baselines
   only after viewing the diffs.

## Validation

- [x] The five gates exit 0 (`npm test`, `npm run check`, `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages`).

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Tokens only; `tokens.css` is protected (propose wording if a token is needed).
- Scratch in the system temp folder; stop only your own processes; don't touch `.visionboard/`.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09

**Notice.** `apps/board/src/shell/ProposalsBar.svelte` (file name kept; App and the gallery import it):
a `<section class="vb-proposals">` region, `position: fixed; z-index: 4` at the board's top left,
`top: toolbar-h + strip-h + space-2`, so it sits under the requests strip and under the toolbar's
layer (z 5; the Agents panel lifts it to 7); the container finder and the version dropdown are native
`<select>`s, drawn above the page. The `--vb-proposals-h` effect is gone and the variable is dropped
from `.vb-stage` (board.css) and `.vb-chat` (chat-sidebar.css): nothing moves when proposals arrive.
Look (`styles/proposals.css`): `color-mix(--vb-surface-raised 50%, transparent)` over
`backdrop-filter: blur(8px)` (no saturate, nothing animated), the selection bar's hairline
(`--vb-line-strong` at 80%), `--vb-radius-sm` (6px), no shadow. Same content: count heading, "· 1 out
of date", Review, Accept all (n), then Hide (a chevron button, "Hide the proposals notice").
The stale words moved from `--vb-ink-subtle` to `--vb-ink` for contrast on the glass.

**Hide and show.** Hide, or Esc anywhere in the notice (preventDefault, so keys.ts's board Escape does
not also fire), collapses it to `.vb-proposals-pill` in the same section ("1 proposal", name "1
proposal, show the notice"); focus goes to the pill; the pill brings the notice back with focus on
Review. Kept per viewer under `vb.proposals-hidden` through the new `shell/kept.ts` (`kept`/`keep`,
guarded localStorage), which ChatSidebar.svelte now uses too instead of its own inline copies. The
pill's count is `barWords(rows).short` (proposals.ts gains `short`); the polite live region stays
outside the section, so arrivals are announced while hidden. The flag and the past-version guard are
unchanged (App passes rows only when not past; no rows, no section).

**Gallery.** "The bar" group became "The notice" and "The pill": each over a real card on the dot
ground (`.g-notice-stage`, gallery.css), so the see-through shows; `collapsed` prop for the pill sample.

**Contrast (APCA-W3 0.0.98G-4g, scripted; light / dark).** Rendered pixels: the notice with its
contents hidden over the gallery card's title, worst pixel: `--vb-ink-strong` 84.3 / 85.9,
`--vb-ink` 74.1 / 62.6. Stress case, the notice moved over an open box's Accept fill (accent):
ink-strong 64.8 / 78.7, ink 54.6 / 55.4. So the count and pill (>= 60) and "out of date" (status
words, >= 45) hold over a card; buttons keep their own opaque fills (unchanged). Not met, reported:
an unblurred solid `--vb-ink-strong` area behind (no such area exists on a card; text is thin and
blurred) would give 41.5 / 58.7.

**Tests.** `tests/pages/proposals-notice.spec.ts` (7: floats, stage not pushed, see-through values;
hide to pill, same place, reload, count and announce while hidden, back; keyboard incl. Esc, Review
and Accept all; below the requests strip; axe light/dark with notice and pill; gallery). Unit:
`apps/board/tests/kept.test.ts`, `barWords` short in `proposals.test.ts`. `proposals.spec.ts` gallery
count 4 -> 6 cards.

**Screenshots.** Updated on purpose after viewing: `proposals-{light,dark}` (the bar group replaced
by the notice and pill groups). `card-updates-`, `parking-replies-`, `chat-{light,dark}`: the sections
after it in the gallery moved by a fraction of a pixel (1px height change, text anti-aliasing only;
actual and expected compared, content identical).

**Revision 2 (2026-10-09).** Maintainer: same glass and placement, new shape. The notice is narrow and
stacked in three rows at a token width (`calc(--vb-card-w - --vb-space-6)`, 216px, content-sized, not
stretched): row 1 the count ("3 proposals", "from the agent" dropped) with the out-of-date words after it
(`--vb-text-xs`, `--vb-ink`, wrapping inside the row rather than widening the box) and Hide at the row's
end; row 2 Review and row 3 Accept all (n), both full width (26px high, above the 24px target size).
Hide is now first in the DOM, so the tab order follows the screen: Hide, Review, Accept all. The pill
is the bare number ("1"), name "1 proposal, show the notice" (the pill's chevron is gone). `barWords`
now returns `{ count, stale, n }` (`short` removed: it equalled `count`). Background, blur, placement,
kept hide/show, Esc, live region, flag, past-version guard and the Accept all confirm list are
unchanged. Contrast: the same tokens on the same glass as before (ink-strong for the count and pill,
ink for the out-of-date words, buttons keep their opaque fills), so the measured pairs above stand; the
out-of-date words are 12px now, still on the status-word tier (Lc 45) with 54.6 / 55.4 at the worst
case measured. Tests: new "three stacked rows" page test (width 160-240, Hide on row 1 at the end,
Review and Accept all stacked, equal and full width, 24px+ high, stale words on row 1 with the width
unchanged), pill text and name, keyboard order; unit `barWords`. Screenshots updated on purpose after
viewing the actual images, light and dark: `proposals-{light,dark}` only (notice and pill groups).
Gates all exit 0: `npm test` (883 + 6), `npm run check`, `npm run verify`, `npm run gen -- --check`, `npm run test:pages` (269 passed).

**Gates (all exit 0):** `npm test` (883 + 6); `npm run check`; `npm run verify` (0 warnings);
`npm run gen -- --check`; `npm run test:pages` (268 passed).

**Follow-up (not done):** the agent API helpers (`join`, `write`, `draw`) are copied in about eleven
page specs, this one included; a shared test helper would remove them. Toolbar.svelte's theme still
reads localStorage unguarded (could use `kept.ts`).
