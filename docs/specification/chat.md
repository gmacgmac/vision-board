---
category: project-docs
type: specification
status: active
created: 2026-10-08
updated: 2026-10-28
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
4. **An approval.** Before a file read, a file edit or a shell command, the CLI's own "before tool
   use" hook (the gate) asks the access rules (§ The agent's access); what they ask about it posts as
   facts to `ask_approval` with the session's run token and waits. The server decides again, then
   streams an `approval_request`; the person's answer (`answer_approval`) becomes an
   `approval_result`, and the gate lets the tool run or refuses it, which the agent is told.
5. **The board's answers ride with every message.** On a board, each message the person sends is
   one message to the agent: their words, then "The person selected these cards:" with the cards
   selected (right after the words, so "these" means the selection: a message about selected cards
   works like a group comment), then "The person updated the board:", the numbered reply of what was
   answered since the agent was last told (each card's kind and word, "2 (question): no"), ending in
   "Still open: …" (the board's cards that need the person) and "Waiting for your reply: …" (those
   with the agent, api.md 149), and the `head` it covers, then the board's id. With no words, the selection and the answers go alone;
   that is what the board's Send is when the board has a session. A message with something attached
   waits while a turn runs and goes when it ends, built then; a second one meanwhile joins it. It
   counts as the board's Send when it goes (api.md 121, 131; `apps/board/server/chat-prompt.ts`
   `promptFor`). What it carries from the board has one writer, packages/actions `boardBlocks` and
   `roundOf`, which the page's preview reads too. A note goes once, as its answer: the composer
   offers no chip for an unsent note, and a note chip an older client still sends is dropped when
   it is among the answers, else listed under "Attached from the board:" after the selection. A
   selected card stays in the selection, with nothing of its answer.
6. **A session in the folder.** In a folder with no board the session starts on no board
   (`start_folder_chat`); its agent is told so and may create one, and the session moves to the
   first board its agent creates (api.md 122).
7. **Versions.** A change to the chat schema moves its `$id` to the next number (`.../chat/2/...`),
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

**The feed follows the latest** (`chat-feed.ts` `ChatFeed`, decisions in `feed-core.ts`). Following is
on by default; only the person's own scrolling away from the latest turns it off: the wheel, Page Up,
Home, the arrow up or Shift+Space in the log (`leavesLatest`), or dragging the scrollbar or a touch
(`followAfterScroll`). Nothing the page does counts: the Working line, chips from a board selection,
approvals, a growing reply, the composer resizing. While on, a `ResizeObserver` on the log and its rows
keeps the view at the end, and a panel that opens shows the latest. Moving down to the end by hand,
sending a message (the host calls `feed.follow()`; `shell/chat-panel.ts` `send`) or the "Jump to
latest" button (shown only while off) turns it on again. Held by `packages/chat/tests/feed-core.test.ts`
(the pure decisions), `tests/pages/chat-follow.spec.ts` (a reply growing with the composer, chips,
the panel opening, the wheel, the keys, sending, the button, the board's own panel) and the gallery
state `scrolled-away` (`tests/pages/chat.spec.ts`).

## On the board (apps/board/src)

The sidebar is `shell/ChatSidebar.svelte` (flag `chatPanel`): on the right, opened and closed by the
toolbar's Chat button and T, its width dragged from its left edge or set by the arrow keys there, both
kept per viewer; the stage shrinks beside it (`--vb-chat-w`). `shell/chat-panel.ts` hosts the elements
for the open board: the session in use (the newest, first in `list_chats`), its events (`watch_chat`,
reopened from the latest event held; a repeat of an earlier one then means the server started over, and
the server's first line then says the earlier messages aren't shown), and the elements' events answered
through `shell/page-io.ts`. A message starts a session when the board has none, and one sent while a session
starts (from the New session confirm on) waits for it and goes there;
the composer is shut with the reason for a page still loading, a past version or a refused start. In a
folder with no board the panel talks in the folder (`start_folder_chat`, `list_folder_chats`); the first
board its agent draws opens (its board write's `tool_activity`, or the board's first line), and the panel
stays on the same session there. The composer shows one chip for everything the message carries
from the board (composer-one-chip ruling 1), "3 answers · 2 selected" (either part alone), not
removable; there is no chip per card, and to leave a card out the person deselects it. Hovering it, or
click, Enter or Space, opens a preview over the feed of exactly the text the agent receives from the
board (`chat-bridge.ts` `boardContext`: packages/actions `boardBlocks` and `roundOf` with the session's
`agentId`, the server's own writer, so only what its agent is told; with no session yet, every
answer); hover keeps it while the pointer is on the chip or the preview, a click holds it until
clicked again, and Esc closes it with focus on the chip. The page tells the composer it holds
what is attached (`ChatHost.holds`): with a chip or the answers it sends with no words, and while the
agent works (held; the line under the box says so). Send to agent goes through the panel
(`boardSend`): with the board's session and something attached it is the composer's message with no
words (`sendsInChat`), so the two are enabled and disabled together (`shell.chatAttached` beside
`board.unsent`); otherwise it is the `send` act, as with no session. Held either way, the button shows
"Waiting for agent" until the next `message_in` ("Queued" with the `workAlongside` flag, below).

**Working alongside the agent** (flag `workAlongside`, point 328). While the agent works the person keeps
working on the board, and the board shows it: the toolbar's Chat button (`shell/ChatButton.svelte`) is
the board's one mark of the chat's agent, "Agent working" while its turn runs and "Waiting for your OK"
while a question waits for the person (that one also said in a polite live region), read from the chat's
own conditions table (`shell/chat-news.ts` `agentWork`). Send to agent pressed meanwhile reads "Queued"
(`SendButton.svelte` `queue`), and the answers given until the turn ends go with it, as the server builds a
held message when it goes (§ The pieces, 5). A reply (the `message_out` a turn ends on) that lands while
the chat is closed or scrolled away from the latest is counted on the Chat button ("1 new") and brings a
toast, "The agent replied" with Open chat, in a polite live region (`shell/Toast.svelte`); Open chat, or
opening the chat, goes to the latest and clears the count, as does scrolling back to it (`createReplyNews`,
`panelNews`). Only a reply that lands after the page began following the session counts. Words alone still
can't go while the agent works: the server refuses them (`apps/board/server/chat-sessions.ts` `tell`), so
the composer keeps them and says why. Held by `apps/board/tests/chat-news.test.ts` and
`tests/pages/chat-alongside.spec.ts` (every state in the gallery, light and dark; with the flag off, as before).
The model picker names exact models ("Opus 5.5", "Sonnet 5.5", with the 1M context for Claude; Kiro's own
ids for Kiro, see § Kiro).
`shell/chat-bridge.ts` is the only file that knows both sides: the selected cards and the answers
as the composer's one chip (the cards a message took are spent until the selection changes); a change chip selects and zooms to its cards
(opening their board first); a changed card's stepper links back to the write in the chat (`CardUpdates.source` in `packages/ui`).

**The drawing loads the first time the panel opens.** The session, its events, the waiting and attached
states and the bridge run from the page's start with the panel closed (`shell/chat-panel.ts`
`createChatPanel`, `shell/chat-bridge.ts`); the header, feed and composer, with the chat's element code
and CSS, are a chunk of their own (`shell/chat-view.ts` `mountChatView`, the only import of the
elements). It loads when the panel opens (the Chat button, T), at start when the panel was kept open,
and when a card's "Show in the chat" link needs a row (`ChatPanel.load`, `reveal`); a context the bridge
set before it came is handed to the composer then (`composerSide`). Until it is drawn the sidebar says
it is loading, and when the chunk does not come it says so, with Try again (`ChatSidebar.svelte`,
`shell.chatView`), which reloads the page: a browser keeps a module import that failed failed until then. The events' names the board listens for are in `packages/chat/src/events.ts`
(`CHAT_SEND_EVENT` and the others), so listening needs no element code. Held by
`tests/pages/chat-lazy.spec.ts` (no chunk requested and no element defined with the panel closed; opening
loads it once and a message goes; T; kept open; the card link; the error state and Try again; the loading
state) and, for the budget counting only what loads at start, `scripts/verify.test.mjs` (`pageAssets`).

## The approval's timing

A question the agent asks (an approval) waits for the person. With the server flag `approvalHold`
(`VB_FLAGS`, on by default; PLAN ruling 335):

- **No expiry.** The question waits until the person answers, presses Stop or sends a new message
  (the last two settle it as `released`). `createApprovals` (`apps/board/server/chat-approvals.ts`)
  sets no timer, and the `approval_request` carries no `expiresAt`: nothing lapses, so nothing is dated.
- **Only the agent's own working time counts.** A turn is stopped after `TURN_LIMIT_MS` (10 minutes)
  of work, not of waiting. While a question waits the live session (`chat-session.ts`) calls the
  adapter session's `hold(true)` and, when the last waiting question settles, `hold(false)`; the adapter's
  turn clock (`packages/agent/src/turn-clock.ts`, `startTurnClock`) pauses and resumes with the time that was left.
  Claude (`claude.ts`) and Kiro (`kiro.ts`) both use it. Stop still ends a held turn at once.
- **The numbers.** Claude's hook timeout in the generated settings is `HELD_HOOK_TIMEOUT_S` (86 400 s, 24 hours,
  `gateSettings`); the gate waits `gateWaitMs(true)` (15 seconds less), told to it by `AGENT_GATE_WAIT_MS`
  (`gateWaitFrom`). Kiro's permission request waits as long as the board does (`askOverHttp` with the same
  `gateWaitMs`). `StartOptions.approvalHold` carries the flag to the adapter.
- **Off:** an unanswered question is a denial after `APPROVAL_TTL_MS` (2 minutes, `expired`, with its
  `expiresAt`), the hook gives up at `HOOK_TIMEOUT_S` (600 s), and a turn stops after 10 minutes of wall
  time, waiting included; `hold` is never called.

Tests: `apps/board/tests/chat-approvals.test.ts`, `chat-hold.test.ts`; `packages/agent/tests/turn-clock.test.ts`,
`claude.test.ts`, `kiro.test.ts`, `claude-args.test.ts`, `gate.test.ts`.

## The agent's access

Every tool call the side-panel agent makes, Claude's or Kiro's, a read, a search, a file change or a
command, is decided by one function, `policy` (`packages/agent/src/policy.ts`), over one table,
`ACCESS_RULES` (`access-rules.ts`), of paths relative to the board's folder (D-066). It runs on every route,
before anything remembered:

- **Claude**: the gate's hook covers `Read`, `Glob` and `Grep` as well as the writing tools and `Bash`
  (`GATED_TOOLS`); the gate calls `policy` with the board's folder from `AGENT_GATE_FOLDER`
  (`packages/agent/src/gate.ts` `decide`). A refusal is denied with the rule's reason, an allowed call
  goes ahead unasked, the rest is asked. The same `--settings` carry Claude Code's own
  `permissions.deny` from the table (`claudeDenyRules`), a second line.
- **Kiro**: `kiro-permission.ts` `verdictFor` calls `policy` on every path a call names (a move at both
  ends); Kiro's agent file pre-approves only the board's tools, so every read reaches it.
- **The server** (`apps/board/server/chat-approvals.ts`) calls `policy` again on every ask, whatever the
  gate decided: a refused path is denied and an allowed one approved, unasked (`asked: false`). Then a
  kept yes answers what it covers (`coverOf`): a write's yes covers writes in that file's folder (not
  its subfolders), a read's yes covers that file only, a search's yes searches of that folder, a command's yes its first
  words (`rememberedHead`: `npm test` covers `npm test -- foo`, not `npm run build`; `git -C x commit`
  is `git commit`). Never remembered, asked every time (`NEVER_REMEMBERED`, one table in
  `readonly-command.ts`): a script by its path; what runs any code it is given (an interpreter, a shell,
  a launcher: `python3`, `sh`, `npx`, `env`); what acts on whatever it targets (`rm`, `rmdir`, `mv`, `cp`,
  `chmod`, `chown`, `ln`, `dd`, `truncate`, `git reset`, `git clean`, `git checkout --`, `git restore`,
  `git push`, `git rebase`, `git branch -D`, `npm publish`, any git command with `--force` or `-f`); and
  what reaches the network (`curl`, `wget`). The request says which scopes its
  yes may have (`scopes`): `once` always, `session` unless the call can't be remembered, `folder` only
  inside the board's folder; an answer with another is `invalid`.
- **For this folder**: kept in `.visionboard/permissions.json` (`chat-permissions.ts`), written by the
  server only and refused to the agent; listed by `list_permissions`, forgotten by `forget_permission`
  (api.md 107). The page's list and the approval's third answer are the chat's (agent-access ASK_01).
- **Off** (`agentAccessRules`, `VB_FLAGS`): nothing goes ahead unasked, `folder` is never offered and
  nothing kept for the folder is used; the refusals hold either way (`strictAccess` on the adapter,
  `AGENT_GATE_STRICT` for the gate).
- **Not covered**: a command that reads a refused file without naming it (a script, `python -c`) is
  asked, not refused; a search of a folder that holds a refused file (any board folder holds
  `.visionboard/agents.json`) is refused, so the agent searches a subfolder.

Tests: `packages/agent/tests/gate.test.ts`, `kiro-turn.test.ts`, `claude-args.test.ts`, `remember.test.ts`,
`policy.test.ts`; `apps/board/tests/chat-approvals.test.ts`, `chat-permissions.test.ts`, and end to end with
the fake CLI and the real gate, `api-chat-access.test.ts`.

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

Kiro runs as the `vision-board` agent (N34): at start the board server keeps
`~/.kiro/agents/vision-board.json` current (`chat-access.ts` `keepKiroAgent`, from
`packages/agent/kiro/vision-board.agent.json` with the skill as its prompt by an absolute `file://` path;
written only when it differs, nothing else in `~/.kiro` touched; `VB_KIRO_AGENT=0` skips it, as the page
tests' servers do). A file that cannot be written stops nothing else: a Kiro start is refused with the
reason, shown in the panel. Kiro starts with `--agent vision-board --model <model> --effort high`; a
session that is not that agent, or does not offer the model, ends before any prompt with a clear error.
The skill is the agent's prompt, so the person's message goes to Kiro as it is. The model picker offers
Kiro's Opus 5.5 (`claude-opus-5.5`, what picking Kiro gives) and Sonnet 5.5 (`claude-sonnet-5.5`), never
`auto`; a session recorded with no model shows Opus 5.5 (what Kiro runs), and picking Claude shows its Default,
Opus 5.5 and Sonnet 5.5 (N37).
The agent also reads the open project's own steering (`.kiro/steering/**/*.md`, always) and lists its skills
(`.kiro/skills/**/SKILL.md`, loaded on demand): the draft's `resources` are relative to Kiro's working folder, which
in the panel is the open project.
