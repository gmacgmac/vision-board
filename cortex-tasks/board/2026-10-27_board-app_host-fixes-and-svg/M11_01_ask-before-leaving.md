# M11_01_ask-before-leaving: The host asks before words are lost

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The board tells its host when a note holds unsaved words, and gives the host one call that asks the
person before they're lost, so closing the board's pane (or the tab) never throws away what someone
was writing without asking.

---

## Context

Tracker M11, from the tidy-up's review (`VERIFY_01_findings.md` F2): `apps/board/src/board/mount.ts`
`unmount` calls `stop` → `board.destroy()` with no check, so a dirty note bubble's words vanish. The
board's own rule (`notes/note-discard.ts`) is that changed words are never lost silently, but it
covers only the board's own moves: Esc, Cancel, another bubble (`mayLeave`, `bindDiscard`).

**The maintainer's choice (2026-10-27):** the board tells the host it holds unsaved words, and the
host asks first. Not "unmount saves a draft". nclite's draft says `unmount()` saves anything being
written (`~/ai/nclite/docs/plugins.md` § The view and its host, read only), so this is a difference
the nclite reply must state (the orchestrator's file: a `REQUEST`).

The contract, decided at planning (change `host.ts` first, then the code):

- `BoardView.unsaved(): boolean`: true while a note bubble is open with changed words. Synchronous,
  so a host can call it from `beforeunload`, or to word its own question.
- `BoardView.leave(): Promise<boolean>`: true at once when nothing is unsaved. Otherwise it asks
  through `host.confirm`, with the board's existing discard words (`DISCARD_ASK`, reused through
  `mayLeave`). OK resolves true (the host then unmounts); Cancel resolves false and puts focus back
  in the text.
- `unmount()` stays a plain, synchronous teardown. A host calls `leave()` first; components.md says so.

The standalone page is the first host to use it. Behind a new flag, while `unsaved()` is true, a tab
close or reload gets the browser's own "Leave site?" prompt (`beforeunload`). The listener is added
only while words are unsaved.

Wave 2: M10_01 has finished `keys.ts` and the host fixture (with host controls); build on them.

**Read previous task notes in TASK-STATUS.md before starting** (M10_01's especially).

---

## Inputs

- **Files to modify**: `apps/board/src/board/host.ts` (`BoardView`), `apps/board/src/board/mount.ts`
  (`mount`, `MountedBoard`), `apps/board/src/board/notes/` (`notes.ts` `createNoteFlow`,
  `note-discard.ts`: expose what's needed, reuse `mayLeave`), the board's composition root if it must
  pass it through (`createBoard`, only to expose the notes flow's state), `apps/board/src/board/words/confirm.ts`
  (only if a new sentence is truly needed), `apps/board/src/shell/page-host.ts` and `App.svelte` (the
  standalone guard), `packages/format/src/flags.ts` (the new flag), `tests/pages/board-host.spec.ts`,
  `tests/pages/board-host-fixture.ts`, `tests/pages/note*.spec.ts`, unit tests beside the notes flow,
  `docs/specification/components.md` § The board's host interface
- **Files to reference**: `packages/ui/src/note-bubble/vb-note-bubble.ts` (`dirty`, `focusText`,
  `cancelIntent`), `apps/board/src/board/notes/notes.ts` (where `mayLeave` is called today with
  `d.discard`), `~/ai/nclite/docs/plugins.md` § The view and its host
- **Patterns to follow**: `mayLeave(bubble, ask)`: "unchanged never asks; Cancel puts focus back"
- **Shared artifacts to reuse**: M10_01's host controls in `board-host-fixture.ts`, and its key rule
  (focus back in the text after Cancel must still take keys)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns (TASK-STATUS.md File Ownership). Need a change elsewhere?
> List it under `REQUESTS` in your return block.

---

## Steps

1. [x] **Every place a person types inside the board's root**: today the note bubble (`vb-note-bubble`,
   on cards and containers) is the only one found at planning. Confirm by search, and list what you
   find in your notes. Anything else that holds typed words joins `unsaved()`. The standalone page's
   own Reply panel and chat composer are outside the board: report them, don't change them. Also
   list the board's own moves that close an open bubble without the person asking (another board
   chosen, a redraw that removes or replaces its card, a folder switch): say whether each asks
   today. One that loses words silently inside the files you own goes through `mayLeave` too;
   anywhere else, a `REQUEST`.
2. [x] **Failing tests first**:
   - unit: with no bubble open, or one open but unchanged, `unsaved()` is false and `leave()` resolves
     true without calling `confirm`; with changed words, `unsaved()` is true, `leave()` calls
     `host.confirm` once with `DISCARD_ASK`'s words, resolves false on Cancel (focus back in the text,
     the words still there), true on OK;
   - page (`board-host.spec.ts`): the fake host gets a Close button outside both boards that does
     `if (await view.leave()) view.unmount()`. Write in a note, press Close: the host's confirm shows
     the discard question. Cancel: the board stays, the words stay, focus is in the text, and a key
     typed goes into the note. OK: the board unmounts and leaves nothing. A Close with an unchanged
     note unmounts at once, with no question. Two boards: only the one with unsaved words asks.
   See them fail.
3. [x] **The contract** (`host.ts` `BoardView`): `unsaved()` and `leave()`, each with a comment saying
   what a host does with it, and that `unmount` doesn't ask.
4. [x] **The code**: the notes flow tells whether its open bubble is dirty, and offers its `mayLeave`
   with the host's confirm. `mount` wires both into the view it returns. Reuse `mayLeave`; don't write
   a second "is it dirty, ask, refocus" path. A `leave()` called while one is already asking returns
   the same answer, not a second dialog.
5. [x] **The standalone page** (`page-host.ts` / `App.svelte`, behind the new flag in
   `packages/format/src/flags.ts`): while `unsaved()` is true, a `beforeunload` listener asks the
   browser to prompt. Add it when words become unsaved and remove it when they're saved, sent or
   discarded, and on unmount. Find the moment cheaply: the bubble's own input or dirty change, not a
   poll. The page's programmatic reloads (switching the open folder, a rebuilt page, a refused cookie)
   prompt too. Say in your notes whether any of them should ask through the shell's dialog instead.
   Name the flag in the existing style; give it a description and a default (propose on, since words
   lost is the worse failure).
6. [x] **Docs** (`cortex-docs`): components.md § The board's host interface: `unsaved` and `leave`
   under what the view gives back; "a host calls `leave()` before `unmount()`"; the difference from
   nclite's draft under Differences; the M11 gap removed from the "Open (VERIFY_01 …)" sentence. Name
   the symbols and tests.
7. [x] **The nclite reply** (`REQUEST` to the orchestrator): one row under Differences we ask of the
   draft. Draft: "`unmount()` saves anything being written" → "`leave()` asks the person first,
   then the host unmounts; `unsaved()` for the host's own question or `beforeunload`", because the
   person decides whether half-written words are kept, not the plugin. Remove the M11 line from the
   gaps bullet.
8. [x] **Every state**: the note bubble's discard question already has a gallery entry. If `leave()`'s
   question looks any different from the bubble's own Esc question, add the state to the gallery,
   light and dark. Otherwise say in your notes that it is the same dialog.
9. [x] **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`;
   the page specs `board-host.spec.ts`, `note*.spec.ts` and any spec that reloads the page or switches
   folder with a note open, on `VB_TEST_PORT=5300`. Check one `beforeunload` in Chromium with
   Playwright (`page.close({ runBeforeUnload: true })` and the `dialog` event). No full page suite
   (rule 12).

---

## Validation

- [x] A host's Close asks before unsaved words are lost; Cancel keeps them with focus in the text;
      unchanged notes never ask (unit and page specs)
- [x] With the flag on, the standalone page prompts on a tab close only while words are unsaved;
      off, nothing changes
- [x] `host.ts` and components.md say what a host does; the nclite reply row is requested
- [x] No second discard path: `mayLeave` is the one

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-10-27 20:45  

### Changes Made
- Contract first: `host.ts` `BoardView` gains `unsaved()` and `leave()`, each saying what a host does
  with it; `unmount`'s comment says it never asks.
- `notes/note-discard.ts`: `unsavedIn(bubble)` (open and `dirty`), now `mayLeave`'s own test, and
  `createLeave(bubble, ask, report)`: `unsaved`, `leave()` (= `mayLeave` with the board's ask, one
  question at a time: `asking ??=`), `check()` (tells `report` each turn; also on every `input` in the
  bubble). No second discard path.
- `notes/notes.ts` `createNoteFlow`: one guard on its bubble; its open/close (`changed`) calls
  `check`; `NoteFlow.unsaved`, `NoteFlow.leave`; `NoteDeps.unsaved?(on)`. The flow's types moved to
  `notes/note-flow-types.ts` (rule 2 seam: notes.ts was 296 lines and would have passed 300).
- Pass-through (the task's "composition root" clause): `controller.ts` (`unsaved: (on) =>
  status.set({ unsaved: on })` to the flow; `Board.unsaved`, `Board.leave`), `controller/board-types.ts`
  (`Board`), `status.ts` (`BoardStatus.unsaved`, so a host hears each turn), `mount.ts` (the view's
  `unsaved`, `leave`; header).
- Standalone page: flag `leavePrompt` (default on, proposed) in `packages/format/src/flags.ts`;
  `shell/page-host.ts` `guardLeave(status)` adds a `beforeunload` listener (`preventDefault`) when
  `unsaved` turns true, removes it when it turns false and on unmount; `App.svelte` calls it.
- Tests: `apps/board/tests/note-leave.test.ts` (4); `board-host.spec.ts` "the host asks before words
  are lost" (fixture: `addClose`, `unsaved`); `note-discard.spec.ts` "a tab close asks" (Chromium
  `beforeunload` via `page.close({ runBeforeUnload: true })` and the `dialog` event).
- Docs: components.md § The board's host interface: `unsaved`, `leave` in the view; "A host calls
  `leave()` before `unmount()`" bullet after M10_01's; the Differences row; M11 out of "Open".

### Step 1: where a person types inside the root, and the board's own moves
- Typed inside the board's root: only `vb-note-bubble`'s textarea (cards, groups and containers; one
  bubble per board, `notes.ts`). Searched `apps/board/src/board` and `packages/ui/src` for input,
  textarea, contenteditable. Outside the root (the page's own, reported, unchanged): the Reply panel,
  the chat composer, Go to card's field, the access request note, the New/Rename board dialog.
- The board's moves that close an open bubble:
  - another bubble, Esc, Cancel, the page's Esc (`stage-handlers.ts`, `notes.close`), a past version
    (`showVersion` → `notes.close`): ask today (`mayLeave`).
  - a removed note (`place` → `noteGone` → `close(false)`): silent, by the earlier ruling ("nothing to save to").
  - its card or container gone from the layout (`place` → `anchorBox` undefined → `close(false)`): an
    agent's redraw that removes the card, Hide answered over an answered card: silent. In notes.ts, but
    Cancel would leave a bubble with no anchor, so it needs a ruling (REQUEST), not a quiet change.
  - another board chosen (`boards.ts` `switchTo` → `open` → redraw → `place`): silent. Card numbers are
    project-wide, so the card is never on the new board and `close(false)` drops the words. [INFERENCE,
    from the code] A container id can repeat across boards: the bubble would then follow the other
    board's container of that id, and Save would write there. REQUEST (controller.ts / boards.ts).
  - board archived and none left under a host (`mount.ts` `restart` → `stop`): silent; rare.
  - a folder switch, a rebuilt page, a refused cookie: page reloads, now behind the browser prompt.

### Step 5: the page's own reloads
- All three reload with `location.reload()`, so with words unsaved they get the browser's prompt.
- Folder switch (`FolderDialog.svelte` `accept`): should ask through the shell's dialog (`view.leave()`)
  before `openProject`, because the server has already switched folders when the prompt shows; Cancel
  there leaves the page on the old folder's board while the server serves the new one, and a Save would
  write to the new folder's ledger. Same for `folder.ts` `folderMoved` (another tab switched). REQUEST.
- A rebuilt page (dev watch only) and a refused cookie (`page-io.ts` `asPerson`, once): the browser's
  prompt is right; Cancel keeps the words to copy.

### Step 8: every state
- `leave()`'s question is the same dialog as the bubble's own Esc question: the host's `confirm` with
  `DISCARD_ASK`, on the page the shared confirm dialog, already in the gallery. No new state drawn; the
  "Leave site?" prompt is the browser's own. No gallery entry added.

### Issues & Resolutions
- `npm run test:timing`: 1-2 budget tests failed on each run (server start 1146-1330 ms over 1000; a
  1000-card layout 826-1332 ms over 100), a different one each run, with the machine's load average at
  24. Neither file is touched by this task; the gate should see them on a quiet machine.
- `askConfirm` (`shell.svelte.ts`) replaces a pending question rather than queueing: two asks at once
  leave the first unresolved. `leave()` asks once at a time; the bubble's own Esc ask and a host's Close
  at the same moment are the host's to avoid (its dialog is modal on the page).

### Caught Beyond the Brief
- Another board chosen with a note being written loses the words without asking (step 1). REQUEST.
- A folder switch asks after the server has switched (step 5). REQUEST.

### Deviations from Plan
- `controller.ts`, `controller/board-types.ts` and `status.ts` are not in TASK-STATUS File Ownership;
  edited under this task's Inputs clause ("the board's composition root if it must pass it through,
  only to expose the notes flow's state"): pass-through only, 9 lines. Recorded as REQUEST R1 for the
  ownership table.
- New file `notes/note-flow-types.ts` (inside the owned `notes/` folder): the flow's types, split to keep
  notes.ts under 300 lines.
- The beforeunload page test was written after the guard; its flag-off and unchanged cases show it
  closes without the guard.

### Run 2
**Status**: Completed  
**Completed**: 2026-10-27 20:50  
Requests M11_01-R3 and R4, routed back by the orchestrator (ownership widened to `boards/boards.ts`,
`controller.ts`, `FolderDialog.svelte`, `folder.ts` and their page specs).

- **Failing tests first** (port 5300): `note-discard.spec.ts` "choosing another board with changed
  words asks first" and `note-folder.spec.ts` (new) both failed on the missing question, then passed.
- **The one path:** `notes/note-discard.ts` `createLeave` takes `discard`: on OK with words unsaved
  it closes the bubble (`notes.ts` passes `close(false)`), so `unsaved` turns false and the page's
  `beforeunload` listener goes before the reload. Unit test updated (OK discards once; Cancel and
  nothing unsaved discard nothing).
- **R3, another board:** `controller.ts` `switchTo(id, go)`: with words unsaved and another board,
  `notes.leave()` first (`mayLeave`); Cancel returns false and keeps the board. Used by
  `Board.switchTo` (now `Promise<boolean>`), the chat side's `switchTo` and `jump`, and Board edit's
  switch after New or Restore. With nothing unsaved it switches synchronously, as before (`reveal`
  still switches then goes to the card). `boards.ts` unchanged: its own switches (an archived board's
  next, boot) are not the person's choice. `Toolbar.svelte` `pickBoard` puts the picker back on the
  open board after the answer (one line; needed, or Cancel left the picker naming the other board):
  outside the widened list, reported.
- **R4, another folder:** `FolderDialog.svelte` takes `guard` (App passes the view with
  `leavePrompt` on): with words unsaved, `accept` closes the dialog, then asks `leave()`; Cancel leaves
  page and server on the same folder with focus back in the note; OK opens the folder (a refusal then
  shows as a toast, the dialog being gone). Flag description updated.
- **`folderMoved`** (`folder.ts`, another tab opened another folder): it learns of the move only
  after the server has switched, so nothing can be asked first; the browser's prompt still asks before
  the reload. Kept as a REQUEST (a server-side answer, e.g. refusing an act whose page folder is stale).
- Docs: components.md § The board's host interface (OK discards; `Board.switchTo` asks; the folder
  picker; `folderMoved` under Not covered); `host.ts` `leave` comment.
- Checks: npm test 1758 + timing 10 pass (load average 2.9); check 0 errors; verify ok (13 warnings,
  as before); gen-api current; page specs board-host, note* (incl. note-folder), open-folder,
  current-folder, live-boards, picker-archive, new-board, toolbar, chat-panel, chat-send, chat, finder,
  versions: 150 passed.

### Run 3
**Status**: Completed  
**Completed**: 2026-10-27 22:05  
VERIFY_01 findings F3 and F5, routed back by the orchestrator.

- **F3, failing test first** (port 5300): `board-host.spec.ts` "reveal of another board's card with
  words unsaved waits for the question" failed (the card named was selected on the board still open
  while the host asked), then passed.
- **Fix:** `mount.ts` `reveal` awaits `board.switchTo` when it names another board and stops when it
  resolves false (Cancel); the card or note is shown by a new local `show` once that board has opened.
  With no board named, or the one open, it shows at once as before. `host.ts` `BoardView.reveal`'s
  comment says it may ask through `confirm`.
- **F5:** components.md § The board's host interface: the keys bullet names the Esc exception (tracker
  M21, `packages/ui/src/base/layer.ts` `dismissable`); the leave bullet says `reveal` may ask and
  cites the new test.
- Checks: npm test 1760 + timing 10 pass (load average 5.8); check 0 errors; verify ok (13 warnings,
  as before); gen-api current; board-host and note* specs 35 passed.

### Run 4
**Status**: Completed  
**Completed**: 2026-10-27 23:00  
The maintainer's ruling on finding 3 (point 309): the person's own act that would close a note with
unsaved words asks first. The agent's redraw is tracker M24, not here.

- **Failing tests first** (`note-discard.spec.ts`, port 5300): "Hide answered over a note being
  written…", "Remove card and Archive board…" and "a past version chosen…" each failed on the missing
  question (or, for the version, on the past version showing behind it), then passed. No unit test:
  the check needs the flow's open bubble and the layout, which need the DOM; the page specs cover it.
- **The one path:** `NoteFlow.leaveIf(gone)` (`notes/notes.ts`, type `NoteGone` in
  `note-flow-types.ts`): when the act takes the open bubble's card (every card of a group's) or its
  container and its words are unsaved, `leave()` (`mayLeave`); else true at once. OK discards the note
  (Run 2's `discard`), then the act goes ahead.
- **Where** (`controller.ts`):
  - `toggleHide` (H and the toolbar's Hide answered, the only callers): hiding asks when the hide set
    (`answeredIds`, as `hiddenSet`) takes the note's card; showing never asks.
  - Remove card and Remove container: the removal flow's `retire` asks after the person confirms the
    removal; Cancel sends nothing (it returns `''`, so no "removed" toast). A container's removal takes
    its cards' notes too.
  - Archive board: Board edit's `actOn` asks for `archive` of the open board; Cancel archives nothing.
  - `showVersion` (the version dropdown, Go to card's past offer, a retired marker): it already asked
    through `notes.close()` but went on without waiting, so a Cancel left the past version showing
    behind the words. It now waits for `notes.leave()` and stops on Cancel.
- **Looked at, no change:** showing answered cards again (no anchor goes); Move to and Later (the card
  moves, its anchor stays); there is no container collapse on the board (the selection pill's collapse
  removes no card); Lock board (nothing goes); Remove in a note's own block (removes the note itself:
  the person's choice, the earlier ruling).
- Docs: components.md § The board's host interface, one sentence on the person's acts that ask, M24
  named for the agent's redraw; the new tests cited.
- Checks: npm test 1760 + timing 10 pass (load average 8.2); check 0 errors; verify ok (13 warnings,
  as before); gen-api current; page specs note*, board-host, toolbar, select, every-node, versions,
  person-remove, picker-archive, go-to-card, flag-retire: 131 passed.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md): your row only.
3. Append **your own** LOG entry to `cortex/LOG.md`: one line, ending in a newline, append-only.

   ```
   [[YYYY-MM-DD HH:MM]] [board-app] M11_01: [what you did] → Task: [[cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/M11_01_ask-before-leaving.md]]
   ```

4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files (the
   nclite reply row at least).

**Constraints**: deviation → stop and ask; no PII in examples; no commits; never port 4466; never
`cortex/AUDITED.md`; no set LOG entry.
