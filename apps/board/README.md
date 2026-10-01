# apps/board

The Vision Board app: the canvas in the browser (`public/`, moving to `src/` with Svelte in board
v3, D-012) and the small local server (`server/`) that reads and writes `sessions/`. Localhost
only, with Host and Origin checks, JSON only. `bin/reply.ts` prints the numbered reply for a
session. Pages arrange patterns from `packages/ui`; they hold no layout maths, file formats or
actions themselves.

- **Depends on**: `packages/format`, `packages/actions`, `packages/layout`, `packages/ui`,
  `packages/tokens`.
- **Used by**: nothing (apps are never imported, D-016).
- **Run**: `node apps/board/server.ts`, then open http://localhost:4466.
