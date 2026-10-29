# Chat Attachments - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-29 · **From**: maintainer points 351, 352 (2026-10-29)

---

## Problem Statement

The person cannot attach a file to a chat message. They want to drop, paste or pick a file (a picture,
a PDF, a text or data file) into the chat and have the agent, Claude Code or Kiro, read it.

---

## Current State

- The composer (`packages/chat/src/composer/`: `chat-composer.ts` `ChatComposer`, `composer-core.ts`
  `Chip`, `chipKey`, `withoutChip`) carries words and removable chips (cards and notes), and raises
  `chat-send`. It has no drop, paste or file picker.
- Send is `send_chat` (`POST /api/chats/{session}/messages`, `packages/format/schema/api/chat-message-request.schema.json`,
  `ChatMessage { text?, notes?, cards? }` in `apps/board/server/chat-prompt.ts`). The server builds one
  text prompt (`chat-prompt.ts`, the one builder); both adapters take text only
  (`AgentSession.prompt(text)`, `packages/agent/src/adapter.ts`).
- Bodies are JSON only, 64 KiB by default (`apps/board/server/body.ts` `readJson`, `BODY_LIMIT`; an
  operation may set its own limit).
- The access table (`packages/agent/src/access-rules.ts` `ACCESS_RULES`) lets the agent read all of
  `.visionboard/**` and refuses writing it, except `images/**` and `apps/**`.
- What each agent can open by path (live check 2026-10-29, Kiro CLI 2.35.2; Claude Code's Read tool):
  Claude Code reads images, PDFs and text files. Kiro's read tool reads text files; whether it opens an
  image by path is **not yet verified** (VERIFY_01 checks it live).

---

## Proposed Solution

Every attached file travels **by path** (point 352: no picture inside the message, so neither adapter
changes). The page uploads each file as it is attached; the server saves it under the board's folder
and answers with its path; Send carries the paths; the prompt names them; the agent opens them with its
own tools. Behind the flag `chatAttachments`.

### Rulings (planner's defaults; the maintainer confirms them in D-068)

1. **By path only**, pictures included. The prompt gets one more block, after the words and before the
   board's blocks: "The person attached these files:" and one relative path per line (words file).
2. **Where**: `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`; `<n>` counts up within the day so two
   files with one name never clash; `<name>` sanitised (letters, digits, `.`, `-`, `_`; at most 80
   characters; no leading dot; the extension kept). Day folders, not session folders: the first message
   of a new chat has no session yet.
3. **Limits**: 10 MB a file, 10 files a message. Any type: the board never serves these files back to a
   page (no GET route), so nothing in them runs in the board.
4. **Upload on attach**, not on Send, so a refusal (too big, too many) shows on the chip at once. A chip
   removed before Send leaves its file; clearing old attachments is a tracker row (out of scope).
5. **The agent may read the files and never change them**: an explicit `ACCESS_RULES` row
   `.visionboard/attachments/**` read allow, write refuse, with its own words ("the files the person
   attached").
6. **The upload is the host's job.** `packages/chat` stays host-independent (`docs/principles.md`
   § The board is a plugin): the composer takes files and raises an event with them; the board's shell
   (`apps/board/src/shell/chat-bridge.ts`) uploads through the API and tells the composer each chip's
   state. In nclite the host's chat does its own attaching; what it hands the board is the paths.
7. **The feed shows them**: `message_in` gains `files` (name, path, size); the message shows a file chip
   per file, as it shows card chips.

### Key Changes

1. **Contract first** (FILES_01): a new operation `attach_chat_file` (`POST /api/chat/files`, body
   `{ name, type, data }` with `data` base64, its own body limit just over 10 MB as base64), answering
   `{ file: { name, path, size } }`; `chat-message-request` gains `files` (paths returned by it, at most
   10); the chat schema's `message_in` gains `files` (additive: `$id` stays chat/1). `npm run gen`.
2. **Server** (FILES_01): `apps/board/server/chat-files.ts` (new) saves one file (sanitised name, the
   real path must stay inside `.visionboard/attachments/`, written with `writeFileAtomic`); `send_chat`
   checks every path it is given is one of those files and still there; `chat-prompt.ts` adds the
   attached-files block; words in `apps/board/server/words/server-chat.ts`.
3. **Access** (FILES_01): the `ACCESS_RULES` row (ruling 5) and its words in
   `packages/agent/src/words/agent-access.ts`; Claude's deny rules and Kiro's agent rules regenerate from
   the table (no hand edit).
4. **Composer** (COMPOSE_01): drop onto the composer, paste, and a paperclip button; a file chip per
   file with its states (uploading, ready, refused with the reason, removable); the composer raises
   `chat-files` with the `File`s and takes each chip's state back from the host. The board's shell
   uploads and puts the paths on Send. The feed's message shows its file chips.
5. **Docs**: api.md (the operation), chat.md (attaching), the skill's line on attached files, D-068.

---

## Dependencies

- FILES_01 (wave 1) before COMPOSE_01 (wave 2): the composer's shell wiring calls the operation and
  shows `message_in.files`. VERIFY_01 (wave 3) last.
- Shared Foundations: the operation and its generated types (FILES_01); the file chip (COMPOSE_01).
- No new dependency.

---

## House Rules

- **Orchestrator-only files**: `docs/decisions.md` (D-068 appended with the maintainer's yes),
  `docs/specification/modules.md` (`npm run map`), `cortex-tasks/tracker.md`, existing screenshots
  (re-taken only after a look), `packages/format/src/flags.ts` (the flag lands before wave 1).
- **Commits**: the orchestrator commits and tags per wave (`attach/wave-N`); sub-agents never commit.
- **Project checks**: `npm run verify` (300-line warning, 500 fails), `check`, `gen-api --check`,
  unit tests, the page specs for what changed; the full page suite at each wave gate on port 4710.
- **New gallery sections go last** (a fractional height shifts the screenshots after it).
- **No test starts a real CLI**; the live look with real Claude and Kiro is the orchestrator's, with the
  maintainer's yes.

---

## Out of Scope

- A picture inside the message itself (an image block to either agent).
- Clearing old attachments (tracker row), and showing an attached file's contents in the board.
- Attaching from the board itself (a card's image to the chat), and attaching in nclite's chat.
- Kiro V3 (point 349: later).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| A crafted name escapes the folder (`../`, a link, an odd Unicode form) | Sanitise, then check the real path stays inside the real attachments folder (the pattern of `images.ts`); tests for each |
| `send_chat` names a file the person did not attach (a path the page made up) | Only paths under the attachments folder that exist are accepted; anything else is refused (422) |
| A large base64 body holds the server | One file per request, its own limit, the 413 that `readJson` already gives |
| Kiro cannot open a picture by path | VERIFY_01 checks it live; if it cannot, the composer says so for Kiro (a words line), never silently |
| Attached files land in the person's project, where their git may pick them up | chat.md says where they go; this repo's `.gitignore` gains `.visionboard/attachments/` (orchestrator, before wave 1); whether the board should offer that to other projects is a VERIFY_01 note |
| `chat-composer.ts` grows past 300 lines | The attaching part goes in its own file in `composer/` |

---

## References

- `docs/principles.md` (§ The board is a plugin, § The contract comes first)
- `packages/chat/src/composer/` · `apps/board/src/shell/chat-bridge.ts` · `apps/board/server/chat.ts`
  (`CHAT`, `send_chat`) · `chat-prompt.ts` · `body.ts` · `images.ts` · `atomic-file.ts`
- `packages/format/schema/api/chat-message-request.schema.json` · `packages/chat/schema/chat-event.schema.json`
- `packages/agent/src/access-rules.ts` · `docs/specification/{api,chat,words}.md`
- `temp/kiro-v3-live.ts` (the live check used on 2026-10-29; git-ignored)

---

## Success Criteria

- [ ] Drop, paste and the paperclip each attach a file; its chip shows uploading, then ready or the reason it was refused
- [ ] Send carries the paths; the agent is told them and opens them (live look: Claude a picture and a PDF, Kiro a text file and a picture)
- [ ] A name never escapes the folder; `send_chat` refuses a path it did not save; the agent cannot change an attached file
- [ ] Flag off: no paperclip, no drop, today's behaviour
- [ ] Every state, light and dark, in the gallery; all tests pass
