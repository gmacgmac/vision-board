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

1. [x] **Use it**: draw the calculator and the scenario-2 converter (copy it from T_02's run, or build
   one) on one board beside ordinary cards and containers. Allow, calculate, convert, read History,
   Stop app, change `tools.mjs` and see "code changed · Allow", break the manifest and see "invalid",
   fix it, zoom out past `FAR_K` and back, scroll a card off screen and back, open a past version,
   switch the theme with the panel open, select and Z to the card, go to it by number, add a note to
   the card and see it like any card's note. **Images**: a card with three images (one in a subfolder,
   one tall, one wide), open each by click and by keyboard and check the 70% fit and the animation in
   and out (and with reduced motion), overwrite one file and select the card to see it update, delete
   one and see "image not found", try an internet URL and an svg in a card's Markdown.
2. [x] **Try to break it** (beyond the automated tests): a panel that posts 1,000 messages a second; a
   tool that returns a huge string; a tool that hangs while the person keeps pressing `=`; two app
   cards for the same app; a deleted app folder while its card is on screen (the card says "not
   found"; restoring the folder heals it); `open_project` to another folder while an app runs (its
   process stops); a card with 30 large images on a big board (lazy loading, no jank when panning).
   The board must stay responsive and never show a blank or broken card.
3. [x] **Goal check**: for each line of PLAN.md § Goal state, write the evidence into TASK-STATUS.md §
   Goal check (line 2: run the gates yourself, one after another, and paste the counts).
4. [x] Findings: each one inside the rulings becomes a finding for a FIX task (name the ruling, the
   example, the screenshot); each outside the rulings becomes a proposed tracker row in TASK-STATUS.md.
   Do not edit code, tests, tokens or the skill yourself.

## Validation

- [x] Every § Goal state line has evidence or a named finding.

## Constraints

- No git commits. Stop every process you start. Never port 4466 or this repo's `.visionboard/`.

## Implementation Notes

**Status**: Completed (2026-10-18), with findings 1-7 inside the rulings (for FIX tasks)

**Gates** (one after another at `a5bde82`, before the by-hand run): `npm run check` 0 (348 files, 0 errors,
0 warnings); `npm test` 1474 pass + `test:timing` 7 pass; `npm run verify` "ok (0 warning(s))";
`node scripts/gen-api.mjs --check` current; `npm run build` 0; `npm run test:pages` 528 passed (11.1 min).

**Harness** (all in `$TMPDIR/vb-vac/`): `scripts/seed.sh` (the calculator copied from the skill, T_02's
round-1 `km-miles` from `$TMPDIR/vb-skill38/claude/s29-r1/`, a panel-only app, a flood panel that posts
1,000 messages a second, a 30 MB answer, a looping tool, later a crashing tool; real PNGs from
`scripts/png.mjs`: a subfolder, a tall, a wide, T_02's settings screenshot and 30 noise PNGs of 3.2 MB);
one board server on port 4495 with `HOME` and `VB_PROJECT` there, `VB_KIRO_AGENT=0`; `scripts/draw.mjs`
(a newly joined agent draws boards `verify` and `big` over HTTP); `scripts/driver.mjs` (one headless
chromium page from the repo's Playwright, driven step by step by `scripts/steps/*.js`; console errors and
warnings, page errors, failed requests and every tool call logged). 1600×1000 and 1470×956, light and dark,
reduced motion and with motion. About 70 screenshots in `shots/`, each looked at. Server, driver and browser
stopped after; no app process left. This repo's `.visionboard/` was only read (Goal line 8).

**Results**: TASK-STATUS.md § VERIFY_01 (what passed, findings 1-7 with steps, fix, files, page code and
screenshots), § Goal check (every line), § Proposed tracker rows 8-24 (the earlier tasks' known limits
gathered, plus VERIFY_01's own).

**Findings inside the rulings, in short** (full text in TASK-STATUS.md):
1. Rulings 10, 11: a deleted app folder never shows "not found" until a reload, its reloaded panel is a
   blank grey box (404 blocked by the page CSP), and restoring the folder doesn't heal the card. Page code.
2. Ruling 7: "Code changed" shows only after the person tries the app; selecting the card doesn't read
   list_apps again. Page code (same seam as 1).
3. Rulings 3, 10: a past version draws app cards at 360×320, ignoring the manifest's size. A few bytes.
4. Plain words: the invalid card shows literal backticks and JSON pointers. A few bytes, or none if the
   server's words change.
5. Ruling 19, plain words: an internet picture's box says "must be inside the images folder". A few bytes.
6. Great UX and components.md's claim: Allow removes the ask line, so the card shrinks 44 px and the board
   below jumps. A little page code, or none if only the claims change.
7. Minor: agent problems say "KiB" (here and in two older messages). No page code; optional.

**Deviations**: none from the steps. The folder switch (step 2) cannot switch back to a project outside the
scratch `HOME`, so the server was restarted on the scratch project for the big-board test. The
"two app cards" case used cards 1 and 13 of one app; the "huge string" was 30 MB.

**Long File Strategy**: TASK-STATUS.md was changed by exact-string edits of under about 50 lines each; the
scratch scripts were each written in one write under 100 lines, with no connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_01: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_01_by-hand.md]]`
