# FIX_08_file-name-rule: Say the whole file-name rule

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix VERIFY_03 finding 36 (TASK-STATUS.md § VERIFY_03): for `panel` set to `.panel.html` or
`my panel.html`, the problem reads "panel must be a file name ending in .html, directly in the app's
folder", which the value already seems to meet, so nobody can tell what to change (ruling 10; the
plain-words instruction). Server words and `openapi.json` only; no page code.

## Inputs

- **Finding 36**: name the rest of the rule for both file-name patterns (`panel`, `tools`), the way the
  id's words already do: allowed characters and no leading dot, e.g. "panel must be a file name ending in
  .html, directly in the app's folder: letters, digits, . - _, not starting with a dot". Settle the exact
  words with `design:ux-copy` (fewest words that still say what to change). Read the real pattern in
  `packages/format/schema/app/manifest.schema.json` `$defs/panelFile`/`toolsFile` so the words are true.
  Files: `apps/board/server/schema.ts` `PATTERNS`; tests that quote it (`app-folder.test.ts` "4h: …",
  `api-apps.test.ts` `PANEL_NAME`); the `list_apps` example's `release-notes` problem in
  `packages/format/schema/openapi.json`, then `npm run gen`.
- **Free alignments, same change** (tracker rows 38 and 40; mark them "fixed in FIX_08" in § Proposed
  tracker rows if done): the `panelFile`/`toolsFile` descriptions in `manifest.schema.json` say the rule the
  same way; the OpenAPI `appForbidden` example uses the server's words, held by FIX_06's
  `app-samples.test.ts`. No `info.version` change unless a drift test asks for one (examples and
  descriptions only); if the manifest schema's description change needs a regenerate, run it.

## Steps

1. [x] Tests first, each seen failing.
2. [x] The fix and the alignments; `npm run gen`.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings),
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] Finding 36 no longer reproduces (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed** (server words, schema descriptions, `openapi.json` and tests; no board-page code).
- **Finding 36**: `apps/board/server/schema.ts` `PATTERNS` now says the whole rule of the manifest's `panelFile` and
  `toolsFile` patterns (`^(?!.*\.\.)[A-Za-z0-9_][A-Za-z0-9._-]{0,94}\.html$`, `.mjs` the same): "panel must be a file
  name ending in .html, directly in the app's folder: letters, digits, dots, hyphens and _, up to 100, not starting
  with a dot or hyphen, no two dots in a row"; tools: ".mjs", "up to 99" (95 before the 4-letter ending). So
  `.panel.html`, `-panel.html`, `my panel.html`, `panel..html` and a 101-character name each break a part the words name.
- **Row 38**: `manifest.schema.json` `$defs/panelFile`, `toolsFile` descriptions say the same: "A file name ending in
  `.html`, directly in the app's folder: letters, digits, dots, hyphens and `_`, up to 100, not starting with a dot or
  hyphen, no two dots in a row." (tools: `.mjs`, 99). No generated file reads them (`npm run gen` changed none for it).
- **Row 40**: the OpenAPI `appForbidden` example is the server's words (`server/apps/host.ts` `call`): "The person has
  not allowed the app "calculator" yet. Press Allow on its card first."
- `openapi.json` `list_apps` example `release-notes` carries the new words; `npm run gen` changed only
  `docs/specification/api-reference.md`. No `info.version` change (1.27.0); no drift test asked for one.
- The expected words are in one place for the tests: `apps/board/tests/app-support.ts` `FILE_NAME_WORDS` (was a copy
  in `api-apps.test.ts` `PANEL_NAME` and one built inline in `app-folder.test.ts`).

**Proof by name** (each seen failing first, `$TMPDIR/fix08/red.log`: 6 failures, each on the old words):
- `app-folder.test.ts` "4h: manifest file names with a folder, `..`, a hidden name or an absolute path are refused"
  (exact words, both fields) and the new "finding 36: the file-name words say the whole rule: a name at each edge
  passes, and one that breaks any part gets them" (names of 100 and 99 characters, `_v2.final-copy.html`, `9.mjs`
  pass; one more character, a leading dot or hyphen, a space, two dots, a subfolder, another ending each get the words).
- `api-apps.test.ts` "list_apps: every folder and every app a card names, …" and "finding 33: …" (`PANEL_NAME`).
- `app-folder.test.ts` "tracker row 38: the manifest schema says the file-name rule in the words the board sends".
- `app-samples.test.ts` "the needs-approval example is the call's answer for the calculator before the person allowed
  it (tracker row 40)"; "the list_apps example's invalid app is the answer for its app.json …" holds `release-notes`.

**ux-copy** (`design:ux-copy` over the two lines): kept the order of the id's words (characters, length, start) and
ended on a word, so the full stop `appInvalid` adds never reads "a dot..". Weighed and not used: the task's ". - _, not
starting with a dot" (symbols run into the commas, and `-panel.html`, `panel..html` or a 101-character name would still
meet the words); "single dots" (shorter, but reads as one dot only, wrong for `panel.v2.html`); "starting with a
letter, digit or _" (same length; "not starting with a dot or hyphen" names the likely slip, as the id's words do).
`_` stays a symbol as in the tool-name and `.env` words; dots and hyphens are words so the list doesn't read as
punctuation.

**Deviation** (inside the rulings): the words are longer than the task's example: they also name a leading hyphen, two
dots and the length, because each of those is refused too and would otherwise get words its value meets (finding 36's
own fault). The new tests live in `app-folder.test.ts` and `app-samples.test.ts`, as the task's files.

**Screenshots**: none changed. **Page weight**: 153,470 B gzip after the build, as before (149.87 of 150 KB, 130 B left).

**For VERIFY_04, seen, not fixed**:
- "letters" means a to z and A to Z: `pänel.html` is refused with words it seems to meet. The id's and tool name's words
  say "letters" the same way; no agent slip like it seen.
- The other `call_app_tool` problem examples (`appNotFound`, `appFailed`, `appBusy`, `appTimeout`) equal the server's
  words today by reading (`host.ts` `call`, `supervisor.ts` `endedProblem`, the queue and timeout lines), but no test
  holds them; row 40 asked for every one, this task held `appForbidden` (and `appInvalid`, `list_apps` as before).
- `docs/specification/apps.md` § The folder says "plain names inside the folder (no `/`, no `..`, not hidden)":
  true, and shorter than the rule; not a claim this change made untrue.

**Gates** (one after another after the last change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0 warnings;
tsc 0); `npm test` 0 (1492 pass, 0 fail: 1489 + 3 new; `test:timing` 7 pass); `npm run verify` 0 ("verify: ok (0
warning(s))"); `node scripts/gen-api.mjs --check` 0 ("generated files are current"); `npm run build` 0; `npm run
test:pages` 0 (534 passed, 11.3 min). Logs in `$TMPDIR/fix08/` (`gates.txt`). No process of mine left running; this
repo's `.visionboard/` and port 4466 untouched. Every write was short or an exact-string edit (Long File Strategy).

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_08: say the whole file-name rule → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_08_file-name-rule.md]]`
