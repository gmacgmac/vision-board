# FIX_07_last-words: Problems end cleanly; examples match the server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix three of the four slips in FIX_06's notes ("Seen, not fixed"), under the plain-words instruction and
rule 6 (examples match the contract). Server and `openapi.json` only; no page code.

## Inputs

- **Finding 33, problems run together**: `apps/board/server/apps/supervisor.ts` `appInvalid` joins the
  problems with a space, so a line with no full stop runs into the next ("…at most 960 app.json: unknown
  field colour Fix them and try again."). End every joined problem cleanly (add a full stop where a line
  has none, or join with "; " and end with "."), one place. Test the exact words in `api-apps.test.ts`.
- **Finding 34, an example that names tools too early**: the `list_apps` example's `calculator` is
  `needs-approval` but lists `evaluate`, `history`; the server sends `tools: []` until Allow and a first
  run (decision 2). Make the example `[]` there (or show tools on an allowed app that has run). Extend
  FIX_06's `app-samples.test.ts` or `openapi.test.ts` so an example can't name tools on an app that isn't
  allowed. `npm run gen`; no `info.version` change.
- **Finding 35, "ending in .html" reads as the folder**: "panel is not a plain file name in the app's
  folder ending in .html" → e.g. "panel must be a file name ending in .html, in the app's folder" (same for
  tools and `.mjs`). Server wording only (`manifest.ts` / `fieldWords` or the schema's own message,
  whichever words it today). Update tests, FIX_06's `gallery.apps.json` and the OpenAPI examples if they
  quote it (its test will tell you).
- **Not this task**: the half-cut last line in a scrolling problems box stays (decision 11).
- **Skills**: `design:ux-copy` on the changed lines.

## Steps

1. [x] Tests first, each seen failing.
2. [x] The three fixes; `npm run gen`. View any screenshot diff light and dark before updating.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings),
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] The three no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed** (server and `openapi.json` only; no board-page code).
- **Finding 33**: `apps/board/server/apps/supervisor.ts` `appInvalid` (the one place; `host.ts` and the supervisor
  both throw through it) writes each problem with `sentence`: "<file>: <detail>", plus a full stop when the detail
  ends without `.`, `!` or `?`. Now: 'The app "invalid-manifest" has problems in its files: app.json: panel must be
  a file name ending in .html, directly in the app's folder. app.json: unknown field colour. Fix them and try again.'
  The dead `pointer` branch went with it (no app problem has one since FIX_01).
- **Finding 34**: `openapi.json` `list_apps` example: the `needs-approval` calculator has `tools: []`, as the server
  sends until Allow and a first run (decision 2).
- **Finding 35**: the words are `apps/board/server/schema.ts` `PATTERNS` for the manifest's `panelFile` and `toolsFile`
  patterns (the field named by `manifest.ts` `fieldWords`, unchanged): "panel must be a file name ending in .html,
  directly in the app's folder", the same for tools and .mjs. The `list_apps` example's `release-notes` quotes it.
- `npm run gen`: only `docs/specification/api-reference.md` changed. No `info.version` change (1.27.0).

**Proof by name** (each seen failing first):
- `api-apps.test.ts` "finding 33: a call to an app with problems gives each as its own sentence, so one with no full
  stop never runs into the next" (failed: "…ending in .html app.json: unknown field colour Fix them…"). The existing
  "finding 29: …" exact line ("…{ tools: [...] }. Fix them…") shows a detail with its own stop gets no second one.
- `app-samples.test.ts` "the list_apps example's calculator is the answer for the calculator as the skill ships it,
  and no example names tools on an app the person has not allowed (finding 34)" (failed: tools named, not allowed).
  It runs first in the file, before the gallery test allows the calculator.
- Finding 35: `app-folder.test.ts` "4h: …" (now the exact words, both fields), `api-apps.test.ts` "list_apps: every
  folder …" (both failed on the old words); `app-samples.test.ts` "the list_apps example's invalid app …" then held
  the example to the new words.

**Deviation** (inside the rulings): "directly in the app's folder", one word more than the task's example. ux-copy:
the likeliest slip is a subfolder (the example's own `pages/notes.html`), which "in the app's folder" doesn't rule out.

**ux-copy** (`design:ux-copy` over the changed lines): the field rule reads one way for `../x.html`, `sub/x.html`
and `x.htm`; the joined call problem reads as one sentence per line. Kept as written.

**Screenshots**: none changed (no page test or gallery sample shows these words). **Page weight**: 153,470 B gzip
after the build, as before (149.87 of 150 KB, 130 B left).

**Seen, not fixed** (for VERIFY_03):
- With one problem the call still says "has problems in its files: … Fix them and try again." (plural for one).
- `manifest.schema.json` `panelFile`/`toolsFile` descriptions keep "A plain file name in the app's folder ending in
  `.html`", the same two readings (contract text, not server words; its ": no folder, …" clears it up).
- `list_apps`'s operation description (the MCP tool's and `vb` command's text) says "the `tools` by name" without
  "once allowed and run"; the field's own description says it.
- A hidden name (`.panel.html`) gets the same words, which don't say the leading dot is the slip.

**Gates** (one after another after the last change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings; tsc 0); `npm test` 0 (1489 pass, 0 fail: 1487 + 2 new; `test:timing` 7 pass); `npm run verify` 0
("verify: ok (0 warning(s))"); `node scripts/gen-api.mjs --check` 0 ("generated files are current"); `npm run build`
0; `npm run test:pages` 0 (534 passed, 11.3 min). Logs in `$TMPDIR/fix07/`. No process of mine left running; this
repo's `.visionboard/` and port 4466 untouched. Every write was short or an exact-string edit (Long File Strategy).

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_07: problems end cleanly; examples match the server → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_07_last-words.md]]`
