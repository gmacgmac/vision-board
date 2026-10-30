# FILES_01_attached-files-server: Attached files — contract, storage and prompt

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The server takes one attached file at a time, saves it under `.visionboard/attachments/`, answers with
its path; Send carries those paths; the agent's prompt names them; the agent may read them and never
change them. Behind `chatAttachments` (server flags, `VB_FLAGS`); off, the operation answers 404 and
Send refuses `files`.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (FILES_01)
- **Files to reference**: PLAN.md rulings 1-7; `apps/board/server/chat.ts` (`CHAT`, `send_chat`, how
  `list_permissions` was added: the newest operation, follow it), `chat-prompt.ts` (`ChatMessage`, the
  one prompt builder), `body.ts` (`readJson`, `checkBody`, a per-operation limit), `images.ts` (the real
  path inside the real folder), `atomic-file.ts` (`writeFileAtomic`), `problem.ts`, `scripts/gen-api.mjs`
  (`npm run gen`), `packages/agent/src/access-rules.ts` (`ACCESS_RULES`, how `images/**` sits under
  `.visionboard/**`)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** (server unit tests, the fake CLIs): a file saved and its path returned; two
   files of one name on one day get different paths; names `../x`, `a/b`, `.env`, `CON`, 200 characters,
   Unicode, empty, all dots are sanitised and stay inside; a link planted at
   `.visionboard/attachments/<day>` pointing outside is refused; 10 MB + 1 byte is 413; bad base64 is 400;
   `send_chat` with a path it did not save, a path outside, or a file since deleted is 422 with a pointer
   to `/files/<i>`; 11 files is 422; the prompt carries the attached-files block once, in its place;
   `message_in` carries `files`; the agent's policy allows reading an attached file and refuses writing
   it (both adapters' generated rules); flag off, 404 and `files` refused.
2. **Contract**: `chat-file-request.schema.json` (`name`, `type`, `data`), `chat-file-response.schema.json`
   (`file: { name, path, size }`), `chat-message-request` `files` (array of relative paths, at most 10),
   the operation in `openapi.json` (`attach_chat_file`, `POST /api/chat/files`, not an agent tool: no
   `x-agent`), `message_in.files` in the chat schema (additive, `$id` stays chat/1). `npm run gen`.
3. **Server**: `chat-files.ts` with `saveAttachment(folder, { name, type, data })` and
   `attachedFile(folder, path)` (the one check, used by `send_chat`); the handler in `chat.ts`; the body
   limit for this operation only.
4. **Prompt**: `chat-prompt.ts` adds "The person attached these files:" and one path per line (words in
   `server-chat.ts`), after the words, before the board's blocks; the `message_in` keeps the files.
5. **Access**: the `ACCESS_RULES` row `.visionboard/attachments/**` read allow, write refuse, with new
   words (`theirAttachments`); the policy tests and the generated Claude and Kiro rules tests cover it.
6. **Docs**: api.md (the operation, its limits and refusals), chat.md § Attaching (where files go, that
   the agent reads them by path, that the board never serves them), the skill's line on attached files
   (version bump). **Checks**: unit tests, `check`, `verify`, `gen-api --check`, `tests/pages/chat*.spec.ts`
   on 5700.

## Validation

- [ ] Every case in step 1 passes; flag off is today's behaviour
- [ ] A hostile name never leaves the folder; `send_chat` takes only paths `attachedFile` accepts
- [ ] The agent can read an attached file and cannot change it (policy and both generated rule sets)

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Blocked on four files outside this task's ownership (requested below); everything in its own files is done · **Completed**:

### Changes Made
- Contract: `chat-file-request`, `chat-file-response`, `chat-message-request` `files`, `attach_chat_file` in `openapi.json` (1.32.0, its own 409 response `chatFileConflict`), `message_in.files` and `$defs/attachedFile` in the chat schema; `npm run gen`.
- Server: `apps/board/server/chat-files.ts` (`attachmentName`, `saveAttachment`, `attachedFile`, `attachedFiles`), the handler and `filesOf` in `chat.ts`, the block and `ONLY_FILES` in `chat-prompt.ts`, `MessageIn.files` in `chat-session.ts`, words in `server-chat.ts`.
- Access: the `.visionboard/attachments/**` row and `theirAttachments`; Claude's and Kiro's rules follow from the table.
- Docs: api.md 164-166, chat.md § Attaching and the access list, SKILL.md v3.19.
- Tests: `apps/board/tests/chat-files.test.ts`, `api-chat-files.test.ts` (new); policy, command, Claude, Kiro, schema, route and openapi tests extended.

### Issues & Resolutions
- The ownership table leaves out four files the task needs. Not touched: requested as one patch, tried in a scratch copy of the worktree.
  - `apps/board/server/chat-sessions.ts`: `joined`, `deliver`, `inFolder`, `tell` drop or refuse `files` without it, and it carries the flag. The table names `chat-session.ts`, which only holds the type.
  - `apps/board/server/app.ts`, `project.ts`: the only way `VB_FLAGS` reaches a handler.
  - `apps/board/server/atomic-file.ts`: `writeFileAtomic` takes text only; it needs bytes too.
- Until the patch lands the server fails closed: `chats().attachments` is undefined, so `attach_chat_file` answers 404 and Send refuses `files`.

### Caught Beyond the Brief
- A fullwidth `．．／` folds to `../` under NFKD, so the name is folded before it is split, not after (tested).
- `mkdir -p` through a linked `attachments` would make the day folder outside before any real-path check, so each step is made and checked with `lstat` in turn. That proves more than the `images.ts` real-path compare: no link at any step, not just an end inside.
- 10 MB and 10 MB + 1 byte have the same base64 length, so the body limit can't tell them apart; the decoded size is checked too.
- A path going into the prompt could carry a line break and write its own prompt lines; `attachedFile`'s exact shape refuses it (tested).
- A body over the limit would say "over the 13 MB limit" to a person who sees a 10 MB rule; it is refused in the file's words.
- Saved files are 0600, as `permissions.json` is: what a person attaches may be private.
- For COMPOSE_01: a wholly non-Latin name saves as `file.png`, and the chip and feed show the saved name, so the person may not recognise it. The rulings say "letters"; ASCII was the safe reading (80 Unicode letters can pass a disk's 255-byte limit). Worth the maintainer's look.
- For COMPOSE_01: after a folder switch a ready chip's path is refused at Send (`/files/<i>`), so the chips should clear on a switch.
- For VERIFY_01: an attached file's words can try to steer the agent; the access rules and approvals still hold (chat.md § Attaching, Not covered). A file deleted while its message waits for the turn is checked at Send, not when the message goes.
- `type` is required by the contract and not used by the server.

### Deviations from Plan
- D-068's rulings hold as written; none changed.
- The task says no `x-agent` on the operation; `apps/board/tests/openapi.test.ts` needs a boolean on every operation, so it is `x-agent: false`, as `forget_permission` has.
- `<YYYY-MM-DD>` is the UTC day (the rulings don't say).
- `message_in.files` allows 200, not 10: a message joined while the agent works carries both messages' files. `send_chat` still takes 10.
- Added the `conflict` refusal for a planted link (the task says "refused" without a code).

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] FILES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes over 50 lines in chunks; `cwd`, not `cd … &&`.
