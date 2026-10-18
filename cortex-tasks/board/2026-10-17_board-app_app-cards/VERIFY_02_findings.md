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

1. [x] **Each finding 1-7**: repeat VERIFY_01's steps; it passes only when the seen behaviour is what the
   finding says it should be. Screenshot each, light and dark. Run `design:ux-copy` over any new words.
2. [x] **Goal lines 3-4**: the named tests pass in your page run; by hand, Allow → `12*3=` → 36 → History.
3. [x] **Gates** (Goal line 2): run the six yourself, one after another, and paste the counts into §
   Goal check line 2.
4. [x] **Goal check**: update lines 2, 3, 4, 7 and 10 with this run's evidence. A finding still open, or a
   new one inside the rulings, is a numbered finding (continue the numbering) for another FIX; one outside
   the rulings is a row in § Proposed tracker rows. Do not edit code, tests, tokens or the skill.

## Validation

- [x] Every finding 1-7 is marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Completed (2026-10-18). Findings 1-7 fixed; one new finding inside the standing instruction
and Goal state line 7 (25); one proposed tracker row (26).

**Gates** (one after another at `6ebb96a`, tree: only FE_02's `.visionboard/` changes, before the by-hand
run): `npm run check` 0 (348 files, 0 errors, 0 warnings; tsc 0); `npm test` 0 (1478 pass, 0 fail;
`test:timing` 7 pass); `npm run verify` 0 ("verify: ok (0 warning(s))"); `node scripts/gen-api.mjs --check`
0 ("generated files are current"); `npm run build` 0; `npm run test:pages` 0 (532 passed, 11.2 min). The
built page: 153,457 B gzip (149.86 of 150 KB, 143 B left; `scripts/verify.mjs` `pageWeight`). Logs:
`$TMPDIR/vb-v2/logs/`.

**Harness**: VERIFY_01's scripts copied to `$TMPDIR/vb-v2/scripts/` (`seed.sh`; `draw.mjs` with a second
write, so v20 is a past version; `driver.mjs`; steps `v*.js` on `lib.js`). One board on port 4497, `HOME` and
`VB_PROJECT` in `$TMPDIR/vb-v2/`, `VB_KIRO_AGENT=0`, the repo's Playwright chromium; 1600×1000 and 1470×956,
light and dark. About 75 screenshots in `$TMPDIR/vb-v2/shots/`, each looked at (some through contact
sheets `sheet-*.png`). Server, driver and browser stopped; no app process left; this repo's
`.visionboard/` and port 4466 untouched.

**Findings 1-7** (TASK-STATUS.md § VERIFY_02 has the evidence line for each): all **fixed**. 1: card 3's
folder away, panned away (0 frames) and back: "App gone not found" + Check again, no page reload, no
`frame-ancestors` block; Check again → "Notice still not found."; folder back + Check again, or select →
panel back. 2: `tools.mjs` changed, 6 s with no list_apps read, select → one read, "Code changed. Allow it
again?", no tool call. 3: now and v20 the same boxes (manifest 360×220, 300×140). 4: "app.json: size.w must
be at most 960", "app.json: unknown field colour". 5: "(no images from the internet)". 6: card 1 456×676
on screen through Allow, code changed, Allow again, Stop app; card 4 under it fixed at y 917. 7: "answered
more than 256 KB", "over the 1 MB limit", "over the 4 KB limit".

**Goal lines 3-4**: page run tests 11-12 (line 3) and 26-28 (4a, 4b, 4j) passed; `npm test` 4c-4i ok. By
hand at all four sizes/themes: Allow → `12*3=` → "Answer: 36" → History "Use 36 from 12×3"; `POST
/api/apps/calculator/calls` `evaluate {"expression":"12×3"}` → 200 `value: 36`, `history` → 200.

**New finding inside the rulings' instruction** (great UX; Goal state line 7, claims match the code):
25. An app card with no size of its own (`app` without `w`/`h`) changes size whenever list_apps can't give
    the manifest's size. Card 2 (Converter, manifest 360×220): manifest broken → panel 360×320, card 421 →
    537 px on screen at 1600, back on the fix (`v25-*`); card 3 (manifest 300×140): folder gone → 387×328 →
    456×537, width too (`v24-*`); a page load with list_apps held: cards 2 and 3 at 360×320 while loading,
    then shrink (`v25-load-*`). components.md § App card 2 ("one height for every state"), the
    `node-app.ts` and `node-app.css` headers say no state change moves the card. Tracker row 24 named only the
    folder gone; FIX_02 now shows "not found" live, so the jump is seen in use. The page tests miss it (their
    cards carry `w`/`h`, or the fixture has no manifest size); the skill draws `app: { id, w, h }`, so agent
    cards rarely meet it. Fix, cheapest first: (a) narrow the three claims to cards that give their size and
    name the exception (no page code; needed anyway for loading); (b) list_apps sends an invalid manifest's
    `size` when `size` itself is valid (`server/apps/state.ts`, no page code); (c) `app-state.ts` keeps the
    last size list_apps gave while an app is missing (page code, a few dozen bytes of the 143 left).

**ux-copy** over FIX_02's words: "Allowed to run", "Nothing to allow", "<name> found", "<name> still not
found." all kept: plain, short, the one term "allow", and the toasts match "<name> updated" / "<name> still
has problems.". **design-critique** of the quiet row (`sheet-row.png`, light and dark): the ask box draws the
eye (accent fill, primary Allow); the quiet row reads as a status line, not a field (no border, `--vb-ink`,
regular weight), Stop app a quiet secondary button on the panel's right edge; the same in dark. Seen, not
findings: the words start at the panel's edge in the quiet row and inset by the box's padding in the ask,
so they shift about 22 px sideways on Allow (height unchanged); "Nothing to allow" is filler on a
panel-only card (it keeps the row's room; FIX_02 deviation 1).

**Tracker row 26** (outside the rulings): the body-limit problem says "Split the items across several
calls." for every operation, a join too (`apps/board/server/body.ts`).

**Deviations**: VERIFY_01's big board not drawn (outside findings 1-7). The first card-3 pan had the pointer
over a panel (tracker row 21), so the frame stayed; re-run with the pointer over the background.

**Long File Strategy**: every change here and in TASK-STATUS.md an exact-string edit under 50 lines; scratch
scripts under 50 lines each. No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_02: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_02_findings.md]]`
