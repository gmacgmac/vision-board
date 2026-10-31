# Plugin seam research (read only; nothing changed in nclite or Vision Board)

Paths: N = /Users/gm/ai/nclite, V = the Vision Board worktree. [INFERENCE] marks my conclusions.

## 1. nclite's flow end to end

### A. Person attaches a file, bot reads it
1. The composer stages the `File` in memory only; nothing uploads on pick (N `app/src/routes/+page.svelte`
   `stage`, `staged`; drawn by `AttachmentStage.svelte`).
2. On submit, `uploadStaged` sends each file alone: `api.uploadAttachment` -> `POST /api/sessions/{sessionId}/attachments`
   (N `engine/http/routes/sessions.ts` `uploadAttachmentRoute`, hand-registered, streams raw bytes).
3. `spoolInbound(db, media, 'app', ..., limit)` caps while streaming, sniffs the type from the header, saves under the
   workspace `media/inbound/` and answers a receipt `{ mediaId, filename, bytes, mediaType, relPath }`.
   Limit: `resolveUploadLimit(systemDb)`, default `APP_MAX_INBOUND_BYTES` = 100 MB (N `engine/channels/media.ts`);
   Telegram's door keeps `MAX_INBOUND_BYTES` = 20 MB; image edge 20,000 px and 50M pixels; spool 2 GB, oldest evicted.
4. `store.send(text, receipts)` -> `POST .../messages` with `attachments` (`postMessageRoute`). Every receipt is judged
   first (`stagedUpload`: from this door, file still on disk) or nothing is written (`invalid_attachment`).
5. `withMedia(text, saved)` (N `engine/channels/inbound.ts`) appends one line per file to the message the bot reads,
   `[document saved: media/inbound/<name>]` (kinds photo, video, audio, document); one `attachment` event
   (`direction: 'in'`, `describeAttachment`) goes in the same transaction so the app shows the file.
6. The container's cwd is the workspace, so the bot opens that relative path with the CLI's own Read. A PreToolUse
   hook, `container/read-gate.sh`, sniffs MIME with `file(1)`: PDFs allowed unless `NCLITE_READ_PDF=deny`; images
   allowed unless `NCLITE_READ_IMAGE=deny`. When denied, the bot is told to use `pdftotext -layout`, pypdfium2,
   pdfplumber, `pdftoppm` + tesseract (all in the image, N `container/Dockerfile`).
   Nothing in nclite turns a PDF into pictures or a Word/Excel file into text for the model: not established beyond the above.

### B. Bot calls a tool, result returns
1. The CLI (Claude Code; Codex too: `mcp_servers.nclite`, `container/harness-codex/args.ts`) runs inside the container.
   It spawns nclite's MCP server as a stdio child, once per turn (`container/mcp-main.ts`, `mcpConfigJson`,
   `--mcp-config` + `--strict-mcp-config`, so a rogue `.mcp.json` in the workspace is ignored; N `harness-claude.ts`).
2. `servedTools(NCLITE_TOOLS)` registers only tools that survived the engine's ceiling (`engine/store/tools.ts`
   `MCP_TOOLS`, only ever subtracts); `--allowedTools` names each as `mcp__nclite__<tool>`.
3. A tool's `run` is either local to the container or a call on the engine: `RunClient` (`container/client.ts`)
   sends HTTP to `NCLITE_ENGINE_URL` `/api/run/*` with `NCLITE_RUN_TOKEN` (both inherited env, not on argv). The run
   listener is a separate port from the app's; the container's pinhole forwards only it (N SECURITY.md).
4. This is "the run door". The ticket (`RunTicket`) names the session and bot; the engine does the work (web fetch,
   memory, tasks, transcribe are engine-side) and the answer returns as the tool result.
5. A gated tool (writes to a shared folder, commands): the container checks floors (`hardline-blocklist`,
   `write-deny-floor`), then `ctx.client().ask(facts)` -> `POST /api/run/approvals` (`runApprovalRoute` ->
   `askAboutFolder`), held open until settled. The question is an event in the chat; the person answers through the
   app API (`app/src/lib/approvals.ts`); the held request returns; stop mid-wait answers 503 and leaves it pending.
6. MCP servers run INSIDE the container; the engine runs on the host. Tools live in a compile-time array
   (`container/mcp-tools.ts` `TOOLS`: "a static tool that is not here does not exist").
7. Harnesses are `claude`, `codex`, `native` (N `engine/store/presets/harness.ts` `HARNESSES`). Kiro is not driven by
   nclite: it appears only in a research doc about KiroCrew (N `docs/research/browser-and-computer-use.md`).

### C. A change reaches the page
1. Chat: `appendEvent` (N `engine/store/log.ts`) -> bus `events:appended` -> the page reads it by long-poll or the
   SSE `GET /api/bots/{botId}/sessions/{sessionId}/stream` (N `app/src/lib/brain/client.ts`, `stores/chat.svelte.ts`;
   the poll stays as fallback). Turn end is the container's ack (`BotEvents`, `engine/bus.ts`).
2. Plugin data: only in the spike. `PluginEngine.watch(ref => ...)` -> `/api/events` SSE (N
   `prototypes/plugin-host/server.ts`, `host/events.ts`) -> `host.events(listener)`; a tool's result becomes a chat
   event `{kind:'tool', summary, ref}` (`host/chat.ts`). "Nothing in engine/ or app/ implements it yet" (N `docs/plugins.md`).

## 2. How would the board's tools reach an nclite bot?

What exists today
- nclite's contract: tools are "declared by the plugin, run by the engine"; the bot "reaches the engine through the
  run door" (N `docs/plugins.md`). The spike calls `runtime.callTool(plugin, tool, input)` in-process; the run-door
  path is listed as "Not settled 1" (same file).
- The board side is ready for the engine half: `createEngine` (V `apps/board/server/engine/engine.ts`) returns
  `tools` (one per served operation, JSON Schema checked, `makeTools` in `engine/tools.ts`), takes the caller from the
  host ("nclite's run ticket ... no secret, no join"), and has `resolve`, `turn`, `watch`.
- Standalone today: the agent gets `vb-mcp` (V `packages/mcp`), a stdio MCP server that calls the board server over
  HTTP with `VB_AGENT_SECRET` (V `apps/board/server/chat-access.ts` `boardMcpServer`); both CLIs take it (Claude via
  `--mcp-config`, Kiro via ACP `session/new` `mcpServers`, V `packages/agent/src/claude-args.ts`, `kiro.ts`).
  The tool table is `packages/mcp/src/tools.generated.json` (12 tools, from openapi.json; `write_board` has nested arrays).

Options
- (a) A board-specific MCP server in the container: needs a new entry in nclite's compile-time `TOOLS`, and a second
  copy of the tool list. Rejected.
- (b) A tool "the host serves" directly to the CLI: not possible as nclite stands. `--strict-mcp-config` and
  `--allowedTools` admit only the one `nclite` server, and a token in a config entry would land on argv.
- (c) Recommended. One generic pass-through in nclite's existing container MCP server, backed by an engine-side
  route: `tools/list` comes from the engine for the plugins that are on for this bot (the manifest, whose input is
  the tool table's JSON Schema); `tools/call` becomes `POST /api/run/plugins/{id}/tools/{name}` with the run token;
  the engine runs `runtime.callTool` -> `engine.tools[name](input, caller)`. Same pattern as `webFetchTool`/transcribe
  ("the call happens ENGINE-side", N `container/mcp-tools.ts`). The container learns no board code.

Why (c)
- Reuses what exists: one MCP server, one run token, one ceiling (`NCLITE_TOOLS` deny-list), one approval path.
- The tool definitions stay ONE source: openapi.json -> tool table -> (standalone `vb-mcp` | nclite manifest +
  `engine.tools`). The bot sees the same names, schemas and skill in both hosts. [INFERENCE]
- Standalone keeps working unchanged: `vb-mcp` is the same MCP standard, its host is the board server's HTTP; the
  standalone server also passes `engine.tools` the caller it resolved from the agent's secret.

Unsettled (not established in sources)
- The run-door route for plugin tools and the `tools/list` for them; whether `NCLITE_TOOLS`/the deny-list cover
  plugin tools by name; how a tool name is spelled (`${plugin}.${tool}` in the spike, `runtime.tools()`; nclite's
  own are `mcp__nclite__<name>`; whether `.` is accepted by each CLI is not established).
- Async and held calls: the spike's `tools[name]` is synchronous; the board's tools are async and `check_responses`
  holds up to 60 s with an abort signal. Run-door holds exist (`waitFor`, `DEFAULT_HOLD_MS`) but their cap for plugin
  tools is not established.
- Whether a `writes: true` tool asks the person: the manifest field exists, nothing reads it yet. The board's grants
  (`request_grant`, per-agent) have no counterpart for a single bot.
- Which of the 12 tools a plugin bot gets: tracker M15 (`x-hosts`) is open (V `cortex-tasks/tracker.md`).

## 3. Every way our chat and the board talk today

V paths under `apps/board/`. "Around" = goes past `BoardHost`, so it works standalone only.

| # | Mechanism | Direction | Where | Through BoardHost? |
|---|---|---|---|---|
| 1 | Board's own routes | board <-> server | `board/io.ts` `createIo(host.api)` | Yes (`host.api`) |
| 2 | Changes to the ledger | server -> board | `host.events`; standalone `page-host.ts` `events` = `page-io.ts` `watchProject` | Yes |
| 3 | Settings / flags | host -> board | `host.settings` (`page-host.ts`) | Yes |
| 4 | Confirm, notify | board -> host | `host.confirm`, `host.notify` | Yes |
| 5 | Chip of the selected cards, then record Send | board -> chat | `mount.ts` `send()` -> `host.addToChat(chip)` per card, then `board.send()` | Yes in the board, but the standalone `addToChat` is an empty function (`page-host.ts`) |
| 6 | Same cards + answers as the composer's one chip | board -> chat | `shell/chat-bridge.ts` `boardContext`, `cards`, `chips()`, reading `BoardSide.selection/ledger/data` (`board/chat-side.ts`) | AROUND |
| 7 | Answers since last Send added to the prompt | board -> agent | `server/chat-sessions.ts` `tell`, `chat-prompt.ts` `promptFor` (`turnOf`, `boardBlocks`); `engine.onSend` | Server side; engine has `turn()` but no host hook uses it for nclite |
| 8 | Board's Send while chat has something attached | board -> chat | `shell/chat-panel.ts` `boardSend` (App.svelte passes it) | AROUND |
| 9 | Change chip in chat zooms the board, opens another board | chat -> board | `chat-bridge.ts` `onChange` -> `BoardSide.zoom/switchTo` | AROUND (`reveal` takes only board, n, seq; no multi-card zoom) |
| 10 | Stepper link "Show in the chat" | board -> chat | `chat-bridge.ts` `onStage` on `side.stage`, `side.source(...)` -> `reveal(feed key)` | AROUND |
| 11 | Agent's first board opens when drawn | chat -> board | `chat-bridge.ts` `open` -> `BoardSide.jump` | AROUND |
| 12 | Agent working / asking mark, news of replies | chat -> board chrome | `chat-news.ts`, `shell.svelte.ts` (workAlongside) | AROUND (shell) |
| 13 | Files attached to a message | person -> chat -> agent | `chat-bridge.ts` `attachFiles/upload` -> `attach_chat_file` (base64, 10 MB, saved `.visionboard/attachments/...`); PDF pages in a frame (`pdf-pages.ts`) | Standalone chat's own (D-068 rule 6) |
| 14 | Message, session, events, stop, approvals | chat <-> server | `chat-panel.ts` -> `start_chat`, `send_chat`, `watch_chat` (SSE), `answer_approval`; server `chat.ts`, `chat-sessions.ts`, `chat-session.ts` | Standalone's chat; not a board concern |
| 15 | Agent's tools | agent -> board | `vb-mcp` over HTTP + secret; `chat-access.ts` | Not the view; engine half is portable (`engine.tools`) |
| 16 | Gate for Write/Edit/Bash/Read | agent -> person | `packages/agent` `GATED_TOOLS`, `POST /api/run/approvals`-shaped `ask_approval` (`chat.ts`) | Standalone only; nclite has its own run-door approval |
| 17 | `read_attachment` | agent -> server | `server/chat-read.ts` (worker threads, `packages/documents`); `engine/tools.ts` leaves it out | Standalone only |
| 18 | Tool result -> change chip in the chat | agent -> chat | `packages/agent/src/claude-stream.ts` `boardWriteSummary` parses the `write_board` result into `{board, cards, head}` | Standalone only |

Other things that go around the host (not chat): saved zoom in sessionStorage (`board/boards/kept-view.ts`, tracker M13)
and last board in localStorage (`boards/start-board.ts`); the image route by raw `fetch` (`board/io/image.ts`,
documented as the page's own, V `docs/specification/components.md`); keys and pointer listeners on `document`
(`input/keys.ts`, `canvas/pointer-focus.ts`; released on unmount, but M21/M22 say Esc and some keys still act page-wide);
module-level markdown image/svg switches (tracker M12; the string `setMarkdown` is not found under `board/`, so those
switches are set elsewhere in the page: not re-verified).

What must change so standalone uses nclite's mechanisms: rows 6, 8, 9, 10, 11, 12 (view <-> chat) and 13 (attach), plus
18 (change chip source). Rows 7 and 14 to 17 are the host's chat and stay with the standalone host as host code, but
their inputs (chips, answers, tool calls, attachments) must arrive in the shape the plugin seam defines.

## 4. Gaps

### What nclite's `PluginHost`/`PluginEngine` lacks that the board needs (N `docs/plugins.md`, `host/plugin-engine.ts`, `host/manifest.ts`)
1. Tool inputs: `ToolInput` is a flat object of `string | boolean` (`checkTool`, `checkInput`). The board's tools take
   nested arrays and objects (`write_board` items; 12 tools in V `packages/mcp/src/tools.generated.json`). Needs real
   JSON Schema. The board already validates with one (`foreignSchemas`, V `server/schema.ts`).
2. Async and held calls: `tools[name](input) => ToolResult` and `route(req) => PluginReply` are synchronous, with no
   caller and no abort signal. The board's are async, take a `Caller` and a `signal` (`EngineTool`, V `engine/tools.ts`);
   `check_responses` holds up to 60 s.
3. Caller: the engine side has no "who is calling". The board checks the caller on every operation (`checkCaller`).
   nclite can pass the bot from the run ticket; the contract does not say so.
4. A prompt contribution that is not a chip: the person's answers since the last Send (`Engine.turn`, `turnOf`) are
   engine state, not something the person chose. The contract has chips (resolved on send) and skills, nothing between.
5. Chips that come and go: `addToChat` only adds. The standalone composer's chip tracks the selection live
   (`boardContext`, replaced on each change) and chips are spent after a send (`spent`).
6. Sending from the plugin: "Send to agent" must make the host's chat send; `addToChat` only stages.
7. Reveal: `reveal(ref)` in the board takes `{board, n, seq}`; a change chip zooms to several cards and selects none
   (`BoardSide.zoom`); not expressible.
8. Chat state to the view: nothing says "the bot is working / asking" (board's mark, `agentWork`), or lets the view
   link back to the chat line that last changed a card (`source`).
9. Chrome: the contract gives the pane header to the host (Add to chat, place, close) and says nothing of a plugin's
   own controls; the board's toolbar, strips and dialogs are standalone Svelte (tracker M8, M27). View status (counts,
   versions, `unsaved`) has no slot.
10. `host.api(path, init)` is untyped; the board's `Transport` resolves a `Response` and reads problems itself; binary
    images go by a separate route (`io/image.ts` `IMAGE_ROUTE`).
11. Settings: two types (`choice`, `switch`); the board has 55 flag entries in `packages/format/src/flags.ts` plus `align`.
    Not all belong in the app's settings pages: which do is undecided.
12. `confirm(...)` and `notify(text, tone)`: absent / no tone. `unmount()` "saves anything being written"; the board's
    `unmount` never asks, `leave()` does (documented difference).
13. Multi-agent: the board has per-agent joins and grants (`join`, `request_grant`, `list_apps`); nclite has one bot.
    Tracker M15 covers which tools a plugin bot gets.
14. "A view is a framework-free module": the plan is Svelte controls bundled inside; the contract text should say the
    host sees only `mount()`, not what is inside.

### What the board does that the contract forbids or does not say (V)
- Reads/writes `sessionStorage`/`localStorage` keyed by board id only (`boards/kept-view.ts`, `start-board.ts`; M13).
- `fetch` of the image route outside `host.api` (`io/image.ts`).
- Page-wide Esc and keys while a menu is open (`packages/ui/src/base/layer.ts` `dismissable`; `input/keys.ts`; M21, M22).
- One element outside `root`: the zoomed image view, a modal dialog (`mount.ts` header comment).
- Reads the chat through `BoardSide`, not the host (table rows 6 to 12).
- `unmount` does not save; the host must call `leave()` first (documented in components.md "Differences").
- Stylesheet rule "every selector starts with the root class" is not checked here: not established.

## 5. Recommended seam (smallest general set) [INFERENCE throughout]

Principle: every hook is either an existing standard (MCP, JSON Schema, ESM, SSE) or already in nclite's draft.
Both hosts (nclite, standalone page+server) implement the same two interfaces; the board owns nothing outside them.

### View side: `mount(root, host) => PluginView` (ESM, as in the draft; Svelte may live inside the bundle)
Host gives (keep from the draft): `api(path, init)` -> `Response`; `events(listener)`; `settings.get/on`; `notify(text, tone?)`.
Add (each is a plain function, none invented beyond what the board already needs):
1. `confirm(ask) -> Promise<boolean>` (host dialog; already in the board).
2. `chat.attach(key, chip | null)`: add, replace or remove a chip by key. Replaces `addToChat` as the one way the
   selection and "3 answers" reach the composer (table rows 5, 6). `addToChat(chip)` stays as sugar for a fresh key.
3. `chat.send() -> Promise<string|null>`: send the staged chips as a message with no words (row 8: Send to agent).
4. `chat.status`: `{ now: 'idle'|'working'|'asking', on(listener) }`, read only (row 12).
5. `chat.reveal(ref)`: optional; opens the chat line that last changed `ref` (row 10). Host may leave it out.
View gives (draft + board's): `unmount()`, `pageChip()`, `reveal({board?, n?, seq?, cards?})` (add `cards` for the
change chip's zoom, row 9), `unsaved()`, `leave()`. The standalone chat then talks to the board only through these,
so rows 6, 8 to 12 stop reading `BoardSide`; `BoardSide` is deleted (row 11 becomes `reveal({board})`).
Keep optional and standalone only: `page` (address, last board).

### Engine side: `createEngine(dir, opts) => PluginEngine` (async, HTTP-shaped and MCP-shaped)
- `route(req, ctx) => Promise<Reply|null>`: as the draft, async, with `ctx = { caller, signal }`.
- `tools`: exactly MCP: `list() -> [{ name, description, inputSchema(JSON Schema) }]` and
  `call(name, input, ctx) -> Promise<CallToolResult>` (`content`, `structuredContent`, `isError`). The host validates
  `input` against `inputSchema` (JSON Schema replaces `checkInput`) before the call. The board's `engine.tools` already
  has this shape; the standalone `vb-mcp` and nclite's run-door shim both just wrap it.
- `resolve(kind, ref) => {where, text} | {refused: reason}`: as the draft (board already has `resolve`).
- `context(ctx) => Promise<{ label, text } | null>`: what the plugin adds to the bot's next message that the person did
  not pick (the answers since the last Send, `Engine.turn`). Alternative with no new hook: the view attaches an
  "answers" chip through `chat.attach` and `resolve` turns it into text; the cost is that the answers become a chip
  the person can drop. Maintainer to choose.
- `watch(onChange) => stop`: as the draft; `ref` is `{board?, head?}`, a ref with no head means "catch up".
- Manifest: JSON, checked by a JSON Schema; `tools` generated from the tool table (M15 `x-hosts` selects which hosts
  get which tool); `view` -> `dist/plugin/board/`; settings stay `choice | switch` with only the flags a person should set.

### Tools in nclite and standalone
Same tool list, two transports: standalone = `vb-mcp` (stdio MCP -> HTTP -> server -> `engine.tools`);
nclite = nclite's own container MCP server with one generic plugin pass-through -> `POST /api/run/plugins/{id}/tools/{name}`
-> `runtime.callTool` -> `engine.tools`, caller from the run ticket. The skill file is the same text.

### Attachments and `read_attachment`
- The host's chat attaches, uploads and tells the bot the path. The plugin never sees a file. nclite: its upload route
  and `[document saved: media/inbound/<name>]` line; standalone: `attach_chat_file` and "The person attached these
  files:" (D-068 rule 6 already says "in nclite the host's chat does its own attaching and hands over the paths").
  This keeps `chat-bridge` `attachFiles/upload/copies`, `chat-files.ts`, `pdf-pages.ts` as standalone-chat code, not seam.
- `read_attachment` is NOT a board tool. Today it is in the board's tool table but the engine leaves it out (V
  `engine/tools.ts` header). Mark it `x-hosts: standalone` (M15) and treat it as a host-chat tool next to the chat.
- Where the reader runs in nclite: in the container. The file is already in the bot's workspace; the image has
  pdftotext, pdfplumber, pypdfium2, pdftoppm and tesseract (N `container/Dockerfile`) and the CLI's Read handles PDFs
  and pictures unless `read-gate.sh` denies them. D-071's page-side PDF-to-pictures exists because Kiro cannot open a
  PDF (V `docs/decisions.md` D-071 Why); that reason does not apply to nclite's Claude/Codex harnesses.
  Word/Excel: the image pins `python-docx==1.1.2` and `openpyxl==3.1.5` (N `container/Dockerfile`), so the bot can
  read them with Python in the container; zip handling in the image is not established. If a dedicated reader is
  wanted, its home is nclite's own `mcp-tools.ts` registry (beside `transcribe_audio`), calling `packages/documents`
  (framework-free, D-071 rule 4) or those libraries, never a board plugin tool.
- Limits differ and are the host's: standalone 10 MB and 10 files (D-068 rule 3), 3.5 MB picture cap for Kiro (D-073);
  nclite 100 MB default upload. The plugin states none.
