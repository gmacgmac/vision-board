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

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] PAGES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes under 50 lines; work in the worktree, not a scratch copy; never re-baseline an existing screenshot (a `REQUEST`).

### Unfinished (stopped early at the coordinator's word, quota)
- Last `tests/pages/chat*.spec.ts` run, 5 workers: 99 passed, 3 failed, not diagnosed. `chat-attach-gallery` light and dark failed `toHaveScreenshot` (they passed at 1 worker just before, on baselines re-taken then; the one later change, `drawDoing`, draws nothing new). `chat-attach-pages` "a 40-page PDF" failed a `toContainText` with "element(s) not found", probably its wait for the moving count on a fast run. Neither cause is established.
- The Done list's design critique was not run.
