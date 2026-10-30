---
task_name: Read Attachment
created: 2026-10-30
completed:
status: in-progress
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
| 1 | READ_01 | 1 | strong | Security engineer who reviews document parsers — every file is hostile until read, a declared size is a claim until counted, and a parser's hang is as bad as its crash. | [The reader and the tool](./READ_01_reader-and-tool.md) | Pending | port 6100 |
| 2 | PAGES_01 | 2 | strong | Browser security engineer who builds sandboxes — code that parses a stranger's file gets no origin, no network and nothing to reach, and whatever it hands back is checked again. | [PDF pages and fitted pictures](./PAGES_01_pdf-pages-and-pictures.md) | Pending | port 6200 |
| 3 | VERIFY_01 | 3 | strong | Solutions architect new to this project, handed real customer documents and the board — does the agent actually see the diagram, the formula, the table, and does a hostile file reach anything? | [Verification](./VERIFY_01_read-attachment-verification.md) | Pending | port 6300 |

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
- 

### Security
- 

### Requests
| From | File | What | Status |
|------|------|------|--------|
