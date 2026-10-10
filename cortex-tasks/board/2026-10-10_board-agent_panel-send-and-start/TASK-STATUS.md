---
task_name: Chat panel - Send hands over the answers, first board from the chat
created: 2026-10-10
status: in-progress
tracker: cortex-tasks/tracker.md#N30,N31
---

# Chat panel: Send and first board - Task Status

> **Plan**: [PLAN.md](./PLAN.md). Task details live in PLAN's table and rulings; each task writes
> its notes below.

| # | ID | Task | Model | Status | Notes |
|---|-----|------|-------|--------|-------|
| 1 | BE_01 | Contract and server | Opus 5.5 | Completed 2026-10-10 | Gates green; api.md 121-122 |
| 2 | FE_01 | Page | Opus 5.5 | Completed 2026-10-10 | Gates green; 8 screenshots updated |
| 3 | T_01 | Skill | Opus 5.5 | Planned | |
| 4 | VERIFY_01 | By hand | Orchestrator | Planned | |

## Implementation Notes

### BE_01
_Status:_ Completed 2026-10-10. Five gates exit 0 (unit 965, page 318, check, verify, gen-check).

**Ruling 4 (words).** The word table moved to `packages/actions/src/action-words.ts` (`MEANINGS`
lowercase `yes`/`no`/`done`, `meaningOf`, `actionWord`, `otherWords`; `packages/ui`'s file deleted,
`node-template.ts` and `apps/board` `key-help.ts` import from the actions front door). Read three ways:
`check_responses` reports `means` on a ✓/✗ whose card kind gives a word (`response-order.ts`
`responsesPage`, `ReportedAct`; schema `check-responses-response.schema.json` `$defs/reported`, built
from the act pieces since `stored` is closed; not in the ledger); `replyText` lines are now
`2 (question): no`, `5, 7 (finding, risk): comment: ...`; Later's reply word is now `saved for later`
(ruling 1's example; `ACTIONS.later.reply`, so the page's toast says it too).

**Ruling 1 (Send).** Chosen: the existing `send` act gains it server-side (rule 8: the Send button
stays one action; no page branching). `writes.ts` `act`: after the answer, a `send` calls
`chats().round(board, seq)` (`chat-sessions.ts`); with no session on the board (`current`), nothing.
The message (`chat-round.ts` `roundText`) = `ROUND_HEAD` + `replyText(view, state, replyScope(...))` +
the head line; one writer. `replyScope` (`pending.ts`) = cards/containers with an on-item act after
`since`, via `responsesAfter` with the session's agent, so only what it may answer (api.md 41);
`replyText` with a scope keeps only notes after `since`, "Still open" stays whole-board. `since` =
the session's last told head (memory), else the previous Send. `LiveSession.post(text)`
(`chat-session.ts`): sent now, or held (one; `QUEUED` system line once) and sent when the turn
ends, its text built then, so a second Send is covered. No chat schema change (a change means chat/2).

**Ruling 2 (folder).** `start_folder_chat` `POST /api/chats`, `list_folder_chats` `GET /api/chats`;
`board` optional in `chat-session.schema.json`; `Chats` takes `Place` (board or undefined). The
folder session joins only (`joinAndGrant` board optional); its prompt ends `NO_BOARD`
(`chat-prompt.ts`), takes no chips, records no Send. `openChats` listens on the ledger: a `board` line
by an unattached session's agent that is the board's creator → `chat-index.ts` `attach` (once, entry
changed in place). Creator needs no grant.

Contract: OpenAPI 1.15.0, `npm run gen`, api.md table + 121-122, chat.md 5-6, components.md 2, READMEs,
modules.md (`npm run map`). Tests: `packages/actions/tests/meanings.test.ts`,
`apps/board/tests/api-chat-send.test.ts`, `api-chat-folder.test.ts`; reply-text tests updated.

**Hand-off FE_01.** (a) Send: keep calling the `send` act; with a panel session the message arrives on
`watch_chat` as a multi-line `message_in` starting "The person updated the board:". Waiting state: the
server queues exactly when the session is busy; it emits one `system` line (`QUEUED` in
`server/chat-session.ts`) and the message_in follows the turn-end line. Derive "waiting" from Send while
`chat.busy` until the next `message_in`. (b) Empty folder: `io.ts` needs `start_folder_chat` /
`list_folder_chats`; `send_chat` works unchanged (no chips; 422 with chips); drop `NO_BOARD` blocking in
`chat-panel.ts`. Jump: the done `tool_activity` of a board write names `board`; the session id stays,
and `list_chats(board)` then lists it first. (c) Model ids: the chat schema's `model` pattern accepts
`claude-opus-5-5[1m]`. (d) The Reply panel and the Later toast show the new words.
**Hand-off T_01:** `means`, the line format, the Send message (head line text in `chat-round.ts`), and
the no-board line (`NO_BOARD` in `chat-prompt.ts`).

**For the maintainer.** (1) Words are lowercase in agent text ("2 (question): no"), matching ruling 4
and the other reply words; ruling 1's example shows "No". (2) The waiting message goes when the turn
ends however it ends, Stop included (the ruling's wording); dropping it on Stop is the alternative.
(3) Answers on another agent's containers are left out of the message (the session's agent can't
answer them; `check_responses` with its secret leaves them out too). (4) What the agent was last told
is kept in memory; after a restart the message covers from the Send before. No protected file needs a
change; no decision entry proposed.
### FE_01
_Status:_ Completed 2026-10-10. Five gates exit 0, one after another (unit 969 + timing 6, check, verify,
gen-check, pages 324).

**CLI check (ruling 5).** `~/.local/bin/claude -p --model 'claude-opus-5-5[1m]' 'Reply with OK'` and the
same with `claude-sonnet-5-5[1m]`: both answered `OK`. `chat-panel.ts` `MODELS.claude` is now Default,
`claude-opus-5-5[1m]` "Opus 5.5", `claude-sonnet-5-5[1m]` "Sonnet 5.5"; a page test checks the session
stores the id and the CLI gets `--model claude-opus-5-5[1m]`.

**Send (ruling 1).** The button still calls the one `send` act; App.svelte routes it through
`ChatPanel.boardSend(send)`: when the panel's session is on the open board and busy, and the act was
recorded while the same message (`lastAsk`, the key of the person's last message) is still the one being
answered, the panel holds `wait` and tells the shell (`shell.sendWaiting`); the next `message_in` ends it
(render clears it). A session change or board load clears it too. `SendButton.svelte` gains the
`waiting` state ("Waiting for agent", a still clock mark, `access.css` `.vb-send-wait`; title and live
region "Your answers go to the agent when it finishes this turn"; clickable, a second Send is covered by
the server); when the wait ends it shows "Sent" for a moment. The multi-line `message_in` already keeps
its lines (`.chat-own` is pre-wrap); seen in the gallery and page tests, no change to packages/chat.

**Folder (ruling 2).** `io.ts` `listFolderChats`, `startFolderChat`; `ChatSessionInfo.board` optional.
`NO_BOARD` is gone: `blockedReason(board | null, past, refused)` blocks only while the page doesn't yet
know where it is (`LOADING`); '' is the folder (App passes it once boot sets the new `shell.noBoards`, so a
page with boards never asks for folder sessions). The empty feed then says "No boards here yet. Ask the
agent to draw one." A folder session's done board write (`firstBoard`) calls the bridge's new `open`,
which calls `boards.ts` `jump` (opens now, or as soon as the board's line arrives, so the tool event
coming before the ledger line never shows "There is no board"). The board's first line also opens it by
the existing empty-project rule. `load(board)` keeps following a folder session while the board's
`list_chats` is read; when it lists the same session first the conversation carries on unreset.
controller.ts stays at 299 lines (the `jump` dep is on the existing bridge line).

**Tests.** Unit: `apps/board/tests/chat-panel.test.ts` (waiting, first board, model ids), bridge `open`
and `blockedReason` in `chat-bridge.test.ts`, the gallery's Send scene against the server's words in
`chat-fixture.test.ts`. Pages: new `tests/pages/chat-send.spec.ts` (empty folder → chat → the agent's
first board opens, same session, next message names the board; Send idle posts the message; Send busy
waits, Stop, the answers go; the labels; axe light and dark while waiting and after) on
`chat-server.ts` (its `write` can now write as another agent's secret); `chat-panel.spec.ts` picks
"Sonnet 5.5"; chat.spec and send-access.spec count the new gallery states.

**Gallery.** Send to agent: Waiting. Chat panel: `send-queued`, `send-handed` (a new `send` scene in
`gallery.chat.json`) and `folder`; the samples' header now shows the model picker with the exact labels.
**Screenshots updated (diffs viewed first):** chat.spec (new samples, model picker), send-access.spec
(the Waiting button), toolbar.spec and open-folder.spec (no visual change: the sections below the chat
section moved by a fraction of a pixel, text antialiasing only).

**Docs.** `docs/specification/chat.md` "On the board" (folder, `boardSend`, waiting, model labels).

**For the maintainer.** (1) The handed-over message shows as the person's bubble ("You: The person
updated the board: ..."), its last line agent-facing ("These are the person's answers up to head N...").
It reads fine; a distinct look (a "From the board" label, the head line muted) would need a host hook in
packages/chat, left out. (2) In an empty folder, if another agent draws a board first, the page opens
that board (existing rule) and the panel leaves the folder session; the folder session's own first board
then doesn't open by itself. (3) The board's "No boards yet. Waiting for an agent to draw." message is
unchanged; it could mention the chat (proposed words: "No boards yet. Ask the agent in the chat (T), or
wait for an agent to draw."). (4) No protected file needs a change.
### T_01
### VERIFY_01
