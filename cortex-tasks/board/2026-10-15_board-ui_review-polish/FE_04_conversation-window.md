# FE_04_conversation-window: The conversation window

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

A click, Enter or Space on a note or a reply opens the card's whole conversation (every note and
reply, oldest first, scrolled to the one clicked) in a window that closes with an × in its top
corner, Esc or a click outside.

## Context

PLAN.md rulings 6 (click) and 7, and "Decisions inside the rulings" 8 and 9. It replaces today's
click (popovers-larger-thread ruling 2), which opens one note with its replies (`sent` or `edit`
mode) or an orphan reply alone (`reply` mode). FE_03 has landed: `notesView` gives the card's notes
and replies in chat order (its shape is in TASK-STATUS.md § Shared Foundations); list that, never
sort again. FE_01's `.vb-tip` border and FE_05's focus rules have landed.

## Inputs

- **Files to modify**: `packages/ui/src/note-bubble/note-bubble-core.ts` (`BubbleMode`,
  `readOnlyMode`, `BubbleInput`, `BubbleView`, `bubbleView`, `threadOf`, `cancelIntent`),
  `note-bubble-template.ts` (the thread markup, the × button), `note-bubble.css`, `vb-note-bubble.ts`
  (scroll to and focus the clicked entry); `apps/board/src/board/notes.ts` (`createNoteFlow`: `show`,
  `reply`, `showContainer`, `close`, `again`), `note-views.ts` (`Open`, `cardView`, `containerView`,
  `repliesOf`), `apps/board/src/board/wiring.ts` (`bindStage`'s note and reply branches;
  `StageHandlers.showNote`, `showReply`), `region-notes.ts` (the container side).
- **Files to reference**: `packages/ui/src/node/node-core.ts` (`notesView`, `ReplyEntry`,
  `replyEntry`), `packages/ui/src/region/region-note.ts` (`vb-region-note` `open`),
  `apps/board/src/board/note-discard.ts` (`bindDiscard`, `mayLeave`), `versions.ts` (`ACTING`:
  `showNote`, `showReply` stay guarded on a past version and a locked board).
- **Tests to extend**: `packages/ui/tests/note-bubble.test.ts`; `tests/pages/popover-thread.spec.ts`,
  `notes.spec.ts`, `parking-replies.spec.ts`, `note-discard.spec.ts`.

## Steps

1. [x] **Tests first.** Unit: a new read-only mode for the whole conversation (name it in the
   pattern's words, e.g. `thread`) lists every entry in `notesView` order, each with who and its
   text; the person's editable note carries an Edit choice; no bottom row; a close control named
   "Close". Page, light and dark: click, Enter and Space on note 2 of a card with notes 1-3 and
   replies open one window listing all of them, oldest first, scrolled so note 2 shows, its arrow on
   note 2, focus on it; the same from a reply and from an orphan reply; the × (top corner), Esc and a
   press outside each close it and focus goes back to what was clicked; the board does not pan
   (FE_05); the pin and C still open the latest note as today; Edit on the person's unlocked note
   turns the window into today's edit mode; a container's note block and its replies the same.
   Axe light and dark; the window is a labelled non-modal dialog.
2. [x] Build the mode in the bubble pattern (extend `vb-note-bubble`, no new popover); retire the
   one-note `sent` and `reply` modes from the click path if nothing else uses them (say which).
   `show` and `reply` in `notes.ts` open the conversation at the part clicked; `again` moves and
   scrolls when it is already open.
3. [x] Build ruling 7: the × in the top corner on the read-only conversation; Esc and a press
   outside close it; the space of today's bottom row goes to the list. Edit and new notes keep Cancel
   and Save and today's discard question (PLAN decision 9).
4. [x] Gallery (`note-bubble-section.ts`): the conversation with three notes and replies, an orphan
   reply, and the editable note's Edit; a container conversation. Screenshots: view every diff.
5. [x] Docs: `docs/specification/components.md` § Notes beside cards (the conversation), the
   note-bubble and node `pattern.json`.

## Validation

- [x] Every step 1 test passes; it failed before the build.
- [x] The five gates exit 0, one after another.

## Constraints

- Patterns first (rule 1): the bubble is the one popover for notes; the conversation's list is
  `notesView`'s, the card's own order.
- Accessibility (rule 5, WCAG 2 AA): the × has a 24px target and the name "Close"; the list scrolls
  as one group; focus returns where it came from.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-16)

1. **The mode (ruling 6, decision 8).** `note-bubble-core.ts`: `BubbleMode` is `new | edit | sent | thread`;
   `thread` is read-only (`readOnlyMode`), its head "Conversation on 42" / "Conversation on container
   Review", its list labelled "Notes and replies"; `BubbleInput.entries` / `BubbleView.entries` carry the
   conversation as given. The list is `node-core.ts` `conversation(notes, replies)`, split out of
   `notesView` (which now reads it), so the window lists exactly the card's order and a container (no
   card) gets the same list; nothing sorts again. `note-bubble-template.ts`: `ol.vb-nb-convo`, each note
   (`li.vb-nb-note`: who, Edit while not sent or answered, Markdown words), its replies, an orphan
   (`.vb-nb-orphan`, not set in) by time; every entry has `data-seq` and `tabindex="-1"`.
   `vb-note-bubble.ts` `reveal(seq?)` scrolls to the entry (the bottom when it is the last, or none given)
   and `focusText` focuses it; Edit sends `vb-note` `{ choice: 'edit', note: seq }`.
2. **Retired modes.** `reply` (a reply on its own) is gone: the click path was its only user. `sent` stays:
   the pin on a note that is history and the container preview's Open still use it (ruling 6: the pin
   and C open the latest note as before).
3. **Ruling 7, decision 9.** Read-only (`sent` and `thread`) the bubble has no bottom row and no error
   line: an × (`.vb-nb-x`, 24px, named "Close", the Cross glyph via `svgIcon(ACTION_ICON.drop)`) in the
   head's top corner; the list takes the row's room (`--vb-pop-max-h` + 32px + 8px). A click outside closes
   it (`apps/board/src/board/note-outside.ts`, new): only a click (a press that moves past
   `pointer.ts` `DRAG_THRESHOLD`, now exported, is a pan and keeps it), a press on a note, reply or pin
   is not "outside" (it moves the open conversation there), and focus goes back to what was pressed unless
   the click gave it to something else. Edit and new notes keep Cancel, Save and the discard question.
4. **Page.** `notes.ts`: `show(id, seq, fromNote)` opens the conversation from a note in the block (the
   pin as before); `reply` opens it at the reply; `showContainer(region, part)` at the block's note or a
   reply (no part: the preview's Edit/Open, as before); `again(at, part)` moves, scrolls and takes the
   new part as focus-back; `edit` turns the window into the edit mode for that note (group note: its
   group; focus-back kept). `note-views.ts` `Open.part` replaces `Open.reply`; `cardView` /
   `containerView` pass `entries` (a container's replies filtered to its own notes, else other
   containers' would read as orphans). Placement moved to `note-anchor.ts` (new, `anchorBox`) so
   `notes.ts` stays under 300 lines. `wiring.ts` and `region-notes.ts`: comments only (the branches
   already sent notes and replies to `showNote` / `showReply` / `open`). The board never pans: focus
   return uses `preventScroll` and FE_05's `lastInput` rule (asserted in the page tests).
5. **Tests first.** Unit: `note-bubble.test.ts` (3 new, 2 changed: the sent note's × and no row; the
   `reply` mode test removed), `node-core.test.ts` (`conversation` equals `notesView`'s entries) failed
   (no export, wrong markup) and pass. Page: `tests/pages/conversation.spec.ts` (new, 8 tests, light and
   dark where axe runs): click on note 2 of notes 1-3 with replies and an orphan lists all oldest first,
   scrolled to and focused on note 2, arrow on it, labelled non-modal dialog, × top corner 24px, list
   taller than 320px, × closes with focus back and the world's transform unchanged; latest -> bottom,
   reply and orphan -> scrolled to them; Enter and Space; a click outside closes (focus back), a drag
   outside keeps it; Edit -> edit mode, pin and C as before; the container the same. All 8 failed on the
   old code. Changed with the behaviour: `popover-thread.spec.ts` (exchange tests now read the
   conversation; the orphan-on-its-own test now opens the conversation; the gallery assertion checks the
   three conversation samples), `notes.spec.ts` (Enter/click on the note -> conversation, Edit -> edit),
   `parking-replies.spec.ts` (dialog name). `note-discard.spec.ts` unchanged (passes).
6. **Key help (extra item).** `key-help.ts` Board: "Pan from anywhere" `Cmd+drag` / `Ctrl+drag` after
   "Pan"; test first in `apps/board/tests/key-help.test.ts`.
7. **Gallery.** `gallery.ledger.jsonl` seq 317-325: parking card n 141 "Who signs off the price change?"
   (decision): note 1 sent, its reply, an orphan reply, note 2 sent, its reply, note 3 not yet sent. It is
   the parking board's fifth card, which the parking section does not draw. `note-bubble-section.ts`: the
   old exchange and reply-alone samples became two conversation samples (opened at the latest, scrolled
   to the bottom with Edit on note 3; opened at note 1, scrolled to the top); `container-bubble.ts` draws
   the edit sample as before plus a container conversation (container-notes board "Answered", block
   shown, opened from its note). The sent sample shows the ×.
8. **Docs.** `components.md` § Notes beside cards items 1, 6 (now "The conversation") and 7; note-bubble
   and node `pattern.json`.
9. **Screenshots (26, every diff viewed light and dark).** Content: `gallery-*` (the note-bubble section:
   × on the sent note, the conversation samples, the container conversation; everything below shifts),
   `key-bubble-open-*` and `key-bubble-gallery-*` (the new row). Text-edge sub-pixel shifts only: chat,
   retired, card-widths, folder-picker (dark failed in the full run; light re-generated in the update run,
   compared with HEAD: same content, 1px height), parking-replies, remove, archive, proposals,
   selection-pill, node-size. No sibling's change appeared.
10. **Outside the listed files (report).** New: `note-outside.ts`, `note-anchor.ts`,
    `tests/pages/conversation.spec.ts`. Changed: `packages/ui/src/node/node-core.ts` (`conversation`
    split out of `notesView`, no behaviour change), `pointer.ts` (`DRAG_THRESHOLD` exported),
    `container-bubble.ts`, `gallery.ledger.jsonl`, `tests/pages/gallery.spec.ts` (the container bubble
    locator scoped to the edit sample, now there are two), `node-core.test.ts`, `key-help.ts` and its test
    (given).
11. **Gates**, one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings), `npm run gen`
    (no generated file changed), `npm run test:pages` (462 passed), all exit 0.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] FE_04: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_04_conversation-window.md]]`
