---
task_name: A Send That Can't Reach The Chat Says Why
created: 2026-11-02
completed:
status: planned
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
