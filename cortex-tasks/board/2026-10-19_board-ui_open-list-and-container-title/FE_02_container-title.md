# FE_02_container-title: Container title centred, sliding left, draggable

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) § Proposed Solution 2-3

## Objective

A container's title sits centred on its top line, slides left as the frame gets too narrow (zooming
out) before it would touch the tools, and drags the container like the grip does.

## Inputs

- **Files**: `packages/ui/src/region/region-template.ts`, `region.css`, `region-narrow.css`,
  `vb-region.ts` (`--tools-w` when the tools change), `pattern.json`; `apps/board/src/board/pointer.ts`
  (the frame drag starts from the label too), `container-drag.ts`; the region gallery section;
  `docs/specification/components.md` (the title line, 3_FE_01 ruling 6 superseded for the label)
- **Patterns**: the grip's hover / pressed / dragging looks; `DRAG_THRESHOLD`; the existing shrink
  order of the title line (holders, then title, then count)
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

## Steps

1. [x] Tests first (page): at 100%, the title's centre is within 2 px of the frame's centre; at a
   zoom where centring would touch the tools, the title is left of centre and its box never
   intersects the tools' box; at the far end it starts at the frame's start and truncates; a drag on
   the title moves the container (and pins it, as the grip does), at normal zoom and zoomed out
   (`[data-zoom='far']`); a click on the title still does what it did; hover shows the tint on grip
   and title together; Alt+arrows on the grip still move it.
2. [x] Layout: the spacer algorithm in PLAN.md (CSS; `--tools-w` measured only when the tools
   change). Keep the existing narrow-line behaviour and retired marker.
3. [x] Drag: the label (grip, title, count) starts a frame drag; buttons inside stay buttons.
4. [x] Look: one hover tint across grip and title, `cursor: grab`, grabbing while dragging; tokens
   only; APCA (decoration tier for the tint, reading text for the title).
5. [x] Docs and gallery (centred, mid zoom slid left, far zoom), pattern states.

## Validation

- [x] New tests failed first and pass; containers, container-polish, layout-controls, zoom specs pass;
  `npm test`, `npm run verify` pass

## Constraints

- Only your files (PLAN.md § Dependencies); FE_01 runs in parallel in the toolbar, `packages/actions`,
  `board.css`. `controller.ts`, `fold.ts`, `io.ts` are over 300 lines: don't grow them.
- Page tests with `VB_TEST_PORT=4520` under `temp/pages.lock`. Never touch port 4466. No commits.
- Bash working directory, never `cd path &&`; writes over 50 lines in chunks.
- Look at it in a browser on your own port at three zooms before reporting done.

## Implementation Notes

**Status**: Completed (2026-10-20), with one change to the algorithm (allowed by PLAN § 2: same behaviour)

1. **Algorithm changed from the spacer to a grid.** A `--tools-w` measured only when the tools change
   can't follow the tools' narrow forms, which change their width with the zoom (container queries);
   measuring per zoom is forbidden (rule 15). So the line's new bar (`region.css` `.vb-region-bar`) is a
   grid `var(--region-lead, minmax(0, 1fr)) minmax(0, auto) minmax(max-content, 1fr)`: the label in
   the middle column, the tools (with their 12px gap as a margin) in the last. With room the side
   columns are equal (centred); when they can't be, the tools' column stops at the tools' width and
   the first takes what is left (slides left, never onto the tools); then the title is cut. No JS.
   The bar is a new element because the line is the query container and can't restyle itself.
2. **Collapsed forms and far zoom start the line** (`region-narrow.css` `--region-lead: 0px`): the
   expanded row leaves the flow, so a slid label would move under it on hover. Never a jump there: the
   full row (about 260px) leaves no room to centre under 408px. Below FAR_K too, so zooming out only
   ever moves a title left (the maintainer's words) and it keeps the tools' room (decision 6). A fixed
   frame (Later) isn't pinned in the collapsed forms (its row never expands).
3. **Drag**: `pointer.ts` `frameAt`: a press on the label (not its other buttons, not its tip, not on a
   past version) starts the frame gesture; a still click on the title clears the selection as before
   (no `stopMouse`, so focus behaves as before); after a move the grip takes focus (Alt+arrows). Lock
   and past-version guards are the existing `frameStart` ones.
4. **Look**: new `.vb-region-handle` (grip, h2, count) in the template; one `--vb-surface-sunken` tint on
   hover, `data-look` and `data-dragging`; on the tint the title mixes with `--vb-ink-strong` (dark was
   Lc 56 with `--vb-ink`, now passes 60). The tint on the canvas is the grip's own hover look (low Lc,
   reported in the test annotations, not gated; the maintainer asked for the grip's look).
5. **Tests**: new `tests/pages/container-title.spec.ts` (6 tests; all failed first); `containers.spec.ts`
   (title drag now moves; pan from the line's empty part; axe test pans from the board), `select.spec.ts`
   U5 (a title drag moves, brought back so the shared board is unchanged), `gallery.spec.ts` frame count
   29; `region-template.test.ts`; APCA helpers moved from `review-colours.spec.ts` to `tests/pages/apca.ts`.
6. **Gallery**: "Title placement" (title-section.ts): 100% mini board, a frame-only slid sample (a 70%
   mini board failed axe target-size on its cards' buttons), 25% mini board. container-section.ts shows
   the handle tint on "Hover".
7. **Screenshots refreshed (frames on purpose)**: flag-retire (flag, retired), gallery (full page),
   layout-controls (alignment, card-widths, link-labels), lock-board, parking-replies, person-remove,
   send-access, light and dark. Not refreshed (no frames; FE_01's sub-pixel toolbar shift): app-gallery,
   card-updates, chat, go-to-card, key-bubble, open-folder, open-list, picker-archive, proposals,
   selection-pill, size, toolbar, versions, wires: VERIFY_01.
8. Looked at on port 4530 (own server) at 34%, 50%, 70%, 100% (Browser pane and Playwright shots):
   `temp/fe02/before-board-{100,70,40}.png`, `after-board-{100,70,40}.png`,
   `after-gallery-placement-{light,dark}.png`, `before/after-gallery-region.png`.

## On Completion

Fill the notes; update your row and notes in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_02: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/FE_02_container-title.md]]`
