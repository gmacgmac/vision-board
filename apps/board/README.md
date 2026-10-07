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
line to the state it holds, `board-data.ts` works the open board out from that state, and `draw.ts`
updates, measures and lays out only what a change touched (`layout-cache.ts` per container,
`wires.ts` per connector, `offscreen.ts` for cards well off screen), counting the work in `work.ts`.

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
`write_board` batch item by item (keys, `base`, grants, then the ledger module).

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
  http://localhost:4466. `VB_PROJECT` picks the project folder; `VB_SEED` names a ledger copied
  in when the project has none yet.
  `npm run board:watch` is for working on the board: it rebuilds the page on save, restarts the
  server only when server code changes, and reloads the open page with its view kept (dev only;
  `npm run board` never reloads). `npm run watch` alone only rebuilds. `npm run check` type-checks `src/`.
