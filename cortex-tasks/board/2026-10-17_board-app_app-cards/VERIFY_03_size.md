# VERIFY_03_size: Re-check findings 25, 27, 28, Goal lines 2-4, 7 and 10

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A copy of VERIFY_02 limited to findings 25, 27 and 28 and PLAN.md § Goal state lines 2-4, 7 and 10: check by hand that
FIX_03 and FIX_04 fixed them, that findings 1-7 still hold, and that the end to end and the safety still hold.

## Context

Read VERIFY_02's notes (finding 25's steps and screenshots) and FIX_03's and FIX_04's notes. Same harness as VERIFY_02
(`$TMPDIR/vb-v2/scripts/` if still there): a scratch board on a spare port with `HOME` and `VB_PROJECT` in
the system temp folder, `VB_KIRO_AGENT=0`, the repo's Playwright chromium, 1600×1000 and 1470×956, light and
dark. Look at every screenshot you take.

## Steps

1. [ ] **Finding 25**: repeat VERIFY_02's steps (manifest broken, folder gone, page load) on a card with no
   `w`/`h`; it passes when the card keeps its box, or when what still moves is exactly what the narrowed
   claims say. Read the three claims against the code.
2. [ ] **Findings 27, 28** (FIX_04): Check again on an invalid app whose folder then goes; a half-written
   app.json. Run `design:ux-copy` over the words.
3. [ ] **Findings 1-7**: a quick pass that each still holds (one screenshot each).
4. [ ] **Goal lines 3-4**: the named tests pass in your page run; by hand, Allow → `12*3=` → 36 → History.
5. [ ] **Gates** (Goal line 2): run the six yourself, one after another, and paste the counts.
6. [ ] **Goal check**: update lines 2, 3, 4, 7 and 10. A finding still open, or a new one inside the
   rulings, gets the next number for another FIX; one outside goes into § Proposed tracker rows. Do not
   edit code, tests, tokens or the skill.

## Validation

- [ ] Findings 25, 27, 28 marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_03: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_03_size.md]]`
