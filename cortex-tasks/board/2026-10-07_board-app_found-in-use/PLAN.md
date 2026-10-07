# Found in use: connectors, live updates, watch mode, polish - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-07 · **From**: first real use of the board by an agent over MCP (tracker
> N17), board `vision-board-overview` items 31-50, maintainer's approval in chat 2026-10-07

---

## Problem Statement

The first session that drew on the board with only the MCP tools showed five gaps. Connectors
drew over cards. The page stopped listening when a project had no boards, so the first board an
agent drew never appeared. The board picker and its version labels never updated. Seeing a code
change meant a manual build and reload that reset zoom and position. And a few patterns had rough
edges: stacked cards nearly touching, cut-off container titles, a popover under its own buttons,
and notes that can't be read in full without opening them.

---

## Current State

- **Connectors**: done in this set's first task, behind `wireLayers` (on), D-032, token
  `--vb-card-fill` (70%). Owed: its page test, gallery sample and pattern states.
- **Live updates**: `watch_board` (`GET /api/boards/{board}/events`, `x-agent: false`) streams
  `change { seq }` on every ledger append but 404s for an unknown board. The page watches only the
  open board (`live.ts` `watch`, `boards.ts` `switchTo`). `boot` stops at "No boards yet" with no
  stream. `shell.boards` is set once at boot (`boards.ts`), so labels `v{b.seq}` go stale. Board
  heads are worked out only on the server, from the event list (`packages/actions` `boardHeads`).
- **Watch mode**: none. `npm run watch` rebuilds `dist/` only. The server reads `dist/` per
  request with `no-store`, so a page change needs a rebuild and reload, not a restart. A server
  restart mints a new person cookie (`newPersonToken`), so an open page is stale until reloaded.
  `Viewport` keeps `x`, `y`, `k` in memory only; `open` always fits.
- **Polish**: `list` and `lanes` stack cards `GAP / 2` (12px) apart, under the 16px tab
  overhang. Container titles are one line with an ellipsis and no way to read the rest. The
  container-note preview (`.vb-note-pop`, z 2) sits under the mode row (z 3) in narrow frames.
  Card notes clamp at 3 lines with no hover. The note editor has a fixed height.

---

## Proposed Solution

Fix each gap at its source, in the contract and the shared layers first, so every door (page,
`vb`, MCP, a future chat panel or hosted board) gets the same behaviour. Nothing here assumes
today's tools: the stream is a plain HTTP contract any client can follow, the watch script uses
only Node, and new behaviour sits behind flags that are on by default (rule 12).

### Rulings (maintainer, 2026-10-06/07; do not reopen)

1. **Connectors**: Look A only (no plates), 30% see-through, dots may show through (D-032).
2. **Live updates**: the board list and labels follow the ledger with no reload. A board another
   chat creates shows a "new" badge; the view never jumps to it (board item 44).
3. **Empty project**: the page waits for the first board and opens it when it appears. The
   message names `npm run board` (your project) and `npm run dev` (example boards) (item 39).
4. **Watch mode** is dev only (`npm run board:watch`). It rebuilds on save, restarts the server
   only when server code changes, and reloads the open page. `npm run board` never reloads.
5. **Zoom and position** survive a reload: the last known place is restored (chat 106).
6. **Titles** wrap to two lines at most, then truncate; the full title shows on hover and on
   keyboard focus, and screen readers always get it (chat 100, 108-109; rule 5).
7. **Notes**: hovering a cut-off note shows it in full without opening it; the editor grows with
   its text up to a maximum height, then scrolls (item 48).

### Key Changes

1. **Project stream (contract first)**: a new operation `watch_project`, `GET /api/events`,
   `x-agent: false`, `security: []`. Same `change { seq }` events as `watch_board`, for the whole
   project, so it never 404s on an empty one. A second event, `build { build }`, is sent only
   when the server runs in watch mode: once on connect and again whenever the built page changes
   or the server restarts. `watch_board` stays as it is.
2. **Board heads in the fold**: `LedgerState` gains each board's own last line, kept by
   `applyEvent` with `eventBoard`. The server's `list_boards` and the page read the same value,
   replacing the event-list `boardHeads` walk (one definition, rule 1).
3. **Page**: follows `watch_project` from boot; derives the board list from the held state after
   every batch; badges new boards; waits on an empty project; keeps the view in `sessionStorage`
   per board and restores it on open; reloads on a changed `build`.
4. **Watch script**: `scripts/board-watch.mjs` runs Vite's watch build and the server under
   `node --watch-path` with `VB_WATCH=1`; the server watches `dist/` and emits `build`.
5. **Polish**: a stack gap above the tab overhang; two-line titles with a full-title tip; the
   container popovers above the mode row; a hover preview for long card notes; a growing editor.

---

## Dependencies

- FE_01 (connectors) is independent and runs first: it only adds tests and gallery samples.
- BE_01 (contract, fold, server) before FE_02 (page) and BE_02 (watch script): both consume the
  `watch_project` operation, the `build` event and the board heads in the fold.
- FE_02 before BE_02: the watch script is only useful once the page reloads on `build` and
  restores its view.
- FE_03 and FE_04 (polish) touch `packages/ui` and `packages/layout`, not the stream; they run
  after the stream work so page tests never share a port with another task's run.
- Every task runs page tests on fixed ports (4468, 4469, and 4470 added by FE_02), so the waves
  are sequential.
- No new packages. Node's `fs.watch` and `node --watch-path` (Node 22.18+, `engines`) only.

---

## Out of Scope

- Changing what a board's version means. The chip shows `view().version` (the ledger position)
  while the picker shows the board's own last line; settling that is a format question, noted
  in TASK-STATUS for the maintainer, not decided here.
- Board settings (tracker N9), including the grid and blur switches from D-032.
- Connector routing around cards (M2); a Vite dev server (the board server owns localhost).
- Pushing the person's notes to the agent (the chat panel, Stage 6).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| A reload during Vite's rebuild catches `dist/` half written | The server waits until `dist/index.html` exists and the folder has been quiet for 300 ms before it emits `build` |
| A reload loop in watch mode | The page remembers the first `build` id it saw and reloads only when a different id arrives |
| A server restart leaves the page's person cookie stale | In watch mode the restart changes the `build` id, so the page reloads and gets a fresh cookie |
| The new stream fails page tests on an empty project | A third test server (port 4470) with no seed; the stream answers 200 on an empty ledger |
| Changing `list_boards` heads changes agent-visible numbers | Unit test: the fold's heads equal today's `boardHeads` on every fixture ledger before the swap |
| Two-line titles break the REGION_HEAD equality | The head stays 38px; the title's two lines fit inside the straddle; the page test still checks both |

---

## References

- `docs/specification/api.md` (41, 43, 44, 52-57; the operation table), `docs/specification/components.md` (§ Feature flags)
- `packages/format/schema/openapi.json` (`watch_board`), `packages/format/schema/api/sse-change.schema.json`
- `apps/board/server/reads.ts` (`watchBoard`, `listBoards`, `requireBoard`), `apps/board/server.ts`, `apps/board/server/app.ts` (`SECURITY_HEADERS`)
- `packages/actions/src/reads.ts` (`boardHeads`, `eventBoard`), `packages/actions/src/fold.ts`
- `apps/board/src/board/live.ts`, `boards.ts`, `io.ts`, `viewport.ts`, `shell/Toolbar.svelte`
- `packages/layout/src/modes/grid.ts` (`list`), `modes/lanes.ts`; `packages/ui/src/region/*`, `node/*`, `note-bubble/*`
- `docs/decisions.md` D-016 (layers), D-030 (flag precedent), D-032 (connectors)

---

## Success Criteria

- [ ] A board drawn into an empty project appears on an open page with no reload
- [ ] A second board appears in the picker with a "new" badge; labels follow every append
- [ ] `npm run board:watch`: a CSS edit shows on the open page within seconds, view kept
- [ ] Connectors, titles, popovers, note previews and the editor pass their page tests and axe
- [ ] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages`, `npm run gen -- --check` exit 0
