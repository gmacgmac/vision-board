# FE_03_card-images: Images on the page: Markdown image, zoomed view, updates

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Render images in cards, open them in an animated 70% view, and pick up a replaced image when the card
is selected or the image is opened.

## Context

PLAN.md rulings 19, 21-23 and § Goal state line 11. BE_03 (the route, `imagePathProblem`,
`IMAGE_LIMITS`, `images.md`) and FE_02 (app cards on the page) have landed: read their notes.

## Inputs

- **Files to modify / create**:
  - `packages/ui/src/markdown/inline.ts` (it already parses `![`; today an image falls back to text):
    emit the one fixed `<img>` shape when `imagePathProblem(path)` passes and alt is present, else the
    plain-text forms of ruling 19; `render.ts` if the shape needs a hook; keep every other rule of
    D-023. `packages/ui/tests/markdown-adversarial.ts` `assertSafe`: allow `img` only in the fixed
    shape (a regex like `LINK_SHAPE`), still refuse `style=`, `<script`, `<iframe`, and any
    `javascript:`/`data:` inside a tag. Add CommonMark-style cases for images.
  - `packages/ui/src/image-view/` (a new pattern, framework-free; core + element + css +
    `pattern.json`): `fitImage(natural, screen) → size` (DOM-free, the 70%-of-the-longer-side rule,
    upscaling allowed, never past the screen on the other axis), the modal view (dialog role, labelled by
    alt, focus kept inside, × button, Esc, click outside), the open/close animation from the card's
    image box (transform, about 220 ms, timing from tokens; `prefers-reduced-motion`: no motion).
  - `apps/board/src/board/` (a new `card-images.ts`): images in cards are buttons in the card's tab
    order that open the view; on card **select** and on view **open**, a conditional request through
    `io.ts` (`If-None-Match` with the last `ETag`); a new version is loaded off-screen, then swapped in;
    the card re-measures once its images load (only that card, rule 15); missing / refused images show
    the small reason box.
  - Gallery: a section for images (in a card, missing, refused, the zoomed view tall and wide, reduced
    motion), with fixture images in the gallery's project.
- **Page tests**: `tests/pages/card-images.spec.ts` covering every item of § Goal state line 11 (box
  sizes for a tall and a wide image at 1600×1000 and 1470×956; keyboard; Esc; click outside; focus
  back; replaced image after select with the conditional request asserted and no repeat on a timer;
  reduced motion; axe light and dark); unit tests for `fitImage` and the Markdown shape.
- **Patterns to follow**: `packages/ui/src/note-bubble/` (pattern split), `markdown/` tests,
  `io.ts`, `offscreen.ts`, `cards.ts` re-measure.
- **Shared artifacts to reuse**: BE_03's `imagePathProblem`, `IMAGE_LIMITS` (import; no second check).
- **Skills**: `cortex-architecture` (pattern-owned UI, one I/O layer, every state, accessibility) ·
  `cortex-docs` (`components.md` § Images in cards and § Image view; `apps/board/README.md` names the
  image route and `card-images.ts`).

## Steps

1. [x] Tests first, each seen failing.
2. [x] Markdown shape, then the image-view pattern, then page wiring, then the gallery.
3. [x] Screenshots: view every diff light and dark before updating; say which changed and why.
4. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] All gates exit 0; § Goal state line 11's tests exist by name and pass; page weight holds.

## Constraints

- No git commits. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** Markdown (`packages/ui/src/markdown/`): `image.ts` `imageMarkup` (the one `<img>` shape after
`imagePathProblem`; a refused path is `imageNote`'s box with `IMAGE_WORDS`' reason; no alt text is the path; the
alt text is the description's words), `inline.ts` hands an image to the caller's writer (still 300 lines),
`render.ts` `MarkdownOptions.images` and `setMarkdownImages` (the page's cardImages flag), `markdown.css`
(`.vb-md-img`, `.vb-md-noimg`), `pattern.json`. The pattern `packages/ui/src/image-view/`: `image-view-core.ts`
(`fitImage`, `centred`, `flipFrom`, `msOf`, `motionMs`, `ZOOM_SHARE`, `MOTION_SHARE`, `IMAGE_VIEW_WORDS`),
`image-view-template.ts`, `vb-image-view.ts` (native modal `<dialog>`), `card-image.ts` (`imageButton`,
`showProblem`), `image-view.css`, `pattern.json` (flag `cardImages`). Page: `apps/board/src/board/card-images.ts`
`createCardImages` (made by `draw.ts`: `drawn` after each sync, `place` after each draw and view move,
`selected` from `restate`, `resized` measures a card alone), `io.ts` `imageVersion`, `main.ts`
(`setMarkdownImages`, `image-view.css`). Flag `cardImages` (orchestrator decision 5). Gallery:
`image-view-section.ts`, `main.ts` (`SAMPLES`, sections filtered by a pattern's `flag`); the pictures are written
into the served project by `tests/pages/gallery-images.ts` (playwright.config.ts). Docs: components.md § Markdown,
§ Feature flags, § Images in cards, § Image view; images.md § Updates and § Kept true by; `apps/board/README.md`
(`server/images.ts`, `card-images.ts`); `packages/ui/README.md`; modules.md (`npm run map`).

**Goal state line 11, by test name** (temp project from FE_02's `tests/pages/app-server.ts` `startAppServer`;
real PNGs from `pngOf`):
- Card shows `![Flow](diagrams/flow.png)` (a subfolder) at the card's width: `card-images.spec.ts` › "an agent's
  card shows ![Flow](diagrams/flow.png) from a subfolder at the card's width, and its card is measured with it
  (light)" and "(dark)" (src `?v=<etag>`, alt, button name, width = the paragraph's, 2:1, the card under it starts
  below it; axe; screenshot).
- Click and keyboard to 70% on the longer side, tall and wide, from the boxes: "a click opens a wide image to 70% of
  the screen's width, never past its height, at 1600×1000" and "… at 1470×956"; "the keyboard opens a tall image to
  70% of the screen's height, at 1600×1000" and "… at 1470×956" (Tab from the card, Enter and Space).
- Esc and a click outside, focus back on the image: "Esc, a click outside the image and the × each close it with
  focus back on the image; while open, focus stays on the × and the board neither pans nor zooms".
- Replaced image after select, conditional request, no timer: "a replaced image shows after its card is selected
  again: a conditional request with its ETag, the new picture swapped in, and no request on a timer" (HEAD with
  `If-None-Match` = the ETag: 304, then 200 after the overwrite; nothing more in 2.5 s); and "opening an image asks
  for a newer version too, and the open view and the card both show it".
- Reduced motion: "reduced motion: the view appears and goes without motion" (no `animate` call); with motion: "with
  motion › the view grows from the card's image box and shrinks back to it, for about 220 ms, eased by the board's
  easing" (216 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, first and last frames on the card's box).
- Axe light and dark: "the open view passes axe and matches its screenshot (light)" / "(dark)", plus the in-card
  tests above and `card-image-states.spec.ts`.
- Safety, text in the card and the route's 404/415/413: `card-image-states.spec.ts` › "missing and refused › a
  missing file, a fake png, one over 8 MB, a path out of the folder and an internet address each say why in their
  place; no alt text is the path (light)" / "(dark)" (neither the path out nor the internet address is requested).
  Unit: `markdown-images.test.ts` "a path the one check refuses is the \"Image not shown\" box, with its reason, and
  nothing is fetched" (`..`, `%2e%2e`, leading `/`, `//`, backslashes, hidden names, `./`, `a//b`, https and http
  URLs, `javascript:`, `data:`, svg, other and no extension, a space), "subfolders work down to the depth limit;
  one folder deeper is refused"; `markdown-safety.test.ts` "an image cannot break out of its shape, and loads from
  nowhere but the board's image route (D-048)". Route side: BE_03's `images-route.test.ts`.
- `markdown-adversarial.ts` allows `<img>` only in the fixed shape: `IMG_SHAPE` in `assertSafe` (every
  `markdown-*` test and `markdown.timing.ts`, with three new image inputs); CommonMark: "CommonMark: Images".
- Also: "with the cardImages flag off, ![alt](path) stays its text and nothing is asked for"; "zoomed out past FAR_K,
  an image is not loaded; zoomed in, it is"; "well off screen, an image is not loaded; once its card comes into
  view, it is"; "a file that goes › opening an image whose file has gone: the view closes, the box says so, and
  focus is on its card"; gallery "gallery: images in cards in every state, from the gallery's own pictures
  (light)" / "(dark)" and "gallery, with motion › gallery: its pictures open in the zoomed view, with motion and
  without it". Unit: `image-view-core.test.ts` (9 tests), `markdown-images.test.ts` (11), flags "cardImages is on
  by default …".
- **Seen failing**: the unit tests before the code (missing exports, wrong output); the page tests with my 10
  changed source files set aside: 21 of 22 failed, the one passing being "flag off" (the old behaviour).

**Deviations, all inside the rulings:**
1. **The flag reaches Markdown once**: `setMarkdownImages(flagOn('cardImages'))` at the page's and the gallery's
   entry points, plus a per-call `images` option, instead of threading a flag through every template (card body,
   notes, replies, steps, handover, the note bubble, container notes, the chat). components.md § Feature flags
   says so.
2. **Width and height "when known"**: the renderer never knows them, so its shape has none; the page sets them
   from the loaded picture and keeps them per address, so a card drawn again keeps its height at once.
3. **The button is the page's**, through the pattern's `imageButton`: the renderer keeps ruling 19's one `<img>`.
   Only an image in a card's body (not in a link, a note, a hover box or the bubble) is a button.
4. **"Fits the card's width (never wider)"** is `max-width: 100%`: a picture wider than the card is at its width,
   a smaller one at its own size; and at most 1.5 card widths tall (`--vb-card-w-s` × 1.5, 420 px) so a phone
   screenshot does not take over the board (the zoomed view shows it whole). While its size is unknown: a sunken
   16 by 10 box at the full width, a transparent stand-in so no broken-image mark shows.
5. **Far zoom**: `loading="lazy"` alone loads every image at far zoom (all are on screen), so the page holds `src`
   back until the card is within a screen (offscreen.ts' bounds) and the zoom is not `isFar`, judged in the next
   frame (a board just opened has its kept or fitted view only after its first draw).
6. **The check is a HEAD** with `If-None-Match` (no picture comes back), and the picture loads at `?v=<ETag>` (the
   route ignores the query), so the page knows the version it shows: one HEAD per file as it first loads. The
   empty body of each HEAD is read: Chromium reports an unread `fetch` HEAD as `net::ERR_ABORTED` (it tripped the
   page tests' failed-request guard), so no test helper changed.
7. **Timing token**: there is no 220 ms token and tokens.css is protected, so the motion is `--vb-motion` ×
   `MOTION_SHARE` (0.6) = 216 ms, eased by `--vb-ease`, both read from the tokens when it runs; reduced motion
   makes the token 0ms, so nothing moves.
8. **Gallery**: a pattern's `pattern.json` may name a `flag` (`image-view`: `cardImages`); the gallery's `main.ts`
   shows its section only with the flag on, so `gallery.spec.ts`'s full screenshot (now with `-cardImages`) is
   unchanged. Its missing and refused samples are drawn from the route's words, so the gallery makes no failing
   request. The Markdown `pattern.json`'s fields the gallery draws (entry, description, states) are unchanged and
   still true; images are documented in its other fields.
9. **Test helpers**: `pngOf` added to BE_03's `apps/board/tests/images-support.ts` (extended, not copied), used by
   both specs and `tests/pages/gallery-images.ts`; the specs reuse FE_02's `startAppServer`; two spec files
   (300-line rule); `gallery.spec.ts` stays at 300 lines.

**Reviews** (live board and gallery, light and dark): design-critique (fixed: in light the board's text competed
with a light picture, so the backdrop now blurs the board softly and the zoomed picture has a hairline ring;
before that, from my own look: the loading box showed a broken-image mark, a tall picture made a very tall card,
the zoomed copy drew an empty frame before it decoded, and the focus ring wrapped the full-width button, not the
picture); accessibility-review (WCAG 2.1 AA, APCA by rule 3: box text Lc 84.8 / 70.5, paths 95 / 94, × 105 / 95,
focus ring 72 / 48; fixed: focus fell to the page when a file went while its view was open, now it returns to the
card, page-tested); ux-copy (fixed: the gallery said "picture" where the board says "image"; the boxes, the ×'s
name and tip and the no-alt path kept).

**Also fixed on the way:** under the full suite's load, a second open (and its Esc) could come before the first
close's `close` event (a task of its own), so Esc was ignored and the late event wiped the new view; now a new open
resets the flag and a late `close` event is ignored. Page test "closed, opened again and Esc, all before the first
close has finished: …" (failed without the fix, passes with it).

**Screenshots** (each viewed light and dark): new `card-images.spec.ts/card-image-{light,dark}`,
`zoomed-{light,dark}`; `card-image-states.spec.ts/card-image-refused-{light,dark}`, `gallery-images-{light,dark}`.
Changed: `gallery.spec.ts/markdown-{light,dark}`, only card 61's `![an image](https://example.com/a.png)`, now the
"Image not shown … (must be inside the images folder)" box (ruling 19). The new gallery section first moved the 41
gallery screenshots under it by a sub-pixel; instead of re-baselining them, it rounds its height to whole pixels with
FE_01's `wholePixels` (now exported from `app-frame-section.ts`, not copied), and they match unchanged.

**Page weight**: 149.7 KB of 150 gzip (146.1 before). Bought back: the flag's description shortened, the box
built with `outerHTML`; a lazily loaded view would not help (verify counts lazy chunks too). **The room left is about
0.3 KB**: T_02 and any FIX need a trim or a budget decision before adding page code.

**Known limits** (proposed tracker rows, not fixed): (a) images outside cards (the note bubble, container note blocks,
the chat) load as the browser does (`loading="lazy"`, no version check), and a missing one there shows the browser's
broken-image mark, not the box; (b) only an image in a card's body opens the zoomed view (in a note it is the note's
click); (c) the first load of each file costs one HEAD; (d) a picture smaller than the card shows at its own size
(ruling 23's "never wider"; the zoomed view scales it up).

**Gates** (one after another, after the last change): `npm run check` 0; `npm test` 1474 + 7 pass (1451 + 23 new); `npm run verify` 0 warnings (after `npm run map`); `node scripts/gen-api.mjs --check` current; `npm run build` 0; `npm run test:pages` 528 passed (505 + 23 new). No process of mine left running.

**Long File Strategy**: two writes went over 50 lines in one go (`markdown-images.test.ts`, about 120 lines;
`tests/pages/gallery-images.ts`, about 70), with no connection error; every other file over 50 lines was created and
appended in chunks. My scratch server (port 4497, a scratch project) and the preview are stopped; this repo's
`.visionboard/` was never touched; no commit.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_03: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_03_card-images.md]]`
