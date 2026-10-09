# FE_02_sidebar-bridge: Board sidebar and bridge

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 6, 7,
> 9, 13) · **Model**: Opus 5.5 · **Needs**: BE_03, FE_01

## Objective

The chat sits on the right of the board, and the board and chat talk through one bridge.

## Rulings (do not reopen)

1. **Sidebar:** on the right, collapsible (a toolbar button and a key), resizable by dragging its
   edge (width kept per viewer in localStorage, guarded), the board's view shrinking beside it.
   Hosts FE_01's elements. Flag `chatPanel`.
2. **Header:** agent picker (Claude, Kiro), model, status, New session (confirms), Stop.
3. **Bridge** (`apps/board/src/board/chat-bridge.ts`, the only file that knows both sides):
   - board → chat: the person's unsent notes and the selected cards become composer chips;
     sending the message sends the round (BE_03 records it);
   - chat → board: a change chip zooms to its cards (reuse `goToContainer`/the selection zoom)
     and selects them; a card can open the message that last changed it (a small link in the
     update stepper is enough).
4. Through the page's one I/O module (`io.ts`) and the generated client; the event stream like
   `watch_project`. Read-only past version: the composer is disabled with the reason.
5. `controller.ts` is at 300 lines: wire through its own module.

## Steps

1. [x] Failing tests first: bridge unit tests; page tests with the fake `claude` (open panel,
   send, text appears, change chip zooms, approval Allow and Deny, Stop, New session, collapse,
   resize, past version), axe light and dark.
2. [x] Build, gallery (the board with the panel open), flag.

## Validation

- [x] The five gates exit 0. Look at it light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09

- **Files**: `apps/board/src/board/chat-bridge.ts` (the only file knowing both sides: `selectedCards`, `unsentNotes`,
  `boardChips`, `lastChange`, `cardIds`, `createChatBridge` with `board()`/`chat()` attach, `drawn`, `source`, `sent`),
  `apps/board/src/board/chat-panel.ts` (`createChatPanel`: header/feed/composer for the open board; `follow`,
  `messageBody`, `blockedReason`, `AGENTS`, `MODELS`, `PAST`, `NO_BOARD`), `apps/board/src/shell/ChatSidebar.svelte`
  (aside, grip, T key, width/open in localStorage `vb.chat-width`/`vb.chat-open`, guarded; `--vb-chat-w`),
  `apps/board/src/styles/chat-sidebar.css`; `io.ts` gains `listChats`, `startChat`, `sendChat`, `stopChat`,
  `answerApproval`, `watchChat` (own EventSource: on a drop it reopens with `after` = the latest seq held, after a
  person call so a stale cookie reloads the page).
- **Wiring**: `createBoard(els, chat?)` (controller.ts, kept at 299 lines by joining lines): `chat?.board({...})`,
  `chat?.drawn()` after each draw, `source` dep to `update-flow.ts`. `App.svelte` creates the bridge with the flag,
  mounts `ChatSidebar`, and feeds `shell.boardId`/`shell.past` to the panel. `shell.chatPanel`/`chatOpen`; Toolbar
  "Chat" button last in the end group (icon on narrow windows); KeyHelp lists T with the flag (`keyGroups({ chat })`).
  `main.ts` imports `chat.css`, `chat-host.css`, `chat-sidebar.css` and calls `defineChatElements()`. The stage
  shrinks by `--vb-chat-w` (board.css); the reply panel moves left of the chat.
- **Choices within the rulings**: the session starts on the first message (the person's click), not on opening the
  panel; picking an agent or model while a session is in use asks for a new session (confirmed), else it is the
  choice for the first one; Claude's models: Default, Opus (`opus[1m]`), Sonnet (`sonnet[1m]`), Kiro: default only;
  a 422 on start blocks the composer with the server's words until another pick or New session; a 409 shows as a
  toast with the server's words. Chips: selected cards then unsent notes (a group note once, container notes too,
  none without words); a chip taken off stays off (a card's until the selection changes); the chips a message
  carried are spent. A change chip on another board opens that board first. The stepper link ("Show in the chat")
  opens the sidebar on the change chip of the last write that changed the card; it shows while a changed card's
  stepper is open. Panel closed by default (so flipping the flag later changes only the toolbar), width 400
  (360-720, the board keeps 480).
- **Small changes outside the new files**: `packages/ui` node: `CardUpdates.source`, `UpdateStep.source`,
  `stepMarkup` renders `<button class="vb-step-src" data-source>` (node-steps.css); `wiring.ts` uses a ResizeObserver
  on the stage instead of window resize (the sidebar and strips change its size); `packages/chat` header.css: a picker
  may shrink (`min-width: 0`), it overlapped Stop at a sidebar's width.
- **Tests**: `apps/board/tests/chat-bridge.test.ts` (7: chips, notes, link lookup, bridge both ways, stream start-over,
  message body, blocked order), `key-help.test.ts` (+1), `packages/ui/tests/node-updates.test.ts` (+1);
  `tests/pages/chat-panel.spec.ts` (9: flag off/on, open/close by button and T, stage shrinks; drag and keys resize,
  kept after reload; chips, send, prompt, words, change chip selects and zooms; stepper link opens the chat; a new page
  shows the conversation; axe light and dark; Allow once and Deny through the gate, Stop and the CLI gone; past version
  shuts the composer; New session cancel/confirm, then a message) on its own in-process server
  (`tests/pages/chat-server.ts`, port 4471, fake `claude` from `apps/board/tests/chat-support.ts`). Tests were written
  alongside the code, not strictly first. Kiro's refused start (a 422) is unit-tested via `blockedReason`, not on
  the page (page tests fail on any 4xx).
- **Gallery**: chat section gains "On the board" (the real `ChatSidebar` in gallery placement beside two cards, one
  selected); baselines `tests/pages/__screenshots__/chat.spec.ts/chat-{light,dark}-darwin.png` updated on purpose
  (viewed: only the new group added). No other baseline changed.
- **APCA** (APCA-W3 0.0.98G-4g, computed colours in Chromium): stepper link accent-text on the step section L 69.6
  D 48.3 (label tier); grip accent/focus on surface-region L 72.0 D 47.7 (decoration); Chat button pressed accent on
  accent-soft L 61.2 D 47.0 (as the existing pressed look). Looked at light and dark on the board and the gallery.
- **Docs**: `docs/specification/chat.md` § On the board; `packages/chat/README.md` Used by.
- **For the orchestrator**: `chatPanel` still default off. When it flips on, the toolbar gains the Chat button, so
  toolbar screenshots will change; the panel itself stays closed until opened.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_02: …`).
