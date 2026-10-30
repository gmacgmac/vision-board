# Read Attachment - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-30 · **From**: maintainer points 361, 364-367 (2026-10-30)

---

## Problem Statement

People will attach customer architectures as pictures and PDFs, plus Word, Excel and zip files, and want the
agent to read them. Today neither agent can read Word, Excel or zip without a tool the machine may not have,
Kiro can't read a real PDF at all, and a picture over the provider's limit never reaches the model.

---

## Current State (measured 2026-10-30, Kiro CLI 2.35.2, Sonnet 5.5)

- Kiro's read tool opens pictures. A 4000 px, 220 KB PNG was seen; a 1800 px, 9.7 MB PNG came back "image removed:
  rejected by the model provider". The session went on working after both (KiroCrew's design note says a session
  can jam for good; not reproduced here, v2 engine, one turn after).
- Kiro's read tool on a PDF: v2 fails ("stream did not contain valid UTF-8"); V3 returns raw source. Claude
  Code's Read is built to open PDFs and pictures (not run live here).
- This Mac has no pdfplumber, python-docx, openpyxl or pdftotext.
- Attached files: `apps/board/server/chat-files.ts` (`saveAttachment`, `attachedFile`), D-068 to D-070.
- KiroCrew (Apache 2.0, reviewed read-only): no agent tool for documents, nothing to lift whole. Its review is in
  the orchestrator's scratchpad; the files to port are named in READ_01.

---

## Proposed Solution

One board tool, `read_attachment`, for what neither agent can open; pictures and PDF pages prepared when the file
is attached, so both agents see them with their own read tool. Behind the flag `readAttachment`.

### Rulings (the maintainer confirms them; recorded as D-071 when the set runs)

1. **`read_attachment(path, { sheet?, range? })`** is an MCP tool (`x-agent: true`) for attached files only: the
   path must pass `attachedFile`, or be inside a folder it made. Everything it returns says it is untrusted (D-070).
2. **Excel keeps its shape.** With no `sheet`: the sheets and their sizes. With `sheet` and `range` (`B2:F20`): each
   cell's address, value and formula, both, never flattened to CSV. A cap on cells per call, and it says when it cut.
3. **Word keeps its shape.** Headings, lists and tables as Markdown, merged cells included; embedded pictures saved
   to a new folder and listed with their sizes.
4. **Zip** expands into a new folder under the attachments folder, never over anything; a taken name gets another,
   as Finder does; the folder's name and its list go back to the agent. Limits on total size, count and each
   entry's real size. Links and names that escape are refused. An encrypted or ZIP64 archive is refused, and says so.
5. **PDFs become pictures in a sandbox.** When a PDF is attached the page renders its pages with `pdfjs-dist` inside a
   sandboxed frame: `sandbox="allow-scripts"` with no same-origin, a CSP with no network, `isEvalSupported: false`. So a
   malicious PDF that runs script can reach neither the board, its API, nor the disk. The bytes come back by
   `postMessage`, and the parent re-checks them (a PNG, within size). At most 30 pages; the agent is told how many of how many.
6. **Pictures that are too big get a fitted copy.** When a picture over 5 MB or 2000 px is attached, the page makes a
   copy within both (canvas, no dependency) and saves it beside the original; the agent is told to open the copy.
7. **The reader lives in `packages/documents`**, framework-free, with no board import, so nclite can take it. A tool and
   its gate ship together or neither ships (nclite `container/mcp-tools.ts`).
8. **Dependencies**: `fflate` 0.8.3 (the ZIP64 hang is fixed in it) and `pdfjs-dist` 6.4.299 without its optional
   `@napi-rs/canvas`. XML is read by our own small reader that refuses a DOCTYPE, so no entity can expand.

### Key Changes

1. **Contract first** (READ_01): the operation and its schemas in `packages/format/schema/`, `npm run gen`.
2. **`packages/documents`** (READ_01): `readDocx`, `readXlsx`, `expandZip`, the zip guard and the XML reader.
3. **The tool** (READ_01): the handler in the engine (`apps/board/server/engine/tools.ts`), words in
   `apps/board/server/words/`, the skill's line.
4. **Pages and fitted pictures** (PAGES_01): the sandboxed frame, the attach flow in the board's shell, saved next to
   the original through an extension of `attach_chat_file`, and the prompt's block naming them.

---

## Dependencies

- READ_01 (wave 1) before PAGES_01 (wave 2): both change `chat-files.ts` and the generated files.
  VERIFY_01 (wave 3) last.
- Shared Foundations: TASK-STATUS.md.
- External: `fflate`, `pdfjs-dist`, exact versions, install scripts off, in `docs/specification/dependencies.md`.
- Apache 2.0 notice kept for anything ported from KiroCrew, and files marked as changed.

---

## House Rules

- **Orchestrator-only files**: `docs/decisions.md`, `docs/specification/modules.md`, `cortex-tasks/tracker.md`,
  `package.json` and the lockfile (the dependencies land before wave 1), `packages/format/src/flags.ts`, existing screenshots.
- **Commits**: the orchestrator commits and tags per wave (`read/wave-N`); sub-agents never commit.
- **Project checks**: `npm run verify`, `check`, `gen-api --check`, unit tests, the specs for what changed; the full page
  suite at each wave gate on port 4710. New gallery sections go last.
- **No test starts a real CLI**; the live look on Kiro Sonnet is the orchestrator's, with tiny files.

---

## Out of Scope

- PowerPoint and Visio (a tracker row: pptx is the same shape; Visio needs its own look).
- OCR, writing Office files, calculating formulas, old `.doc` and `.xls`.
- Switching the board to Kiro V3, and how the agent reaches the Uplynk APIs (next topic).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| A malicious PDF runs script (pdf.js has had such flaws, the latest fixed in 6.2.108) | Ruling 5: no same origin, no network, nothing reachable; a test that script in the frame can't call the API |
| A zip bomb or a hostile XML | The guard checks declared sizes first and counts real output as it goes; no DOCTYPE; a time limit, run off the server's main thread (`worker_threads`) so a hang can't freeze the board |
| One maintainer on `fflate` | Exact pin; small enough to replace |
| A huge PDF stalls the page | Rendered in the frame's own task with a page cap and a deadline; the chip stays usable and says how far it got |
| A fitted copy loses detail a diagram needs | The original stays and is named too; 2000 px is the cap, not the target |
| The cap numbers are measured on one version | Named constants; VERIFY_01 re-measures them |

---

## Success Criteria

- [ ] A Word file comes back with headings, tables and picture files; an Excel range with values and formulas
- [ ] A zip expands into a new folder and nothing is overwritten; hostile archives are refused with a reason
- [ ] A real PDF with a diagram is seen by Kiro and Claude, by its page pictures; a too-big picture by its fitted copy
- [ ] A PDF that runs script reaches nothing; flag off is today's behaviour; all tests pass
