# FE_03_one-conversation-box: One Conversation Box

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make reading a node's notes and writing one the same box: the conversation beside the node, with a reply field
and two buttons, Add note and Ask now.

---

## Context

PLAN.md § Decision 5 and § Planner's call 1. The look is the conversation section of
`design/mockups/node-skins/default-skin-*.html`. Today `vb-note-bubble` has four modes (new, edit, sent, thread);
"Conversation on N" is thread mode and has no field (`CODE-MAP.md` § 10). Extend that pattern: with `nodeEdges` on,
opening a node's notes always opens the thread with its field. Nothing sends one note straight to the agent today;
Ask now is Add note followed by the board's Send.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/note-bubble/` (core, template, element, styles, `pattern.json`),
  `packages/ui/src/words/note-bubble.ts`, `packages/ui/tests/`, `apps/board/src/board/notes/`,
  `apps/board/src/board/words/notes.ts`, `apps/board/src/gallery/note-bubble-section.ts`, `tests/pages/`,
  `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 10; `packages/ui/src/note-bubble/note-bubble-core.ts` (`placeBubble`,
  `bubbleView`, `saveIntent`, `cancelIntent`, `NOTE_DISCARD_EVENT`); `apps/board/src/board/notes/notes.ts`
  (`openWith`); `apps/board/src/board/controller.ts` (`send`); `apps/board/src/shell/chat-panel.ts` (`boardSend`);
  tracker M24 and M35 (unsaved words)
- **Shared artifacts to reuse**: T_02's tokens; FE_01's icons
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **The box**: thread mode gains a compact header (the node's number and title, Close), the thread (your
       notes and the agent's replies, oldest first, scrolling past a maximum height), and a reply field of one
       line that grows to three and then scrolls. It sits beside the node on the side with room, top-aligned,
       with a pointer at the node, floats over neighbours and never moves them, and scales with the board.
2. [ ] **Two buttons** sharing the width: **Add note** (Enter) writes the `comment` act as today and keeps the box
       open; **Ask now** (Cmd or Ctrl Enter) writes the note and then runs the board's Send. Shift Enter is a new
       line. The keys are in the buttons' tooltips. While Send is not possible (no agent, read-only, a turn
       running) Ask now is disabled and its tooltip says why, from the existing words.
3. [ ] **States**: empty (no notes yet: only the field), a note not yet sent (it can still be edited or removed,
       as today's edit mode allows), sending, sent, a reply arriving while the box is open, failed (the words stay
       in the field), closed with unsaved words (ask before discarding, as today).
4. [ ] **Unread**: opening the box marks the agent's replies on that node seen, so the notes mark goes back to its
       count (FE_01's state reads the same fold).
5. [ ] **One way in**: with `nodeEdges` on, the notes mark, C and the right-click list's Comment all open this
       box with the field focused. A container's note and a note on several nodes keep today's bubbles (FE_06 adds
       "Ask about the selection").
6. [ ] With `nodeEdges` off nothing changes. Gallery entries for every state; unit tests for the core; page specs
       with screenshots, light and dark; `pattern.json` and `components.md` updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; the new specs pass; `notes.spec.ts`, `conversation.spec.ts`
      and `popover-thread.spec.ts` pass with the flag off and no new baseline
- [ ] Words typed in the field survive a redraw of the board, a failed write and an accidental Escape (tests)
- [ ] Enter never sends to the agent; only Ask now does (test)
- [ ] The box is usable by keyboard alone and axe finds nothing

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

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
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_03: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_03_one-conversation-box.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
