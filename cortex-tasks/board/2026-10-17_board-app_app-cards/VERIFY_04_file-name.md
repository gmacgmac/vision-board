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

1. [x] **Finding 36**: set `panel` to `.panel.html`, `my panel.html`, `pages/notes.html`, `panel.htm`; and
   `tools` likewise. Each problem line says what to change, in plain words, light and dark on the card and
   in `list_apps`. Run `design:ux-copy` over the words.
2. [x] **A quick pass** on Goal line 3 by hand (Allow → `12*3=` → 36 → History).
3. [x] **Gates** (Goal line 2): the six, one after another; paste the counts.
4. [x] **Goal check**: update lines 2, 3 and 10. Anything new inside the rulings: the next number, for
   another FIX; outside: § Proposed tracker rows. Do not edit code, tests, tokens or the skill.

## Validation

- [x] Finding 36 marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Completed (2026-10-18). Finding 36 fixed; no finding inside the rulings open; the words' length kept (no
shorter line fixes every refused name); FIX_08's three slips are tracker rows 41-43.

**Gates** (one after another at `c009781`, tree: only FE_02's `.visionboard/` changes, before the by-hand run):
`npm run check` 0 (348 files, 0 errors, 0 warnings; tsc 0); `npm test` 0 (1492 pass, 0 fail; `test:timing` 7 pass);
`npm run verify` 0 ("verify: ok (0 warning(s))"); `node scripts/gen-api.mjs --check` 0 ("gen-api: generated files are
current"); `npm run build` 0; `npm run test:pages` 0 (534 passed, 11.3 min). Built page 153,470 B gzip (149.87 of 150
KB, 130 B left; `scripts/verify.mjs` `pageWeight` after the build). FIX_08's named tests ok in the run: `app-folder.test.ts`
"4h: …", "finding 36: …", "tracker row 38: …"; `api-apps.test.ts` "list_apps: every folder …", "finding 33: …";
`app-samples.test.ts` "the needs-approval example … (tracker row 40)". Logs: `$TMPDIR/vb-v4/logs/`.

**Harness**: VERIFY_03's scripts copied to `$TMPDIR/vb-v4/scripts/` (paths moved; steps `fname.js`, one file-name case on
the Lab: the card, list_apps as person and as agent, the problems box measured, shots at the top and scrolled to the end;
`e2e.js`). Board on port 4487 (driver 4488), `HOME`/`VB_PROJECT` in `$TMPDIR/vb-v4/`, `VB_KIRO_AGENT=0`, the repo's
Playwright chromium; 1600×1000 and 1470×956, light and dark. 52 shots and 5 contact sheets in `$TMPDIR/vb-v4/shots/`,
each looked at. Server, driver and browser stopped; no app process left; this repo's `.visionboard/` and port 4466
untouched.

**Finding 36: fixed.** Lab (card 14, panel-only, no `w`/`h`, manifest 320×180) with `panel` `.panel.html`, `my
panel.html`, `pages/notes.html`, `panel.htm`, `-panel.html`, `panel..html`, a 101-character name, and `tools`
`.tools.mjs`, `my tools.mjs`, `lib/tools.mjs`, `tools.js`, a 100-character name: each gives one problem, on the card
and in list_apps (person and agent the same): "app.json: panel must be a file name ending in .html, directly in the
app's folder: letters, digits, dots, hyphens and _, up to 100, not starting with a dot or hyphen, no two dots in a row"
(tools: .mjs, 99). Each value breaks a part the words name (leading dot, space, folder, ending, hyphen, two dots,
length), so the agent can tell what to change. A call to the Lab with both wrong: 422, both rules, one sentence each.
Cards 14 and 15 never moved (373×341, card 15 at y 977 at 1600; 354×324, y 932 at 1470). Light and dark at both
sizes (`n-*`, `sheet-*`). No console error but the board's deliberately missing image.

**The words' length, weighed** (`design:ux-copy`; the fewest-words instruction). Kept as FIX_08 wrote them:
- On the card at 320×180 the problems box shows 3 of the rule's 7 lines (12 px mono; 303 px wide at 1600, 288 at
  1470); the third line ends "letters, digits, dots," so it reads as going on, and the box scrolls (a tab stop). Two
  rules: 3 of 13. At the default 360×320 both rules read whole. No clipping outside the box, light and dark.
- The person is not slowed: what they act on is the head, "This app has problems. Ask the agent to fix them." The agent
  reads list_apps whole with its value at hand; every refused name above breaks a part the line names, so one try fixes it.
- Each clause is one refused case; dropping any reopens finding 36 for that case. The shortest whole line found, "panel
  must be a .html file directly in the app's folder: …", saves 3 of 36 words and still wraps to 6-7 lines at 320 wide:
  no change for anyone, so not a finding. "single dots", "starting with a letter, digit or _" and ". - _" fail as in
  FIX_08's notes. Materially fewer words only by naming the broken part instead of the rule: code, not words, and the
  bar doesn't ask for it.

**FIX_08's three slips** (the bar: would someone be misled, confused or slowed?):
1. "letters" means a to z: `pänel.html` gets words it seems to meet (seen, 1600 light). **Tracker row 41**: unlikely to
   be met (SKILL.md § Apps on the board names only `env` and `csp` as optional fields; the four apps agents built in scenario 29 set
   neither `panel` nor `tools`), and the same "letters" stands in the id, tool-name and .env words, so it is one choice
   across the pattern words, best changed together ("letters a to z").
2. The `appNotFound`, `appFailed`, `appBusy`, `appTimeout` examples equal the server's words by reading (`host.ts` `call`;
   `supervisor.ts` `endedProblem` "crashed", the queue line, the timeout line). **Tracker row 42**: nobody misled (only
   api-reference.md shows them; agents never call `call_app_tool`); hold each by a test (rule 6).
3. apps.md § The folder "(no `/`, no `..`, not hidden)": true (ruling 9's words), and § The manifest says "Ends in
   `.html`". **Tracker row 43**: a reader who picks `my panel.html` from it is refused once, with words that name the fix.

**Goal line 3 by hand** (1600 light, 1470 dark): Allow (confirm, toast "Calculator allowed") → `12*3=` → "Answer: 36" →
History "Use 36 from 12×3"; `evaluate {"expression":"12×3"}` → 200 `value: 36`, `history` → 200 `items [{12×3, 36}]`;
Stop app after each (`e2e-*`). Page run tests 11-12 (line 3) and 28-30 (4a, 4b, 4j) passed.

**Seen, not a finding**: a problems box scrolled to its end stays there when the next answer has the same words (the
same list; nothing new to show).

**Long File Strategy**: every edit here and in TASK-STATUS.md an exact-string edit under 50 lines; scratch steps under
50 lines. No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_04: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_04_file-name.md]]`
