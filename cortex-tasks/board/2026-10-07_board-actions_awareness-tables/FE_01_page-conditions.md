# FE_01_page-conditions: Page reads conditions

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 5)
> · **Builds on**: BE_04 · **Model**: Opus 5.5

## Objective

Every attention mark on the page comes from `conditionsOf`, and the page records board seen, so
"this board changed" works after a reload and on another computer.

## Rulings (do not reopen)

1. The picker marks a board `· new` (`board.new`) or `· changed` (`board.changed`); the toolbar
   chip counts both ("2 boards updated"). The open board is never marked.
2. Container badges (`container.owed`), the request strip (`grant.requested`), the "agent drew"
   toast (`board.drawn`) read conditions; the strip's own `known` set, `boards.ts` `known`, and
   the gallery's inline copy of `owedRegions` go.
3. Board seen: the page sends `seen {board, seq}` when it opens a board and, while it stays open,
   at most once a minute when new lines arrive; never while viewing a past version (Set 2).
4. One module computes the page's conditions after each batch (`apps/board/src/board/
   attention.ts` or similar); components only render.

## Steps

1. [x] Failing page tests first: a second board changed by an agent shows `· changed` after a
   reload; opening it clears the mark; container badge, strip and toast unchanged in behaviour
   (existing tests pass untouched).
2. [x] The page module; Toolbar; remove the replaced sets and copies; axe in both themes.

## Validation

- [x] The five gates exit 0.

## Implementation Notes

**Status**: Completed (2026-10-07)

- **Table refinement** (orchestrator, from BE_04): `board.changed` now reads the fold's new
  `agentHeads` (board -> last line any agent wrote: drawing, replies, proposals, requests), so the
  person's own acts never mark a board changed; its `seq` is that agent line. One rule,
  `boardNews(s, board)` in `conditions.ts`, behind both `board.new` and `board.changed`; the page
  reads it for the open board to know a board seen is due. Row text, api.md 87 and 89 updated;
  the row's test adds person acts (no mark), an agent reply (marks), and `boardNews`.
- **Page**: `pageConditions(s, board)` (`board-data.ts`, pure, also the gallery's) is the one read of
  `conditionsOf`: picker marks, `owed` containers, open request lines, `board.drawn`. `attention.ts`
  (`createAttention`) runs it after every batch and on every switch: `shell.boardMarks`, the badges
  (`owed()`, given to `draw.ts`), `shell.requestNews` (requests whose line is in the batch), and the
  toast (true when `board.drawn`'s line is in the batch, i.e. its seq rose). It sends board seen
  (`markBoardSeen` in `io.ts`, `seen {board, head}` at the board's head) when `boardNews` says one
  is due: on opening, on leaving (switch; `pagehide` with a keepalive client), and while open at
  most once a minute (a timer). Never twice for the same head.
- **Removed**: `boards.ts` `known` (a `booted` flag keeps the first-board auto-open), the strip's
  `known`/`primed`/`ready` (it now derives its announcement from `news`), `region-notes.ts`
  `owedRegions`, the gallery's inline `owedRegions` copy, `drewOn` (and its test, replaced by a
  `pageConditions` test). `shell.newBoards` became `shell.boardMarks`.
- **Toolbar**: options read ` · new` or ` · changed`; the chip `#boards-updated` ("2 boards
  updated", `data-tone="new"`); the open board is never marked. Checked by eye in a scratch
  server, dark and light; axe in both themes in the new page test.
- **Tests**: `live-boards.spec.ts`: new "changed after a reload and in another browser, opening
  clears it, own ack is not news" and "agent drawing toasts, person acting doesn't"; existing tests
  first mark every board seen (`seeAll`) and read the new chip; the label test now expects
  ` · changed` after the agent's append. `send-access.spec.ts` "Remove access … Cancel" filters the
  board seen line from "nothing recorded". Board screenshots updated: the version chip reads v37,
  as opening the board records a board seen (a ledger line, so the ledger position moves). Strip
  announcement, container badge tests untouched and passing.
- **Note for the maintainer**: every board seen is a ledger line, so the toolbar's version chip
  (the ledger position) moves when the person opens a board with news. The toolbar has no gallery
  section, so the marks have no gallery entry (Set 2 owns the toolbar).
- Gates: `npm test` 639 + 6 timing, `npm run check`, `npm run verify` (0 warnings, modules.md
  regenerated), `npm run gen -- --check`, `npm run test:pages` 152, all exit 0. `controller.ts`
  300 lines.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_01: …`).
