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
6. **The person's own name for a file** (point 356; FILES_01's notes: a wholly non-Latin name saves as
   `file.png`): the chip and the sent message show the name the person's file has. Contract first:
   `send_chat`'s `files` items become `{ path, label }`, `attachedFile` in the chat schema gains an optional
   `label` (1-200 characters, no control characters). Display only: it is shown as text, never reaches the
   agent's prompt (the prompt names paths alone), and the server still believes only `attachedFile`'s check
   of the path. Tests: a label with a line break is refused; a hostile label never reaches the prompt.
7. **Folder switch**: ready chips are cleared when the folder changes (their paths would be refused at
   Send, FILES_01's notes), and the composer's preview does not need to list files.
8. **Gallery**: a section, **last**, with the composer holding a chip in each state, the drop target
   showing, and a sent message with files; light and dark. **Checks**: unit tests, `check`, `verify`,
   `gen-api --check`, `tests/pages/chat*.spec.ts` on 5800; a look in a browser, light and dark.

## Validation

- [ ] Drop, paste, paperclip and keyboard each attach; every chip state shows and is announced
- [ ] A refused file says why and is never sent; files alone can be sent
- [ ] Contrast and focus pass in light and dark (APCA tiers per the project rules); flag off is today

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Blocked on two files outside this task's ownership (patch in TASK-STATUS Requests); everything in its own files is done · **Completed**:

### Changes Made
- Contract (point 356, first): `$defs/fileLabel`, `attachedFile.label`, `send_chat` `files` items `{ path, label? }`; `npm run gen`. Server: `attachedFiles` takes the items, keeps the label, refuses a path named twice; the prompt still names paths alone.
- Composer: `composer-attach.ts` (new: drag, drop, paste, paperclip, status line), `ComposerFile`, `ComposerFileWords`, `filesSaid`, `newestFile`, `pastedFiles`, `sendIntent` with files, `fileTemplate`, `attachTemplate`, `setFiles`, `chat-files`, `chat-file-remove`; states in `pattern.json`.
- Shell: `chat-bridge.ts` holds the files, checks size and count, uploads, sets each chip (`attachFiles`, `removeFile`, `files`, `uploading`, `fileLabel`, `attachedName`, `fileData`); `chat-panel.ts` puts them on Send and passes the words; words in `words/chat.ts`.
- Sent message: `fileChipTemplate`, `fileIcon`. Gallery: `attach-section.ts`, last. Docs: chat.md § Attaching, api.md 165.
- Tests: `tests/pages/chat-attach.spec.ts`, `chat-attach-gallery.spec.ts` (new baselines `chat-attach-{light,dark}-darwin.png`, after a look), `apps/board/tests/chat-attach.test.ts`, `packages/chat/tests/composer-files.test.ts`; `api-chat-files.test.ts`, `chat-schema.test.ts`, `chat-bridge.test.ts` extended.

### Issues & Resolutions
- `page-io.ts` (`attachChatFile`) and `feed-core.ts` (`PersonEntry.files`) are needed and in no one's list for this task. Not touched: requested as one patch, tried in a scratch copy of the worktree, where every check below ran. Until the patch lands the worktree does not type-check.
- A template's top-level call or interpolated string counts as running on import: the bundler then kept the chat's elements (28 KB) in the page's first chunk and put the gallery's stylesheet before the chat's, which moved three existing screenshots. Fixed with whole strings in `message-template.ts`; `chat-attach.spec.ts` now fails if the first chunks carry the composer. No screenshot was re-baselined.
- `createChatPanel` runs 51 lines and `chat-attach.spec.ts` 318: `verify` warnings only.

### Caught Beyond the Brief
- A paste from a spreadsheet or word processor carries a picture of what was copied beside its text; attaching it would have swallowed the text. Text wins unless it is only the files' names (`pastedFiles`).
- A file's name can hold a line break or a text-direction mark, which the contract refuses, and that would refuse the whole message: `fileLabel` cleans it first. A test holds the two equal.
- A state moving while focus sat on another chip's remove button redrew the row and lost focus (WCAG 2.4.3); focus and the row's scroll now stay. A refusal in a long row scrolls into view.
- Several files settling at once overwrite a live region: announcements within 100 ms go as one line (`announcer`).
- `uniqueItems` stopped catching a repeated path once items became objects: `attachedFiles` refuses it at `/files/<i>`.
- For the maintainer: a file deleted between attach and Send gets a toast, but `ApiError` drops the problem's pointers (`board/io/errors.ts`), so the chip stays ready and the page can't say which one. With the pointers it could refuse that chip.
- For the maintainer: a file dropped just outside the composer opens in the browser, replacing the board (no page-level guard; the shell's `App.svelte`, not this task's).
- For the maintainer: the board's Send sends `text: ''` and then `composer.clear()` wipes words typed in the composer (`boardSend`). Already so, and likelier now that a ready file enables it.
- For the maintainer: a clipped name's whole text is in the chip's tip and its remove button's name, which a sighted keyboard or touch user can't read. A refused chip goes with the message it was for: a judgement call.
- `.g-chat` and `.chat-panel` have equal specificity, so the gallery's heights depend on the bundler's stylesheet order; `.chat-panel.g-chat` would stop that. `chat-lazy.spec.ts`'s `CHUNK` pattern also misses the shared `chat-*.js` chunk.
- Live look: real page, light and dark, on a scratch board (drop, ready and refused); nothing was sent, so no CLI started. The sent message and uploading state were looked at in the gallery.

### Deviations from Plan
- D-068's rulings hold as written; none changed.
- `label` is optional in `send_chat` (the task writes `{ path, label }`): D-068 ruling 6 has nclite hand over paths, and a name with nothing left after cleaning has no label.
- Folder switch needs no code: the page reloads onto the new folder (`reloadOnto`, `folderMoved`), which clears the chips; a page spec holds it.
- Attaching lives in `chat-bridge.ts` as the plan says, though it has little to do with the board. Its own file would fit one job per file better; left for the orchestrator's call, as a new shell file is outside this task's list.

### Run 2

Point 357 (the orchestrator's call; the maintainer was told and can still say no): a file dropped just outside the composer must never replace the board.

**Status**: Completed · **Completed**: 2026-10-30

#### Changes Made
- Nothing else on the page listened for a native drag (only the composer; a card's move is pointer events), so nothing was reused beyond the composer's own handling.
- `apps/board/src/shell/file-drops.ts` (new) `guardFileDrops`: on the document, a dragged file that nothing took gets `preventDefault` and the no-drop cursor; only files. `App.svelte` starts it with the chat and the flag on, and removes it on unmount.
- `composer-attach.ts` `dropArea`: the composer's drop handling can sit on a host's panel; `chat-panel.ts` hands it the panel, so the feed, the header and the words all take a file with the same drop target on the composer.
- A dragged file passes over app frames, whose pages the guard can't reach: frames take `pointer-events: none` while a file is dragged.
- `tests/pages/chat-attach-drop.spec.ts` (new, real drags through CDP `Input.dispatchDragEvent`), `apps/board/tests/file-drops.test.ts` (new, removal included), chat.md § Attaching, `pattern.json`. No new sentence.

#### Issues & Resolutions
- The headless browser does not itself open a dropped file, so "the page stays the board" can't fail on its own. The spec fails first on what can: whether the page stopped the drag. It failed before the guard. With the no-drop answer the browser fires no `drop` at all, which is the point.
- CDP's `dragCancel` fires no `dragleave`, so leaving the window is tested by a leave event with no target and moving on to the board by a real drag.

#### Caught Beyond the Brief
- From memory of Chromium's drag code, an unhandled drop over a frame navigates the main frame, so the frames needed guarding too. Not established here: the test browser never navigates, so only "the page sees the drag over a frame's place" is proven, not what an unguarded frame would have done.
- Not covered: a drag that first enters the window directly over a frame isn't seen until it reaches the page. A frame's own page would have to guard that (`packages/ui` `vb-app-frame`, outside this run's files).
- While a file is dragged, app panels get no drops. No panel in `skills/` or the gallery takes any today; a future panel that wants them would need a decision.
- The panel's resize grip sits outside the `.chat-panel` element: a file dropped on that thin edge does nothing, safely.

#### Deviations from Plan
- `apps/board/tests/file-drops.test.ts` is a new test file outside the run's named paths: removal on unmount can't be driven from a page spec.
- Not looked at in a real browser by a person's own drag: an OS file drag can't be scripted in the browser pane, so the real drags are CDP's. The drop target's look is unchanged and in the gallery.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] COMPOSE_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes over 50 lines in chunks; `cwd`, not `cd … &&`; never re-baseline an existing screenshot (a `REQUEST`).
