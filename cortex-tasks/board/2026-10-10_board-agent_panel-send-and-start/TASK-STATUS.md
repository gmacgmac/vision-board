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
| 2 | FE_01 | Page | Opus 5.5 | Planned | |
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
### T_01
### VERIFY_01
