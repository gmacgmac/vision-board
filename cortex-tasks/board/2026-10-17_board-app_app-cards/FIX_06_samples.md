# FIX_06_samples: The gallery and the API examples show the server's real words

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two leftovers in FIX_05's notes ("Seen, not fixed"): samples that show words the server never
sends (rule 11, mock the data, not the screens; rule 6, one contract) and code marks in what agents read
(the maintainer's plain-words instruction).

## Inputs

- **Finding 31, the gallery's invalid sample**: `apps/board/src/gallery/app-frame-section.ts` `STATES`
  "Invalid" shows "tools.mjs: imports ./parser.mjs: a tools module imports only node: built-ins", which the
  server never sends. Show lines the server does send today (from FIX_01/FIX_05's words: e.g. the import
  refusal and a schema line). Better still, take them from one source the tests also read, if one exists;
  do not add a second copy of the server's words to the page bundle (page weight 149.87 of 150 KB). View
  the gallery screenshot diffs light and dark before updating them.
- **Finding 32, the OpenAPI examples**: `packages/format/schema/openapi.json` `app-invalid` example
  ("app.json /panel: \`panel\` is not a plain file name ending in .html", a pointer and code marks) and the
  `list_apps` example (code marks) still show the words from before FIX_01. Replace them with words the
  server sends now (no pointer, no backticks), run `npm run gen` so `docs/specification/api-reference.md`
  and the generated MCP/CLI files follow. An example only: no `info.version` change (as FIX_01's example
  edit). Add a check if cheap: a test that every app problem example in openapi.json has no backtick.
- **Skills**: `design:ux-copy` over the sample lines.

## Steps

1. [x] Tests first where a test can hold it, seen failing.
2. [x] The two fixes; `npm run gen`.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] Both fixed (name the tests or files); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed** (no server or board-page code).
- **Finding 31, the gallery**: the invalid sample is now two real list_apps answers from one new data file,
  `apps/board/src/gallery/gallery.apps.json` (like `gallery.chat.json`). `files`: the calculator with a broken
  app.json ("app.json: size.w must be at most 960", "app.json: unknown field colour"; no title, version or size,
  as the server sends it then). `tools`: the calculator allowed, its tools.mjs importing ./parser.mjs (FIX_05's
  import line). `app-frame-section.ts` `INVALID` reads it (`?raw`); `STATES` "Invalid, in app.json", "Invalid, in
  tools.mjs". The made-up "imports ./parser.mjs: a tools module imports only node: built-ins" is gone.
- **Finding 32, the OpenAPI**: the `list_apps` example's `release-notes` has no pointer and no code marks, plus the
  `size` and `hash` the server sends for that app.json; the `appInvalid` example is the call's words for the
  calculator whose tools.mjs imports a file. `npm run gen`: only `docs/specification/api-reference.md` changed (the
  MCP and CLI files hold no example). `info.version` unchanged (1.27.0).
- **One source**: the server's words have none the tests read (the runner's are inline: its process may read only
  its own file; the tests keep their own copies, e.g. `api-apps.test.ts` `IMPORT_ONLY`), and the gallery may not
  import server code. So the samples have one copy, `gallery.apps.json`, and a test gets the same answers from the
  real server, as `chat-fixture.test.ts` does for `gallery.chat.json`. The OpenAPI examples are held the same way.

**Proof by name** (each seen failing first):
- `apps/board/tests/app-samples.test.ts` (new): "the gallery's invalid app cards are list_apps' answers for a broken
  app.json and for a tools.mjs that imports a file (finding 31); the app-invalid example is the call's (finding 32)"
  (failed on the old sample: title, size, tools, the made-up words) and "the list_apps example's invalid app is the
  answer for its app.json: the field as a person writes it, no pointer (finding 32)" (failed: pointer, backticks).
- `apps/board/tests/openapi.test.ts` "the app examples are in plain words, as the server sends them: no code mark
  and no pointer in a problem (finding 32)": the cheap check the task asked for, over every app problem example
  (failed: `/panel`, a backtick).
- `tests/pages/app-gallery.spec.ts` "app frame: …": two `invalid` cards and their lines (failed: one card).

**Deviations** (inside the rulings):
1. Two invalid cards, not one with both lines: a schema problem and a tools load problem never come in one answer
   (`server/apps/state.ts` `appState` returns file problems before anything runs), so one card with both is not
   data the server sends (rule 11).
2. The `appInvalid` example is the import case, not the old app.json panel case: that case's real words read
   "…ending in .html Fix them and try again." (no period, see below), and an import refusal is what a call meets.

**ux-copy** (`design:ux-copy` over the labels and the sample lines): the labels "Invalid, in app.json" and "Invalid,
in tools.mjs" (the state's word first, then where, like "Ready, allowed, …"). The problem lines are the server's
words, so kept here; its two flags are below.

**Screenshots**: `gallery.spec.ts` `gallery-{light,dark}` re-baselined after viewing the diff light and dark: only
the app-frame section's state cards changed (y 768 to 1961 of 20,804 px; same page height, nothing under it moved).

**Page weight**: board page 153,470 B gzip before and after (149.87 of 150 KB, 130 B left; the same asset files).
verify measures `dist/index.html`'s assets; the sample words are in the gallery's own chunk only.

**Seen, not fixed** (for VERIFY_03):
- `server/apps/supervisor.ts` `appInvalid` joins problems with a space only, so a detail with no closing period
  runs into the next: "…: app.json: size.w must be at most 960 app.json: unknown field colour Fix them and try
  again."
- The `list_apps` example's `calculator` is `needs-approval` with tools `evaluate`, `history`; the server names tools
  only after Allow and a first run (decision 2), so it sends `[]` there.
- In a 300×220 panel the import line makes the problems box scroll, and its last visible line shows half cut at
  the box's edge (light and dark). The box scrolls by keyboard too; the pattern as FIX_01 left it.
- ux-copy, minor: "panel is not a plain file name in the app's folder ending in .html" can read as the folder
  ending in .html.

**Gates** (one after another after the last change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings; tsc 0); `npm test` 0 (1487 pass, 0 fail: 1484 + 3 new; `test:timing` 7 pass); `npm run verify` 0 ("verify:
ok (0 warning(s))"); `node scripts/gen-api.mjs --check` 0 ("generated files are current"); `npm run build` 0;
`npm run test:pages` 0 (534 passed, 11.3 min). Logs in this session's scratch folder. No process of mine left
running; this repo's `.visionboard/` and port 4466 untouched.

**Long File Strategy**: `app-samples.test.ts` was created in one write of 57 lines (over the 50-line rule); it went
through with no connection error. Every other change was a short write or an exact-string edit.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_06: gallery and API examples show the server's real words → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_06_samples.md]]`
