# BE_03_image-route: Image route and contract

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Serve the project's images safely and say so in the contract, so FE_03 can render them.

## Context

PLAN.md rulings 19-21, 24 and § Goal state line 11. Runs in wave 3 beside FE_02 (page only); you
touch the server's image route, the format package's limits, tests and docs. BE_02 has landed: reuse
its path-safety helpers if it made them shared (read its notes); otherwise follow `server/static.ts`
`resolveStatic`.

## Inputs

- **Files to create**: `packages/format/src/images.ts` (`IMAGE_LIMITS`: types png, jpeg, webp, gif
  with their magic bytes and content types, max 8 MB, depth 8, the segment pattern; `imagePathProblem(path)`
  → a reason or nothing, **the one path check** both the server and the Markdown renderer use;
  exported from the format front door), `apps/board/server/images.ts` (the route: resolve, check, stat,
  ETag, 304, magic-byte check, stream), `docs/specification/images.md` (folder, subfolders, path rules,
  types and limits, the route and its headers, updates by ETag on select/open, the zoomed view in one
  paragraph pointing at `components.md`), tests `apps/board/tests/images.test.ts` (unit for
  `imagePathProblem`, API for the route) with fixture images generated in the test (tiny valid png,
  jpeg, webp, gif buffers; an svg; a text file named `.png`; an oversized file made sparse).
- **Files to modify**: `apps/board/server/app.ts` (`GET /board-images/<path>` before static; HEAD
  too), `docs/decisions.md` (D-048 verbatim from PLAN.md), `docs/specification/api.md` (a short section
  "Images in cards (D-048)": the route is not an API operation, like the app panel route).
  Not `apps/board/README.md` (FE_02 edits it in this wave; FE_03 adds the image line).
- **Patterns to follow**: `server/static.ts`, `server/problem.ts`, BE_02's panel route wiring.
- **Shared artifacts to reuse**: none new beyond BE_02's.
- **Skills**: `cortex-architecture` (one path check in one place, imported by both sides) ·
  `cortex-docs` (images.md, api.md, decisions).

## Steps

1. [x] Tests first, each seen failing: every refused path of § Goal state line 11; every type
   accepted by extension and bytes; svg and a fake png refused (415); over 8 MB refused (413); 404 for
   missing; `ETag` present and a matching `If-None-Match` → 304; `Cache-Control: no-cache`;
   `nosniff`; Host guard applies; nothing outside `.visionboard/images/` is ever read (assert with a
   symlink pointing outside: refused).
2. [x] Build `images.ts` (format), then the route.
3. [x] D-048, images.md, api.md section.
4. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`. **Not** `npm run test:pages` (FE_02 runs
   page tests in this wave).

## Validation

- [x] Gates above exit 0; every safety case has a test named in your notes.

## Constraints

- Touch nothing under `apps/board/src/` (FE_02) or `packages/ui/` (FE_03 next). No git commits.
  Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** `packages/format/src/images.ts` (front door `index.ts`): `IMAGE_LIMITS` (the four types
with extensions, content type and first bytes; `maxBytes`, `depth`, `nameChars`, the name pattern),
`IMAGES_DIR`, `IMAGE_ROUTE`, `IMAGE_HEAD_BYTES`, `IMAGE_WORDS` (every reason, in plain words; FE_03's
"image not shown" text should use these), `imageNotReal(type)`, `imagePathProblem(path)` (the one path
check: a reason or nothing), `imageTypeByName`, `imageTypeOf`. Pure string logic (a test fails on any
import, Node name or DOM name). `apps/board/server/images.ts` `serveImage`, called from `app.ts` after
`/api` and before the GET-only check (so HEAD works): decode once, `imagePathProblem`, real path inside
the real images folder (`folders.ts` `isUnder`, the existing containment helper: nothing copied), open
once with no link followed, then size, first bytes and body from that one open file; ETag
`"<size hex>-<mtime µs hex>"`, `Cache-Control: no-cache`, 304 on a matching `If-None-Match` (list, weak,
`*`), `nosniff` from `SECURITY_HEADERS`. `docs/specification/images.md`, api.md 154-155 (the route is not
an operation), D-048 appended verbatim, `packages/format/README.md` entry, `app.ts` header comment,
`modules.md` regenerated with `npm run map`.

**Wording (maintainer's standing instruction).** `IMAGE_WORDS`: "no file name", "must be inside the images
folder", "use / between folders", "names can't start with a dot", "empty folder name", "only letters,
digits, - _ and .", "names are 100 characters at most", "more than 8 folders", "only png, jpeg, webp or
gif", "not found", "over 8 MB", "not a real png" (the type its name says). Numbers in them come from
`IMAGE_LIMITS`. The route's problem `detail` is exactly one of these (no sentence), and a test fails on
jargon or a reason over 40 characters.

**Statuses.** A refused path, a missing file or folder, a link out: 404 `not-found`. An extension that is
not allowed, or bytes that are not the type the name says (svg included, a text file named `.png`, an
empty file): 415 `unsupported-media-type`. Over `maxBytes`: 413 `too-large` (checked before the bytes).
Other methods: 405 with `Allow: GET, HEAD`. Host not ours: 403 (the guard, before the route).

**Safety tests (Goal state line 11), each seen failing first** against a naive pass-through route and
no-op format functions (22 of 27 failed; the 5 that passed test things the stub already did: the Host
guard, the folder in use, the accepted paths, the word list, the purity check), then the real code;
afterwards four more mutations each failed the named test: no link containment (11, 12), no first-bytes
check (6), no size check (8), no path check (2, 6, 7, 9, 10), and the route placed before the guard (13).
- `..`, `%2e%2e`, leading `/`, backslash, hidden names, scheme, internet URL, `javascript:`, `data:`:
  unit "imagePathProblem: anything that leaves the images folder is refused (.., /, //, a scheme,
  javascript:, data:)" and "imagePathProblem: a backslash, a % code, a hidden name and an odd character
  are each refused with their reason"; route "path tricks are refused and never read the decoys outside
  the images folder (.., %2e, leading /, backslash, hidden, scheme, javascript:, data:)" (every trick is
  sent raw against valid pictures just outside the folder and their bytes must never come back).
- Depth over 8: unit "imagePathProblem: nothing, an empty folder name, a name or a depth over the limit
  are refused"; route "subfolders work down to the depth limit, and one folder deeper is refused".
- svg: unit "imagePathProblem: svg and every other type that is not png, jpeg, webp or gif is refused";
  route "svg is refused (415), by name and by content, and a file is the type its name says or it is
  refused (415)" and "other extensions are refused (415): html, js, txt, none".
- A png extension on a non-image file (text, html, empty, cut short, a png named .jpg): same route test;
  unit "imageTypeOf: each type is known by the bytes it starts with, and nothing else is".
- Over 8 MB (sparse file): route "a file over the size limit is refused (413) and one at the limit is served".
- Nothing outside the images folder is read: route "a link out of the images folder is refused, a link
  that stays inside works, and a dangling link is 404" and "the images folder may itself be a link, but
  nothing in it may link out of it"; the decoys in the tricks test.
- Host guard "the Host check applies to images: another host gets nothing (403)"; methods "only GET and
  HEAD: any other method is 405 and says so"; `HEAD`, ETag and 304 "HEAD answers the GET headers and no
  body", "a matching If-None-Match gets 304 with the ETag and no body; another gets the image", "an
  overwritten image has a new ETag, so the old one gets the new picture (updates without polling)";
  headers (type, length, ETag, `no-cache`, `nosniff`, no cookie): "each type is served by its extension and
  its bytes, with its type, size, ETag and the no-sniff, no-cache headers"; the open folder per request:
  "the route serves the folder that is open now, not the one the server started on"; "the image route is
  not an API operation: not in openapi.json, and not in the route table (api.md 154)".
- Docs held by tests: "images.md states every limit as IMAGE_LIMITS holds it, and nothing else", "…lists
  each type with its extensions and content type…", "…lists every reason an image is not shown, in the words
  the code uses", "…gives each problem the status the server gives it", "…lists the headers the route sets".

**Deviations, all inside the rulings:**
1. Test files: `images.test.ts` (unit and doc), `images-route.test.ts` (route) and `images-support.ts` (four
   real 1x1 images, `put`, a raw binary `get`) instead of the one file the task names: the route tests alone
   are over 250 lines, and one job per file.
2. `IMAGE_LIMITS.depth` is **8 folders** above the file (ruling 20: "up to 8 folders"), so 8 folders and a
   file is served and 9 folders is refused. If FE_03 reads "depth" as 8 names in all, tell me.
3. A `jpg` and `jpeg` extension both mean `jpeg`; extensions are matched in any case (`Shot.JPG`).
4. A file that links out is 404 "must be inside the images folder"; a linked **images folder** itself is
   allowed (as BE_02 allows a linked apps folder), and files in it that link out are still refused. The
   file is opened once without following a link at the last step (`O_NOFOLLOW`), and size, first bytes and
   body come from that one open file, so the file read is the file checked.
5. The 304 is only answered after the size and first-bytes checks, so a fake or an oversized file is
   refused even when the client sends a matching or `*` `If-None-Match`.
6. Containment reuses `folders.ts` `isUnder`: `static.ts` keeps its check inline and unexported, and
   `apps/manifest.ts` has a private copy (`inside`), so neither could be imported; I did not edit them.
   (`apps/manifest.ts` `inside` and `static.ts` could later use `isUnder` too.)

**For FE_03.** The route is `IMAGE_ROUTE + path`; only characters from `IMAGE_LIMITS.name` and `/` can
appear in a path that passed `imagePathProblem`, so no encoding is needed. Call `imagePathProblem(path)`
first in the Markdown renderer: render the `<img>` when it returns nothing, else the text "image not
shown: <path>" with the reason beside it (`IMAGE_WORDS`). The problem's `detail` for a refused file
(`over 8 MB`, `not a real png`, `not found`) is the reason to show in the "not found" box. Test images:
`apps/board/tests/images-support.ts` `IMAGES` (png, gif, webp, jpeg; real, 1x1). `apps/board/README.md`
should list `server/images.ts` and the route (not edited: FE_02's file this wave). The `appCards`-style
server flag was not added: ruling 24 and the plan give images no flag (steering rule 12 would ask for one;
the orchestrator may want to decide that).

**Gates** (one after another; `npm run build` and `npm run test:pages` not run, per the orchestrator for
this wave): `npm run check` 0; `npm test` 1447 + 7 pass (1417 + 30 new: 15 route tests + the
not-an-operation test, 14 unit and doc tests); `npm run verify` 0 warnings after `npm run map`;
`node scripts/gen-api.mjs --check` current. No process of mine is left running.

**Long File Strategy**: every file over 50 lines was created and appended in chunks (no connection error).

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-security] BE_03: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_03_image-route.md]]`
