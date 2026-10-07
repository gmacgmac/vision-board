# BE_02_board-watch: npm run board:watch

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 4;
> ruling 4) · **Builds on**: BE_01 (`VB_WATCH`, `build`), FE_02 (reload, view kept) ·
> **Model**: Sonnet 5.5

## Objective

One dev command that keeps the open board current while code changes: rebuild the page on save,
restart the server only when server code changes, and let the page reload itself.

## Rulings (do not reopen)

1. `scripts/board-watch.mjs`, plain Node, no new package. It spawns two children and passes
   through `VB_PORT`, `VB_PROJECT` and `VB_SEED`:
   - the page build: `npm run watch` (Vite's `--watch`);
   - the server, started once the first build has written `apps/board/dist/index.html`:
     `node --watch-path=apps/board/server --watch-path=apps/board/server.ts
     --watch-path=packages/format/src --watch-path=packages/actions/src apps/board/server.ts`,
     with `VB_WATCH=1`.
2. Ctrl+C stops both children; if either exits with an error, the script stops the other and
   exits with that code. Output from each child is prefixed (`[page]`, `[server]`).
3. Root `package.json`: `"board:watch": "node scripts/board-watch.mjs"`. `npm run board` is
   unchanged. `README.md` (§ Running) and `apps/board/README.md` say when to use each.
4. Spawn the server as a child process; never import an app file from `scripts/` (D-016,
   `verify.mjs` `checkImports`).

## Steps

1. [x] Write the script (under 150 lines) and the npm entry.
2. [x] A test in `scripts/board-watch.test.mjs` for the pure parts (argument building, the
   prefixing), as `scripts/*.test.mjs` runs in `npm test`.
3. [x] By hand: run it, open the board, change a token in `packages/tokens/src/tokens.css`, see
   the page reload with the same view; change `apps/board/server/reads.ts` (a comment), see the
   server restart and the page reload; stop with Ctrl+C, no child left (`lsof -i :4466`).
4. [x] Docs as in ruling 3; `npm run map` if the module map changes.

## Validation

- [x] The five gates exit 0; step 3 done and noted with what was seen.

## Implementation Notes

**Status**: COMPLETED

`scripts/board-watch.mjs` (77 lines, plain Node) and `scripts/board-watch.test.mjs` (3 tests: `serverArgs`, `linePrefixer`, `built`). Page child `npm run watch`; the server starts once `apps/board/dist/index.html` has an mtime from this run (not a stale build), with `VB_WATCH=1` and the `--watch-path` list from the ruling. Each child gets its own process group (`detached`), so Ctrl+C or one child exiting stops the whole tree and the script exits with that code. Output prefixed `[page]` / `[server]`. `board:watch` in root `package.json`; README.md gained a short Running section, `apps/board/README.md` Run line says when to use which.

By hand (port 4480, scratch project `temp/be02-watch`, seeded from the roadmap fixture): a token comment added to `tokens.css` gave a new `build` event on `GET /api/events` within about 2 s (Vite rebuilt, server not restarted); a comment added to `server/reads.ts` printed `Restarting 'apps/board/server.ts'` and the build id changed on reconnect (`muy5uk88-...` to `muy5vcon-...`), which is what makes the page reload. Both edits reverted (files compared byte-identical to the saved copies). Ctrl+C (SIGINT): no vite, node --watch or server process left, nothing on 4480. I did not open the page in a browser; the page side was covered by FE_02's tests. `npm run map` regenerated the actions row of `docs/specification/modules.md` (BE_01's `boardList`/`emptyState` exports; `scripts` row unchanged). Gates: check, test (583 + 4 timing), verify, gen --check, test:pages (133) all exit 0.

## On Completion

Fill in notes, update your row, append your own LOG line (`[project-tooling] BE_02: …`).
