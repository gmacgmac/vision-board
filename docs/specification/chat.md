---
category: project-docs
type: specification
status: active
created: 2026-10-08
updated: 2026-10-09
scope: How the chat panel pattern is built — its own event contract, the agent adapters, the gate and the bridge to the board
---

# Chat panel pattern

The decisions are D-036 (CLI agents through our own adapters) and D-037 (`packages/chat`; the chat
and agent packages stand alone). The plan is
`cortex-tasks/board/2026-10-08_board-agent_chat-panel/PLAN.md`. The contract's details are
[api.md](./api.md) 98-104; this page says how the pieces fit.

## The pieces

```
packages/chat/schema/chat-event.schema.json   the chat's own contract: events, approval facts and answers
packages/agent      one adapter interface, shaped after the Agent Client Protocol; one adapter per CLI; the gate hook
packages/chat       the panel: a framework-free core and plain web components, styled only by --chat-*
apps/board/server   sessions, the event stream and approvals; the only thing that starts a CLI (chat*.ts, api.md 105-107)
apps/board/src      the sidebar, and the bridge between the chat and the board
```

1. **Standing alone.** `packages/chat` and `packages/agent` import nothing from this repo, and the
   chat schema references nothing in `packages/format`. Everything that knows about boards (card
   numbers, notes, the round, change chips that zoom to cards) is in `apps/board`.
2. **One contract.** The chat event schema is the source (rule 6). The chat package's types and the
   agent package's event mapper are tested against it; `openapi.json` references it by `$id` for
   the chat routes' bodies and stream.
3. **A turn.** The person sends a message (`send_chat`); the server starts the CLI for that one
   message through its adapter; the adapter's updates become chat events (`message_out`,
   `tool_activity`, `system`); the server stamps `at`, `session` and `seq` and streams them
   (`watch_chat`). Tool calls never show raw: a board write becomes a change chip, any other tool
   one quiet status line while it runs.
4. **An approval.** Before a file edit or a shell command, the CLI's own "before tool use" hook (the
   gate) posts the facts to `ask_approval` with the session's run token and waits. The server
   streams an `approval_request`; the person's answer (`answer_approval`) becomes an
   `approval_result`, and the gate lets the tool run or refuses it, which the agent is told.
5. **Versions.** A change to the chat schema moves its `$id` to the next number (`.../chat/2/...`),
   as the ledger's does; new versions only add, so older events stay valid.

## The panel (packages/chat)

One folder per pattern, as `packages/ui` builds them (core, template, element, CSS, `pattern.json`):
`<chat-feed>`, `<chat-message>`, `<chat-approval>`, `<chat-composer>`, `<chat-header>`. The feed's
core is a reducer from chat events to what the feed shows; `src/conditions.ts` is the chat's
conditions table (busy, waiting, blocked, stopped, error), which the header's status, Stop and Send
read. The elements raise DOM events and never call a server; the host answers them. How a host
wires it: `packages/chat/README.md`. Every state is in the gallery behind the `chatPanel` flag,
fed by the recorded Claude turns (`apps/board/src/gallery/gallery.chat.json`, checked against the
recording by `apps/board/tests/chat-fixture.test.ts`).

## On the board (apps/board/src)

The sidebar is `shell/ChatSidebar.svelte` (flag `chatPanel`): on the right, opened and closed by the
toolbar's Chat button and T, its width dragged from its left edge or set by the arrow keys there, both
kept per viewer; the stage shrinks beside it (`--vb-chat-w`). `board/chat-panel.ts` hosts the elements
for the open board: the session in use (the newest, first in `list_chats`), its events (`watch_chat`,
reopened from the latest event held; a repeat of an earlier one then means the server started over, and
the server's first line then says the earlier messages aren't shown), and the elements' events answered
through `board/io.ts`. A message starts a session when the board has none, and one sent while a session
starts (from the New session confirm on) waits for it and goes there;
the composer is shut with the reason for no board, a past version or a refused start.
`board/chat-bridge.ts` is the only file that knows both sides: the selected cards and unsent notes as
chips; a change chip selects and zooms to its cards (opening their board first); a changed card's
stepper links back to the write in the chat (`CardUpdates.source` in `packages/ui`).

## Another host

To host the panel elsewhere (nclite's vision board chat mode): take `packages/chat` and
`packages/agent` as they are, map the `--chat-*` properties to that host's tokens, and serve the
same events and routes, or the host's own equivalents. nclite's run door (`/api/run/approvals`) is
the same shape as `ask_approval`: the gate sends facts and obeys the answer.

## Kiro

Kiro CLI runs through the same adapter interface over ACP (`packages/agent/src/kiro.ts`, engine v2;
see its README for the protocol notes). It has no hook to gate, so its `session/request_permission`
calls are mapped to the same facts and the same `ask_approval` route inside the adapter: the chat
panel's Allow and Deny work for it unchanged. The board's own tools (`vb`) and reading go ahead
unasked; a file change or a command is asked; any other request is refused.
