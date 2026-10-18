# VERIFY_03_size: Re-check findings 25, 27-35, Goal lines 2-4, 7 and 10

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A copy of VERIFY_02 limited to findings 25 and 27-35 and PLAN.md § Goal state lines 2-4, 7 and 10: check by hand that
FIX_03 to FIX_07 fixed them, that findings 1-7 still hold, and that the end to end and the safety still hold.

## Context

Read VERIFY_02's notes (finding 25's steps and screenshots) and the FIX_03 to FIX_07 notes. Same harness as VERIFY_02
(`$TMPDIR/vb-v2/scripts/` if still there): a scratch board on a spare port with `HOME` and `VB_PROJECT` in
the system temp folder, `VB_KIRO_AGENT=0`, the repo's Playwright chromium, 1600×1000 and 1470×956, light and
dark. Look at every screenshot you take.

## Steps

1. [x] **Finding 25**: repeat VERIFY_02's steps (manifest broken, folder gone, page load) on a card with no
   `w`/`h`; it passes when the card keeps its box, or when what still moves is exactly what the narrowed
   claims say. Read the three claims against the code.
2. [x] **Findings 27-35** (FIX_04 to FIX_07): Check again on an invalid app whose folder then goes; a
   half-written app.json; a file over its limit (named once); an app.json with a byte-order mark; the gallery's
   invalid sample against what the server sends; the OpenAPI app examples; a call to an invalid app
   with two problems (they end cleanly); the panel/tools file-name line. Run `design:ux-copy` over the words.
3. [x] **Findings 1-7**: a quick pass that each still holds (one screenshot each).
4. [x] **Goal lines 3-4**: the named tests pass in your page run; by hand, Allow → `12*3=` → 36 → History.
5. [x] **Gates** (Goal line 2): run the six yourself, one after another, and paste the counts.
6. [x] **Goal check**: update lines 2, 3, 4, 7 and 10. A finding still open, or a new one inside the
   rulings, gets the next number for another FIX; one outside goes into § Proposed tracker rows. Do not
   edit code, tests, tokens or the skill.

## Validation

- [x] Findings 25 and 27-35 marked fixed with evidence, or still open with a reason.

## Constraints

- No git commits. Stop every process you start. Never port 4466; this repo's `.visionboard/` read only.

## Implementation Notes

**Status**: Completed (2026-10-18). Findings 25 and 27-35 fixed; findings 1-7 still hold; one new finding inside
the rulings (36, the file-name words FIX_07 saw); four proposed tracker rows (37-40).

**Gates** (one after another at `b26dd43`, tree: only FE_02's `.visionboard/` changes, before the by-hand run):
`npm run check` 0 (348 files, 0 errors, 0 warnings; tsc 0); `npm test` 0 (1489 pass, 0 fail; `test:timing` 7 pass);
`npm run verify` 0 ("verify: ok (0 warning(s))"); `node scripts/gen-api.mjs --check` 0 ("gen-api: generated files are
current"); `npm run build` 0; `npm run test:pages` 0 (534 passed, 11.3 min). Built page 153,470 B gzip (149.87 of 150
KB, 130 B left; `scripts/verify.mjs` `pageWeight`). Logs: `$TMPDIR/vb-v3/logs/`.

**Harness**: VERIFY_02's scripts copied to `$TMPDIR/vb-v3/scripts/` (paths moved; a panel-only app `lab`, manifest
320×180, drawn as card 14 with no `w`/`h`, a note under it as card 15; steps `v25b`, `v25c`, `labcase`, `call`, `v31`,
`v31b` added). Board on port 4491 (driver 4492), `HOME`/`VB_PROJECT` in `$TMPDIR/vb-v3/`, `VB_KIRO_AGENT=0`, the
repo's Playwright chromium; 1600×1000 and 1470×956, light and dark. 80 screenshots in `$TMPDIR/vb-v3/shots/`, each
looked at (through contact sheets `sheet-*.png`). Server, driver and browser stopped; no app process left; this
repo's `.visionboard/` and port 4466 untouched.

**Findings 25, 27-35: all fixed.**
- **25**: card 2 (Converter, no `w`/`h`, manifest 360×220) keeps one box through an unknown field (select), a
  half-written app.json (Check again), the fix, the folder gone (select) and back (Check again): 415×383 on screen at
  1600, 394×364 at 1470, light and dark; card 4 under the row never moves (`v25b-*`). Lab card 14 (manifest 320×180)
  373×341 and card 15 under it at y 977 through every Lab case below (354×324, y 932 at 1470). What still moves is what
  the narrowed claims say: on load with list_apps held, cards 2, 3 and 14 at the default, then the manifest's size
  (`v25-load-*`); gone before the page opened, card 2 at 360×320 (415×488), then 360×220 once back and Check again
  (`v25c-*`). Read against the code: components.md § App card 2 and § 8 State, the `node-app.ts` and `node-app.css`
  headers, `node-template.ts` `appSlot`, `pattern.json` `vb-app-ask`, apps.md § Panel size and § Kept true by, against
  `app-state.ts` `readOnce`, `manifest.ts` `AppFolder.size` (`SIZE_AT`), `state.ts` `appState`: all true.
- **27**: Lab with an unknown field, folder moved away, Check again → toast "Lab not found", card "App lab not found".
- **28**: "app.json: not valid JSON near line 1" (Lab), "near line 4" (Converter); no parser sentence.
- **29**: "panel.html: over the 1 MB limit. Make it smaller." (the file named once).
- **30**: app.json with a byte-order mark → ready, "Nothing to allow", panel shown, size 320×180; its hash differs from
  the unmarked file's (`dd29…` against `c59c…`: over the bytes, ruling 7).
- **31**: the gallery's two invalid cards (`v31-*`, light and dark) say word for word what the scratch server said for the
  same files: card 1's app.json with `w` 5000 and `colour` ("app.json: size.w must be at most 960", "app.json: unknown
  field colour"), and its tools.mjs importing ./parser.mjs once allowed and `=` pressed (the import line, `v31b-*`).
- **32**, **34**: list_apps for the shipped calculator before Allow and for a `release-notes` app.json with `panel`
  `pages/notes.html` equals the OpenAPI example (`tools: []`; release-notes word for word, hash included; the
  calculator's hash is the example's own); no code mark or pointer in an app example.
- **33**: a call to Lab with two problems: '… has problems in its files: app.json: panel must be a file name ending in
  .html, directly in the app's folder. app.json: unknown field colour. Fix them and try again.'
- **35**: `pages/notes.html` and `panel.htm` read "app.json: panel must be a file name ending in .html, directly in the
  app's folder": one reading.

**Findings 1-7 still hold** (1600 light, a shot each; 2, 6 and the end to end at 1470 dark too). 1: card 3's folder
away, panned away (0 frames) and back: "App gone not found" + Check again, "Notice still not found.", back + Check again
or select → panel (`v24-*`). 2: `tools.mjs` changed, 6 s with no read, select → "Code changed. Allow it again?", no
call. 3: now and v23 the same boxes (360×440, 360×220, 300×140, 360×440), no frame (`v03-*`). 4: "app.json: size.w
must be at most 960" (`v07-*`). 5: "(no images from the internet)" (`v08-*`). 6: card 1 415×614 (394×584 at 1470) and
card 4 still through Allow, code changed, Allow again, Stop app (`v06-*`). 7: the 30 MB answer → 413 "… answered more
than 256 KB. Answer less.", the panel "The tool's answer is too big." (`v21-*`).

**Goal lines 3-4**: page run tests 11-12 (line 3) and 28-30 (4a, 4b, 4j) passed; `npm test` ok for 4c, 4d, 4e, 4f, 4g, 4h
(both), 4i. By hand at 1600 light and 1470 dark: Allow (confirm, "Calculator allowed") → `12*3=` → "Answer: 36" →
History "Use 36 from 12×3"; `evaluate {"expression":"12×3"}` → 200 `value: 36`, `history` → 200.

**FIX_07's four slips, weighed** (the bar: would a person or an agent be misled, confused or slowed?):
1. "has problems … Fix them" for one problem (`supervisor.ts` `appInvalid`): **tracker row 37**. Only the call's
   `detail` says it; no person sees it (the panel shows `PROBLEM_WORDS`, the card lists every problem) and agents
   don't call tools. Plural for one misleads nobody.
2. `manifest.schema.json` `panelFile`/`toolsFile` descriptions: **tracker row 38**. "…ending in `.html`: no folder, no
   `..`, not hidden": the clause after the colon rules out the folder reading. Align it when 36 is fixed (free then).
3. list_apps' operation description without "once allowed and run": **tracker row 39**. The MCP tool's output schema
   carries the `tools` field's description ("once the person allowed this version and its tools first ran …; empty
   until then") and SKILL.md § Apps says "`tools` is `[]` until a tool runs", so an agent is not misled.
4. A hidden name's words: **finding 36** (below). Seen: `.panel.html` and `my panel.html` get the same line as a
   subfolder.

**New finding inside the rulings** (ruling 10: the problems, for the agent to fix; the plain-words instruction):
36. The panel and tools file-name problem names only part of the rule. For `panel` `.panel.html` or `my panel.html`
    the card and list_apps say "app.json: panel must be a file name ending in .html, directly in the app's folder"
    (`lab-g-*`, `lab-h-*`, light and dark): the value is a file name ending in .html, directly in the folder, so the
    words say it is fine; neither the person (who doesn't see the value) nor the agent can tell what to change. Before
    FIX_07, "plain file name" hinted at it. Fix: say the rest of the rule as the id's words do ("lowercase letters,
    digits and hyphens, …, not starting with a hyphen"), e.g. "…, directly in the app's folder: letters, digits, ., -
    and _, not starting with a dot" (both patterns; ux-copy to settle). Files: `apps/board/server/schema.ts`
    `PATTERNS`; tests that quote it (`app-folder.test.ts` "4h: …", `api-apps.test.ts` `PANEL_NAME`, "list_apps: every
    folder …"); `packages/format/schema/openapi.json` `list_apps` example (`release-notes`) and `npm run gen`
    (api-reference.md); optionally the schema descriptions (row 38). Page code: no.

**New outside the rulings**: tracker row 40, the OpenAPI `appForbidden` example's words differ from the server's.

**ux-copy** (`design:ux-copy` over the words): kept "not valid JSON near line N", "over the 1 MB limit. Make it
smaller.", "<name> not found", the call's one-sentence-per-problem; the file-name line is clear for a subfolder or
`.htm`, not for a leading dot or a space (36); plural for one problem reads off but is seen by no one (37).

**Long File Strategy**: every change here and in TASK-STATUS.md an exact-string edit under 50 lines; scratch scripts
under 50 lines each. No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] VERIFY_03: <what you found> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/VERIFY_03_size.md]]`
