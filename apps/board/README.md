# apps/board

The Vision Board app: the page in `src/` and the small local server (`server/`) that serves the
built page and reads and writes `sessions/`. `src/shell/` is the Svelte shell (toolbar, reply
panel, note dialog; D-012). `src/board/` is the framework-free canvas controller it mounts
(layout, drawing, pointer, keys, I/O; D-005). Vite builds `src/` into `dist/` (gitignored). Localhost
only, with Host and Origin checks, JSON only. `bin/reply.ts` prints the numbered reply for a
session. Pages arrange patterns from `packages/ui`; they hold no layout maths, file formats or
actions themselves.

- **Depends on**: `packages/format`, `packages/actions`, `packages/layout`, `packages/ui`,
  `packages/tokens`.
- **Used by**: nothing (apps are never imported, D-016).
- **Run**: `npm run board` (builds, then serves), then open http://localhost:4466.
  `npm run watch` rebuilds on change; reload the page. `npm run check` type-checks `src/`.
