# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Model**: Orchestrator

## Steps

1. [x] The five gates, every exit code read.
2. [x] Two servers on one scratch project: the second refuses and names the first.
3. [x] Over MCP, two agents: agent B can't write to agent A's board (`needs-grant {board}`); the
   person grants the board on the page; B creates its own container there; B still can't write
   in A's container without that container's grant.
4. [x] A board changed by an agent while another is open shows `· changed`; reload: still there;
   open it: gone.
5. [x] Grep: the replaced functions are gone or one-line calls into the tables.

## Implementation Notes

**Status**: Completed (2026-10-07)

1. Gates: `npm test` 639 + 6 timing, `npm run check`, `npm run verify` (0 warnings),
   `npm run gen -- --check`, `npm run test:pages` 153; all exit 0. One run had a perf-test
   teardown timeout under load (Dropbox syncing); it passed alone 3/3 and in the full rerun.
2. Lock: a second server on `temp/v1` refused, naming host, process, port and start time.
3. Over MCP (vb-mcp, three agents): B refused on A's board with `needs-grant` for the board; the
   page showed "Agent B wants to draw on this board"; Allow; B then created its own container
   and card; B refused in A's container (`needs-grant` for the container).
4. C's board Beta: "· new" and "1 board updated"; opened and left, mark cleared; C added a card:
   "· changed" live and after a reload.
5. Grep: `eventBoard` is a one-line call into `references.ts`; `boardOf`, `cardsOfAct`,
   `owedContainers`, `unseenItems`, `owedRegions`, `drewOn`, `regionOf`, the `canWrite` switch and
   the page's `known` sets are gone.

**Bug found and fixed here** (rule 13, failing test first): a board opened while the page had no
room (hidden pane or background tab) fitted to the minimum zoom off to one side, and keepView kept
that view, so the board stayed out of sight. `Viewport.fit` now waits until the stage has room
(`sized`, `resized()` on window resize), and `kept-view.ts` never saves a view taken without room.
Test: `tests/pages/live-boards.spec.ts` "a board opened with no room fits once the window has
room". Files: `apps/board/src/board/viewport.ts`, `kept-view.ts`, `controller.ts` (resize hook).
