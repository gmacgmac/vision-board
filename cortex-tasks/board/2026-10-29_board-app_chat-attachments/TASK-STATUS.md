---
task_name: Chat Attachments
created: 2026-10-29
completed:
status: in-progress
categories: [board-app, board-security, board-agent]
skills: [cortex-architecture, cortex-docs]
---

# Chat Attachments - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-10-29

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
| 1 | FILES_01 | 1 | strong | Application security engineer who reviews file-upload endpoints — a name the person typed is hostile until sanitised and its real path proven inside the folder; a server never trusts a path the page sends back. | [Attached files: contract, storage and prompt](./FILES_01_attached-files-server.md) | Blocked | port 5700; own files done, needs the four-file patch below |
| 2 | COMPOSE_01 | 2 | strong | Product designer for chat tools who works to WCAG 2.2 — attaching must work by drag, paste, button and keyboard alike, every chip state must say what is happening, and a refused file must say why. | [Attaching in the composer](./COMPOSE_01_attach-in-composer.md) | Pending | port 5800 |
| 3 | VERIFY_01 | 3 | strong | QA engineer new to this project, given the board and a chat with an agent — tries odd, huge, many and hostile files, every way to attach, and checks the agent really opens what was sent. | [Verification](./VERIFY_01_attachments-verification.md) | Pending | port 5900 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `chatAttachments` flag in `packages/format/src/flags.ts` | orchestrator (before wave 1) | FILES_01, COMPOSE_01 |
| `attach_chat_file` operation, `chat-message-request` `files`, `message_in` `files`, and their generated types (`packages/format/src/api-types.generated.ts`) | FILES_01 | COMPOSE_01, VERIFY_01 |
| `apps/board/server/chat-files.ts` (`saveAttachment`, `attachedFile`: the one check that a path is an attached file) | FILES_01 | VERIFY_01 |
| The composer's file chip and its states (`packages/chat/src/composer/`) | COMPOSE_01 | VERIFY_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 0 | orchestrator | `packages/format/src/flags.ts`, `.gitignore`, `docs/decisions.md`, `docs/specification/modules.md`, `cortex-tasks/tracker.md`, existing screenshots |
| 1 | FILES_01 | `packages/format/schema/api/` (new `chat-file-request`/`chat-file-response`, `chat-message-request`), `packages/format/schema/openapi.json` (the new operation), the generated files `npm run gen` writes, `packages/chat/schema/chat-event.schema.json` (`message_in.files`), `apps/board/server/chat-files.ts` (new), `chat.ts`, `chat-prompt.ts`, `chat-session.ts` (passing files through only), `apps/board/server/words/server-chat.ts`, `packages/agent/src/access-rules.ts` (one row), `packages/agent/src/words/agent-access.ts`, their tests, `docs/specification/api.md`, `docs/specification/chat.md` § attaching (the server side), `skills/vision-board/SKILL.md` (one line on attached files; version line) |
| 2 | COMPOSE_01 | `packages/chat/src/composer/**`, `packages/chat/src/message/**` (the file chips on a sent message), `packages/chat/src/index.ts` (exports), the chat's words, `apps/board/src/shell/chat-bridge.ts`, `chat-panel.ts`, `chat-view.ts` (the upload and Send wiring), `apps/board/src/shell/words/chat.ts`, `apps/board/src/gallery/` (the new section last), `tests/pages/chat-attach*.spec.ts` (new), `docs/specification/chat.md` § attaching (the panel) |
| 3 | VERIFY_01 | `VERIFY_01_findings.md` (new), its task file; no code |

## Implementation Notes

### Wave gates
- 

### Security
- 

### Requests
| From | File | What | Status |
|------|------|------|--------|
| FILES_01 | `apps/board/server/chat-sessions.ts`, `app.ts`, `project.ts`, `atomic-file.ts` | One patch: files through `joined`, `deliver`, `inFolder`, `tell`; the `chatAttachments` flag to `chats().attachments`; `writeFileAtomic` takes bytes. Blocking | Open |
| FILES_01 | `docs/specification/modules.md` | `npm run map` for `chat-files.ts`. Non-blocking | Open |
| FILES_01 | `packages/chat/src/events.ts` | `MessageIn` gains `files`, for COMPOSE_01 (not in anyone's ownership). Non-blocking | Open |
