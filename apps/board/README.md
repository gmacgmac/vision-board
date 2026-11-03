# apps/board

The Vision Board app: the page in `src/` and the small local server (`server.ts`, `server/`) that
serves the built page and reads and appends the project ledger
(`<VB_PROJECT>/.visionboard/ledger.jsonl`, D-017) through `server/ledger.ts`. `src/shell/` is the
standalone page, one host of the board (its chat, folder picker, toast and confirm dialog; D-012). `src/board/` is what any
host mounts: the framework-free canvas controller (layout, drawing, pointer, keys, I/O; D-005) and, in `chrome/`, its controls
(the toolbar, strips, reply panel, search and help, Svelte compiled inside), in feature folders: `canvas/` (the draw, the viewport,
focus, places), `links/` (connectors and their labels), `cards/` (the card set, images, attention, the review
buttons, the flag, proposals, updates, parking, Remove, a card's history), `notes/` (note bubbles, container notes,
group pins), `selection/` (selection, lasso, bar, moves, container drags), `input/` (commands, keys, pointer, the
stage's wiring), `find/` (the container finder, Go to card), `boards/` (boot, the picker, versions, a locked board,
board edits), `access/` (agent access) and `apps/` (app cards), with `controller.ts` (and `controller/`), `mount.ts`,
`host.ts`, `status.ts`, `io.ts` (and `io/`), `live.ts` and `sender.ts` at its root. Each folder has one public
file, `index.ts`, and code outside it imports only that (`npm run verify`, `checkFeatureFolders`); a unit test of a
folder's inside may import the inside. Vite builds `src/` into `dist/`
(gitignored). Localhost only, with Host and Origin checks, JSON only. `bin/reply.ts <board>
[--json]` prints the numbered reply for a board from the project ledger. `bin/validate.ts
<ledger.jsonl>` (`npm run validate -- <file>`) checks ledger files line by line against the JSON
Schemas and the hand validator, then in order, and prints every problem with its line number.
`server/schema.ts` is the only module that imports `ajv` (D-026): it loads the schemas in
`packages/format/schema/` by `$id` and gives plain-English problems (`ledgerLineProblems`,
`compileSchema`); the page never imports it. Pages arrange patterns
from `packages/ui`; they hold no layout maths, file formats or actions themselves. Every card is a
`<vb-node>` element: `src/main.ts` calls `defineBoardElements()` and imports the page's stylesheet list
(`src/styles/page.ts`: the tokens, the page's own rules (`shell.css`), the board's sheets, `#ui/styles.css`, the shell's; the gallery imports
it too; the chat's sheets are `src/styles/chat.ts`, loaded with the panel), and
`src/board/cards/cards.ts` and `src/board/canvas/render.ts` create, measure and place the elements but never
build their markup. The page works in proportion to what changed (N12,
`docs/specification/performance.md`): `src/board/live.ts` reads the ledger once and applies each new
line to the state it holds, `boardData` (`packages/actions/src/answers/board-data.ts`, which the server's `get_board` is built from
too) works the open board and what needs attention (`pageConditions`, from the conditions table;
`cards/attention.ts` shows it and sends the board seen) out from that state, and `canvas/draw.ts`
updates, measures and lays out only what a change touched (`canvas/layout-cache.ts` per container,
`links/wires.ts` per connector, `canvas/offscreen.ts` for cards well off screen), counting the work in `work.ts`.
The page reads every line through `src/board/io.ts` `readLedger` (`fromLine`), so its state is by
card identity, while everything it draws and sends names a card by its number on its board (api.md
125): `src/board/card-numbers.ts` turns one into the other, and an act's answer back. The person's
flag (`cards/flag-flow.ts`, cardFlag flag), the "N cards retired" markers (`retiredCounts`, retiredMarker
flag), the person's Remove card and Remove container (`cards/remove-flow.ts`, whose words are
`cardsWords` and `containerWords`, personRemove flag), the Go to card box (`find/go-to-card.ts` over `goTarget`,
`src/board/chrome/GoToCard.svelte`, goToCard flag)
and the toolbar's numbers (`toolbar-counts.ts`) sit beside the controller. Field report batch
3: `links/wires.ts` draws a link's label on its line where the layout found it room (`links/link-labels.ts`)
and a marker that floats the label on hover and focus where it did not (`links/link-marks.ts`, linkLabels
flag); `cards/cards.ts` measures a card the layout widens (Match card widths, widthsControl flag: the
switch in each frame's mode row) at the width it is drawn at; the viewer's alignment is the "⋯"
menu's Centre cards (`src/shell/align.ts`, alignSetting flag); and `notes/bubble-clear.ts` keeps the note
bubble clear of a neighbouring card's footer buttons. The gallery draws these through the board's
own drawing (`src/gallery/mini-board.ts`).

One server per ledger: `server.ts` takes `<VB_PROJECT>/.visionboard/lock` (`server/lock.ts`)
before it opens the ledger, because a second writer would fork it. The file is JSON (`host`, `pid`,
`port`, `started`, `beat`), git-ignored, and `beat` is rewritten every 30 seconds. A second server,
here or on another computer sharing the folder, prints which computer holds the lock and exits 1.
A lock is stale, and replaced with a one-line notice, when its `beat` is over 2 minutes old or it
is on this computer and its process is gone. `SIGINT`, `SIGTERM` and normal exit release it, in
every mode. If a server is refused and nothing is running, wait 2 minutes or delete the file.
With ledger folders (`ledgerFolders` flag, D-084, api.md 113a) a ledger lives in its own folder,
`<VB_PROJECT>/.visionboard/<ledger>/` (ledger, agents, lock, images, apps, app state; paths from
`packages/format/src/data-folder.ts`), and the lock is that folder's, so two servers can hold two ledgers of
one folder. At start `server.ts` opens the folder's last ledger (`recent.json` `ledgers`), else `main`;
`server/ledgers.ts` lists and makes ledgers; `server/ledger-move.ts` moves an old-layout folder into `main/`
by rename (`moveIntoMain`) and back (`undoMove`, run by `npm run ledgers:undo -- <folder>`,
`bin/ledgers-undo.ts`). Tests: `tests/api-ledgers.test.ts`, `tests/ledger-move.test.ts`,
`tests/access-layout.test.ts`.

Routes come from the route table generated from `packages/format/schema/openapi.json`
(`docs/specification/api.md`). `server.ts` only starts the server; `server/app.ts` runs the guard
and hands `/api` to `server/dispatch.ts`, which matches the route table, reads path and query
parameters with the spec's schemas (`server/spec.ts`) and calls the operation's handler from
`server/handlers.ts`. The operations the board's engine serves go to `server/engine/` (`createEngine`
in `engine.ts`: reads in `engine/reads.ts`, writes in `engine/writes.ts`, the agent tools, chip
`resolve`, `turn` and `watch`), which is HTTP-free and takes its folder and its caller from its host;
the standalone server is one host of it. Every error is an
RFC 9457 problem (`server/problem.ts`), and `server/body.ts` parses the media type exactly and caps
the body. The page calls the server only through `packages/client`: the board through its host's
transport (`src/board/io.ts` `createIo`), the page's own calls through `src/shell/page-io.ts`. Before a handler runs, `server/callers.ts` works out the caller from the
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
session's agent, gives its secret to the board's MCP server only and keeps Kiro's agent file
(`~/.kiro/agents/vision-board.json`) current at start (`chat: { kiroAgent: true }`, as server.ts
does unless `VB_KIRO_AGENT=0`), `server/chat-session.ts` stamps and
streams a session's events, `server/chat-approvals.ts` holds the gate's asks,
`server/chat-prompt.ts` builds the one message (the words, the chips spelled out, the board's
answers, the board), `server/chat-round.ts` writes the answers part, the board's Send message, and
`server/chat-sessions.ts` `tell` hands it over, holding one while a turn runs (api.md 121-122, 131).

The open folder (api.md 109-112): `server/project.ts` holds the folder the server has open (its
ledger, lock, agents, chats and app host) and is the only code that switches it (`open_project`): the new
folder's lock first, then the chats and app processes stop, the live streams end, the old lock goes; with ledger
folders it opens a named ledger the same way, so switching ledgers is opening the same folder. `server/folders.ts`
is the only module that looks at other folders, all under the home folder (realpath, no hidden
folder or `node_modules`); `server/recent.ts` is the only module that touches
`~/.visionboard/recent.json` and picks the start folder. `server/open-folder.ts` answers the three
routes. `createBoardServer({ home })` takes the home folder, so tests use a temp one.

App cards (D-047, `docs/specification/apps.md`): `server/apps.ts` is the front door other server
files import; the app host is in `server/apps/`. It reads only the open ledger's `apps/<id>/`
(`manifest.ts`), works out each app's state fresh in one function (`state.ts` `appState`), serves
the panel at `GET /app-panels/<id>` with its own CSP (`panel.ts`), answers `list_apps` and
`call_app_tool` (`routes.ts`), and runs each app's tools in its own permission-limited process
(`supervisor.ts`, `child.ts`, `runner.mjs`), started on the first call and stopped when idle, when
its code changes or is stopped, and when the folder closes. `VB_FLAGS=-appCards` turns app cards
off on the server; `createBoardServer({ appLimits })` lets a test shorten `APP_LIMITS`. Test apps:
`tests/fixtures/apps/` (`probe` is the page tests' panel). On the page, `src/board/apps/app-cards.ts`
wires each app card's frame (loaded once on screen, then kept and frozen when off screen or zoomed out, at most 8 live, D-050; its state saved per card; tool calls
through `io.ts` `callAppTool`; Esc back to the card; theme changes), and Allow and Stop app through
the one sender; `src/board/apps/app-state.ts` holds the one copy of `list_apps`' answer;
`src/board/words/app-cards.ts` says what the person reads around them (components.md § App card; `tests/words-app-cards.test.ts`). This
repo's own board holds a copy of the example in `.visionboard/apps/calculator/` (in `.visionboard/main/apps/`
once its folder has moved into ledger folders; `tests/repo-example-app.test.ts` finds it in either and keeps it
equal to the skill's).

Images in cards (D-048, `docs/specification/images.md`): `server/images.ts` `serveImage` answers
`GET /board-images/<path>` (and `HEAD`) from the open ledger's `images/` only (`.visionboard/images/`, or
`.visionboard/<ledger>/images/` with ledger folders), after `imagePathProblem`
(packages/format, the one path check the Markdown renderer makes too), with an ETag and 304. An svg
(the svgImages flag, D-064) is checked by its opening (`svgProblem`) and served with its own policy,
`SVG_CSP`: no script, nothing loaded, sandboxed, so opened at its own address it runs nothing. On the
page, `src/board/cards/card-images.ts` (made by `canvas/draw.ts`) loads a card's images once it is near and the
zoom is not far (ruling 23), asks the route which version each is through `io.ts` `imageVersion`,
asks again when a card is selected or an image is opened (no timer), swaps a newer one in, shows the
box saying why for a refused file, has a card measured again when its image changed its height, and
opens the zoomed view (`<vb-image-view>`, components.md § Images in cards and § Image view). The
`cardImages` and `svgImages` flags reach the renderer per board, from the host's settings, through
`markdownOf` (`src/board/host.ts`) and `renderMarkdown`'s `images` and `svg`.

The pattern gallery (`gallery.html`, `src/gallery/`) shows every pattern in every state on one page,
drawn from `#format/gallery.ledger.jsonl` (`packages/format/fixtures/gallery.ledger.jsonl`, imported `?raw`: a real ledger in the real schema) through the
patterns' own `boardView`, `nodeState` and `regionState`. Sections are listed from `#ui` `PATTERNS`
(`packages/ui/src/patterns.ts`, the patterns' `pattern.json` files); a pattern needs a sample function in `src/gallery/main.ts` or the page shows
a gap and the page test fails. Open it at `/gallery.html`. Page tests (`npm run test:pages`, D-025,
in `tests/pages/`) run the board and the gallery in Chromium on 5 workers (`VB_TEST_WORKERS` to
change). Each worker starts its own boards (the roadmap fixture, a generated 1,000-card ledger, an empty
project) on its own block of ports, `VB_TEST_PORT` (4468) + 10 × (slot + 1), fresh for every spec
file (`tests/pages/ports.ts`, `servers.ts`). The 1,000-card ledger is `perfLedger` from
`#format/testing`. The performance budgets (`perf.spec.ts`) run last and alone, in the `budgets`
project. `--shard` needs `--project=chromium`; `perf.spec.ts` alone needs `--no-deps`. Screenshots
are stored in `tests/pages/__screenshots__/`, and `npm run test:pages -- --update-snapshots`
replaces them on purpose. The board's test support (`startTestBoard`, the API harness, fakes) is
`#board/testing` (`apps/board/tests/support.ts`, `test-board.ts`); other modules' tests find it with
`import.meta.resolve('#board/testing')` and run it as a child process, never import it (D-062).

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
- **The plugin folder**: `npm run build:plugin` writes `dist/plugin/board/` (git-ignored), the board as
  one folder for another host: `manifest.json` (checked by `plugin/manifest.schema.json`; its tools are
  `engine.tools.list()`, its text keys into `words.json`), `view/board.js` (exports `mount`, carries its own
  Svelte) with `view/board.css`, `engine/engine.js` (exports `createEngine`, imports only `node:` modules,
  reads nothing beside itself), `words.json` and `skill.md` (the skill less what only the standalone host has:
  `plugin/words/skill-edits.ts`; the tool descriptions likewise, `server/words/plugin-tools.ts`). It is
  built by `bin/build-plugin.ts` and `vite.plugin.config.ts` from the entries in `plugin/`; the same input
  gives the same bytes, and `-- --watch` rebuilds the two bundles on a change. A host sets `--host-font`,
  `--host-font-mono` and `--host-text-scale` on its root to theme it (`plugin/theme.css`). The names a host
  imports are `#board` (`mount`), `#board/styles.css` and `#board/engine`; inside the app the same files are
  reached by path. The page is built from the same files, and its own build is unchanged.
