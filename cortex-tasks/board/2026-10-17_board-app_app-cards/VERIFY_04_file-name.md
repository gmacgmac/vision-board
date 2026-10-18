# VERIFY_04_file-name: Re-check finding 36 and Goal lines 2 and 10

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A copy of VERIFY_03 limited to finding 36 (PLAN.md § Orchestrator guide, fix loop): check by hand that
FIX_08 fixed it, run the gates, and settle Goal lines 2 and 10.

## Context

Read VERIFY_03's notes (finding 36) and FIX_08's notes. Same harness as VERIFY_03 (`$TMPDIR/vb-v3/` scripts
if still there): a scratch board on a spare port, `HOME` and `VB_PROJECT` in the system temp folder,
`VB_KIRO_AGENT=0`, the repo's Playwright chromium, 1600×1000 and 1470×956, light and dark.

## Steps

1. [ ] **Finding 36**: set `panel` to `.panel.html`, `my panel.html`, `pages/notes.html`, `panel.htm`; and
   `tools` likewise. Each problem line says what to change, in plain words, light and dark on the card and
   in `list_apps`. Run `design:ux-copy` over the words.
2. [ ] **A quick pass** on Goal line 3 by hand (Allow → `12*3=` → 36 → History).
3. [ ] **Gates** (Goal line 2): the six, one after another; paste the counts.
4. [ ] **Goal check**: update lines 2, 3 and 10. Anything new inside the rulings: the next number, for
   another FIX; outside: § Proposed tracker rows. Do not edit code, tests, tokens or the skill.

## Validation

- [ ] Finding 36 marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_04: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_04_file-name.md]]`
