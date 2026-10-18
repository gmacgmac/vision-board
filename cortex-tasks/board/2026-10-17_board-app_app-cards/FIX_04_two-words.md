# FIX_04_two-words: Two wording slips FIX_03 saw

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two slips in FIX_03's notes ("Seen, not fixed"), so every word on an app card says what happened
in plain words (the maintainer's standing instruction; ruling 10).

## Inputs

- **Finding 27, the wrong toast**: Check again on an invalid app whose folder has since gone toasts
  "<name> updated" while the card says "not found". `apps/board/src/board/app-words.ts` `retryDone` must
  pick its words from the new state: gone → "<name> not found." (or the existing missing words), changed →
  "<name> updated", same → the existing "still …" words. Unit test in `apps/board/tests/app-words.test.ts`.
  Page code: a few bytes; the page has 131 B gzip left; never raise the budget.
- **Finding 28, a parser's words on the card**: a half-written app.json lists "app.json: app.json is not
  valid JSON: Expected ',' or '}' after property value in JSON at position 38". The file is named twice
  (`problemLine` adds it, `apps/board/server/apps/manifest.ts` `manifestOf` says it again) and the rest is
  the parser's message. Word it on the server: "app.json: not valid JSON (check commas and brackets near
  line N)" or shorter; keep a line number if it is cheap and true, drop the parser's sentence. Same for any
  other file this path reads as JSON. Test in `apps/board/tests/app-folder.test.ts`. No page code.
- Docs that quote these words follow (apps.md, the skill's scenarios if they quote it).
- **Skills**: `design:ux-copy` on both new wordings.

## Steps

1. [x] Tests first, each seen failing.
2. [x] The two fixes.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] Both slips no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed.**
- **Finding 27, page**: `apps/board/src/board/app-words.ts` `retryDone`: a change of state into `missing` says "<name> not
  found", as the card does; from `missing` still "<name> found", any other change "<name> updated", no change the "still
  …" words. One more branch in the existing helper. **+1 B gzip** (153,469 → 153,470; 149.87 of 150 KB, 130 B left).
- **Finding 28, server**: `apps/board/server/apps/manifest.ts` `manifestOf`: JSON that doesn't parse is "not valid JSON
  near line N", or "not valid JSON" when the parser gives no line (an empty file). The page's `problemLine` adds
  "app.json: ", so the file is named once; the parser's sentence is dropped. The line comes only from the end of the
  parser's message (`PARSED_AT`, anchored at `$`), because some of its messages quote the file before that (a
  byte-order mark gives `Unexpected token '…', "<the file>" is not valid JSON`); a line inside the file's own text is
  never read. Beside `fieldWords` (FIX_01's seam, the server words every app problem); no page code.
- **Any other file this path reads as JSON**: none. In `server/apps/` only `manifest.ts` parses a file of the app's
  (`runner.mjs` parses the board's own env-name list, not an agent's file).
- **Docs**: none quote either wording (apps.md, components.md, SKILL.md, scenarios.md, the OpenAPI and schemas
  searched). components.md § App card 8 ("say what they found (`retryDone`)") stays true. No doc edited.

**Proof by name** (each seen failing first):
- 27: `apps/board/tests/app-words.test.ts` "Check again on an app whose folder went since it had problems says not found,
  as its card does (finding 27)" (failed: 'Notice updated'); page `tests/pages/app-follow.spec.ts` "a half-written
  app.json says so near its line, and Check again once its folder went says not found (findings 27, 28)" (with the
  old `retryDone` put back for one run, the toast step failed; restored).
- 28: `apps/board/tests/app-folder.test.ts` "finding 28: an app.json that is not JSON says so once, near its line,
  without the parser's words" (half-written → line 1; a missing comma → line 3; empty → no line; a byte-order mark
  whose file text holds "(line 9 column 2)" → no line); the same page test (failed: the card listed "app.json: app.json
  is not valid JSON: Expected ',' or '}' after property value in JSON at position 25 (line 3 column 3).").

**ux-copy** (`design:ux-copy` over both): kept "<name> not found" with no period, like the other change toasts
("found", "updated", "allowed") and the card's head "App <id> not found"; "still not found." would be untrue (it was
there before). Kept "not valid JSON near line N" over "(check commas and brackets near line N)": the advice is wrong for
a missing quote or a comment and adds words; the line is the useful part, and "near", not "on", because the parser
names where it noticed (a missing comma at the end of line 2 is reported at line 3). No period, like the schema lines.

**Seen, not fixed** (outside this task; for VERIFY_03 to weigh): an app.json that starts with a byte-order mark reads
"not valid JSON" with no line, though it looks right in an editor (`JSON.parse` refuses the mark; the server could strip
it). The per-file lines still name the file twice ("panel.html: panel.html is over the 1 MB limit. Make it smaller.";
FIX_01's ux-copy saw it and kept it).

**Gates** (one after another after the last code change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings; tsc 0); `npm test` 0 (1481 pass, 0 fail: 1479 + 2 new; `test:timing` 7 pass); `npm run verify` 0 ("verify: ok
(0 warning(s))", run again after the build: the same); `node scripts/gen-api.mjs --check` 0 ("generated files are
current"); `npm run build` 0; `npm run test:pages` 0 (534 passed, 11.3 min: 533 + 1 new). Built page 153,470 B gzip
(149.87 of 150 KB, 130 B left; budget unchanged). Logs: `$TMPDIR/vb-fix04/logs/`. No process of mine left running; this
repo's `.visionboard/` and port 4466 untouched. No screenshot changed.

**Long File Strategy**: the page test was appended in one chunk under 50 lines; every other change an exact-string edit.
No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_04: two wording slips on app cards → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_04_two-words.md]]`
