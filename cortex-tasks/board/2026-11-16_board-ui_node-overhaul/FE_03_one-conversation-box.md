# FE_03_one-conversation-box: One Conversation Box

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make reading a node's notes and writing one the same box: the conversation beside the node, with a reply field
and two buttons, Add note and Ask now.

---

## Context

PLAN.md § Decision 5 and § Planner's call 1. Ask now is node-scoped: it sends that one message for that node at
once, apart from the board's Send, and the ledger records it as an `ask` act naming the lines it carried and the
context the agent was given (T_01; the ledger review § 4 O6). Add note keeps the note for the board's Send, as
today. The look is the conversation section of
`design/mockups/node-skins/default-skin-*.html`. Today `vb-note-bubble` has four modes (new, edit, sent, thread);
"Conversation on N" is thread mode and has no field (`CODE-MAP.md` § 10). Extend that pattern: with `nodeEdges` on,
opening a node's notes always opens the thread with its field. Send (`controller.ts` `send`, through the chat
bridge's `boardSend`) is how a message reaches the agent today; Ask now goes the same way with an `ask` act in
place of the `send` act, so the agent reads it through `check_responses` (T_01's `pending.ts`).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/note-bubble/` (core, template, element, styles, `pattern.json`),
  `packages/ui/src/words/note-bubble.ts`, `packages/ui/tests/`, `apps/board/src/board/notes/`,
  `apps/board/src/board/words/notes.ts`, `apps/board/src/board/boards/kept-view.ts` (the setting),
  `apps/board/src/board/controller.ts` and `controller/` (Ask now's path beside `send`),
  `apps/board/src/gallery/note-bubble-section.ts`, `tests/pages/`,
  `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 10; `packages/ui/src/note-bubble/note-bubble-core.ts` (`placeBubble`,
  `bubbleView`, `saveIntent`, `cancelIntent`, `NOTE_DISCARD_EVENT`); `apps/board/src/board/notes/notes.ts`
  (`openWith`); `apps/board/src/board/controller.ts` (`send`); `apps/board/src/shell/chat-panel.ts` (`boardSend`);
  tracker M24 and M35 (unsaved words)
- **Shared artifacts to reuse**: T_02's tokens; FE_01's icons; T_01's `ask` act, `ASK_CONTEXTS` and the fold's
  asked lines (`unsent.ts`, `note-lock.ts`)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **The box**: thread mode gains a compact header (the node's number and title, Close), the thread (your
       notes and the agent's replies, oldest first, scrolling past a maximum height), and a reply field of one
       line that grows to three and then scrolls. It sits beside the node on the side with room, top-aligned,
       with a pointer at the node, floats over neighbours and never moves them, and scales with the board.
2. [ ] **Two buttons** sharing the width: **Add note** (Enter) writes the `comment` act as today and keeps the box
       open; the note waits, unsent, for the board's Send. **Ask now** (Cmd or Ctrl Enter) sends the node's note at
       once and then writes the `ask` act with `lines` (the note's `seq`) and `context`, as a Send is written once
       the message went (D-075). A node holds at most one unsent note (`api.md` 59): if it has one, Ask now sends
       it, with any words in the field saved to it first as an edit; if not, it writes the field's words as the
       note and sends that. DESIGN_01's open choice on queued notes, as the maintainer answered it at the wave-4
       gate, decides any difference. Ask now never sends the board's other unsent answers; they stay unsent.
       Shift Enter is a new line. The keys are
       in the buttons' tooltips. While a message cannot go (no agent, read-only, a turn running) Ask now is disabled
       and its tooltip says why, from the existing words.
2a. [ ] **The context setting** (call 1): `askContext`, a page setting kept as the board's other page settings are
       (`apps/board/src/board/boards/kept-view.ts`; the host's store under a host), default `board`, recorded on
       every `ask`. This set builds what `board` gives the agent (the asked note with the board, as Send gives
       it); `node` and `session` stay values of the contract only, so the setting has no control on screen until a
       second mode is built (a tracker row).
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
- [ ] Ask now writes one `ask` with the note's `seq` and `context: "board"`, leaves the board's other unsent
      answers unsent, locks the asked note, and the next Send does not carry it (tests)
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

**Status**: Blocked (the plugin's `view/board.js` budget: a ruling, below); everything else done
**Completed**: 2026-11-17 16:40

### Changes Made
- `packages/ui/src/note-bubble/`: mode `conversation` (core `bubbleView` → `BoxView`, `BubbleTab`, `fieldKey`: Enter is
  Add note, Cmd or Ctrl Enter is Ask now and only in the box, Shift Enter a new line); `conversation-template.ts` (head
  with number, title and ×; tabs only in a group note; the thread with the queued note dashed and "not sent yet · goes
  with Send"; "Waiting for the agent"; a one-line field that grows to three; Ask now and Add note sharing the width,
  keys in their titles, Ask now `aria-disabled` with the reason as its title), loaded on first use
  (`elements.ts` `loadConversation`, `useConversation`); element: `show(..., keep)` keeps the field's words, caret,
  focus, phase and the thread's place through a redraw; `setPhase(..., by)` ("Asking…"); choices `ask` and `tab`;
  `note-bubble.css` box rules; `pattern.json`; words in `words/note-bubble.ts`.
- `apps/board/src/board/notes/note-box.ts` (loaded on first use, `loadNoteBox`): `boxView` (tabs per group of nodes,
  the tab's notes and replies, waiting), `addNote` (comment, or a `note-edit` joining the node's queued note, api.md
  59), `askNow` (blocked → says why, writes nothing; no agent listening → the words wait as a note and the toast says
  so; else write, then one `ask` with `lines: [seq]`). `notes.ts`: with `box` (nodeEdges) `press`, `talk`, `show` open
  the box; a redraw refreshes it only when what it says changed; Edit on a queued note comes back to the box; an
  empty box closes on a click outside.
- `apps/board/src/board/controller/ask-now.ts` (`createAskNow`: blocked = past version, read-only ledger, locked
  board, the chat's agent mid-turn; listening = an agent joined the ledger or `singleAgent`; the `ask` with
  `askContextOf`; `looked`: a card `seen` at the version already seen so only the replies are read);
  `controller.ts` passes it to the note flow with `nodeEdges` on. `boards/kept-view.ts` `askContextOf` (store key
  `ask-context`, default `board`; no control on screen).
- Words: `apps/board/src/board/words/notes.ts` (`noAgentIsListening`, `notAsked`, `thisNode`, `withNodes`,
  `theAgentIsWorking`). Gallery: `conversation-box-samples.ts` (8 states, through the board's own `boxView`; shown
  with `?flags=nodeEdges`). Docs: `components.md` § Notes beside cards item 9.
- Tests: `packages/ui/tests/conversation-box.test.ts` (6), `apps/board/tests/ask-now.test.ts` (6),
  `tests/pages/conversation-box.spec.ts` (8: one way in; Add note never asks; Ask now writes one `ask` with the seq
  and `context: "board"`, the tick stays unsent and the asked note is not carried; words survive a redraw, a failed
  write and Esc; unread back to count; tabs; dark and light screenshots, keyboard alone, axe, APCA).

### Issues & Resolutions
- Weights: page 198.40 KB at start (203,164 B; was 196.77): the box's template and its page code are their own
  chunks. Plugin `view/board.css` 23,994 / 24,000 gzip (trimmed to fit). Plugin `view/board.js` **192,725 / 190,000
  gzip**, over by 2,725: the plugin is one file, so `import()` saves nothing there. Not raised: the maintainer's ruling.
  `plugin-build.test.ts` "the bundles stay inside their budgets" is the one failing unit test.
- `npm run verify`: only `modules.md` out of date (new imports): `npm run map` requested.
- The gallery's note-bubble section shows `pattern.json`'s states, so its two baselines were renewed for the new
  `conversation` state (`gallery-note-bubble-{dark,light}`); nothing else in the gallery moves. With the flag off,
  `notes`, `conversation`, `popover-thread` and the other note specs pass with no new baseline.

### Caught Beyond the Brief
- An `ask` reaches agents through `check_responses` only. The chat panel's agent, idle between turns, is not woken
  by it (the server records an `ask` without `onSend`), and `BoardChat.send` sends the staged chips (the board's
  answers), so Ask now cannot go that way. A host path for one node's message (`BoardChat.ask`) is a tracker row.
- "No agent listening" is read as: no agent joined the ledger, and the engine is not `singleAgent`. The page cannot
  tell whether an agent is waiting in `check_responses` now.
- Ask now's disabled title follows a redraw; a change of the chat's working state alone does not redraw it. A press
  says the current reason anyway.
- An asked note reads "· Sent" in the thread: the mock-up's "asked now" needs `askedBy` on `ItemNote` (a small
  contract read).
- My calls: a tab per group of nodes (several notes on one group share a tab); "This node"'s Ask now carries the
  node's own queued note, a group's tab carries that group's; words added to a queued note are appended, never
  replace it.
- The box's scale with the board is FE_05's (its step 3).

### Deviations from Plan
- None in behaviour. Files touched beyond the list, all front doors or new files: `packages/ui/src/elements.ts`,
  `packages/ui/src/index.ts`, `apps/board/src/board/notes/index.ts`, `apps/board/src/board/boards/index.ts`, the new
  gallery file and tests.

### Run 2

**Status**: Completed  
**Completed**: 2026-11-17 19:10

Budgets ruled at point 351 (page 210 KB, plugin view JS 200,000, CSS 26,000 gzip; 678cc19). Scope added by the
coordinator: Ask now reaches the board's chat panel; then three musts from the maintainer's look: top alignment, the
history box, compact boxes.

#### Changes Made
- **Ask now reaches the chat panel's agent** with no seam change. Today's record stays: the page writes the `ask`. The
  standalone server's chat sessions hear the person's `ask` line (`chat-sessions.ts` `hearAsk`, on `ledger.onAppend`)
  and hand the session in use on that board the asked notes with the board, as their own message ("Asked now.";
  prompt head `server-chat.ts` `askedNowFromTheBoard`). They never carry the board's other answers, record no Send, and
  leave `told` alone, so those answers still go with the next Send. While a turn runs they ride with the next
  message. Found and fixed on the way: a Send's round still carried an asked note when its card was in the round for
  another answer (`pending.ts` `replyScope` now carries `asked`; `reply.ts` `fresh` leaves those notes out).
- **"Asked now" in the thread**: `conversation(notes, replies, asked?)` (`node-notes.ts`, word `askedNow`), fed by
  `BoxDeps.asked` (`controller/ask-now.ts`, from `LedgerState.asked`).
- **One place for every box beside a node**: `mark-place.ts` `placeBeside` (top level with the node, right when there
  is room, else below with left edges aligned, never over the node; the arrow on the mark that opened it) and
  `nodeReach` (the node's box out to its hanging marks). It is used by the conversation box (`notes.ts` `place`), the
  history and proposal boxes (`mark-boxes.ts` `place`, written in the node's own pixels, followed on every pan, zoom
  and draw through `MarkBox.place`) and the gallery. `mark-boxes.ts` `flip` and its CSS are gone. Pressing the notes
  mark closes an open mark box.
- **One look, compact**: `packages/ui/src/node/node-box.css` (`.vb-node-box`, `-head`, `-title`, `-x`, `-body`; last
  in `#ui/styles.css`). It is styled once for the conversation box (the element adds the class in `conversation`
  mode; its template draws the shared head and body) and for the history and proposal boxes with edges: about 1.2
  times the node's width, the node's body text size, a 32px head over a hairline, and the mock-ups' proportions. The
  two variants the maintainer saw are now this one style.
- **The history box as designed** (with `nodeEdges`): `node-history.ts` `historyBox` draws "History of N" with an ×
  (`data-box-close`), then the stepper, then `historyMarkup(rows, now, box)`: one row per entry with its version (↩ for
  a withdrawn proposal), its words, then who and when. "Proposal withdrawn: the node changed" is a new history kind,
  `proposal-withdrawn` (`card-times.ts` `withdrawn`, `card-history.ts` `cardHistory`, which agree; `HistoryRow.ver`).
  The old box is unchanged with the flag off.
- **The stray "1" circle** on the node's right edge was the group pin (`notes/group-pins.ts`, groupNoteOnce). It no
  longer draws with `nodeEdges` on: the notes mark already counts a note on several nodes, and the box gives it a tab.
- Words: `server-chat.ts`, `node.ts` (`historyOfN`, `closeHistory`), `node-notes.ts`, `actions-history.ts`
  (`proposalWithdrawn`). Docs: `api.md` 188, `components.md` § Notes beside cards items 9 and 10, both `pattern.json`
  files.
- Tests:
  - `apps/board/tests/api-chat-ask.test.ts`: no session runs nothing; the asked note goes alone with the board and no
    Send; the next Send carries the tick and not the note.
  - `tests/pages/chat-ask.spec.ts`: Ask now from the box reaches the panel's fake agent, reads "Asked now" in the
    panel and in the thread, and records one `ask`.
  - `apps/board/tests/mark-place.test.ts` (`placeBeside`).
  - `packages/actions/tests/card-history.test.ts` (withdrawn rows in both readers).
  - `packages/ui/tests/node-edges.test.ts` (the new history box, its rows).
  - `tests/pages/node-boxes.spec.ts`: three boxes top aligned or below; one look; the history box's head, rows and ×;
    no group pin; screenshots `temp/fe03/run2-{conversation,history,proposal}-{dark,light}.png`.

#### Verification
- Checks:
  - `npm test`: 2600 of 2600, timing 14 of 14.
  - `npm run check`: 0 errors.
  - `npm run verify`: passes.
  - `npm run gen -- --check`: current. The contract is unchanged.
  - `npm run test:plugin`: 116 passed.
- Page specs: 128 related specs pass with the flag off and on (notes, conversation, popover-thread, gallery,
  node-edges, proposals, card-history, chat-alongside, parking, group-note, and the three new files).
- Weights: page 199.88 KB of 210. Plugin `view/board.js` 193,679 of 200,000 and `view/board.css` 24,511 of 26,000
  gzip.
- Baselines renewed:
  - `conversation-box.spec.ts` box dark and light: the new look.
  - `proposals-review` review-list and `chat-alongside` alongside, dark and light: a sub-pixel shift of their gallery
    sections. The text antialiasing differs everywhere and the content is the same. It was already there after run 1,
    whose specs did not include these two.

#### Caught Beyond the Brief
- The order is the reverse of D-075 for the chat. The `ask` is recorded first and the panel's agent is told on that
  line. If the session can't be loaded, the ask still stands and the agent reads it through `check_responses`. The
  failure is only logged on the server.
- The conversation box sits on the stage and keeps one size, while the history and proposal boxes sit in the node and
  scale. At a zoom other than 100% their sizes differ until FE_05 makes the box scale with the board.
- nclite: no seam change was needed for the standalone server. A host can do the same from the `ask` lines it already
  receives as change events, using the engine's `resolve('note')`. That is nclite's code, not built here.
- `notes.ts` is 304 lines (warns over 300).

#### Deviations from Plan
- None. Files beyond the list:
  - The chat server: `chat-sessions.ts`, `chat-prompt.ts` and their words.
  - The actions reply round and history: `pending.ts`, `reply.ts`, `card-history.ts`, `card-times.ts`.
  - The marks' boxes: `mark-place.ts`, `mark-boxes.ts`, `mark-acts.ts`, `history-flow.ts`, `node-edges.css` (dead flip
    rules removed).
  - In the ui package: `node-history.ts`, `node-notes.ts`, `node-edges.ts`, and the new `node-box.css`.
  - All were within the coordinator's added scope.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_03: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_03_one-conversation-box.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
