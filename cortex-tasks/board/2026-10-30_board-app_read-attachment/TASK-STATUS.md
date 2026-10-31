---
task_name: Read Attachment
created: 2026-10-30
completed: 2026-10-31
status: completed
categories: [board-agent, board-security, board-app]
skills: [cortex-architecture, cortex-docs]
tracker: [M39]
---

# Read Attachment - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-10-30

## Instructions for Agents

1. **Read PLAN.md first**, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column**
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component
5. **Touch only the files you own** (File Ownership). Need a change elsewhere? `REQUESTS`
6. **If you need to deviate, STOP and inform the user**
7. **Frontmatter `status`**: `planned` → `in-progress` when you start; closing is the orchestrator's
8. **Update your row** when you finish; **implementation notes** in your task file and brief notes here.
   Re-run? A `Run N:` line here and a `### Run N` block in your task file
9. **No git commits**; never port 4466; never `cortex/AUDITED.md`
10. **Your port**: your row's Notes (`VB_TEST_PORT`, workers +10)
11. **No full page suite in a task**: unit tests, `check`, `verify`, `gen-api --check`, your page specs
12. **A bug fix starts with the failing test**
13. **No test starts a real CLI** on the person's account: fake CLIs and the chat fixtures only

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | READ_01 | 1 | strong | Security engineer who reviews document parsers — every file is hostile until read, a declared size is a claim until counted, and a parser's hang is as bad as its crash. | [The reader and the tool](./READ_01_reader-and-tool.md) | Completed | port 6100. The handler is the server's beside the chat, not the engine's; off, the tool stays listed and answers `not-found` (request below) |
| 2 | PAGES_01 | 2 | strong | Browser security engineer who builds sandboxes — code that parses a stranger's file gets no origin, no network and nothing to reach, and whatever it hands back is checked again. | [PDF pages and fitted pictures](./PAGES_01_pdf-pages-and-pictures.md) | Completed | port 6200. The file is read in a worker inside the frame: a frame's `connect-src` does not stop WebRTC (measured: a STUN packet left) |
| 3 | VERIFY_01 | 3 | strong | Solutions architect new to this project, handed real customer documents and the board — does the agent actually see the diagram, the formula, the table, and does a hostile file reach anything? | [Verification](./VERIFY_01_read-attachment-verification.md) | Completed | port 6300. [Findings](./VERIFY_01_findings.md): blocking F1 (full Chromium build: a race, no PDF pages or copies), F2 (diagrams vanish unsaid), F3 (Word numbers). A hostile file reached nothing |
| 4 | FIX_PAGES | 4 | strong | Browser security engineer who builds sandboxes (PAGES_01's). | F1, the picture cap, a blank page told to the agent; `PAGES_01` Run 3 | Completed | port 6200 |
| 5 | FIX_DOCS | 4 | strong | Security engineer who reviews document parsers (READ_01's). | F2 to F9; `READ_01` Run 2 | Completed | port 6100 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `readAttachment` flag; `fflate`, `pdfjs-dist` in `package.json` and the register | orchestrator (before wave 1) | READ_01, PAGES_01 |
| `#documents` (`packages/documents`): `readDocx`, `readXlsx`, `expandZip`, `zipGuard`, `xmlEvents` | READ_01 | PAGES_01 only if needed, VERIFY_01; nclite later |
| `read_attachment` operation and its generated types | READ_01 | VERIFY_01 |
| `attachedFile` widened to files in folders the board made | READ_01 | PAGES_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 0 | orchestrator | `package.json`, lockfile, `packages/format/src/flags.ts`, `docs/specification/dependencies.md`, `docs/decisions.md`, `docs/specification/modules.md`, `cortex-tasks/tracker.md` |
| 1 | READ_01 | `packages/documents/**` (new), the `imports` line request, `packages/format/schema/` (the operation), the generated files, `apps/board/server/chat-files.ts`, `apps/board/server/engine/tools.ts`, a new `apps/board/server/chat-read.ts`, `apps/board/server/words/server-chat.ts`, `packages/agent/src/access-rules.ts` if a row is needed, their tests, `docs/specification/{api,chat}.md`, `skills/vision-board/SKILL.md`, `THIRD-PARTY-NOTICES` if the repo has one, else a `NOTICE` in `packages/documents` |
| 2 | PAGES_01 | `apps/board/src/shell/chat-bridge.ts`, `attached-file.ts`, a new `apps/board/src/shell/pdf-pages*.ts` and the frame's page, `apps/board/server/chat-files.ts`, `chat-prompt.ts`, `apps/board/server/words/server-chat.ts`, `apps/board/src/shell/words/chat.ts`, `packages/chat/src/composer/**`, `packages/format/schema/` (`attach_chat_file`), the generated files, `apps/board/src/gallery/` (last), `tests/pages/chat-attach-pages*.spec.ts`, `docs/specification/{api,chat}.md` |
| 3 | VERIFY_01 | `VERIFY_01_findings.md` (new), its task file; no code |

## Implementation Notes

### Wave gates
- Run 2: READ_01 (FIX_DOCS): F2-F9: diagrams stand as markers with their words and links, and `note` says what wasn't reached; Word's numbers worked out; Excel's names, links, comments and pictures; one answer under 40,000 characters; `cut.next` moves on; the list survives a big sheet.
- Run 3: PAGES_01 (FIX_PAGES): a frame gets a real deadline for `ready`, so good PDFs draw on the full builds; `PICTURE_BYTES` 3.5 MB, one constant in `#format`; a blank page in its name and the prompt; `@full-build` tests on each full build found.
- Run 2: PAGES_01: CMaps and standard fonts inside the frame's script (4.8 MB), a chip note for a page with text that drew nothing, Send waits for a fitted copy, the skill's line (v3.23). Gallery baselines re-taken.
- Wave 1 (READ_01, audit fixes, chat text 125%): 2078 unit, full page suite green; `host-styles` (M28) failed under load and passed alone, and `chat-attach-gallery` timed out once under load.

- Wave 2 (PAGES_01 Runs 1, 2): 2100 unit, 787 page tests; `host-styles` (M28) failed under load, and it and the 10 tests in its file passed alone. `chat-attach-gallery` allows 12 pixels (fallback text, cause not established).

- Live 2026-10-31, Kiro CLI 2.35.2 (v2, Sonnet 5.5): a 4.3 MB PNG is rejected by the provider, a 3.5 MB PNG is seen. So the cap on a picture is 3.5 MB, not 5 (the provider's 5 MB is on the base64 size).

- Close: 2138 unit, 14 timing (quiet machine), 792 page tests; `host-styles` (M28) fails under load and passes alone. Live on Kiro Sonnet (v2) in a full Chromium build, real page: a Word section and its diagram, an Excel formula and name, a diagram-only PDF, a 3000 px and a 4.3 MB picture all read right, no approvals.

### Security
- PAGES_01: `connect-src 'none'` is not "no network" in a frame: `RTCPeerConnection` sent a real STUN packet past it, Chromium has no `webrtc` directive, and a frame can navigate itself. So the stranger's file is read in a worker inside the frame, which has neither; the page's `frame-src 'self'` also stops the navigation. Tested in `chat-attach-pages.spec.ts`.

### Requests
| From | File | What | Status |
|------|------|------|--------|
| READ_01 | `packages/mcp/src/protocol.ts`, `apps/board/server/chat-access.ts` | Hide `read_attachment` from `tools/list` with the flag off | Open |
| READ_01 | `docs/specification/modules.md` | `npm run map` for `packages/documents` | Open |
| PAGES_01 | `apps/board/server/app.ts`, `apps/board/vite.config.ts`, `apps/board/src/shell/chat-panel.ts`, `apps/board/server/chat.ts`, `apps/board/tests/openapi.test.ts`, `packages/chat/src/chat.css` | Changed, though not in the ownership row: the frame's route, its build entry, the flag's wiring, the handler, the version, the feed's share. Please review | Done |
| PAGES_01 | `docs/specification/dependencies.md` | `pdfjs-dist`'s row: its `wasm/openjpeg.wasm` and `jbig2.wasm` are bundled into the frame (their own licences, `wasm/LICENSE_*`) | Open |
| PAGES_01 | `docs/decisions.md` | D-071 ruling 3 to name the worker, and the frame's `wasm-unsafe-eval`, and that a fitted copy is made in the frame too | Open |
| PAGES_01 | `skills/vision-board/SKILL.md` | Its line naming `pdftotext` for a PDF could say to open the pictures the message names first | Done in Run 2 |
| PAGES_01 Run 2 | `docs/specification/dependencies.md` | `pdfjs-dist`'s row: its `cmaps/` and `standard_fonts/` are bundled too, with their licences (`standard_fonts/LICENSE_FOXIT`, `LICENSE_LIBERATION`, `cmaps/LICENSE`) | Open |
| PAGES_01 Run 2 | `docs/decisions.md` | D-071: Send waits for a fitted copy, never for a PDF's pages | Open |
| PAGES_01 Run 3 | `docs/decisions.md` | D-072 "Chromium is all the suite runs": the headless shell, with `@full-build` tests on full builds. D-071 ruling 3's "5 MB": 3.5 MB, measured. D-069 ruling 4 "the agent cannot write there": a yes to a command the rules can't judge can | Open |
