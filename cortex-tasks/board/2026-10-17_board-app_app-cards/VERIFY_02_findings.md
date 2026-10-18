# VERIFY_02_findings: Re-check VERIFY_01's findings and Goal lines 3-4

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A copy of VERIFY_01 limited to its findings 1-7 and PLAN.md § Goal state lines 3-4 (PLAN.md §
Orchestrator guide, fix loop): check by hand that FIX_01 and FIX_02 fixed them, and that the end to end
and the safety still hold.

## Context

Read VERIFY_01's notes (TASK-STATUS.md § VERIFY_01: steps and screenshots for each finding) and the FIX_01
and FIX_02 notes. Same harness as VERIFY_01: a scratch board on a spare port with `HOME` and `VB_PROJECT`
in the system temp folder, `VB_KIRO_AGENT=0`, the repo's Playwright chromium, 1600×1000 and 1470×956,
light and dark. Look at every screenshot you take.

## Steps

1. [ ] **Each finding 1-7**: repeat VERIFY_01's steps; it passes only when the seen behaviour is what the
   finding says it should be. Screenshot each, light and dark. Run `design:ux-copy` over any new words.
2. [ ] **Goal lines 3-4**: the named tests pass in your page run; by hand, Allow → `12*3=` → 36 → History.
3. [ ] **Gates** (Goal line 2): run the six yourself, one after another, and paste the counts into §
   Goal check line 2.
4. [ ] **Goal check**: update lines 2, 3, 4, 7 and 10 with this run's evidence. A finding still open, or a
   new one inside the rulings, is a numbered finding (continue the numbering) for another FIX; one outside
   the rulings is a row in § Proposed tracker rows. Do not edit code, tests, tokens or the skill.

## Validation

- [ ] Every finding 1-7 is marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_02: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_02_findings.md]]`
