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

Done 2026-11-05 in `.claude/worktrees/one-tab` (branch `feat/one-tab`), uncommitted.

- **Core**: `packages/ui/src/node/node-core.ts` `changeTab` + `CardConditions.oneTab` (the flag, passed by the page
  like `groupNotesApart`) + `NodeState.oneTab`. With both, the proposal view's tab/label/box say both and carry
  `updated`; the updates view is kept (the box's stepper reads it). Past the last step the tab is "Proposal" again.
  Words: `packages/ui/src/words/node.ts` `updatesAndProposalsTab`, `updatesAndProposalsOnItem`.
- **Element** (`vb-node.ts`): the proposal tab gets `data-updated`; `placeSteps` *moves* the card's own step section
  and stepper into the proposal box (after the proposals) and back, so nothing is copied; `data-stepping` is not set
  while they are in the box (the footer stays); the proposal box now rebuilds only its `.vb-prop` children.
- **Popover** (`node-popover.ts`): new `POPOVER_HIDE` event (exported from `#ui`), fired on every hide. Needed because
  the dismissable layer swallows Esc in capture, so update-flow's own Esc never sees it.
- **Page** (`update-flow.ts`): `POPOVER_OPEN` on a proposal box holding the steps opens the stepper without moving
  focus (Reject keeps it); `POPOVER_HIDE` folds it (in a microtask: an answered proposal closes its box from inside the
  card's update). Past the last step focus goes to the box's first answer; `fold` leaves focus on a tab or in an open
  box. `controller.ts` passes `oneTab` in `facts`.
- **CSS**: `node-steps.css` the combined tab shares the updates tab's look, always in `--vb-state-updated` (not gated
  on freshCards), soft fill hovered/open; `node-popover.css` the combined tab counts as two tabs for the buttons' rise
  (see Caught Beyond the Brief 1).
- **Flag** `oneChangeTab` (on) + description. **Gallery**: new last section `gallery/one-tab-section.ts`.
- **Docs**: `docs/specification/components.md` (after Tab place), `pattern.json` (state, btabs, event),
  `modules.md` regenerated (`npm run map`).
- **Tests**: `packages/ui/tests/node-change-tab.test.ts` (4); `tests/pages/one-change-tab.spec.ts` (15). Adjusted:
  `tab-place.spec.ts` and three `proposals.spec.ts` tests open with `-oneChangeTab` (they test two tabs / the proposal
  tab alone after a change); four "section is last" gallery asserts skip `oneChangeTab`; gallery node-section
  baselines regenerated (only the pattern's states line changed).
- **PNGs** (`temp/one-tab/`): before-{m-card,s-card,popover,stepper}-{light,dark}.png, after-{m-card,s-card,popover}-{light,dark}.png.

### Caught Beyond the Brief

1. On an S card "1 update · proposal" is wider than the room before ✓, so its 24px target sat over ✓. Applied D-091's
   own rule for two tabs on S (buttons rise, row drops 2px) to the one tab. M and L stay level, centred at a third.
2. Accepting from the box always clears the updates too (an act clears `item.unseen`, D-054), so "N updates alone"
   after Accept never happens; the test asserts the tab goes.
3. The hover/focus preview shows the proposals only; the steps appear on a click or Enter, because showing a step marks
   it seen and hovering must send nothing. Maintainer may want the preview to say "1 update" beneath.
4. The open box has two pink primaries (Accept and Next). Works, but the eye has two targets; a quieter Next in the
   box is a possible follow-up.
5. Tracker N50 reproduced: a proposal at v2 written live right after the v2 change sometimes never shows its tab. My
   page tests open the board after the agent's round to stay clear of it.

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] One change tab: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_one-change-tab.md]]`, ending in a newline.
