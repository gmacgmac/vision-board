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

**Status**: Pending · **Completed**:

### Changes Made
- 

### Caught Beyond the Brief
- 

### Deviations from Plan
- 

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] PAGES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes under 50 lines; work in the worktree, not a scratch copy; never re-baseline an existing screenshot (a `REQUEST`).
