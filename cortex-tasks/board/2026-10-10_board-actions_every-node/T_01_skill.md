---
category: board-agent
status: planned
created: 2026-10-10
---

# T_01 The skill

> Plan: [PLAN.md](./PLAN.md) rulings 2-7 · Model: Opus 5.5 · After FE_01 · Rule 17

## Steps

1. [ ] `skills/vision-board/SKILL.md` v2 (this part): no `item`; ask with a question, decision or
   action card, explain with any other kind; what ✓ ✗ Comment, More context and Later mean on each;
   responses arrive in card order; reply or append for every note, park for every Later. Fold in
   the NOTES.md evidence that fits (links only for real flows, grid by default, short chat words).
2. [ ] `scenarios.md`: update; add one where the person comments on three mixed cards at once.
3. [ ] One run of the changed scenarios against a real model (short), results in the notes.

## Validation

- [ ] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Not started
