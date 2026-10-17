# VERIFY_01_by-hand: By hand, light and dark, and the goal check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Use app cards the way the maintainer will, look at them, try to break them, and check every line of
PLAN.md § Goal state with evidence.

## Context

Everything has landed: read every task's notes. Harness: a scratch board on a spare port with `HOME`
and `VB_PROJECT` in the system temp folder (see the answer-model and review-polish VERIFY notes), the
repo's Playwright chromium, a large screen (1600×1000) and the MacBook Air size (1470×956), light and
dark. Look at every screenshot you take.

## Steps

1. [ ] **Use it**: draw the calculator and the scenario-2 converter (copy it from T_02's run, or build
   one) on one board beside ordinary cards and containers. Allow, calculate, convert, read History,
   Stop app, change `tools.mjs` and see "code changed · Allow", break the manifest and see "invalid",
   fix it, zoom out past `FAR_K` and back, scroll a card off screen and back, open a past version,
   switch the theme with the panel open, select and Z to the card, go to it by number, add a note to
   the card and see it like any card's note.
2. [ ] **Try to break it** (beyond the automated tests): a panel that posts 1,000 messages a second; a
   tool that returns a huge string; a tool that hangs while the person keeps pressing `=`; two app
   cards for the same app; a deleted app folder while its card is on screen (the card says "not
   found"; restoring the folder heals it); `open_project` to another folder while an app runs (its
   process stops). The board must stay responsive and never show a blank or broken card.
3. [ ] **Goal check**: for each line of PLAN.md § Goal state, write the evidence into TASK-STATUS.md §
   Goal check (line 2: run the gates yourself, one after another, and paste the counts).
4. [ ] Findings: each one inside the rulings becomes a finding for a FIX task (name the ruling, the
   example, the screenshot); each outside the rulings becomes a proposed tracker row in TASK-STATUS.md.
   Do not edit code, tests, tokens or the skill yourself.

## Validation

- [ ] Every § Goal state line has evidence or a named finding.

## Constraints

- No git commits. Stop every process you start. Never port 4466 or this repo's `.visionboard/`.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_01: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_01_by-hand.md]]`
