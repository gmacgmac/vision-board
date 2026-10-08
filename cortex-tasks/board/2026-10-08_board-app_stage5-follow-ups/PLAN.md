# Stage 5 follow-ups: NEW cards, what clears a label, the selection pill - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-08 · **Follows**: `2026-10-08_board-app_proposals-seen-parking` (Stage 5)
> · **Decisions**: D-033, D-035 · **Agreed**: chat 259-270 (maintainer, 2026-10-08)

## Problem Statement

Stage 5 shows a changed card but not a card the agent added later, so new cards are easy to miss.
What clears a label is coded in the page, not declared where it can be changed. The selection bar
is large, opens on every selection, and its Comment button's hover looks wrong (black on dark
grey in dark, white on grey in light).

## Rulings (maintainer, 2026-10-08; do not reopen)

1. **NEW (263).** A card the agent adds after the board's first drawing shows a NEW tab (bottom
   edge, FE_01 Stage 5 slot). A freshly drawn board shows no NEW at all: its first drawing is the
   board's first run (`LedgerState.runs`). NEW goes when the person selects the card or acts on
   it, or when the next round starts: the person Sends and the agent then draws again, after
   which only the cards of that newer round are NEW. A NEW card shows NEW only, never "N updates",
   until it is seen.
2. **What clears a label is declared (263).** Each card-label row in the conditions table
   (`item.new`, `item.unseen`) names what ends it in a typed field (e.g. `clearedBy: ['select',
   'act', 'round']`). The page reads that field to decide when selecting sends `mark_seen`; the
   fold's "an act counts as seen" and the round rule are tested against it. Changing the rule
   later is a change to the row.
3. **Re-saving for later (264).** No code change: taking a card out of Later and saving it again
   asks the agent for a fresh handover. One line in `skills/vision-board/NOTES.md`.
4. **Selection pill (265).** Selecting cards shows a small pill where the bar sits now ("3
   selected" and a chevron). Click or Enter on it opens the bar, more compact than today; it stays
   open until a click anywhere outside it (background included), a pan, or Esc. Keyboard commands
   on the selection work without opening it. The bar's button hover uses the right tokens in both
   themes (the Comment button's hover today reads black on dark grey / white on grey).
5. **Contrast (266, D-035).** Short muted detail lines are measured at Lc 45; no token change.
6. Flags: `newCards`, `selectionPill`, on by default. Contract first where it changes.

## Tasks

BE_01 (conditions row `item.new`, `clearedBy` on card rows, fold round start, skill note), FE_01
(NEW tab, seen on select read from `clearedBy`), FE_02 (selection pill and compact bar, hover
fix), VERIFY_01 (orchestrator, by hand). Page tests share ports, so all run in sequence.

## Success Criteria

- [ ] A fresh board has no NEW; a card added in a later round shows NEW until selected, acted on,
      or the next round
- [ ] `clearedBy` drives seen-on-select; a test fails if the fold and the rows disagree
- [ ] Selecting shows the pill; the bar opens on click or Enter and closes on outside click, pan
      or Esc; hover reads right in both themes
- [ ] The five gates exit 0
