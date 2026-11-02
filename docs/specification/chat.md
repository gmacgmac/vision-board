---
category: project-docs
type: specification
status: active
created: 2026-10-08
updated: 2026-10-31
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
board (`chat-bridge.ts` `composerContext`, joining the board's two live chips, packages/actions
`selectionChip` and `answersChip` with the session's `agentId`, the server's own writer `boardBlocks`
word for word, so only what its agent is told; with no session yet, every answer); hover keeps it while the pointer is on the chip or the preview, a click holds it until
clicked again, and Esc closes it with focus on the chip. The page tells the composer it holds
what is attached (`ChatHost.holds`): with a chip or the answers it sends with no words, and while the
agent works (held; the line under the box says so). Send to agent goes through the host's chat
(`board/host.ts` `BoardChat.send`; `chat-panel.ts` `boardSend`): with the board's session and something attached it is the composer's message with no
words (`sendsInChat`), which the server records as the Send, so the two are enabled and disabled together (`shell.chatAttached` beside
`board.unsent`, the status's own, from `BoardChat.status`, which counts only what the session's agent may read, api.md 170); otherwise it is the
board's `send` act, as with no session, which the server records once it has handed the session's agent its answers (api.md 170). Held either way, the button shows
"Waiting for agent" until the next `message_in` ("Queued" with the `workAlongside` flag, below).

**Working alongside the agent** (flag `workAlongside`, point 328). While the agent works the person keeps
working on the board, and the board shows it: the toolbar's Chat button (`shell/ChatButton.svelte`) is
the board's one mark of the chat's agent, "Agent working" while its turn runs and "Waiting for your OK"
while a question waits for the person (that one also said in a polite live region), read from the chat's
own conditions table (`shell/chat-news.ts` `agentWork`) and reaching the mark as any host's would, through
`BoardChat.status` and the board's status (`chatWork`). Send to agent pressed meanwhile reads "Queued"
(`SendButton.svelte` `queue`), and the answers given until the turn ends go with it, as the server builds a
held message when it goes (§ The pieces, 5). A reply (the `message_out` a turn ends on) that lands while
the chat is closed or scrolled away from the latest is counted on the Chat button ("1 new") and brings a
toast, "The agent replied" with Open chat, in a polite live region (`shell/Toast.svelte`); Open chat, or
opening the chat, goes to the latest and clears the count, as does scrolling back to it (`createReplyNews`,
`panelNews`). Only a reply that lands after the page began following the session counts. Words alone go too: the page tells
the composer it queues them (`ChatHost.queues`, set by `shell/chat-panel.ts` `render` with the flag on), and
the server holds them in order (`apps/board/server/chat-sessions.ts` `tell`), while the agent works and
while a question waits (that one is then released, unanswered); the line under the box says so
(`composerView`). With the flag off the composer keeps them and says to Stop. Held by
`apps/board/tests/chat-news.test.ts`, `packages/chat/tests/folder-scope.test.ts` and
`tests/pages/chat-alongside.spec.ts`, `chat-folder.spec.ts` (every state in the gallery, light and dark; with the flag off, as before).
The model picker names exact models ("Opus 5.5", "Sonnet 5.5", with the 1M context for Claude; Kiro's own
ids for Kiro, see § Kiro).
The chat reaches the board only through the host contract (D-074; `board/host.ts` `BoardChat`, `BoardView`), and
`shell/chat-bridge.ts` is the standalone chat's side of it (`createChatBridge` `host`): the board attaches its selected cards and the answers,
drawn as the composer's one chip (a selection a message took is spent until its `ref` changes); a change chip is `BoardView.reveal({ board, cards })`, which zooms and selects nothing, so nothing goes with the next message
(opening their board first); a changed card's stepper links back to the write in the chat (`BoardChat.reveal`, `hasLine`; `board/chat-side.ts`, `CardUpdates.source` in `packages/ui`). Held by
`apps/board/tests/chat-bridge.test.ts`, with no other part of the board, and `tests/pages/board-host.spec.ts` "the chat seam".

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
  goes ahead unasked, the rest is asked. A command's words are resolved from the hook's `cwd` and judged
  against the board's folder, and the CLI runs with `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1`, so no
  `cd` carries over between commands. The same `--settings` carry Claude Code's own `permissions.deny`
  from the table (`claudeDenyRules`), a second line; `--tools` leaves the session only the built-in tools
  the chat allows (`CHAT_TOOLS`: ToolSearch and the gated ones).
- **Kiro**: `kiro-permission.ts` `verdictFor` calls `policy` on every path a call names (a move at both
  ends). Kiro asks only when its own rules say so: its agent file (`kiro-agent.ts` `kiroAccess`) makes
  `fs_read` and `shell` ask (engine V3), so each reaches `verdictFor`, and denies the refused rows itself.
  CLI 2.x trusts `read`, `grep` and `glob` in its working folder with no way to make them ask: there a read
  inside the folder never reaches `verdictFor`, and only the closed files are stopped, by Kiro's own
  `deniedPaths` from the same table (VERIFY_01 F1; which engine runs is the maintainer's live look).
- **The server** (`apps/board/server/chat-approvals.ts`) calls `policy` again on every ask, whatever the
  gate decided: a refused path is denied and an allowed one approved, unasked (`asked: false`). Then a
  kept yes answers what it covers (`coverOf`): a write's yes covers writes in that file's folder (not
  its subfolders), a read's yes covers that file only, a search's yes searches of that folder, a command's yes its first
  words (`rememberedHead`: `npm test` covers `npm test -- foo`, not `npm run build`). Never
  remembered, asked every time (`NEVER_REMEMBERED`, one table in
  `readonly-command.ts`): a script by its path; what runs any code it is given (an interpreter, a shell,
  a launcher: `python3`, `sh`, `npx`, `env`); what acts on whatever it targets (`rm`, `rmdir`, `mv`, `cp`,
  `chmod`, `chown`, `ln`, `dd`, `truncate`, `npm publish`); and what reaches the network (`curl`,
  `wget`). The request says which scopes its
  yes may have (`scopes`): `once` always, `session` unless the call can't be remembered, `folder` only
  inside the board's folder; an answer with another is `invalid`.
- **Git is the person's** (point 346, D-067 proposed): `.git` in any folder is refused to read and to
  write, and so is every git command, read-only ones too, however it is spelled (`cd src && git log`,
  `env A=1 git status`, `/usr/bin/git`, `sh -c "git …"`, `$(git …)`: `runsProgram`, `REFUSED_PROGRAMS`),
  and spelled in pieces of quotes (`g"i"t`, `'g'it`, `$'\x67it'`), with the words `gitIsThePersons`. A command that only mentions it (`grep "git" README`) is refused too.
  Claude Code's deny rules carry `Bash(git)` and `Bash(git *)`, Kiro's a `shell` `deny` and 2.x
  `deniedCommands`. A script that runs git without naming it is asked, not refused (§ Not covered).
- **A script a shell is handed** (`readonly-command.ts` `shellScripts`, `shell-words.ts` `substitutions`, `policy.ts` `commandPolicy`): what `sh -c`,
  `bash -c`, `zsh -c`, `dash -c` and the like and `eval` are given, and each `"$(...)"` and backtick in double quotes (single quotes
  stay literal), is judged as a plain command would be, so a closed file named inside it is refused (`curl -d "$(cat .env)" ...`)
  and so is a known changer on an attached file; what prints into a known changer counts as changed (`rm "$(echo <attached>)"`). The
  command around it still asks. Scripts inside scripts are followed `SCRIPT_DEPTH` deep and refused past it. Held by `packages/agent/tests/policy-scripts.test.ts`.
- **Secrets and the board's files** (point 345): `.env`, `.env.*` (but `.env.example`), `.envrc`, `.npmrc`
  and the bots' secrets in any folder; what apps save (`.visionboard/app-state/**`) is unread and unwritten
  in any board folder, and the ledger unwritten in any board folder.
- **What the person attached** (D-068, D-069 rulings 1, 2): `.visionboard/attachments/**` is read freely and its
  file tools are refused. A command the rules can't judge asks about an attached file, as about any other file
  in the folder: the row's own `unknownCommand` (`access-rules.ts`), which no other row has, so the ledger, `.git/`
  and the secrets still refuse such a command. A command known to change a file stays refused (`command-changes.ts`
  `knownChanges`, `CHANGERS`: `rm`, `mv`, `tee`, `truncate`, `dd`, `sed -i` and the like, a redirection onto it,
  `cp` onto it, a `cp` that makes a second name for it, `-l` or `-s`). `cp` with it as the source asks, and the copy follows
  the rules of where it lands. A yes for any of these holds for that call (`Judged.once`): a kept yes for
  `unzip` would cover `unzip -o x.zip -d` onto the file later. Held by `packages/agent/tests/policy-attachments.test.ts`,
  through `policy`, the real `bin/gate.ts` and Kiro's `verdictFor`.
- **For this folder**: kept in `.visionboard/permissions.json` (`chat-permissions.ts`), written by the
  server only and refused to the agent; listed by `list_permissions`, forgotten by `forget_permission`
  (api.md 107).
- **In the chat** (`agentAccessRules` on; `packages/chat`). The approval card offers the answers its request lists
  (`approval_request.scopes`, `choicesFor`): Allow once, Allow for this session, Allow for this folder, Deny; a
  request that lists none (an older host) offers the first two. A read shows as "File read", a search as
  "Folder search", the path exactly. A request with no `expiresAt` (`approvalHold`) shows no countdown and never
  lapses: it says "Waiting for your answer" (`approvalView` `timed`). The header's "Allowed for this folder"
  (`allowedTemplate`, `allowedLabel`, under the status) lists each kept yes in words ("Write files in src/", "Run
  npm test") with Forget (`chat-forget`); `shell/chat-allowed.ts` reads the list when the drawing comes, when the
  list opens (`chat-allowed`) and when a yes for the folder is given, and Forget asks first (the confirm dialog),
  then `forget_permission`, and the agent asks again. Held by `packages/chat/tests/folder-scope.test.ts` and
  `tests/pages/chat-folder.spec.ts` (every state in the gallery, light and dark).
- **Off** (`agentAccessRules`, `VB_FLAGS`): nothing goes ahead unasked, `folder` is never offered and
  nothing kept for the folder is used; the refusals hold either way (`strictAccess` on the adapter,
  `AGENT_GATE_STRICT` for the gate).
- **Searches and paths outside**: a search of a folder that holds a refused file (any board folder holds
  `.visionboard/agents.json`) is refused, and so is a search of a folder that holds the board's folder (the
  parent, `/`): the board's folder is walked for it. A command naming a path outside the folder is asked
  `once`, never kept. A command the gate asked about is never let through unasked by the server, and the gate tells it
  the shell's folder when that is not the board's (`commandFacts.cwd`), so the server judges the same words from
  the same place and a kept yes can't answer what the gate asked once (`apps/board/tests/chat-approvals-shell.test.ts`).
- **Not covered**: a command that reads a refused file or runs git without naming it (a script file,
  `python -c`, a variable, `"$X"`, a script on stdin, `env -S "..."`, `npm run` of a script that calls git, git behind a
  launcher outside `WRAPPERS` such as `busybox git`) is asked, not refused. "Never change" an attached file holds
  for what `knownChanges` recognises; for anything else (a script, `tar -x` or `unzip -o` into its folder, a
  program the shell computes, `python3 <attached>` itself) it rests on the person's answer (D-069 ruling 1). A remembered command runs whatever code it runs: a yes for `npm test` or `npm run
  build` covers the code the agent writes there later, and that code can read what the person can (`.env`
  too). Inside the folder a yes for `sed -i` covers every file the rules ask about, where a Write yes
  covers one folder.

Tests: `packages/agent/tests/gate.test.ts`, `kiro-turn.test.ts`, `claude-args.test.ts`, `remember.test.ts`,
`policy.test.ts`, `policy-scripts.test.ts`; `apps/board/tests/chat-approvals.test.ts`, `chat-approvals-shell.test.ts`, `chat-permissions.test.ts`, and end to end with
the fake CLI and the real gate, `api-chat-access.test.ts`.

## Attaching

The person attaches a file to a message and the agent opens it with its own tools (D-068, D-069; api.md 164-166).
The page and the server each have the `chatAttachments` flag, and off means both: `VB_FLAGS=-chatAttachments` for the
server, `?flags=-chatAttachments` for the page. With only the server's off the paperclip stays, and a chip says it is off.

- **Where files go**: each is saved when it is attached (`attach_chat_file`,
  `apps/board/server/chat-files.ts` `saveAttachment`) at `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`, in
  the person's project. Day folders, because a new chat's first message has no session yet. The board keeps them out
  of the project's git: `saveAttachment` adds `attachments/` to `.visionboard/.gitignore` through `ignoreInGit`
  (D-069 ruling 3; `chat-files.test.ts` asks git itself).
- **By path, never by content**: Send carries the paths; the prompt names them, one a line, under "The
  person attached these files:" (`chat-prompt.ts` `promptFor`). Neither adapter changes, and pictures go the
  same way. What an agent can open by path is its own. A file its read tool can't open, it opens by a command, which
  asks (§ What the person attached). Kiro's read tool opens a picture (measured live, D-071); no test can run a real CLI, so
  that stays a live look.
- **A path from a page is not believed**: `send_chat` takes only what `attachedFile` accepts: the saved
  shape, or inside a folder the board made for it (`saveBeside`), no link at any step, still there. It does not record what it saved (D-069 ruling 4). The agent's file tools can't write there and known commands are refused; a command the rules can't judge (`mkdir`, `unzip -o -d`) asks, so a yes lets it. A link is refused either way, and what it planted is read as untrusted.
- **A PDF's pages and a big picture's copy** (D-071; api.md 168; flag `readAttachment`): once a file is ready, the page has it read in a
  sandbox and saves pictures beside it (`apps/board/src/shell/pdf-pages.ts` `createCopies`, called from `chat-bridge.ts`). A PDF gets at most `PAGES_MAX` (30) pages, one at a time, each saved
  before the next is asked; a raster picture over `PICTURE_BYTES` (`#format`, 3.5 MB: measured live on Kiro, a 4.3 MB PNG rejected, a 3.5 MB one seen) or `PICTURE_EDGE` (2000 px) gets one fitted copy, a PNG if it fits, else a JPEG. Send waits for that copy, as for an upload, and the line says why (`ComposerFile.holds`), since the original may never reach the model; a failure or the deadline frees it, the chip says so, and the original goes. A PNG or JPEG whose header says it is within the limits (`headerWithin`) gets no frame and holds nothing. Pictures have their own queue, so a PDF ahead doesn't hold them. The chip says "Reading pages… 12 of 30", moving in place (`onlyDoingMoved`, so a press on its remove button is never lost to a redraw); a PDF that can't be read, or falls short, says so in a row of its own (`ComposerFile.note`) and the file itself still goes. A message sent while a PDF is read says only what is saved, and the work stops; so does taking the chip off. A page with text that drew nothing (`blank`, from the worker: all white, with a `showText` in its operators) is still saved, as `page-003-of-040-blank.png`; the chip says the pictures may be incomplete, and the prompt says the page is not known to be blank (`pagesDrewNothing`).
- **Where a stranger's file is read**: a new hidden frame per file, one at a time in each queue (`browserFrame`): `sandbox="allow-scripts"`, so no origin; a policy with no network and no eval, whose one script is inside the page, by hash (`server/pdf-frame.ts`), so it asks for no file. The frame's own script only starts a worker and passes messages (`pdf-pages-frame.ts`); the reading is in the worker (`pdf-pages-worker.ts`), because `connect-src` doesn't stop WebRTC in a frame and nothing of its own stops it navigating, and a worker has neither; pdf.js's core runs in a second worker inside it. It stalls neither the page nor the frame. The page takes only the answer it is waiting for, whole (`pdf-pages-core.ts` `checkedAnswer`: shape, page, size, a real PNG or JPEG within the limits), removes the frame at `READY_MS` (a frame may have a process of its own, so its `ready` comes before or after its `load`, and `load` says nothing), `STEP_MS` or `FILE_MS`, and after every file, and the server checks again (`saveCopy`). All pdf.js would fetch is inside the script (`DATA`, by file name, `BinaryData`): its two image decoders (JPEG 2000, JBIG2) as WebAssembly, so the policy has `wasm-unsafe-eval`; its predefined CMaps, so CJK text in a font a PDF doesn't embed is read, and drawn in the system's CJK font; its standard fonts, so a PDF relying on Helvetica or Times draws the same on any machine. ICC profiles do not come (a colour shift at most). Held by `apps/board/tests/pdf-pages.test.ts`, and `tests/pages/chat-attach-pages.spec.ts` on the headless shell, its `@full-build` tests also on each full build found (`full-builds.ts`).
- **A picture inside a Word file or a zip** is not fitted, as it appears after the page's part is done: `read_attachment` names those over `PICTURE_BYTES` in its `note` (`overTheLimit`), and says the agent may not see them.
- **A message that waited** is checked again when it goes (`chat-files.ts` `checked`, `stillThere`): a file deleted
  meanwhile is left out of the prompt, its chip is gone from the message, and the message says which, to the person
  by their name for it and to the agent by the saved name. A number stays taken once its file is deleted (`nextNumber`,
  `taken`), so a waiting path never comes to name other bytes. Held by `api-chat-files.test.ts`, `chat-files.test.ts`.
- **What the agent's own tools can't open**, `read_attachment` reads (D-071; api.md 167; `apps/board/server/chat-read.ts`,
  `packages/documents`): an Excel file's sheets, names and links, then a range's values, formulas, comments and drawings, its pictures saved; a Word file as Markdown with
  Word's numbers, its pictures saved beside it in a new folder, and SmartArt, charts and drawn shapes as markers with their words and links, not their look; a zip into a new folder,
  never over anything. `note` says what wasn't reached, so the agent can tell the person, not answer from half a document. A PDF from a zip has no pages made, and the note and the refusal say to ask
  for it on its own: the page makes pages only for what is attached directly, and the server can't. The new folders sit under
  `.visionboard/attachments/`, so the row for attachments covers them, and `attachments/` is already in the board's own
  `.gitignore`. Behind the server's `readAttachment` flag (`VB_FLAGS=-readAttachment`); off, the operation is `not-found`, and
  the tool stays in the MCP server's list, whose table is generated once. A hostile file reaches nothing outside its new
  folder, and a refused one leaves nothing. Held by `chat-read.test.ts`, `api-read-attachment.test.ts`, `packages/documents/tests/`.
- **The board never serves them**: no route reads them (`api-chat-files.test.ts` tries the addresses one might), so
  nothing in a file runs in the board. What the agent may do with them is § What the person attached.
- **In the panel** (`apps/board/src/shell/chat-bridge.ts` `createChatBridge`, `packages/chat` `composer-attach.ts`,
  `composer-core.ts` `ComposerFile`; held by `tests/pages/chat-attach.spec.ts`): the person drops, pastes or picks
  (the paperclip, a button, so the keys do all of it). `packages/chat` takes no API: the composer raises `chat-files`
  with each `File` and takes each chip's state from `setFiles`, and its sentences come from the host
  (`ComposerView.files`, `words/chat.ts` `attachingFiles`). Each file uploads as it comes. Its chip says uploading,
  ready, or refused with why, in a row of its own; a status line tells a screen reader each change. The page checks
  10 MB and 10 files first (`FILE_BYTES`, `FILE_COUNT`, held equal to the server's) and the server checks again. Send
  waits while a file uploads, and says so; a ready file goes with no words; a refused one never goes, and leaves the
  composer with the message. A paste with other text is that text (a spreadsheet's cells come with a picture of
  them), unless the text is only the files' names (`pastedFiles`). A picture pasted with no name of its own is named
  from the words: "pasted picture", the day, its type's extension.
- **A file dragged over the page** (point 357; `shell/file-drops.ts` `guardFileDrops`, `chat-attach-drop.spec.ts`,
  `file-drops.test.ts`): with the flag on, the whole open panel takes a drop as the composer does (`dropArea`, the
  same drop target on the composer), and anywhere else on the page a file does nothing: the page stops the browser
  opening it in place of the board. Only files; text and a card's drag go on as ever. App frames let a dragged file
  through while it is dragged, as the guard can't reach their pages. The guard is the host's, as a host owns its page,
  and it comes off when the board unmounts. **Not covered**: a drag that first enters the window directly over a frame
  is not seen until it reaches the page; panels get no drops during a file's drag.
- **The person's name for a file** (`attachedFile.label`, point 356; api.md 165): the server's saved name is plain ASCII, so a
  wholly non-Latin name saves as `file.png`. The chip and the sent message show the name the person's file has: Send
  carries it beside the path (`fileLabel` makes it one the contract takes). It is display only: shown as text, never in
  the prompt, and nothing is believed from it.
- **Another folder**: the page reloads onto it (`folder.ts` `reloadOnto`, `folderMoved`), so the chips go with the page
  and a path saved in the last folder never reaches Send.
- **Refused at Send** (`ApiError.pointers`, `createChatBridge` `refuseSent`, `chat-attach-batch.spec.ts`): a file deleted before
  Send marks its own chip refused from the problem's `/files/<i>`, with why; the words stay, and the next Send goes without it.
- **Many at once** (`attachFiles`, `filesSaid`, `chat-attach-batch.spec.ts`): what fits gets a chip and uploads; the rest
  share one refused chip that counts them; more than a few moving at once are one line of counts in the status.
- **Not covered**: an attached file's contents are read by the agent like anything else it reads, so
  words inside it can try to steer it; the access rules and the person's approvals still hold. A saved name keeps an
  ASCII name's words, with underscores, so a hostile name's words reach the prompt that way (shell and path safe;
  VERIFY_01 F6, accepted). Two wholly non-Latin names reach the agent as `1-file.pdf` and `2-file.pdf`: the
  person's own name stays out of the prompt.

Tests: `apps/board/tests/chat-files.test.ts`, `api-chat-files.test.ts`, `chat-attach.test.ts`, `file-drops.test.ts`; `packages/chat/tests/composer-files.test.ts`; `packages/agent/tests/policy-attachments.test.ts`; `tests/pages/chat-attach.spec.ts`, `chat-attach-batch.spec.ts`, `chat-attach-drop.spec.ts`, `chat-attach-gallery.spec.ts`.

## Another host

To host the panel elsewhere (nclite's vision board chat mode): take `packages/chat` and
`packages/agent` as they are, map the `--chat-*` properties to that host's tokens, and serve the
same events and routes, or the host's own equivalents. nclite's run door (`/api/run/approvals`) is
the same shape as `ask_approval`: the gate sends facts and obeys the answer.

## Kiro

Kiro CLI runs through the same adapter interface over ACP (`packages/agent/src/kiro.ts`, engine v2;
see its README for the protocol notes). It has no hook to gate, so its `session/request_permission`
calls are mapped to the same facts and the same `ask_approval` route inside the adapter: the chat
panel's Allow and Deny work for it unchanged. The board's own tools (`vb`) go ahead unasked; reads,
searches, file changes and commands are decided by the access rules (§ The agent's access); any other
request is refused.

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
