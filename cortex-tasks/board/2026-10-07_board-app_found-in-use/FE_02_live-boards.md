# FE_02_live-boards: Page follows the project: list, badge, empty wait, view kept

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 3;
> rulings 2, 3, 5) · **Builds on**: BE_01 · **Model**: Opus 5.5

## Objective

The page listens to the whole project from the moment it opens: the first board drawn into an
empty project opens by itself, new boards appear in the picker with a "new" badge, labels follow
every append, and a reload (by hand or in watch mode) keeps the board's zoom and position.

## Rulings (do not reopen)

1. **One stream**: `live.ts` follows `watch_project` (via `watchProject` in `io.ts`, built here)
   from `boot`, whether or not there are boards; `switchTo` no longer opens a stream per board.
2. **Board list from the held state**: after every batch, `shell.boards` is rebuilt from
   `boardList(live.state)` (BE_01). `listBoards()` over HTTP is no longer needed at boot.
3. **New badge**: boards present when the page opened are known. A board that appears later
   shows " · new" in its picker option, and the toolbar shows a small chip ("1 new board") until
   each new board has been opened. The open board never changes by itself, except rule 4.
4. **Empty project**: `boot` shows "No boards yet. Waiting for an agent to draw. (`npm run board`
   serves your project; `npm run dev` the example boards.)" and opens the first board that
   appears, then behaves as usual.
5. **View kept**: `Viewport` gets `snapshot()` and `restore({x, y, k})` (clamped to `MIN_K`,
   `MAX_K`). The page saves the view per board in `sessionStorage` (`vb.view.<board>`, try/catch
   as `flags.ts` does) on every `apply`, debounced, and `open` restores it instead of fitting
   when present. Behind a new flag `keepView`, on by default.
6. **Reload on build**: the page remembers the first `build` id it receives and calls
   `location.reload()` when a different one arrives (the view is already saved). No `build`
   events means no reloads: `npm run board` never reloads.

## Inputs

- **Files to modify**: `apps/board/src/board/io.ts`, `live.ts`, `boards.ts`, `viewport.ts`,
  `controller.ts` (keep it at or under 300 lines; split if needed), `apps/board/src/shell/shell.svelte.ts`,
  `Toolbar.svelte`, `packages/format/src/flags.ts`, `tests/pages/playwright.config.ts` (a third
  `webServer` on `PORT + 2` with `VB_PROJECT` only, no seed), new `tests/pages/live-boards.spec.ts`
- **Shared artifacts to reuse**: `watch_project`, the `build` event, `boardList` (BE_01)
- **Patterns to follow**: `send-access.spec.ts` (`join`, writes with a Bearer secret from a
  test); `same-picture.spec.ts` (`__vbWork.idle()`); `helpers.ts` fails on any request ≥ 400

## Steps

1. [x] Failing page tests first, in `live-boards.spec.ts`:
   - empty project (port `PORT + 2`): the waiting message, then an agent writes a board through
     the API, and it opens with no reload;
   - seeded project: an agent writes a second board; the picker gains it with " · new" and the
     chip; the open board doesn't change; opening the new board clears its badge;
   - picker labels change after an append to that board;
   - zoom and pan, reload, same `x`, `y`, `k`; with `?flags=-keepView` the board fits again.
2. [x] `watchProject` in `io.ts`; `live.ts` `watch()` with no board id; `boards.ts` boot and
   switchTo reworked; `shell.boards` rebuilt from `boardList` in the controller's `onLines`.
3. [x] Badge state in `shell` (`newBoards: Set<string>`); Toolbar option suffix and chip.
4. [x] `Viewport.snapshot` / `restore`; save and restore in `boards.ts` `open`; flag `keepView`.
5. [x] `build` handling in `live.ts` (first id kept; a different one reloads).
6. [x] Axe passes with the chip showing, both themes.

## Validation

- [x] The five gates exit 0. By hand: `npm run board` on an empty `VB_PROJECT`, open the page,
  draw a board over MCP, see it appear.

## Implementation Notes

**Status**: COMPLETED (2026-10-07)

- **Client**: `packages/client` `watch()` takes one event name or several and hands each event on
  with its name (`on(data, event)`), so one `EventSource` carries `change` and `build`; a handler's
  own error is no longer swallowed with a bad-JSON event. New unit test in `client.test.ts`.
- **io.ts**: `watchProject({ change, build, open })` replaces `watchBoard`; `listBoards` and
  `BoardSummary` removed (no user left). `shell.boards` is now `BoardListItem[]` (`board`, `title`,
  `seq`) straight from `boardList`, one definition with the server's `list_boards`.
- **live.ts**: `watch()` (no board id) follows `watch_project`; it keeps the first `build` id and
  calls `location.reload()` on a different one (ruling 6).
- **boards.ts**: `boot` loads, sets the known boards, starts the one stream, then shows the
  waiting message (ruling 4 text, the parenthesis on a second line) or opens the hash's board.
  `listed()` (called from the controller's `onLines`, every batch) rebuilds `shell.boards`,
  adds unseen boards to `shell.newBoards`, drops ones that left, and on an empty project opens
  the first board drawn. `switchTo` clears a board's badge. `firstDrawMs` is set on the first
  open, whichever path opened it.
- **View kept** (ruling 5): `Viewport.snapshot()` / `restore()` (`ViewSnapshot`, zoom clamped);
  new `apps/board/src/board/kept-view.ts` saves `vb.view.<board>` in sessionStorage 250 ms after
  the view stops moving, and at once on `pagehide` or when another board opens; `open` restores
  it, else fits. Flag `keepView` (on), checked once in the controller and passed to `createBoards`.
- **Toolbar**: option suffix " · new"; chip `#new-boards` ("1 new board", `data-tone="new"`,
  `--vb-accent` on `--vb-accent-soft`, the pressed-button pair) inside `#counts`, which is already
  a polite live region, so the chip is announced with no second live region.
- **controller.ts**: 299 lines (imports merged, header reflowed, `rebuild` on one line).
- **Tests**: `tests/pages/live-boards.spec.ts` (4 tests: empty project then first board with a
  no-reload mark; new board badge + chip + open board kept + axe in both themes + badge cleared on
  open; label follows an append; view kept across a reload and fitted with `-keepView`). Third
  webServer on `EMPTY_PORT` (`PERF_PORT + 1` = 4470, `perf-server.ts`), `VB_PROJECT` only. The
  tests were written with the code rather than strictly before it.
- **Checked**: `npm run check`, `npm test` (580 + 4 timing), `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages` (133) all exit 0. By hand: a server on 4470 over
  an empty scratch project; screenshots of the waiting message, the first board opening by itself
  after an API write, and the chip in light and dark. Port 4466 untouched.
- **For the maintainer**: the toolbar's version chip (`view().version`, the ledger position)
  now visibly moves when another board is drawn (v4 to v7 in the check above) while the picker
  shows the board's own v4. This is the open question already in TASK-STATUS; not changed here.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_02: …`).
