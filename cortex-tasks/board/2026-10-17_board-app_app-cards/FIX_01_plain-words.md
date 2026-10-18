# FIX_01_plain-words: Plain words in app and image problems

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix VERIFY_01 findings 4, 5 and 7 (TASK-STATUS.md § VERIFY_01): every problem a person or an agent reads
says what happened in plain words, with no code marks or unit jargon.

## Context

The maintainer's standing instruction for this run: any text that explains something uses plain words,
no jargon, the fewest words that carry the message. VERIFY_01 found three places that miss it. All three
are fixed on the server and in `packages/format`, so the page gains a few bytes at most (page weight is
149.7 of 150 KB gzip; the budget must hold, never raised).

## Inputs

- **Finding 4** (ruling 10, the invalid card's problems list): `list_apps` problems read like
  "app.json /size/w: \`w\` must be at most 960". Word them on the server, where agents read them too:
  no backticks, no JSON pointer; name the field the way a person writes it
  ("app.json: size.w must be at most 960", "app.json: unknown field colour"). Change only the app
  manifest's problems (`apps/board/server/apps/manifest.ts`, or a small mapping it owns); do not change the
  wording other operations use through `server/schema.ts` unless the change is confined to app problems.
  Leave `node-app.ts` `problemLine` as it is unless it adds its own marks.
- **Finding 5** (ruling 19): an internet address in `![alt](https://…)` shows "(must be inside the images
  folder)". Add one `IMAGE_WORDS` reason for a scheme or `//` ("no images from the internet"), returned by
  `imagePathProblem` in `packages/format/src/images.ts`; keep "must be inside the images folder" for `..`, a
  leading `/` and the like. Update its row in `docs/specification/images.md` (a test reads that table) and
  the tests that assert the old reason (unit, route, page specs that assert the text).
- **Finding 7**: "256 KiB", "64 KiB", "1024 KiB" in problem details → "256 KB", "64 KB", "1 MB".
  Files: `apps/board/server/apps/tool-checks.ts` (`tooLarge`), `apps/board/server/apps/manifest.ts`,
  `apps/board/server/body.ts`, and the tests that read them (`api-apps.test.ts`, `api-errors.test.ts`,
  `app-folder.test.ts`; search for `KiB`). Docs that quote these messages (api.md, apps.md) follow.
- **Skills**: `cortex-docs` (images.md, apps.md, api.md claims stay true) · `design:ux-copy` on the new words.

## Steps

1. [x] Tests first: change each assertion to the new words, see it fail.
2. [x] Change the words; search `tests/pages/` and the gallery fixtures for the old strings and update them.
3. [x] If a gallery screenshot shows changed words, view the diff light and dark before updating it.
4. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] The three findings no longer reproduce (name the test for each); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed.**
- **Finding 4.** `apps/board/server/apps/manifest.ts` `fieldWords`, the one mapping (exported): a schema
  problem's code-marked field becomes the field as a person writes it (`size.w`, `env[0]`; the whole file
  is "it"), any other code mark goes, and no `pointer` is sent. Every manifest schema problem goes through
  it, and so does a tool that doesn't fit the tool shape (`tool-checks.ts` `checkTools`). The id mismatch and
  "or fix the panel/tools field in app.json" lost their backticks too. `server/schema.ts` is untouched (other
  operations keep their pointer errors). `node-app.ts` `problemLine` is unchanged (it adds no marks of its
  own), so the card reads "app.json: size.w must be at most 960", "app.json: unknown field colour".
- **Finding 5.** `IMAGE_WORDS.web` "no images from the internet", returned by `imagePathProblem` for
  `http:`, `https:` or `//` at the start (`WEB`); every other way out (another scheme, a leading `/` or `\`,
  `..`, a link out) keeps "must be inside the images folder". `docs/specification/images.md` § Reasons has
  the row.
- **Finding 7.** `apps/board/server/problem.ts` `sizeWords`, one helper: "64 KB", "4 KB", "512 KB"
  (`body.ts`), "256 KB" (`tool-checks.ts` `resultOf`), "1 MB" (`manifest.ts` `locate`); the two local `KIB`
  constants went. The OpenAPI `tooLarge` example says 64 KB (an example only: no version change, as
  BE_02's description edits).

**Proof by name** (each seen failing first):
- 4: `app-folder.test.ts` "finding 4: a manifest's problems name each field as a person writes it, with no
  code marks and no pointer"; `api-apps.test.ts` "finding 4: a tools module whose tools don't fit is
  invalid, its problems in plain words" (new test app `apps/board/tests/fixtures/apps/bad-tool/`) and
  "list_apps: every folder and every app a card names …" (the invalid manifest's two problems, word for
  word, no pointer); `app-folder.test.ts` "4h: manifest file names …" and "what the agent must fix: …".
- 5: `images.test.ts` "imagePathProblem: an internet address says so, not a folder rule (http:, https:,
  //)", "… the reasons are plain words, short, and say what is allowed" and "images.md lists every reason an
  image is not shown, in the words the code uses"; `markdown-images.test.ts` "a path the one check refuses
  is the "Image not shown" box …"; `markdown-render.test.ts` "everything outside the subset renders as
  escaped plain text"; page `card-image-states.spec.ts` "missing and refused › a missing file, a fake png,
  … an internet address each say why in their place; … (light|dark)" and "gallery: images in cards in every
  state … (light|dark)". `images-route.test.ts` "path tricks are refused …": its `http:%2f%2f…` row now
  asserts the new reason (it did not fail first: the harness skips an undefined reason).
- 7: `api-apps.test.ts` "4i: …" (exactly "answered more than 256 KB"); `api-errors.test.ts` "a body over
  64 KB is too-large (413), in KB not KiB (finding 7); …"; `api-identity.test.ts` "join: … over 4 KB is
  too-large …" (now asserts the detail); `app-folder.test.ts` "what the agent must fix: …" ("over the 1 MB
  limit").

**Deviations, all inside the rulings:**
1. The internet reason covers `http:`, `https:` and `//`, not every scheme as the task says: `data:`,
   `file:`, `javascript:` and `C:/` are not the internet, so they keep "must be inside the images folder"
   (an agent's inline `data:` image would otherwise read "no images from the internet").
2. Tool-shape problems (`checkTools`) use the same mapping: they show in the same problems list on the
   invalid card with the same backticks. Confined to app problems.
3. `pointer` stays optional in the list_apps problem schema and `AppProblem` (no contract change); the
   server no longer sends it for app problems. A later tidy could drop it from the schema and from
   `problemLine` (that saves page bytes).
4. The gallery's invalid sample (`apps/board/src/gallery/app-frame-section.ts`) now has the server's
   shape ("size.w must be at most 960", no pointer); `skills/vision-board/scenarios.md` § 31 quotes the
   problem as list_apps words it now (the skill itself is unchanged).
5. api.md 160-162 keep "4 KiB / 64 KiB / 512 KiB": they state limits in the spec, they don't quote the
   messages, and they are still true.

**ux-copy** (`design:ux-copy` over every new word): all kept but one: "or fix panel/tools in app.json" →
"or fix the panel/tools field in app.json" (without code marks, "panel" reads as the panel itself). Seen,
not changed: "panel.html: panel.html is over the 1 MB limit" repeats the file name, like the other
per-file lines.

**Screenshots** (8, every diff looked at light and dark; only the changed words differ):
`card-image-states.spec.ts` `card-image-refused-*` and `gallery-images-*` (the internet box's reason);
`gallery.spec.ts` `markdown-*` (card 61's box) and `gallery-*` (the app card's problems list; in the
280 px sample its first line now wraps inside the list's scroll box).

**Page weight**: 153,271 → 153,310 bytes gzip (+39; 149.72 of 150 KB, 290 bytes left). Folding the
leading `/` and `\` checks into one pattern saved only 3 bytes, so I didn't keep it.

**Gates** (one after another after the last change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings); `npm test` 0 (1477 pass, 0 fail: 1474 + 3 new; `test:timing` 7 pass); `npm run verify` 0 ("verify:
ok (0 warning(s))", page 149.72 of 150 KB); `node scripts/gen-api.mjs --check` 0 ("generated files are
current"); `npm run build` 0; `npm run test:pages` 0 (528 passed, 11.1 min). The run before the screenshot
update had 520 passed and only those 8 screenshots failing. Logs are in `$TMPDIR/vb-fix01/`. No process of
mine left running; this repo's `.visionboard/` and port 4466 untouched. Long File Strategy: no write over
50 lines (every change was an exact-string edit).

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_01: plain words in app and image problems → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_01_plain-words.md]]`
