---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Interaction designer — one mark per card says "something here needs you", and opening it shows all of it in order of what to do.
---

# One tab for an update and a proposal (point 444)

> **Created**: 2026-11-05 · **From**: maintainer, point 444 · **Flag**: `oneChangeTab`

## Problem

When the agent changes a card and proposes its ✓ or ✗ in the same round, the card shows two bottom-edge tabs,
"Proposal" and "1 update" (`packages/ui/src/node/node-template.ts` `POPOVERS`, `vb-node.ts` `bindCardPopover`,
`node-steps.css` the updates tab, `node-popover.css` `.vb-node-btabs`; D-018 proposals, D-088/D-091 tab colour and
place). Both say "something new here": the maintainer wants one.

## Decision (maintainer, 444)

1. When a card has both unseen updates and a proposal, it shows one tab in the updated amber, e.g. "1 update ·
   proposal" ("2 updates · 2 proposals"; words in the node words file). Its popover shows the proposal(s) first
   (accept, as today, with the agent's reason; out-of-date marked as today) and the update steps beneath (as the
   updates tab shows them today). Accepting works exactly as it does from the proposal tab.
2. A proposal alone and updates alone stay as today. The handover tab is unchanged.
3. Accessible name says both ("1 update and a proposal on item 3"); keyboard, focus and Esc as the two tabs today.
4. Behind a new flag `oneChangeTab` (on) in `packages/format/src/flags.ts` + `FLAG_DESCRIPTIONS`; off = two tabs.

## Steps

1. Failing page tests first (new `tests/pages/one-change-tab.spec.ts`): both present → one tab with both counts;
   its popover lists the proposal then the steps; accept from it marks the card and the tab becomes "N updates"
   alone (or goes, as the updates tab would); stale proposal shown; alone cases unchanged; flag off = two tabs;
   light and dark, axe, APCA (labels Lc 45).
2. Reuse the existing popover pieces (proposal box, steps view); no copy of either. Tab place stays D-091's.
3. Gallery: in the existing last section for update signals or a new last section (never move a section).
4. Before/after PNGs (M card with both, S card with both, the open popover), light and dark, in
   `temp/one-tab/`; list absolute paths.
5. `docs/specification/components.md`; full page suite once at the end.

## Constraints

Worktree `.claude/worktrees/one-tab` (branch `feat/one-tab`, from main), `VB_TEST_PORT` 8700. Never port 4466, the
repo's own `.visionboard/` (the maintainer's uncommitted changes), or `node_modules`. No git commits. Writes >50
lines in chunks. Time limit on every run, `nice -n 15`, `VB_TEST_WORKERS=3`, full spec paths. Build once first.

## Implementation Notes

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] One change tab: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_one-change-tab.md]]`, ending in a newline.
