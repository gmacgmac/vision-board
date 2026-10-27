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

1. [ ] **Every place a person types inside the board's root**: today the note bubble (`vb-note-bubble`,
   on cards and containers) is the only one found at planning. Confirm by search, and list what you
   find in your notes. Anything else that holds typed words joins `unsaved()`. The standalone page's
   own Reply panel and chat composer are outside the board: report them, don't change them. Also
   list the board's own moves that close an open bubble without the person asking (another board
   chosen, a redraw that removes or replaces its card, a folder switch): say whether each asks
   today. One that loses words silently inside the files you own goes through `mayLeave` too;
   anywhere else, a `REQUEST`.
2. [ ] **Failing tests first**:
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
3. [ ] **The contract** (`host.ts` `BoardView`): `unsaved()` and `leave()`, each with a comment saying
   what a host does with it, and that `unmount` doesn't ask.
4. [ ] **The code**: the notes flow tells whether its open bubble is dirty, and offers its `mayLeave`
   with the host's confirm. `mount` wires both into the view it returns. Reuse `mayLeave`; don't write
   a second "is it dirty, ask, refocus" path. A `leave()` called while one is already asking returns
   the same answer, not a second dialog.
5. [ ] **The standalone page** (`page-host.ts` / `App.svelte`, behind the new flag in
   `packages/format/src/flags.ts`): while `unsaved()` is true, a `beforeunload` listener asks the
   browser to prompt. Add it when words become unsaved and remove it when they're saved, sent or
   discarded, and on unmount. Find the moment cheaply: the bubble's own input or dirty change, not a
   poll. The page's programmatic reloads (switching the open folder, a rebuilt page, a refused cookie)
   prompt too. Say in your notes whether any of them should ask through the shell's dialog instead.
   Name the flag in the existing style; give it a description and a default (propose on, since words
   lost is the worse failure).
6. [ ] **Docs** (`cortex-docs`): components.md § The board's host interface: `unsaved` and `leave`
   under what the view gives back; "a host calls `leave()` before `unmount()`"; the difference from
   nclite's draft under Differences; the M11 gap removed from the "Open (VERIFY_01 …)" sentence. Name
   the symbols and tests.
7. [ ] **The nclite reply** (`REQUEST` to the orchestrator): one row under Differences we ask of the
   draft. Draft: "`unmount()` saves anything being written" → "`leave()` asks the person first,
   then the host unmounts; `unsaved()` for the host's own question or `beforeunload`", because the
   person decides whether half-written words are kept, not the plugin. Remove the M11 line from the
   gaps bullet.
8. [ ] **Every state**: the note bubble's discard question already has a gallery entry. If `leave()`'s
   question looks any different from the bubble's own Esc question, add the state to the gallery,
   light and dark. Otherwise say in your notes that it is the same dialog.
9. [ ] **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`;
   the page specs `board-host.spec.ts`, `note*.spec.ts` and any spec that reloads the page or switches
   folder with a note open, on `VB_TEST_PORT=5300`. Check one `beforeunload` in Chromium with
   Playwright (`page.close({ runBeforeUnload: true })` and the `dialog` event). No full page suite
   (rule 12).

---

## Validation

- [ ] A host's Close asks before unsaved words are lost; Cancel keeps them with focus in the text;
      unchanged notes never ask (unit and page specs)
- [ ] With the flag on, the standalone page prompts on a tab close only while words are unsaved;
      off, nothing changes
- [ ] `host.ts` and components.md say what a host does; the nclite reply row is requested
- [ ] No second discard path: `mayLeave` is the one

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

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
