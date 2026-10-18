# FIX_05_file-lines: Name each file once; read app.json saved with a byte-order mark

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two things FIX_04's notes saw ("Seen, not fixed"), under the maintainer's fewest-words instruction
and ruling 10 (the invalid state lists the problems for the agent to fix).

## Inputs

- **Finding 29, the file named twice**: per-file problems read "panel.html: panel.html is over the 1 MB
  limit. Make it smaller." The page's `problemLine` adds "<file>: ", and the server's words name the file
  again. Word them on the server (`apps/board/server/apps/manifest.ts`, FIX_01's `fieldWords` seam and
  FIX_04's JSON line) so the card reads "panel.html: over the 1 MB limit. Make it smaller." Check every
  per-file line the server can send (size, missing file, a path outside the folder, a link out, the
  tools module's load and import problems) and name the file once in each. Agents read `list_apps` too:
  the `file` field still names it. No page code.
- **Finding 30, a byte-order mark**: an app.json that starts with a byte-order mark (some editors add one)
  reads "not valid JSON" though it is fine. Strip one leading mark before parsing in `manifestOf`; the hash
  stays over the file's bytes as they are (ruling 7). No page code.
- Tests: `apps/board/tests/app-folder.test.ts` (and `api-apps.test.ts` where they assert the old words);
  page specs or gallery samples that quote the old words follow (search `tests/pages/`, `apps/board/src/gallery/`).
- Docs or the skill's scenarios that quote these words follow.
- **Skills**: `design:ux-copy` on the changed lines.

## Steps

1. [x] Tests first, each seen failing.
2. [x] The two fixes. If a screenshot shows the changed words, view the diff light and dark before updating.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] Both no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What changed** (server only; no page code).
- **Finding 29**: every per-file problem names its file once; the page's `problemLine` and `call_app_tool`'s
  `appInvalid` put "<file>: " first, and `list_apps` keeps `file`. `apps/board/server/apps/manifest.ts`: `locate`
  ("over the 1 MB limit. Make it smaller.", "links outside the app's folder. Make it a real file.", "not a file.");
  `readApp` (the folder link "links outside .visionboard/apps/. Make it a real folder."; a missing app.json, panel or
  tools file `NOT_THERE` "not in the app's folder. Write it there", plus ", or fix the panel|tools field in app.json"
  as before). `child.ts` load timer: "did not finish loading within N s. Make its top-level code quicker.".
  `runner.mjs`: its own words are an `Unfit` error, sent as they are ("must export default { tools: [...] }.",
  "Tool "a" is not an object.", "Tool "a" has no run function.", "has two tools named "a"."; the import refusal
  "Import only Node's built-in modules, such as node:fs, not "./helper.mjs". Put that code in this file, so the
  version the person allows covers all of it.", which is also a tool's error, alone, at call time); anything else
  the module throws stays "could not load: <its words>". Already once, unchanged: the schema lines (`fieldWords`),
  the id mismatch, "not valid JSON near line N", the tool-shape lines (`checkTools`), the broken line.
  The seam: `fieldWords` words schema problems only; these are the hand-written lines beside it in manifest.ts, and
  the two files that word the tools module's load. Nothing of `fieldWords` copied.
- **Finding 30**: `manifestOf` strips one leading byte-order mark (`MARK`) before `JSON.parse`; `manifestBytes`, and
  so `appHash`, stay the file's bytes as they are (ruling 7). Two marks still read "not valid JSON".

**Proof by name** (each seen failing first):
- 29: `apps/board/tests/app-folder.test.ts` "finding 29: each file's problem names the file once, as the card puts it
  first" (failed on all seven: "panel.html: panel.html is over the 1 MB limit…", "app.json: The folder has no
  app.json…", …); `apps/board/tests/api-apps.test.ts` "finding 29: a tools module that doesn't load or doesn't fit
  says why without naming its file again" (five modules; failed: "tools.mjs: tools.mjs could not load: tools.mjs must
  export …"), "one file: a tools module that imports another file is invalid; …" (the import words exactly, in
  list_apps and as the tool's error) and "a tools module that never finishes loading …" (exactly), both failed first.
- 30: `app-folder.test.ts` "finding 30: an app.json saved with a byte-order mark reads as it is; the hash is over its
  bytes, mark and all" (failed: "not valid JSON").
- FIX_04's "finding 28: …" used a file with a mark as its parser-quotes-the-file case; now that the mark is read, it
  uses a stray first character (`x{…`): the same kind of parser message, still no line. "what the agent must fix: …"
  and "finding 4: …" follow the new missing-file and size words.

**Deviations** (inside the rulings):
1. Beyond dropping the name, fewer words per ux-copy: "Write it there" for all three missing files (was "write the
   panel there", "write the app's manifest there", "write it there"); "links outside … Make it a real file|folder"
   (was "links to a file outside … Put the file itself in the folder", "links to somewhere outside … Put the app's
   files in the folder itself").
2. The runner's shape lines no longer start "could not load:" (the module loaded; its shape is off): one small class
   (`Unfit`) marks the runner's own words; whatever else is thrown keeps "could not load:".

**ux-copy** (`design:ux-copy` over the 14 changed lines): the changes in deviation 1; kept "not a file." (the fix is
plain), "has two tools named "a"." and the import line's reason (an agent needs it not to work around the rule);
"not in the app's folder" over "missing" or "not found" (it says where "there" is; "not found" is the card's word for
a gone app).

**Docs**: none quote these words (apps.md, components.md, SKILL.md, scenarios.md, the OpenAPI, the schemas searched);
apps.md § Approval "the bytes of `app.json`" stays true. No doc, page code, gallery sample or screenshot changed (no
page test or sample shows these lines).

**Seen, not fixed** (outside this task):
- The gallery's invalid sample (`apps/board/src/gallery/app-frame-section.ts` `STATES` "Invalid") shows "tools.mjs:
  imports ./parser.mjs: a tools module imports only node: built-ins", words the server never sends (rule 11, mock the
  data); it could show the import line above (gallery screenshots would change).
- The OpenAPI `app-invalid` example still has the shape before FIX_01 ("app.json /panel: \`panel\` is not a plain file
  name ending in .html", a pointer and code marks), and the `list_apps` example (so api-reference.md too) "\`panel\`
  is not a plain file name …" with code marks.

**Gates** (one after another after the last code change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings; tsc 0); `npm test` 0 (1484 pass, 0 fail: 1481 + 3 new; `test:timing` 7 pass); `npm run verify` 0 ("verify: ok
(0 warning(s))", again after the build: the same); `node scripts/gen-api.mjs --check` 0 ("generated files are current");
`npm run build` 0; `npm run test:pages` 0 (534 passed, 11.3 min). Built page 153,470 B gzip (149.87 of 150 KB, 130 B
left; unchanged, budget unchanged). Logs in this session's scratch folder. No process of mine left running; this repo's
`.visionboard/` and port 4466 untouched.

**Long File Strategy**: no file created; every code and test change an exact-string edit. One edit of these notes ran
to about 55 lines (over the 50-line rule); it went through with no connection error, and the rest were kept short.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_05: name each file once; read app.json with a byte-order mark → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_05_file-lines.md]]`
