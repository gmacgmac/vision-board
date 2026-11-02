---
task_name: Send Follow-ups
created: 2026-11-02
completed:
status: pending
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

_To be completed by the agent._
