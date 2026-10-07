# BE_01_project-stream: Project stream, board heads in the fold, build event

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key
> changes 1, 2; rulings 2-4) · **Contract**: `docs/specification/api.md` · **Model**: Opus 5.5

## Objective

One live stream for the whole project, which answers on an empty project, plus each board's own
last line kept in the fold, plus a dev-only `build` event, all contract first (rule 6).

## Rulings (do not reopen)

1. **New operation** `watch_project`: `GET /api/events`, `x-agent: false`, `security: []`,
   `text/event-stream`. On every append: `event: change`, `data: {"seq":N}` (same item schema as
   `watch_board`), `retry: 2000` first, a `: beat` comment every 20 s. 200 on an empty project.
   `watch_board` stays unchanged (other clients may use it).
2. **`build` event**, only when the server was started with `VB_WATCH=1`: `event: build`,
   `data: {"build":"<id>"}`, sent once on every connect and again whenever the id changes. The id
   is the server's start time plus the `mtime` of `dist/index.html`, so a server restart and a
   new page build both change it. The server watches `dist/` with `fs.watch` and emits once the
   folder has been quiet for 300 ms and `index.html` exists. Without `VB_WATCH` no `build` event
   is ever sent and nothing is watched. The item schema is a new
   `packages/format/schema/api/sse-build.schema.json`; the 200 response's `itemSchema` becomes a
   `oneOf` of change and build.
3. **Board heads in the fold**: `LedgerState` gains `heads: Map<string, number>` (board id → the
   board's own last line), updated in `applyEvent` with `eventBoard` (so `foldLedger` and the
   page's incremental apply agree). Add a read `boardList(state)` in
   `packages/actions/src/reads.ts` returning `{ board, title, seq }[]` as `list_boards` does
   today, and use it in the server's `listBoards`. Remove `boardHeads` if nothing else uses it.
4. **api.md**: add the operation to the table and numbered points after the current last one
   (do not renumber); note in 44 that the project stream carries `build` in watch mode only.

## Inputs

- **Files to modify**: `packages/format/schema/openapi.json`, `packages/format/schema/api/`
  (new `sse-build.schema.json`), `docs/specification/api.md`, `packages/actions/src/fold.ts`,
  `packages/actions/src/reads.ts`, `apps/board/server/reads.ts`, `apps/board/server.ts`
  (`VB_WATCH`, dist watcher), generated files via `npm run gen`
- **Tests to extend**: `apps/board/tests/route-table.test.ts` (auth map row),
  `apps/board/tests/api.test.ts` (stream cases), `apps/board/tests/openapi.test.ts` (version),
  `packages/actions/tests/` (heads equal `boardHeads` on every fixture ledger, then the swap)
- **Patterns to follow**: `watchBoard` in `apps/board/server/reads.ts`; `api.md` 57 (schema →
  openapi → gen → handler → test)

## Steps

1. [x] Failing tests first: `watch_project` answers 200 with `retry: 2000` on an empty ledger and
   sends `change` on an append; with `VB_WATCH=1` it sends `build` on connect and a new id after
   `dist/index.html` changes; without it, never. Heads: `state.heads` equals `boardHeads` on
   every fixture ledger, folded at once and line by line.
2. [x] Schema and OpenAPI: `sse-build.schema.json`, the operation, `info.version` bump (minor),
   descriptions on every field (gen tests require them, without citing our own docs).
3. [x] `npm run gen`; check MCP tools and `vb` commands are unchanged (`x-agent: false`).
4. [x] Fold heads in `applyEvent`; `boardList`; swap the server's `listBoards` to it.
5. [x] Handler `watchProject` in `READS`; the dist watcher in a small module of its own
   (`apps/board/server/build-watch.ts`), started from `server.ts` only under `VB_WATCH=1`,
   closed on `SIGINT`/`SIGTERM`.
6. [x] api.md table row and points; regenerate `api-reference.md` (part of `gen`).

## Validation

- [x] The five gates exit 0. `curl -N http://127.0.0.1:4466/api/events` on a running board shows
  `retry` then `change` lines as you write; with `VB_WATCH=1`, a `build` line.

## Implementation Notes

**Status**: COMPLETED (2026-10-07)

- **Contract**: `packages/format/schema/api/sse-build.schema.json` (new; `build` is a string,
  `^[a-z0-9.-]+$`, 1-64); `openapi.json` operation `watch_project` (`GET /api/events`,
  `x-agent: false`, `security: []`, 200/400/403/405/500, `itemSchema` `oneOf` [`sseChange`,
  `sseBuild`], `change` and `build` examples), component `sseBuild`, `info.version` 1.5.0.
  `npm run gen`: route table gains `watch_project`; MCP tools change only `apiVersion`; `vb`
  commands unchanged.
- **Fold**: `LedgerState.heads` set in `applyEvent` through `eventBoard`, which moved from
  `reads.ts` to `fold.ts` (fold.ts would otherwise import reads.ts, which imports fold.ts).
  `boardList(state)` (+ `BoardListItem`) in `packages/actions/src/reads.ts`; `boardHeads` removed
  (no other user); `emptyState` and `eventBoard` exported from `fold.ts` through the index.
  The old walk is kept only as the test oracle in `packages/actions/tests/heads.test.ts` (all four
  fixture ledgers incl. the gallery's, folded at once and after every line).
- **Server**: `listBoards` reads `boardList`. `watchBoard` and the new `watchProject` share one
  `stream` helper in `apps/board/server/reads.ts` (retry, change, beat, off switches).
  `apps/board/server/build-watch.ts` (`watchBuild(dist, quietMs = 300)`, id
  `<start ms base36>-<index.html mtime ms base36>`, `fs.watch` recursive, emits only when the id
  changed and `index.html` exists). `server.ts` starts it only under `VB_WATCH=1` and closes it
  and the server on `SIGINT`/`SIGTERM`. `createBoardServer` takes `build?`; `dispatch.ts` gains
  `ServerEnv` (`CallerEnv` + `build`) and `Ctx.build`.
- **Tests**: stream cases are in a new `apps/board/tests/api-events.test.ts` rather than
  `api.test.ts`, because they need their own servers (an empty project; watch mode); each event
  is checked against the operation's `itemSchema`. `api-harness.ts` `startBoard({ watch })` and
  `Harness.dist`. `openapi.test.ts` (version, the serialized-example check covers both streams),
  `route-table.test.ts` (auth row).
- **Docs**: `api.md` table row, 41 and 44 mention `watch_project`, new points 78-80;
  `api-reference.md` regenerated; `modules.md` via `npm run map`; `packages/actions/README.md`
  public API (also dropped a stale `applyItem`).
- **Checked**: `npm run check`, `npm test` (579 + 4 timing), `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages` (129) all exit 0. Manual: `server.ts` with
  `VB_WATCH=1` on port 4477 over an empty scratch project; `curl -N /api/events` showed `retry`,
  `build`, then `change {"seq":1}` on a `join`; SIGINT stopped it cleanly. Port 4466 untouched.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-format] BE_01: …`).
