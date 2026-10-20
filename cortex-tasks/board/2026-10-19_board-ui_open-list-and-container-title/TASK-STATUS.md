---
task_name: Open-Cards List and Container Title - Navigate Open Cards, Centred Draggable Titles
created: 2026-10-19
completed: 2026-10-20
status: completed
categories: [board-ui, board-app, board-actions]
tracker:
---

# Open-Cards List and Container Title - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Go**: given 2026-10-19 · **Worktree**: run everything in
> `.claude/worktrees/open-list-title` (branch `feat/open-list-container-title`), never the main checkout

## Instructions for Agents

1. Read PLAN.md first, then previous task notes.
2. Respect the Wave column; reuse Shared Foundations and existing patterns; never copy code.
3. If you need to deviate, STOP and report.
4. Update your row and your notes section here when done; no git commits.
5. Page tests: `VB_TEST_PORT=4520` (so they never meet another checkout's tests), under this
   worktree's lock `temp/pages.lock`. The maintainer's board on 4466 is never touched.

## Task List

| # | ID | Wave | Model | Task | Status | Notes |
|---|-----|------|-------|------|--------|-------|
| 1 | FE_01 | 1 | strong | [Open-cards list from the "N open" chip](./FE_01_open-cards-list.md) | Completed | openList flag; MenuSelect shared with Containers; gallery screenshots below the toolbar section need a refresh (VERIFY_01) |
| 2 | FE_02 | 1 | strong | [Container title centred, sliding left, draggable](./FE_02_container-title.md) | Completed | Grid in place of the spacer (see notes) |
| 3 | VERIFY_01 | 2 | standard | [Final verification](./VERIFY_01_testing.md) | Completed | All criteria met; 14 spec baselines refreshed (sub-pixel); 3 findings below |

## Implementation Notes

### FE_01: Open-cards list
_Status:_ Completed (2026-10-20)  
_Notes:_ `openCards` beside `counts` (named so because `reads.ts` already has `openItems`, a different set);
`shell/MenuSelect.svelte` is the one dropdown pattern (Containers uses it; option words in `label`, name in
`aria-label`, so `#counts` keeps its text); `OpenChip.svelte`; `GoTo.to(n)`; flag `openList` (on). Gallery
samples sit in the toolbar section (no `main.ts` line). VERIFY_01: the samples move every gallery section
below the toolbar section by a sub-pixel, so those screenshots (and the full gallery) need one refresh
together with FE_02's. Native list keys can't be automated (see the task's notes). +1.06 KB gzip.

### FE_02: Container title
_Status:_ Completed (2026-10-20)  
_Notes:_ Algorithm changed (same behaviour): a CSS grid on a new `.vb-region-bar` (`minmax(0,1fr) auto
minmax(max-content,1fr)`) instead of a spacer with a measured `--tools-w`, which couldn't follow the
tools' zoom-driven narrow forms. Collapsed forms and far zoom start the line (`--region-lead: 0px`), so
zooming out only moves titles left. Label drag in `pointer.ts` `frameAt`; `.vb-region-handle` tint. Frame
screenshots refreshed on purpose (flag-retire, gallery, layout-controls, lock-board, parking-replies,
person-remove, send-access); the sub-pixel toolbar ones are left for VERIFY_01. New spec
`container-title.spec.ts`; APCA helpers now in `tests/pages/apca.ts`. 

### VERIFY_01: Final verification
_Status:_ Completed (2026-10-20)  
_Notes:_ PLAN's criteria all ticked, with evidence there. `npm test` 1567 pass; `check` 0 errors; `verify`
ok (3 old length warnings); page suite 561 pass + 27 screenshot-only failures before the refresh, then a
clean 589 pass. The refresh (28 PNGs, 14 specs: app-gallery, card-updates, chat, go-to-card, key-bubble,
open-folder, open-list, picker-archive, proposals, selection-pill, size, toolbar, versions, wires) was
checked diff by diff: text and edge anti-aliasing and 1px section heights only (details and the diffs in
the task file and `temp/v01/diffs/`). Walk on port 4540, light and dark, no console errors. Findings:
1. **Clipped slivers on a narrow frame at 70%** (`temp/v01/title-70-dark.png`, the frame "Second", about
   450px at 100%, with an agent holder): the title is cut to "SEC…" and the count and the holder show as
   clipped slivers ("(" and "· W") beside the tools. Never overlaps the tools, so the criterion holds;
   whether the slivers were there before the set is not established (no before shot of a narrow frame
   with a holder). The maintainer may want the count and holder to drop out whole.
2. **Untested doc claim**: components.md says a drag on the title of a past version pans. Checked by hand
   (the whole board moved with the pointer, ledger unchanged; `past.mjs`), but no test holds it
   (`container-title.spec.ts` and `containers.spec.ts` don't open a past version). A test is the smallest fix.
3. **Hover tint on the canvas reads Lc 0** in both themes (the grip's own look, reported not gated, as FE_02
   noted); the title on the tint is Lc 87.8 / 73.4, the grip dots 95.1 / 93.8. Fine by the tiers, only
   noted since the tint is barely visible on the canvas.
Also: the open list's own keys are the native select's. Walked in headless Chromium: Tab reaches it
("Go to an open card", 7 options), typeahead "6" and a pick select and focus the card, a click opens the
native popup (not drawn in a headless shot). Opening and arrowing the real popup is by hand only.
One doc wording fix: a long line in components.md's title paragraph rewrapped. Not flipped: this set's
frontmatter.

## On Completion

Frontmatter `status: completed`, `completed:`; one set LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Open-Cards List and Container Title → Task: [[cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/TASK-STATUS.md]]`
