---
task_name: A Send That Can't Reach The Chat Says Why
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-actions]
type: implementation
model: standard
persona: API designer — a failure the person caused by pressing a button is answered to that person, in their words, with nothing half-recorded behind it.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: A Send That Can't Reach The Chat Says Why

## Problem Statement

Point 386 (maintainer: "yes, page says why"). With `sendCountsWhatWent` on, `send` in
`apps/board/server/chat-sessions.ts` calls `live(stored.session)`; when the chat session can't be
loaded, `notHandedOver` writes the reason to the server log and the press is recorded with the board's
watermark (`pressed()`). The page shows nothing, so the person thinks it went.

Wanted: the `act` that carries the Send answers 409 with a problem whose detail says the chat couldn't
be reached and why, records nothing (the answers stay unsent, so Send stays lit and can be pressed
again), and the page shows that detail the way it already shows a failed act.

## Steps

1. Contract first: `act`'s 409 in the OpenAPI source (and `gen-api`), with the problem shape the
   server already uses (`problem('conflict', …)`, `apps/board/server/problem.ts`).
2. Failing test first: a unit test on `send` where `live` rejects: it throws the conflict, writes no
   ledger line. Then the change, only in the `sendHead` branch (the flag-off path stays as it is).
3. The sentence goes in the server chat words (`serverChatWords`, the words file `send` already uses;
   `docs/specification/words.md` says where). Reuse `reason(err)` for the why.
4. The page: find how a failed act reaches the person today (the sender's error path,
   `apps/board/src/board/sender.ts` `attempt`) and reuse it. Add a page spec that makes the session
   fail to load and sees the message, with Send still lit after.
5. Docs: `cortex-docs` audit of what this makes untrue (`docs/specification/chat.md`, `plugin.md` §
   The chat, `api.md`).
6. Checks: unit, `npm run verify`, `check`, `gen-api`, the specs you touched and the Send specs
   (`chat-send-*.spec.ts`), all at `nice -n 15`, at most 3 workers.

## Constraints

- Work only in the worktree you are given (branch `feat/send-error`). No commits.
- Ports: `VB_TEST_PORT=5410` (plugin), `5510` (pages). Never 4466 or 4600–5399.
- No protected files. Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- STOP and report if this needs a ledger format change or a change to the plugin seam's types.
- `chat-sessions.ts` is 328 lines: don't grow it much. If the change needs more than a few lines,
  move a cohesive piece out (maintainer, point 387: "reduce or split it the next time we add to it").

## Implementation Notes

**Done (2026-11-02, single mode, sub-agent).**

- **Contract**: `packages/format/schema/openapi.json`: `act` now lists `409` (`#/components/responses/sendConflict`, new, with the worked example), the `act` description says it, `info.version` 1.37.0 -> 1.38.0 (additive; `openapi.test.ts` follows). `npm run gen` regenerated `api-reference.md` and both `tools.generated.json` (`apiVersion`); `gen-api --check` is current. Problem shape is the server's own `conflict`; no ledger or plugin seam change.
- **Test first**: `apps/board/tests/api-chat-send.test.ts` "a chat that cannot be reached answers the Send with why, records nothing, and the answers go with the next Send" (was "a hand-over that fails ..."): failed 201 !== 409 before the change; now asserts 409, `conflict` type, the exact detail, no new `send` line, `sentHead` unchanged, the note still unsent, and the next Send carries it.
- **Change** (`apps/board/server/chat-sessions.ts`, `send`, `sendHead` branch only): `live(...)` rejection is now `throw problem('conflict', serverChatWords.theChatCouldNotBeReached(reason(err)))` in place of `.catch(notHandedOver)` plus `pressed()`. The file went 328 -> 327 lines, so no split. `notHandedOver` stays for the flag-off `handOver` path, untouched.
- **Words**: `theChatCouldNotBeReached(why)` in `apps/board/server/words/server-chat.ts`: "Send did not go: the chat could not be reached (<why>). Your answers are still unsent; press Send to try again." `<why>` is `reason(err)`, which for a load failure is already "Claude Code could not be started: ...".
- **Page**: no page code change. `sender.ts` `attempt` -> `fail` already toasts an `ApiError`'s message, and `SendButton.svelte` shows the same text as the button's error tip, then lights again after `HOLD.error`. New spec `tests/pages/chat-send-error.spec.ts` (dark and light): server 1 starts the chat session and a card of the chat agent's; server 2 on the same project cannot start the CLI; the page (which is made to know no chat on the board, see below) presses Send; sees the toast, the button's error state and tip, no new `send` line in the ledger, the agent told nothing, axe clean, and Send lit again.
- **Test support**: `tests/pages/chat-server.ts` `startChatServer({ project, startError, port })` and `ChatServer.project`; `tests/pages/ports.ts` gains `chatAgain` (offset 8 of the worker block) because a restarted server on the same port hits a dead keep-alive socket (`ECONNRESET`).
- **Docs** (`cortex-docs` audit): `api.md` rulings 121 and 170 (no longer "openapi.json is unchanged", "hands over nothing", "the error is logged"; test names; `updated`), `chat.md` (the board's `send` act refuses with why), `plugin.md` `send(record)` (the standalone `send` act is that rejection); `api-reference.md` generated. `docs/specification/words.md` needed nothing: `server-chat.ts` is already its home for this.
- **Checks** (all `nice -n 15`): `api-chat-send` + `openapi` unit tests; all `apps/board`, `packages/format|mcp|cli` unit tests (999 pass); `tests/plugin/*.test.ts` + `scripts/*.test.mjs` (87 pass); `npm run verify` ok (31 warnings, none new: `chat-sessions.ts` was already over 300); `npm run check` 0 errors; `gen-api --check` current; page specs `chat-send-error` (2), `chat-send*`, `chat-context`, `chat-lazy`, `send-access` (49 pass, 3 workers, port 5510); plugin spec `send-what-went` (4 pass, 5410). Not run: the full page suite (the orchestrator's once, at the end).

### Caught Beyond the Brief

1. **The standalone page's Send mostly doesn't reach `act send` with a session.** When the page knows the board's session and a chip is staged, `chat-panel.ts` `boardSend` sends it as a message with no words (`POST /api/chats/:id/messages`), and that route already told the person why (the toast "Claude Code could not be started: ..."). The `act send` path this task fixes is reached when the page holds nothing to attach or knows no session on the board (a session started elsewhere, a race at load) or by a host calling `act` directly. The page spec therefore stubs `GET /api/boards/<b>/chats` to an empty list to put the page in that state; there is no other way in the standalone page without a chip. Worth knowing for point 386's wording: "page shows nothing" was true for that path only.
2. **Same failure, two sentences.** The message route says "Claude Code could not be started: <why>"; the `act` route now says "Send did not go: the chat could not be reached (Claude Code could not be started: <why>). ..." The maintainer may want the message route to carry the "Your answers are still unsent" half too (there the words stay in the composer, so it may not be needed). Not changed.
3. **`reason(err)` on a load failure can carry a CLI's own error text** into a person-facing sentence (the same text `start_chat` already puts in `/agent`'s detail); api.md 40 says details never show internals. No new exposure, but it is where a stack-like message would surface.
4. The first Send in the page flow (a typed message on a board with a fresh grant) records a `send` line with no answers; unchanged, noted because it looked like a bug in the new spec until the ledger was dumped.
