# COMPOSE_01_attach-in-composer: Attaching in the composer

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The person attaches files to a chat message by dropping them on the composer, pasting, or the
paperclip button; each shows as a file chip that says whether it is uploading, ready, or refused and
why; Send carries the ready files; the sent message shows its files. Behind `chatAttachments`; off, no
paperclip, a drop or paste of a file does nothing new.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (COMPOSE_01)
- **Files to reference**: PLAN.md rulings 4, 6, 7; FILES_01's notes (the operation, its refusals, the
  generated types); `packages/chat/src/composer/` (`ChatComposer`, `Chip`, `chipKey`, `withoutChip`,
  `composer-template.ts`, `pattern.json`: the chip pattern and its states, extend it); `packages/chat/src/message/`
  (how a sent message shows its card chips); `apps/board/src/shell/chat-bridge.ts` (how the shell calls the
  API and hands the composer its view, as it does `placeholder`); `apps/board/src/gallery/chat-section.ts`
- **Shared artifacts to reuse**: the `attach_chat_file` operation and generated types (FILES_01). Import
  them; do not re-declare the shapes.
- **Skills**: `cortex-architecture`, `cortex-docs`, `design:accessibility-review`

## Steps

1. **Failing page specs first** (`tests/pages/chat-attach.spec.ts`, a fake agent): drop a file, paste a
   picture, pick one with the paperclip; each chip goes uploading → ready; a file over 10 MB and an 11th
   file show refused with the reason and send nothing; a chip is removed by its button and by keyboard;
   Send with only files (no words) works; the sent message shows its file chips; flag off, no paperclip.
2. **The composer** (host-independent, `packages/chat` takes no API): a file chip kind beside card and
   note chips, its states in `pattern.json` (uploading, ready, refused; plus the chip's own hover, focus,
   pressed); drop target state on the composer while a file is dragged over it (only files, not text or
   a card); paste of files; the paperclip button (a native file input behind it, multiple). The composer
   raises `chat-files` with the `File`s and takes each chip's state from the host. If `chat-composer.ts`
   would pass 300 lines, the attaching part goes in its own file in `composer/`.
3. **The shell**: `chat-bridge.ts` uploads each file (base64 in JSON, one request each), sets the chip's
   state from the answer or refusal, checks size and count before uploading (same limits as the server,
   the server still checks), and puts the ready paths in Send's `files`. A pasted picture with no name
   gets one from the words file ("pasted picture", the date, its type's extension).
4. **The sent message** shows a file chip per `message_in.files` (name; a picture and a document look
   different by icon only). Not a link: the board serves no attached file.
5. **Words**: every new sentence (the paperclip's label and tip, each refusal, the drop hint, the
   pasted-picture name) in `apps/board/src/shell/words/chat.ts`, handed to the composer like `placeholder`.
6. **Gallery**: a section, **last**, with the composer holding a chip in each state, the drop target
   showing, and a sent message with files; light and dark. **Checks**: unit tests, `check`, `verify`,
   `gen-api --check`, `tests/pages/chat*.spec.ts` on 5800; a look in a browser, light and dark.

## Validation

- [ ] Drop, paste, paperclip and keyboard each attach; every chip state shows and is announced
- [ ] A refused file says why and is never sent; files alone can be sent
- [ ] Contrast and focus pass in light and dark (APCA tiers per the project rules); flag off is today

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

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] COMPOSE_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes over 50 lines in chunks; `cwd`, not `cd … &&`; never re-baseline an existing screenshot (a `REQUEST`).
