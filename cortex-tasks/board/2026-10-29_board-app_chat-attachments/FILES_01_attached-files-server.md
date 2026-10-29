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

**Status**: Pending · **Completed**:

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- 

### Deviations from Plan
- 

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] FILES_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes over 50 lines in chunks; `cwd`, not `cd … &&`.
