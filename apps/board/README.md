# apps/board

The Vision Board app: the page in `src/` and the small local server (`server.ts`, `server/`) that
serves the built page and reads and appends the project ledger
(`<VB_PROJECT>/.visionboard/ledger.jsonl`, D-017) through `server/ledger.ts`. `src/shell/` is the
Svelte shell (toolbar, reply panel, note dialog; D-012). `src/board/` is the framework-free canvas
controller it mounts (layout, drawing, pointer, keys, I/O; D-005). Vite builds `src/` into `dist/`
(gitignored). Localhost only, with Host and Origin checks, JSON only. `bin/reply.ts <board>
[--json]` prints the numbered reply for a board from the project ledger. `bin/validate.ts
<ledger.jsonl>` (`npm run validate -- <file>`) checks ledger files line by line against the JSON
Schemas and the hand validator, then in order, and prints every problem with its line number.
`server/schema.ts` is the only module that imports `ajv` (D-026): it loads the schemas in
`packages/format/schema/` by `$id` and gives plain-English problems (`ledgerLineProblems`,
`compileSchema`); the page never imports it. Pages arrange patterns
from `packages/ui`; they hold no layout maths, file formats or actions themselves. Every card is a
`<vb-node>` element: `src/main.ts` calls `defineBoardElements()` and imports the pattern CSS, and
`src/board/cards.ts` and `src/board/render.ts` create, measure and place the elements but never
build their markup. The page works in proportion to what changed (N12,
`docs/specification/performance.md`): `src/board/live.ts` reads the ledger once and applies each new
line to the state it holds, `board-data.ts` works the open board and what needs attention
(`pageConditions`, from the conditions table; `attention.ts` shows it and sends the board seen) out
from that state, and `draw.ts`
updates, measures and lays out only what a change touched (`layout-cache.ts` per container,
`wires.ts` per connector, `offscreen.ts` for cards well off screen), counting the work in `work.ts`.
The page reads every line through `src/board/io.ts` `readLedger` (`fromLine`), so its state is by
card identity, while everything it draws and sends names a card by its number on its board (api.md
125): `src/board/card-numbers.ts` turns one into the other, and an act's answer back. The person's
flag (`flag-flow.ts`, cardFlag flag), the "N cards retired" markers (`retired.ts`, retiredMarker
flag) and the toolbar's numbers (`toolbar-counts.ts`) sit beside the controller. Field report batch
3: `wires.ts` draws a link's label on its line where the layout found it room (`link-labels.ts`)
and a marker that floats the label on hover and focus where it did not (`link-marks.ts`, linkLabels
flag); `cards.ts` measures a card the layout widens (Match card widths, widthsControl flag: the
switch in each frame's mode row) at the width it is drawn at; the viewer's alignment is the "⋯"
menu's Centre cards (`src/shell/align.ts`, alignSetting flag); and `bubble-clear.ts` keeps the note
bubble clear of a neighbouring card's footer buttons. The gallery draws these through the board's
own drawing (`src/gallery/mini-board.ts`).

One server per ledger: `server.ts` takes `<VB_PROJECT>/.visionboard/lock` (`server/lock.ts`)
before it opens the ledger, because a second writer would fork it. The file is JSON (`host`, `pid`,
`port`, `started`, `beat`), git-ignored, and `beat` is rewritten every 30 seconds. A second server,
here or on another computer sharing the folder, prints which computer holds the lock and exits 1.
A lock is stale, and replaced with a one-line notice, when its `beat` is over 2 minutes old or it
is on this computer and its process is gone. `SIGINT`, `SIGTERM` and normal exit release it, in
every mode. If a server is refused and nothing is running, wait 2 minutes or delete the file.

Routes come from the route table generated from `packages/format/schema/openapi.json`
(`docs/specification/api.md`). `server.ts` only starts the server; `server/app.ts` runs the guard
and hands `/api` to `server/dispatch.ts`, which matches the route table, reads path and query
parameters with the spec's schemas (`server/spec.ts`) and calls the operation's handler from
`server/handlers.ts` (reads in `server/reads.ts`, writes in `server/writes.ts`). Every error is an
RFC 9457 problem (`server/problem.ts`), and `server/body.ts` parses the media type exactly and caps
the body. The page calls the server only through `packages/client`, wrapped by
`src/board/io.ts`. Before a handler runs, `server/callers.ts` works out the caller from the
operation's `security`: the person by the `vb_person` cookie set with the page (fresh at each start),
an agent by its Bearer secret. `server/agents.ts` is the only module that touches
`.visionboard/agents.json` (one SHA-256 per agent, git-ignored), and `server/write-board.ts` runs a
`write_board` batch item by item (the cards it names, `server/write-refs.ts`; keys, `base`, grants,
a retire's owed cards, then the ledger module). Requests name a card by its number on the board in
the path; `server/edge.ts` is the one place a number coming in becomes the card's identity
(api.md 125); `server/visibility.ts` is the only module that asks whether a board is archived: every
agent operation names its board through it, so an archived board is not found (api.md 136), and
whether one is locked: a write on a locked board is refused there, whole, with `locked` (api.md 139). The chat routes
(`server/chat.ts`, api.md 98-107) run sessions through `packages/agent`: `server/chat-sessions.ts`
starts and resumes them (the only code that starts a CLI), `server/chat-index.ts` is the only
module that touches `.visionboard/chat-sessions.json`, `server/chat-access.ts` joins and grants the
session's agent, gives its secret to the vb MCP server only and keeps Kiro's agent file
(`~/.kiro/agents/vision-board.json`) current at start (`chat: { kiroAgent: true }`, as server.ts
does unless `VB_KIRO_AGENT=0`), `server/chat-session.ts` stamps and
streams a session's events, `server/chat-approvals.ts` holds the gate's asks,
`server/chat-prompt.ts` builds the one message (the words, the chips spelled out, the board's
answers, the board), `server/chat-round.ts` writes the answers part, the board's Send message, and
`server/chat-sessions.ts` `tell` hands it over, holding one while a turn runs (api.md 121-122, 131).

The open folder (api.md 109-112): `server/project.ts` holds the folder the server has open (its
ledger, lock, agents and chats) and is the only code that switches it (`open_project`): the new
folder's lock first, then the chats stop, the live streams end, the old lock goes. `server/folders.ts`
is the only module that looks at other folders, all under the home folder (realpath, no hidden
folder or `node_modules`); `server/recent.ts` is the only module that touches
`~/.visionboard/recent.json` and picks the start folder. `server/open-folder.ts` answers the three
routes. `createBoardServer({ home })` takes the home folder, so tests use a temp one.

The pattern gallery (`gallery.html`, `src/gallery/`) shows every pattern in every state on one page,
drawn from `src/gallery/gallery.ledger.jsonl` (a real ledger in the real schema) through the
patterns' own `boardView`, `nodeState` and `regionState`. Sections are listed from the patterns'
`pattern.json` files; a pattern needs a sample function in `src/gallery/main.ts` or the page shows
a gap and the page test fails. Open it at `/gallery.html`. Page tests (`npm run test:pages`, D-025,
in `tests/pages/`) run the board and the gallery in Chromium on port 4468 from a fresh copy of the
roadmap fixture ledger, and the performance budgets on port 4469 from a generated 1,000-card ledger
(`tests/pages/perf-ledger.ts`); screenshots are stored in `tests/pages/__screenshots__/`, and
`npm run test:pages -- --update-snapshots` replaces them on purpose.

- **Depends on**: `packages/format`, `packages/actions`, `packages/client`, `packages/layout`,
  `packages/ui`, `packages/tokens`.
- **Used by**: nothing (apps are never imported, D-016).
- **Run**: `npm run board` (builds, then serves the repo's own project ledger), or `npm run dev`
  (serves `temp/demo`, seeded once from the roadmap fixture ledger), then open
  http://localhost:4466. `VB_PROJECT` picks the project folder (without it, the folder last opened
  from the board, else this repo); "⋯" › Open folder… opens another one; `VB_SEED` names a ledger
  copied in when the project has none yet; `VB_KIRO_AGENT=0` leaves `~/.kiro` alone (the page tests' servers).
  `npm run board:watch` is for working on the board: it rebuilds the page on save, restarts the
  server only when server code changes, and reloads the open page with its view kept (dev only;
  `npm run board` never reloads). `npm run watch` alone only rebuilds. `npm run check` type-checks `src/`.
