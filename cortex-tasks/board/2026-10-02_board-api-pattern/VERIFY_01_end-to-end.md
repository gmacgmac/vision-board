# VERIFY_01_end-to-end: Two agents, grants, Send, over the real MCP server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Done by**: the orchestrator, 2026-10-05 ·
> **Contract**: `docs/specification/api.md` (all)

## What was run

A throwaway probe (`temp/verify-u4.mjs`, deleted afterwards) started a real board server on a
temporary project and three real `vb-mcp` processes talking JSON-RPC over stdio, then played this:

| # | Step | Result |
|---|---|---|
| 1 | The page is served | sets the `vb_person` cookie |
| 2 | `server/discover`, `tools/list` (2026-07-28) | supported versions listed; 10 tools |
| 3 | Agent A joins as "Pricing chat" | id `a-` + 8 characters |
| 4 | A writes a board, a container and an item | all three ok |
| 5 | Agent B writes a note into A's container | refused per item, `needs-grant`, with the fix in plain English |
| 6 | B asks for the container twice | the second call returns the first request (`replayed`) |
| 7 | B waits on `check_responses`; the person allows on the board | B's wait wakes with the grant |
| 8 | B resends the same item with the same key | written; a third send is a replay |
| 9 | A write with an unknown secret | whole-call error, text only, no `structuredContent` |
| 10 | The person comments on item 1; A calls `list_open` | item 1 shows as owed a comment |
| 11 | A waits; the person presses Send | A wakes, and the comment comes with the Send |
| 12 | A legacy client (`initialize` 2025-11-25) | handshake answered; same 10 tools |

All 12 steps passed (16 checks). Earlier the same night, `vb` was smoke-tested the same way (join,
write, replay, unknown secret 401, an agent's `act` refused 403).

## Gates at the time

`npm test` 423, `npm run test:pages` 54, `npm run check`, `npm run verify` and
`node scripts/gen-api.mjs --check` all exit 0 (commit `c988fd0`).

## Not covered here

- A real Kiro, Claude Code or Cursor session using the server; the README has the config.
- The page's access strip clicked by hand: covered by `tests/pages/send-access.spec.ts`, not by eye.
