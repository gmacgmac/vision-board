---
category: board-ui
status: planned
created: 2026-10-10
---

# FE_01 The page: every card numbered and answerable

> Plan: [PLAN.md](./PLAN.md) rulings 1-4, 6 · Model: Opus 5.5 · After BE_02

## Steps

1. [ ] `node-core.ts` `offers` from the kind; the number on every card; ✓/✗ tooltips "Yes"/"No"
   on a question, "Done" on an action (assumption B); key help.
2. [ ] Selection Comment (`selection-flow.ts` `comment`) on any selected cards, one or many; C on
   one card is its own comment as now.
3. [ ] Counts in the toolbar from BE_02; card states for comment, context and later on plain cards
   (assumption C), tokens only, APCA tiers light and dark.
4. [ ] Flag `everyNode` (on by default; off: numbers and buttons only on answer cards). Gallery: a
   plain card with its three actions, a group note over mixed kinds. Screenshots only after viewing
   the diffs.

## Validation

- [ ] Failing page tests first (a plain card commented alone; three mixed cards lassoed and
   commented once; Yes/No tooltips; counts; keyboard; axe light and dark); the five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Not started
