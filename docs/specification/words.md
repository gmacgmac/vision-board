# Words

> Every sentence a person or an agent reads lives in a words file for its area, never in the code
> that shows or sends it (`docs/principles.md` § Architecture we adopt; the `cortex-architecture`
> skill, rule 7 and `references/words.md`). This doc lists every home. `scripts/words.test.mjs`
> holds this list and the code equal, both ways.

## What counts

Any sentence someone reads: headings, labels, buttons, placeholders, tooltips, alt text and
screen-reader names, empty states, toasts, confirms, refusals, and everything an agent receives
(tool results, refusals, the text added to a chat message, the server's instructions). Fixed text is
an exported constant; text that carries a value is an exported function returning a string, with
its plural and branch logic inside. A words file imports nothing but other words files (and types).

What stays in code, by rule (`scripts/words-text.mjs`): ids, keys, CSS and selectors, markup
attributes that are not read, log lines (`console.*`, `warn`), thrown `Error` messages, comparisons,
and a server-sent event's lines. Anything else left in code is named one literal at a time under
Exemptions, with its reason.

## Keys

A sentence's key is `board.<area>.<name>`: the area is the words file's name, the name is the
export (an object's members are dotted on). Areas are unique across the homes, so a key is. The
keys are what the plugin's one words file (nclite, `organizer.chip.task` style) is built from later;
this doc does not list them, the test does (`words.test.mjs`, "every sentence has a key").
Keys are stable: reword a sentence in its file, keep its name.

Shared text lives in the `common` file of its part (`common.ts`, `shell-common.ts`, `ui-common.ts`,
`server-common.ts`): a fixed sentence in two files of one group of parts (the board and the shell
are one) fails the test. The parts are separate modules and may not import each other's words
(D-016): the board, the shell, the patterns, the server, the action layer and the format each keep
their own, so a sentence two of them both say is written in each. `packages/format` is the bottom
layer: its words import nothing, not even `node:`.

## Homes

### The board (hostable: its words live inside `board/`)

| File | Area | Holds |
|---|---|---|
| `apps/board/src/board/words/access.ts` | `access` | Access requests and the revoke confirm: what an agent asks for and what the person is told. |
| `apps/board/src/board/words/app-cards.ts` | `app-cards` | The confirms before Allow and Stop app, the toasts after, and what Check again and Restart found. |
| `apps/board/src/board/words/board.ts` | `board` | The board page's own text: its heading, status, empty states and errors. |
| `apps/board/src/board/words/boards.ts` | `boards` | The board picker, rename, archive, lock and the archived list. |
| `apps/board/src/board/words/cards.ts` | `cards` | Cards: flag, move, select, finder and history. |
| `apps/board/src/board/words/commands.ts` | `commands` | Tooltips of the board's commands (name and what they do). |
| `apps/board/src/board/words/common.ts` | `common` | Sentences more than one area of the page says, said once. |
| `apps/board/src/board/words/confirm.ts` | `confirm` | The confirm dialog, its list and the discard-changes confirm. |
| `apps/board/src/board/words/go-to-card.ts` | `go-to-card` | Go to card and the open-items chip. |
| `apps/board/src/board/words/key-help.ts` | `key-help` | The key command list and its headings. |
| `apps/board/src/board/words/notes.ts` | `notes` | Notes: the toasts for saving and removing, and the group pins. |
| `apps/board/src/board/words/proposals.ts` | `proposals` | Proposal counts, the accept-all confirm and its toast. |
| `apps/board/src/board/words/send.ts` | `send` | The Send button, its states and tooltips. |

### The standalone page around the board

| File | Area | Holds |
|---|---|---|
| `apps/board/src/shell/words/chat.ts` | `chat` | The chat panel's sentences that the page owns. |
| `apps/board/src/shell/words/folders.ts` | `folders` | The folder picker, the folder chip and the page title that names the folder. |
| `apps/board/src/shell/words/reply.ts` | `reply` | The reply panel. |
| `apps/board/src/shell/words/shell-access.ts` | `shell-access` | Access requests and the revoke confirm: what an agent asks for and what the person is told. |
| `apps/board/src/shell/words/shell-board.ts` | `shell-board` | The board page's own text: its heading, status, empty states and errors. |
| `apps/board/src/shell/words/shell-boards.ts` | `shell-boards` | The board picker, rename, archive, lock and the archived list. |
| `apps/board/src/shell/words/shell-common.ts` | `shell-common` | Sentences more than one area of the page says, said once. |
| `apps/board/src/shell/words/shell-confirm.ts` | `shell-confirm` | The confirm dialog, its list and the discard-changes confirm. |
| `apps/board/src/shell/words/shell-go-to-card.ts` | `shell-go-to-card` | Go to card and the open-items chip. |
| `apps/board/src/shell/words/shell-key-help.ts` | `shell-key-help` | The key command list and its headings. |
| `apps/board/src/shell/words/shell-proposals.ts` | `shell-proposals` | Proposal counts, the accept-all confirm and its toast. |
| `apps/board/src/shell/words/shell-send.ts` | `shell-send` | The Send button, its states and tooltips. |
| `apps/board/src/shell/words/toolbar.ts` | `toolbar` | The toolbar, its menu, zoom level, chips and the version banner. |

### The ledger format (`packages/format`, the bottom layer: its words import nothing)

| File | Area | Holds |
|---|---|---|
| `packages/format/src/words/format-common.ts` | `format-common` | Sentences more than one area of the format says, said once. |
| `packages/format/src/words/format-kinds.ts` | `format-kinds` | The names of the kinds of card. |
| `packages/format/src/words/format-ledger.ts` | `format-ledger` | Why a ledger line or an act is refused: the field, what it must be, and what it names. |
| `packages/format/src/words/format-view.ts` | `format-view` | Why a view or a card's state is refused. |

### The action layer (`packages/actions`)

| File | Area | Holds |
|---|---|---|
| `packages/actions/src/words/actions-chips.ts` | `actions-chips` | What a chip says (a card, a note, a board) and why one is refused. |
| `packages/actions/src/words/actions-history.ts` | `actions-history` | A card's history: what the person or the agent did, in a row. |
| `packages/actions/src/words/actions-message.ts` | `actions-message` | The lines the Send message adds from the board. |
| `packages/actions/src/words/actions-refusals.ts` | `actions-refusals` | Why an act or a write is refused, in the words an agent or the page shows. |
| `packages/actions/src/words/actions-registry.ts` | `actions-registry` | The names of the actions, as buttons, tooltips and tools say them. |

### The patterns (`packages/ui`)

| File | Area | Holds |
|---|---|---|
| `packages/ui/src/words/app-frame.ts` | `app-frame` | The app panel frame: the refusals it shows for a tool call and the protocol's messages. |
| `packages/ui/src/words/markdown.ts` | `markdown` | The stand-ins for a picture the board cannot show. |
| `packages/ui/src/words/node-app.ts` | `node-app` | An app card: its states, notices and buttons. |
| `packages/ui/src/words/node-notes.ts` | `node-notes` | The notes on a card: who wrote them, how many are new, and the hide and show labels. |
| `packages/ui/src/words/node-updates.ts` | `node-updates` | A card's updates since you last looked: the step labels and counts. |
| `packages/ui/src/words/node.ts` | `node` | A card: state labels, accessible names, proposals, handover, history, times and the buttons on it. |
| `packages/ui/src/words/note-bubble.ts` | `note-bubble` | The note window: its accessible names, hint, buttons and thread labels. |
| `packages/ui/src/words/region-note.ts` | `region-note` | A container's note: Open, Edit, Hide and Show labels. |
| `packages/ui/src/words/region.ts` | `region` | A container: modes, widths, notes, retired and fresh counts, settings and its answered count. |
| `packages/ui/src/words/selection-bar.ts` | `selection-bar` | The selection bar: how many are selected. |
| `packages/ui/src/words/ui-common.ts` | `ui-common` | Sentences more than one area of the patterns says, said once. |

### The server

| File | Area | Holds |
|---|---|---|
| `apps/board/server/words/apps-host.ts` | `apps-host` | The refusals for an app that cannot be called, and the app panel's. |
| `apps/board/server/words/apps-manifest.ts` | `apps-manifest` | What is wrong in an app's files, as list_apps tells the agent. |
| `apps/board/server/words/apps-supervisor.ts` | `apps-supervisor` | The app supervisor's refusals: an app that crashed, timed out or was stopped, and the tool checks. |
| `apps/board/server/words/bin.ts` | `bin` | The board's command-line tools. |
| `apps/board/server/words/http.ts` | `http` | The refusals every call can meet: the path, method, body, caller and origin. |
| `apps/board/server/words/schema.ts` | `schema` | How a schema failure is told to the agent. |
| `apps/board/server/words/server-chat.ts` | `server-chat` | The chat session: what the agent is told, and the refusals a chat call gets. |
| `apps/board/server/words/server-common.ts` | `server-common` | Sentences more than one area of the server says, said once. |
| `apps/board/server/words/server-folders.ts` | `server-folders` | Opening a folder, the ledger lock and the files on disk. |
| `apps/board/server/words/writes.ts` | `writes` | The refusals for a write: a board, node, key, grant or batch that does not fit. |

### The MCP server

| File | Area | Holds |
|---|---|---|
| `packages/mcp/src/words/check-args.ts` | `check-args` | How a tool call's arguments are refused. |
| `packages/mcp/src/words/info.ts` | `info` | What the server says about itself and how to use it. |
| `packages/mcp/src/words/protocol.ts` | `protocol` | The protocol's errors and the tool call's refusals. |

### The `vb` commands

| File | Area | Holds |
|---|---|---|
| `packages/cli/src/words/args.ts` | `args` | How a flag is refused. |
| `packages/cli/src/words/failure.ts` | `failure` | The failure lines. |
| `packages/cli/src/words/globals.ts` | `globals` | The flags every command takes. |
| `packages/cli/src/words/help.ts` | `help` | The help text. |

## Other homes

Homes that are not a words folder, each with the reason it cannot import one.

| File | Why it cannot import a words file |
|---|---|
| `packages/format/schema/openapi.json` | Tool, parameter and route descriptions are one source (D-056); the MCP tools and the vb commands are generated from it. |
| `packages/format/schema/ledger-event.schema.json` | Field descriptions the OpenAPI source refers to; JSON cannot import. |
| `skills/vision-board/SKILL.md` | The agent's instructions are a Markdown file the agent's client loads; it cannot import. |
| `apps/board/server/apps/runner.mjs` | An app's tools run in a child under Node's permission model that may read only the app's folder and this file, so it cannot import; it tells the supervisor what failed, which tells the agent. |
| `packages/format/src/images.ts` | A pure file that imports nothing (images-pure.test.ts: the page and the server both run it); its reasons are the one `IMAGE_WORDS` object, with that test. |
| `apps/board/index.html` | A static page: its title is read before any script runs. |
| `packages/actions/src/answers/remove-words.ts` | Already a words file with its logic (the Remove confirm) and its own test; it stays where its pure code is. |

## Developer text

Files whose text only a developer reads: they stay in code and are not scanned.

| File | Why it stays in code |
|---|---|
| `packages/format/src/flags.ts` | What each feature flag switches: read in the source and in the gallery's flag list, by the maintainer. |
| `packages/actions/src/conditions.ts` | When each condition is true and when it ends (`trueWhen`, `endsWhen`): documentation of the registry, not shown to the person or sent to an agent. |
| `packages/actions/src/references.ts` | What each reference edge means (`REFERENCES`): documentation of the registry, not shown or sent. |

## Not scanned yet

Roots the test does not scan, with why. A root leaves this list when its words are moved.

| Root | Why |
|---|---|
| `packages/chat/src` | The chat package is replaced by nclite's chat (PLAN Out of Scope). |
| `packages/agent/src` | Agent adapters: protocol and process lines for developers, not a screen. |
| `apps/board/src/gallery` | The gallery is a developer page: its text is sample board content and captions for the maintainer. |

## Exemptions

One literal at a time, with its reason. The test fails when an exemption names a literal that is gone.

| File | Literal | Why |
|---|---|---|
| `apps/board/src/board/history-flow.ts` | `Home` | a keyboard key name (KeyboardEvent.key) |
| `apps/board/src/board/history-flow.ts` | `End` | a keyboard key name (KeyboardEvent.key) |
| `packages/ui/src/base/menu-core.ts` | `Escape` | a keyboard key name (KeyboardEvent.key) |
| `apps/board/server/chat-access.ts` | `Read` | a tool name the agent client knows (an id, not a sentence) |
| `apps/board/server/chat-access.ts` | `Glob` | a tool name the agent client knows (an id, not a sentence) |
| `apps/board/server/chat-access.ts` | `Grep` | a tool name the agent client knows (an id, not a sentence) |
| `apps/board/server/folders.ts` | `Library` | the name of a macOS folder (a path part, not a sentence) |

## Mechanisms

### No sentence stands outside a words file

**Property** — a string literal or template that is a sentence (two words, a lone capitalised word,
or any text in a place people read) in the scanned roots, outside a words file, fails the test.
**Where** — `scripts/words-homes.mjs` (`PARTS`, `sentencesOutside`), `scripts/words-scan.mjs` (`scanFile`),
`scripts/words-text.mjs` (`isSentence`, `htmlSegments`).
**Proven by** — `scripts/words.test.mjs` ("no sentence a person or an agent reads stands outside a words
file"); `scripts/words-scan.test.mjs` ("a planted sentence fails the repo check", "ids, keys, CSS,
selectors, log lines, thrown errors and comparisons are not sentences").
**Not covered** — a sentence built from pieces none of which reads as a sentence on its own (a lone
lower-case word joined to others); text in the roots listed under Not scanned yet.

### This list and the code agree

**Property** — every file in a words folder is a row under Homes and every row is a file; the other
homes, the unscanned roots and the exemptions here equal the code's.
**Where** — `scripts/words-homes.mjs` (`PARTS`, `OTHER_HOMES`, `NOT_SCANNED`, `EXEMPT`).
**Proven by** — `scripts/words.test.mjs` ("the doc lists every words file", "the doc lists the other
homes, the unscanned roots and the exemptions the code holds").

### Keys are unique; a words file imports only words

**Property** — `board.<area>.<name>` is unique across the homes; a words file's imports are other
words files and types.
**Proven by** — `scripts/words.test.mjs` ("every sentence has a key", "a words file imports only other
words files, and types", "a fixed sentence has one home in a part").

## Changing words

New wording is drafted and approved as a set, then copied into the words files exactly as approved
(`references/words.md` § Changing words). Moving a sentence changes no wording.

nclite writes US English. The words here are not yet in step with that; a list of the sentences
that would differ is in the ARCH_05 task notes, and the choice is the maintainer's.

## Related

- `docs/principles.md` § Architecture we adopt, § The board is a plugin
- `packages/format/schema/openapi.json` — the tool and parameter descriptions (D-056)
