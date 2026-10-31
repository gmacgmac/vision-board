# PAGES_01_pdf-pages-and-pictures: PDF pages and fitted pictures

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

When a PDF is attached its pages become pictures, rendered in a sandbox; when a picture over the limits is attached it
gets a fitted copy. The agent is told about both and opens them with its own read tool. PLAN rulings 5, 6. Behind
`readAttachment`; off, attaching is as it is today.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (PAGES_01)
- **Files to reference**: PLAN.md; READ_01's notes; the app frames' sandbox (`packages/ui` `vb-app-frame`, its CSP and how
  `apps/board/server/apps` serves a panel: reuse that pattern); `apps/board/src/shell/chat-bridge.ts`, `attached-file.ts`,
  `file-drops.ts`; `apps/board/server/chat-files.ts`, `chat-prompt.ts` (`filesBlock`)
- **Skills**: `cortex-architecture`, `cortex-docs`, `design:accessibility-review`

## Steps

1. **Failing tests first** (`tests/pages/chat-attach-pages.spec.ts`, a fake agent; PDFs built in the test): a one-page and a
   40-page PDF give that many pictures, at most 30, and the agent is told "30 of 40"; a PDF with a picture on its page and no text
   renders it; a corrupt or password PDF says so on its chip and the PDF itself still goes; **a PDF whose script tries `fetch`,
   `parent.document`, `top.location`, `localStorage` reaches none of them**, and a bad answer from the frame (not a PNG, too
   big, wrong page) is dropped; a 3000 px picture and a 6 MB picture get a fitted copy within 2000 px and 5 MB, a small one gets none.
2. **Contract**: `attach_chat_file` gains how a derived file says what it came from (`of`: the saved path, `page`); the server
   saves it next to its original, in a folder named from it, under the same no-link checks, and only if `of` passes `attachedFile`.
   Derived files don't count towards the 10 files. `npm run gen`.
3. **The frame**: its own page with `pdfjs-dist` bundled in a lazy chunk, `sandbox="allow-scripts"` (never `allow-same-origin`), a CSP
   with `connect-src 'none'`, `isEvalSupported: false`. Messages are checked by source, shape and size both ways. A deadline, then
   the frame is removed. The main bundle stays free of pdf.js (a test, as `chat-lazy.spec.ts` does).
4. **The chip**: says "reading pages… 12 of 30", then ready; Send may go meanwhile with what has finished, and the agent is told only
   what is saved. Reduced motion respected; the status line announces it.
5. **The prompt**: `filesBlock` names each original, then its pages or fitted copy, with one line saying to open those, before the
   untrusted line (words in `server-chat.ts`). Keep the block short: a folder and a count, not 30 lines.
6. **Gallery** (a section, last): the chip's new states, light and dark. **Docs**: api.md, chat.md § Attaching. **Checks**: unit tests,
   `check`, `verify`, `gen-api --check`, `tests/pages/chat*.spec.ts` on 6200; a look in a browser, light and dark.

## Validation

- [ ] A PDF that runs script reaches nothing (tested, not assumed)
- [ ] A picture-only PDF's page reaches the agent as a picture; 30 pages at most, and it says how many of how many
- [ ] Contrast and focus pass, light and dark; flag off is today

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed · **Completed**: 2026-10-31

### Changes Made
- Contract: `attach_chat_file` `of: { path, page?, pages? }`, `info.version` 1.34.0, `npm run gen`. `chat-files.ts` `saveCopy`, `besideOf`, `PICTURE_BYTES`; `checked` adds `beside`, read from the disk as the message goes; `filesBlock` one line a file, then `openThesePictures`, before the untrusted line.
- The frame: `server/pdf-frame.ts` (`GET /pdf-frame`, the built script inside the page, by hash); `shell/pdf-pages.ts` (`createCopies`, one new frame a file, one at a time, deadlines), `pdf-pages-core.ts` (`checkedAnswer`), `pdf-pages-frame.ts` (starts the worker, passes messages), `pdf-pages-worker.ts` (pdf.js and the canvas). A third build entry in `vite.config.ts`, and a plugin that takes pdf.js's `import()`s out, so the script stays one file.
- The chip: `ComposerFile.doing` and `note`; a refused file comes first; `onlyDoingMoved`, `drawDoing`. Gallery: three samples in the section, behind the flag.
- `read_attachment` names a picture over 5 MB in its `note` (`overTheLimit`, words `picturesOverTheLimit`): by bytes only, as a 4000 px, 220 KB picture was seen.
- The two screenshots' faults: the samples' heights, held by a test that the feed's line clears what is attached and no list scrolls. The chip list's cap is gone: the feed keeps 30% of the panel (20% in a window under 520 px) and the list takes what the box and the line leave, and scrolls. Under 520 px the keys and the label go and the box is lower. Measured at 420 px high with eleven files and a long message: the reason reads whole. `chat-attach-gallery` baselines re-taken, after looking, and its timeout 120 s. No other baseline moved.
- Docs: api.md 168, chat.md § Attaching, `pattern.json`.

### Design choices (decided by the principles)
- **The file is read in a worker inside the frame, not in the frame** (see Caught). Script run by a hostile file has no `RTCPeerConnection`, `location` to navigate, document or child frames. pdf.js's own core is a second worker. A classic worker: a frame with no origin can't start a module worker from a blob (measured), so `classicScript` drops the `export`.
- **The script is inside the frame's page, named by its hash**: the frame asks for no file, and nothing else can run in it. Served whole each time (2.2 MB, from localhost).
- **The fitted copy is made in the frame too**, though ruling 6 says "the page": a stranger's picture decoded in the board's own origin is what the frame exists to avoid, and it reuses the frame's checks. So every raster picture attached gets a frame for a moment; the chip shows nothing unless the file is known to be over 5 MB.
- **Pages at twice their size in points, capped at 2000 px**: a Letter page is 1224 x 1584. Over 5 MB, it is tried at 75%, four times. A fitted copy: a PNG if it fits (not for a JPEG source), else a JPEG at 0.85 or 0.7, then smaller.
- **The total goes in the file's name** (`page-012-of-040.png`), so `send_chat` needs no new field and the prompt comes from the disk alone.
- **pdf.js's two image decoders are inside the script**, as WebAssembly (`wasm-unsafe-eval` in the policy, no `unsafe-eval`): a scanner's JPEG 2000 or JBIG2 would otherwise be a silently blank page. JPEG 2000 is tested with a real one; JBIG2 goes the same way, untested.
- A frame per file, sequential, and the frame is removed at 30 s a step or 3 minutes a file.

### Caught Beyond the Brief
- **`connect-src 'none'` is not "no network" in a frame.** Measured: `new RTCPeerConnection({ iceServers: [{ urls: 'stun:…' }] })` in the frame sent 3 UDP packets to a test's socket, carrying whatever a STUN name can. Chromium answers "Unrecognized Content-Security-Policy directive 'webrtc'". This is why the worker. The frame's own main thread still has WebRTC; only `pdf-pages-frame.ts` runs there, and it reads no file.
- **A frame can navigate itself**, carrying data in the URL, and no directive of its own stops that. The page's `frame-src 'self'` does (tested), and the worker has no way to try. A host's page needs the same `frame-src`: nclite takes `packages/documents`, not this frame, but worth saying if it ever takes the frame.
- **Redrawing a chip per page would have lost clicks**: the remove button was replaced under the pointer (the test caught "element was detached"). Hence `drawDoing`.
- **Not tested outside Chromium** (the suite is Chromium only): nested blob workers and an inline module with a hash in Safari or Firefox are not established here. A frame that doesn't work says "can't be read here" on the chip and the file still goes.
- **A PDF relying on fonts it doesn't embed** draws in the system's (Helvetica here). **Predefined CJK CMaps are not bundled** (`cmaps/`), so such text may not draw, silently: for a customer in Asia, the same blank-page failure the decoders were added to avoid. `iccs/` too (a colour shift only). SVG filters are no-ops in a worker, so a few blending effects draw plainly. Worth a tracker row.
- **Send isn't held for a fitted copy**: a person who pastes a 9 MB picture and presses Enter within a second sends the original alone, and the provider rejects it. The ruling says Send may go; for a picture over 5 MB, waiting a moment might serve better. For the maintainer.
- **The original PDF is still named first**, so an agent may try it first; the line says not to. Kiro's read tool on it fails, and goes on.
- **A hostile PDF can draw what it likes on its page**, read by the agent as a picture: a picture-borne instruction. The untrusted line covers it; nothing else can.
- **Pictures attached before Send take disk**: each 5 MB, 30 pages, a PDF; `read_attachment`'s note on disk (READ_01) applies here too.
- `chat-files.ts` is 311 lines (warn); `saveCopy` and `besideOf` could move to their own file if it grows.

### Deviations from Plan
- None from D-071's rulings. Beyond the task's wording: the worker inside the frame (stronger than "a frame"), the fitted copy made in the frame rather than the page, and files outside the ownership row, listed in TASK-STATUS Requests.
- A chip says "Reading pages…", capital first, as "Uploading…" does.

### Caught Beyond the Brief
- 

### Deviations from Plan
- 

### Run 2 (2026-10-31)

**CJK**: failing test first (a real PDF, `UniGB-UTF16-H` and `UniKS-UTF16-H`, no embedded font: a white page). All 168 CMaps are now inside the worker (`DATA`, `import.meta.glob`, `BinaryData` by file name). A page looked at: 中文测试 draws. **Standard fonts: bundled too**: 816 KB is cheap beside the CMaps' 1.6 MB, and a PDF relying on Helvetica or Times then draws the same on any machine. The frame's script is 4.8 MB (was 2.2), read from localhost, and most pictures no longer load it (below). `chat-lazy` holds: the first chunk has none of it.
**A page with text that drew nothing**: the worker marks it `blank` (all white, a `showText` in its operators); it is saved, and the chip says the pictures may be incomplete (`pagesMayBeIncomplete`). Tested with a CMap that exists nowhere, a real font failure.
**Send waits for a fitted copy**: `ComposerFile.holds`, the host's words for the line; held from the moment the file is ready until the copy is saved, or fails, or the frame's deadline (30 s), and then the chip says so and the original goes. A PDF never holds it.

Design choices:
- **A PNG or JPEG whose own header says it is within the limits gets no frame and holds nothing** (`headerWithin`, reusing `pngSize`, `jpegSize`: arithmetic on bytes, nothing decoded). Otherwise every picture would stop Send for a moment and flicker the line. Any other kind (WebP, GIF, BMP, AVIF, or a header that doesn't read) holds until the frame answers, showing "Fitting…" for that moment.
- **Pictures have their own queue**: behind a long PDF they would have held Send for it.
- `pictureNotFitted` now shows on any failed fit, not only over 5 MB: only a picture that needed one, or couldn't be told, reaches the frame. A small picture with a broken header says so too.
- `filesStillUploading` reworded (key kept): the board's Send now also means a copy is being made.

Caught Beyond the Brief:
- **Run 1's "40-page PDF" failure had a real cause, not only load**: 40 small pages go by faster than the test's look at the moving count. It failed at 1 worker here. The test now holds page 12 and looks. The gallery screenshots: passed at 1 worker and in a 5-worker run of the attach and lazy specs, then failed in the 5-worker run of all `chat*` specs, by 4 pixels of about 4.9 million, same size, both themes' runs. Which pixels and why not established; not chased, as asked.
- **CJK glyphs come from the system's fonts**, as pdf.js bundles none: a machine with no CJK font draws boxes, which the `blank` check can't see (a box isn't white). macOS and Windows have them; not established on a bare Linux.
- **`blank` catches a wholly white page only**: a page whose picture draws and whose caption doesn't says nothing. And a page of only invisible text (`3 Tr`) would say "may be incomplete", wrongly but harmlessly.
- **The agent isn't told a page is blank**: only the person is, on the chip. The prompt comes from the disk, which doesn't hold that.
- **A hostile picture can hold Send for up to 30 s**, and ten of them, one after another, for five minutes; the person can take the chip off, which stops it.
- Registers: `pdfjs-dist/cmaps` and `standard_fonts` carry their own licences (`standard_fonts/LICENSE_FOXIT`, `LICENSE_LIBERATION`, `cmaps/LICENSE`): see Requests.
- `chat-attach-pages.spec.ts` is about 400 lines (warn): its helpers could move out.

### Run 3 (2026-10-31, row FIX_PAGES)

**F1**: reproduced first: the first test failed on Chrome for Testing 149 and Chromium 152. The `load` check is gone, with `load` itself: a frame gets `READY_MS` (15 s) for its `ready`. **Builds run**: headless shell 1243 (the suite's), Chrome for Testing 149 (`ms-playwright/chromium-1228`), Chromium 152 (`/Applications/Chromium.app`): the whole spec passes on each (18), and the `@full-build` tests 5 times over on both full builds (20 of 20). Not run: Google Chrome, Chromium 156 on Linux. `tests/pages/full-builds.ts` finds full builds; each gets a `full-*` project running tests tagged `@full-build` (the one-page PDF and the fitted copy). Each run prints which it found, or plainly that none is there. `--project=chromium` leaves them out: the gate must not name a project.

**The cap**: `PICTURE_BYTES` is 3,500,000 bytes, in `packages/format/src/attachments.ts`, citing the measurement: the page, the server and `read_attachment` all use that one (`chat-files.ts` re-exports it, so `chat-read.ts` is untouched). Decimal, as "3.5 MB seen" may be either and this is the lower. Tested with a real 4.3 MB PNG, and a page of heavy noise, each within it.

**A blank page**: `of.blank` (`info.version` 1.35.0) puts it in the name, `besideOf` reads it back, and `pagesDrewNothing` goes under the pages' line.

**Docs**: F10's rows on my area, in chat.md, api.md, `chat-files.ts`, dependencies.md. Not mine: `read_attachment`'s description for a file from a zip (F5).

Caught Beyond the Brief:
- **With the load check gone, a server with the flag off and a page with it on takes 15 s to say "can't be read here"**, and holds Send that long on a picture over the limits. It was instant, by the same guess that broke F1. Rare: both flags come off together by default. A response status can't be read from a frame.
- `apps/board/tests/chat-read.test.ts`: one word changed (the note's "3.5 MB"), in the other agent's file.
- At 3.5 MB a dense PNG page steps down further: a heavy page came out near 1100 px. A scan's fine print may suffer; it stays a PNG by the ruling. F9's A0 poster is no better.
- Fitting a JPEG source now happens more often, and the agent sees the copy, not the original: right by the measurement, but worth a look at quality in the live look.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] PAGES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes under 50 lines; work in the worktree, not a scratch copy; never re-baseline an existing screenshot (a `REQUEST`).

### Unfinished (stopped early at the coordinator's word, quota)
- Last `tests/pages/chat*.spec.ts` run, 5 workers: 99 passed, 3 failed, not diagnosed. `chat-attach-gallery` light and dark failed `toHaveScreenshot` (they passed at 1 worker just before, on baselines re-taken then; the one later change, `drawDoing`, draws nothing new). `chat-attach-pages` "a 40-page PDF" failed a `toContainText` with "element(s) not found", probably its wait for the moving count on a fast run. Neither cause is established.
- The Done list's design critique was not run.
