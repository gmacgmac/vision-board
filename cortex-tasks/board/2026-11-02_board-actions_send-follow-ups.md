---
task_name: Send Follow-ups
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-actions]
type: implementation
model: strong
persona: Messaging engineer on a payments platform — a message is acknowledged for exactly what was delivered, nothing is ever lost silently, and a button that does nothing is a bug.
skills: [cortex-architecture]
tracker:
---

# Task: Send Follow-ups

## Problem Statement

Two follow-ups to `2026-11-02_board-actions_send-counts-what-went.md` (read its Implementation Notes
first), decided by the maintainer on 2026-11-02:

- **383:** on the board's own page, when the board's Send is recorded first and the server then hands
  the answers to a chat session (`apps/board/server/chat-sessions.ts` `round`), a crash between the two
  loses that hand-over. That path must follow the same rule as `deliver`: record the Send (with the
  `head` it read) only after the answers were handed over. A crash then records nothing and the answers
  go again with the next Send: a duplicate at worst, never zero.
- **384:** on a board with several agents, answers in a container the chat's agent may not read
  (`packages/actions/src/pending.ts` `concerns`) never go in its answers chip. Since the change they stay
  unsent, so Send stays lit with nothing to carry. Send must light up only for answers the chat's own
  agent may read (`chat.status.agent`; with no agent, as today). The other agents still get theirs
  through `check_responses`.

## Steps

1. Failing tests first: 383 (a crash, or a failure, between hand-over and record), 384 (only another
   agent's container answered: Send not lit; then one of its own: lit).
2. Fix each in the one place it belongs (`board.unsent` condition, `chat-side.ts`, the server path);
   reuse `concerns` / `replyScope`, don't copy them.
3. Changes to `docs/specification/plugin.md`: don't edit it (another task owns it this round); put the
   exact sentences under REQUESTS. Other docs the change makes untrue: fix them.
4. Gates at `nice -n 15`: `npm run map`, `npm run verify`, `npm run check`, `node scripts/gen-api.mjs --check`,
   `npm test`, `npm run test:plugin` (`VB_TEST_WORKERS=3 VB_TEST_PORT=5210`), the page specs on Send
   (`chat-send*.spec.ts` and any you touch, `VB_TEST_PORT=5310`), then the full page suite once.

## Constraints

- Work only in the worktree you are given (branch `feat/send-follow-ups`). No commits, no git history.
- Never port 4466 or 4600–5199. Tests `nice -n 15`, at most 3 workers.
- No protected files. Don't write `cortex/LOG.md` or `cortex/AUDITED.md`. Don't edit `plugin.md` or `apps/board/plugin/`.
- ✓, ✗ and approving stay the person's. The ledger stays append-only. No screenshot re-baselined without saying why.
- STOP and report if either fix needs a ledger format change.

## Implementation Notes

### Design

**383, the server path.** The engine's `act` used to append the Send and then tell the host (`onSend(board, seq)` on
`setImmediate`), which handed the answers to the chat session later (`round`). The order is turned round with the seam
the page already uses (`BoardChat.send(record)`): the engine gives the host the Send *to record*
(`operations.ts` `SendHook`, `onSend(board, record)`; default `record()` at once, so the plugin's engine and every other
action are unchanged). `chat-sessions.ts` `send` (replacing `round`):
- no session, a session starting, or nothing new for its agent: `record()` at once, as before;
- idle session: `deliver` with `record` as the held Send's recorder, so the read, the record (`head` = the line read)
  and the hand-over are one synchronous step, the same as a message's Send (`tell`). A refused record hands nothing over
  (the record now runs before `told.set`);
- busy session: the press is recorded at once with `head` = the board's watermark (`sendHead(s, board, null)`: the
  `record(null)` shape, acknowledging nothing new), and the round is held with the recorder, so the Send through what
  was read is recorded when the message goes at the turn's end;
- a session that can't be loaded: logged as before, and the press acknowledges nothing new; the answers go with the
  next Send.
- flag `sendCountsWhatWent` off: today's order (record, then hand over after: `handOver`).
`Held.record` became the recorder itself (`tell` passes a plain `send` append), so one `deliver` serves both paths.
No ledger format change, no `openapi.json` change: `act` still answers its stored line.

**384, the `board.unsent` condition.** `concerns` (which acts concern an agent, the `check_responses` test) moved from
`pending.ts` to `permissions.ts`, unchanged, so `unsent.ts` can reuse it without an import cycle
(unsent -> pending -> conditions -> unsent). `unsentOn(s, board, agent?)` keeps only the lines the agent may read;
`ConditionContext.sendTo` (not `agent`, which drops the person's rows) carries the chat's agent to `board.unsent`;
`pageConditions(s, board, sendTo?)`. On the page, `attention.ts` takes the host's `ChatStatus` (`chat`), reads
`agent` on every read and reads again when it changes; `controller.ts` passes `host.chat.status` with the flag on.
With no agent: every answer, as before. `chat-side.ts` needed no change: its answers chip was already agent-scoped.

**Rejected.**
- *Act answers 202 for a held Send (one Send line per hand-over)*: changes `act`'s responses (`openapi.json`, version,
  the page's `sendAct`/`sender.ts` handling a reply with no line). The press line acknowledging nothing is the existing
  `record(null)` shape and needs no contract change.
- *Refuse the Send (409) when the session can't be loaded*: tells the person why, but `act` declares no 409 (contract
  change). Logged instead, nothing lost; see REQUESTS.
- *Always press-line first, then hand over async*: two Send lines for every board Send; idle sessions need only one.
- *Scope `board.unsent` in chat-side.ts by the answers chip*: a chip spent by a Send that went without it (property 1
  of point 377) would then leave Send off with this agent's answers unsent.
- *A second writer of the status's `unsent`*: two writers race; the condition is the one place.

### Changes

- Engine: `operations.ts` `SendHook`; `engine.ts` `EngineOptions.onSend` takes it (default records at once);
  `writes.ts` `act` hands a Send to `onSend` with `record`.
- Server: `project.ts` `onSend` -> `chats.send`; `chat-sessions.ts` `send` (was `round`), `handOver` (flag off),
  `Held.record` a recorder, `deliver` records before `told.set`, `notHandedOver`.
- Actions: `permissions.ts` `concerns` (moved), `pending.ts` imports it; `unsent.ts` `unsentOn(s, board, agent?)`;
  `conditions.ts` `ConditionContext.sendTo`, `board.unsent` reads it (its `trueWhen` says so);
  `answers/page-conditions.ts` `pageConditions(s, board, sendTo?)`.
- Page: `cards/attention.ts` `chat` dep, re-read on agent change; `controller.ts` passes it behind the flag;
  `host.ts` `ChatStatus.agent` comment.
- Flag text (`flags.ts` `sendCountsWhatWent`) names both.
- Docs: `api.md` 170 (new), 121 and 160 amended; `chat.md` § the board's Send; `components.md` (`pageConditions`
  paragraph); `packages/actions/README.md`.
- Tests: `api-chat-send.test.ts` ("with a session": the Send's `head` is the line its message read; "while a turn
  runs": the press acknowledges nothing, the delivery records the read; new "a hand-over that fails counts nothing as
  sent; the answers go with the next Send", a restart whose CLI can't start, then one that can); `unsent.test.ts`
  ("with the chat's agent ..."); new `tests/pages/chat-send-scope.spec.ts` (dark and light, axe in both states).

Failing first: the three `api-chat-send` assertions (`head` missing; press acknowledged everything; the failed
hand-over acknowledged the note), the `unsent` test (row held for B's card), and the page spec with the attention
wiring taken out ("nothing for the chat's agent": Send `idle`, expected `disabled`).


### Results

- `npm run map` (modules.md unchanged), `npm run verify` ok (31 warnings, none new as a failure; `chat-sessions.ts`
  grew 307 -> 328, `flags.ts` 321 -> 322; `controller.ts` stays 306), `npm run check` 0 errors,
  `node scripts/gen-api.mjs --check` current, `npm test` 2201 + 14 timing pass.
- `npm run test:plugin` (3 workers, 5210): 78 pass.
- Send page specs (`chat-send`, `chat-send-scope`, `send-nothing-new`, `send-access`, `chat-alongside`; 5310): 40 pass.
- Full page suite once (3 workers, 5310): 835 pass, 1 fail, 10 did not run (the projects that depend on chromium):
  `host-styles.spec.ts` "the board in a 550px pane inside a 1600px page ... (dark)", "the pane lays out as the window
  did", 4 lines apart under load; the same flake the previous task saw (in light there). Passes alone (8 of 8). No
  Send in it. No screenshot re-baselined.
- Browser: `chat-send-scope.spec.ts` drives the real page in dark and light (Send quiet with "Nothing new to send",
  then lit and handed over, axe clean in both states). Nothing looks different, so no gallery entry.

### Issues and requests

1. **A session that can't be loaded is only logged** (as before): the person's Send is recorded, acknowledging nothing
   new, Send stays lit, and the next press tries again. Nothing is lost, but the page doesn't say why. Saying so needs
   `act` to declare a 409 (an `openapi.json` change): [needs-human-input] whether to.
2. **A Send pressed while the agent works writes two Send lines** (the press, acknowledging nothing new, and the one
   through what was read when the message goes). A pull agent sees both in `check_responses`. The alternative (a 202
   with no line) is a contract change; rejected above.
3. **A busy session with nothing new for its agent at the press** records the Send at once (covering every answer, as
   a Send no chat carried); answers made later in that turn go with the next Send, no longer at the turn's end.
4. **plugin.md (not edited, owned by another task this round)**, § The chat, `status`, proposed exact sentences:
   - replace "An answer no Send has carried enables Send either way." with "An answer no Send has carried enables Send
     either way; with `agent`, only one that agent may read."
   - replace "`agent`: the id your chat talks to, which scopes the answers chip to what it may read." with "`agent`: the
     id your chat talks to, which scopes the answers chip, and the answers that light Send, to what it may read; an
     answer only another agent may read leaves Send off, and that agent reads it with `check_responses`."
   - The table row for `EngineOptions.onSend` stays true. No fake-host test proves the `agent` scoping (the fake host
     gives no `agent`); `chat-send-scope.spec.ts` proves it on the standalone page through the same `attention.ts`.
5. Decision draft (for `docs/decisions.md`, not written): an addendum to the proposed D-075: "6. The board's Send on
   the standalone page is recorded once its chat session has the answers, with the head it read; pressed while the
   agent works, it is recorded acknowledging nothing new, and again when the message goes (point 383). 7. With the
   chat's agent known, Send lights only for answers it may read (point 384)."
