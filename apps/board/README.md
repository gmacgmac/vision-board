# apps/board

The Vision Board app: the page in `src/` and the small local server (`server.ts`, `server/`) that
serves the built page and reads and appends the project ledger
(`<VB_PROJECT>/.visionboard/ledger.jsonl`, D-017) through `server/ledger.ts`. `src/shell/` is the
Svelte shell (toolbar, reply panel, note dialog; D-012). `src/board/` is the framework-free canvas
controller it mounts (layout, drawing, pointer, keys, I/O; D-005). Vite builds `src/` into `dist/`
(gitignored). Localhost only, with Host and Origin checks, JSON only. `bin/reply.ts <board>
[--json]` prints the numbered reply for a board from the project ledger. Pages arrange patterns
from `packages/ui`; they hold no layout maths, file formats or actions themselves. Every card is a
`<vb-node>` element: `src/main.ts` calls `defineBoardElements()` and imports the pattern CSS, and
`src/board/render.ts` creates, measures and places the elements but never builds their markup.

Routes (interim until U4 derives them from the OpenAPI spec, D-022; no agent write route). The
page calls them only through `src/board/io.ts`; an action sends `{ action, n, ver }` (plus `text`,
`x`, `y`, `region`, `mode`) and the server is its only validator:

- `GET /api/boards`: `[{ id, title, seq }]`
- `GET /api/boards/:id`: `{ seq, view, state, versions }` (`versions`: node id -> latest `ver`)
- `POST /api/boards/:id/act`: append one person `act` event; 201 with the event, 422 with problems
- `GET /api/boards/:id/events`: server-sent `change` events with `{ seq }` on every append

- **Depends on**: `packages/format`, `packages/actions`, `packages/layout`, `packages/ui`,
  `packages/tokens`.
- **Used by**: nothing (apps are never imported, D-016).
- **Run**: `npm run board` (builds, then serves the repo's own project ledger), or `npm run dev`
  (serves `temp/demo`, seeded once from the roadmap fixture ledger), then open
  http://localhost:4466. `VB_PROJECT` picks the project folder; `VB_SEED` names a ledger copied
  in when the project has none yet.
  `npm run watch` rebuilds on change; reload the page. `npm run check` type-checks `src/`.
