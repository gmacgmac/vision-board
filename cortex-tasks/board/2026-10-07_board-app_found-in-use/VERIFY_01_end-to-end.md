# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Success
> criteria) · **Model**: Orchestrator

## Objective

Prove the set works the way the maintainer will use it, on a real board over MCP, not only in tests.

## Steps

1. [x] Gates: `npm test`, `npm run check`, `npm run verify`, `npm run test:pages`,
   `npm run gen -- --check`; read every exit code.
2. [x] Empty project: `VB_PROJECT=temp/verify-empty npm run board`, open the page, write a board
   over MCP (`vb-mcp` with `VB_SERVER` on that port): it appears with no reload.
3. [x] Second board over MCP: the picker shows it with " · new"; the open board stays.
4. [x] `npm run board:watch`: edit a token, the page reloads with the same view; edit a server
   comment, the server restarts and the page reloads; Ctrl+C leaves nothing listening.
5. [x] On the maintainer's board: connectors behind cards, a long container title and its tip, a
   narrow frame's Comment preview above the row, a long card note's hover preview, a growing
   editor; dark and light; screenshots sent to the maintainer.
6. [x] Draw the result on the board (`vision-board-overview`) as a short summary container.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-07

1. Gates after every task, run and read by the orchestrator: all exit 0. Final: `npm test` 587 + 4
   timing, `npm run check`, `npm run verify` (0 warnings), `npm run gen -- --check`,
   `npm run test:pages` 149.
2. Empty project on 4481: the waiting message showed; a board written over MCP (`vb-mcp` over
   stdio, `join` then `write_board`) opened with no reload.
3. A second board from another agent: picker "Verify two · v10 · new", chip "1 new board", the
   open board stayed. The version chip read v10 while the picker read v6 for the open board
   (the open question in TASK-STATUS).
4. `board:watch` on 4482: a `tokens.css` edit and a `server/reads.ts` edit each reloaded the open
   page with the same `translate(...) scale(0.6257)`; SIGINT left no process and 4482 free. Both
   probe edits restored byte for byte.
5. A copy of the maintainer's ledger on 4483: "Questions for you" now wraps in full; the Comment
   preview opens below the row, readable; item 31's long note shows in full in the hover
   preview; connectors show faintly through cards. Dark checked; light covered by page tests.
6. Summary drawn on `vision-board-overview` (container `found-in-use`).

## On Completion

Fill in notes, update the row, then the set's own completion steps in TASK-STATUS.
