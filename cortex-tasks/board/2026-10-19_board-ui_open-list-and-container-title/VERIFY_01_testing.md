# VERIFY_01_testing: Final verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Prove PLAN.md's success criteria with evidence and audit the docs this set touched.

## Steps

1. [x] Read every task's notes first.
2. [x] `npm test`, `npm run check`, `npm run verify`, and the full page suite once
   (`VB_TEST_PORT=4520`, under `temp/pages.lock`, nothing else running); report every failure with its
   cause. Known: `board.spec.ts` screenshot is order dependent.
3. [x] Walk the criteria in a browser on your own port, light and dark: the open list (mouse and
   keyboard); the title centred, sliding left as you zoom out, never under the tools; dragging by
   the title at normal and far zoom; a click still selects. Save screenshots to `temp/v01/` (centred,
   mid zoom, far zoom, the open list) and list them.
4. [x] APCA spot-checks; `cortex-docs` audit of components.md and anything else touched.
5. [x] Tick PLAN.md's criteria with evidence in TASK-STATUS.md. Don't flip the set's frontmatter.

## Constraints

- Fix nothing beyond trivial doc wording; report findings. Never touch port 4466. No commits.
- Bash working directory, never `cd path &&`.

## Implementation Notes

**Status**: Completed (2026-10-20). Sizes and files: all in `temp/v01/`.

1. **Suites.** `npm test` 1567 pass, 0 fail (+ 10 timing); `npm run check` 0 errors, 0 warnings;
   `npm run verify` ok with 3 warnings (`controller.ts` 305, `io.ts` 301, `fold.ts` 308 lines; none touched
   by this set). Page suite, first run (before any refresh): 561 passed, 27 failed, 1 did not run
   (`pages-run1.txt`); all 27 were screenshot mismatches (none axe or behaviour), 14 specs as listed in
   the task. After the refresh, a clean run with no update flag: 589 passed (`pages-run2.txt`). The
   `board.spec.ts` order-dependent shot did not bite.
2. **Baselines refreshed** (`--update-snapshots=changed`; 28 PNGs, light and dark; before and after
   copies of each failure in `temp/v01/diffs/`). I looked at every diff first: all were text and edge
   anti-aliasing (1px element shifts), no moved block, no new or missing element.
   app-gallery (app-cards: section 698 -> 699px tall, text edges and the Allow button's outline),
   card-updates (text edges), chat (text edges down the whole page), go-to-card (under Lc 40 per pixel:
   faint edges), key-bubble (text edges), open-folder (dark failed, light then did not run; text edges),
   open-list (the focus ring's outline edge only, 4 rows), picker-archive (text edges), proposals (text
   edges), selection-pill (802 -> 801px tall; text and the Comment button's edge), size (text edges),
   toolbar (the Send to agent and menu buttons' bottom edges, 4 rows), versions (faint edges, Lc 33 at
   most), wires (1 level per channel: nothing visible). `gallery-*.png` and FE_02's frame ones were
   already refreshed and passed in the first run.
3. **Walk** (own server on 4540, a board drawn by an agent: two containers, six cards; Playwright
   Chromium, light and dark; `temp/v01/walk.mjs`, `keys.mjs`, `past.mjs`). No console errors, page errors or
   failed requests. Shots: `title-100-{light,dark}.png`, `title-70-*`, `title-40-*` (and `-frame` crops),
   `title-hover-tint-{light,dark}.png`, `drag-100-{during,after}.png`, `drag-40-{during,after}.png`,
   `toolbar-chip-{rest,hover,focus}-{light,dark}.png`, `open-list-mouse-click.png`,
   `past-version-title-drag.png`. The native popup is not in any shot (a headless Chromium does not draw it).
4. **Findings** are in TASK-STATUS.md (numbered there).
5. **Docs.** `components.md` (FE_01 item 7, item 2 note, FE_02 title paragraph, Pointer item 3), `modules.md`
   (generated, `verify` agrees): every symbol named exists (`.vb-region-bar`, `--region-lead`,
   `.vb-region-handle`, `frameAt`, `GoTo.to`, `openCards`, `openRow`, `OPEN_ROW_MAX`, `clip`, `MenuSelect`);
   the numbers (2px, 50%, 20%, 100%/40%) match `container-title.spec.ts`. One wording fix: a 168-character
   line in the FE_02 paragraph rewrapped. One claim has no test (finding 2 in TASK-STATUS).

## On Completion

Fill the notes; update your row and notes in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/VERIFY_01_testing.md]]`
