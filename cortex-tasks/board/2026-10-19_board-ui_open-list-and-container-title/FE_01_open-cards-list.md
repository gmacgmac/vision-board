# FE_01_open-cards-list: Open-cards list from the "N open" chip

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) § Proposed Solution 1

## Objective

Pressing the toolbar's "N open" chip lists the open cards by number and title; choosing one goes to it.

## Inputs

- **Files**: `packages/actions/src/board-state.ts` (an `openItems(view, s)` beside `counts`; `counts.open`
  reads it so the two can't disagree), `apps/board/src/board/toolbar-counts.ts` (`shell` gets the rows),
  `apps/board/src/shell/Toolbar.svelte` (the chip becomes the control), `apps/board/src/board/finder.ts`
  and `go-to-card.ts` (reuse: the dropdown pattern and the go-to), `apps/board/src/styles/board.css`,
  the toolbar gallery section, `docs/specification/components.md` (toolbar)
- **Patterns**: the Containers finder (one dropdown pattern for both — widen it, don't copy it);
  Go to card's arrive (select, focus, reveal); `.kiro/steering/svelte-conventions.md`
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

## Steps

1. [x] Tests first: unit test for `openItems` (same set `counts.open` counts); page test: the chip
   opens a list "N · title" in board order, choosing one focuses and reveals the card, keyboard
   (open, arrows, Enter, Esc), axe light and dark; nothing open → plain chip.
2. [x] Build: rows from `openItems`, cut long titles in the control's width with the full text
   available (title or the option text), chip look kept (tone "open"), all control states.
3. [x] Works in a past version (reading, not acting) the way the Containers finder does.
4. [x] Docs, gallery entry, APCA check; report the gzip delta (200 KB start budget, D-049).

## Validation

- [x] Tests pass; `npm test`, `npm run verify` pass

## Constraints

- Only your files (PLAN.md § Dependencies); FE_02 runs in parallel in `packages/ui/src/region/*`,
  `pointer.ts`, `container-drag.ts`. `controller.ts`, `fold.ts`, `io.ts` are over 300 lines: don't grow them.
- Page tests with `VB_TEST_PORT=4520` under `temp/pages.lock`. Never touch port 4466. No commits.
- Bash working directory, never `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed (2026-10-20)

- **One definition of open.** `packages/actions/src/board-state.ts` `openCards(view, s)` (cards that need
  an answer and have none, not Later, not with the agent; board number order); `counts.open` is its
  length. Named `openCards`, not `openItems`: `openItems` already exists in `reads.ts` (the agents'
  `list_open`, a different set: it keeps owed cards). Exported with `OpenCard`.
- **One dropdown pattern.** `apps/board/src/shell/MenuSelect.svelte`: the Containers finder's native
  select, widened (name row, `onpick`, back to its name; optional `face` snippet the select lies unseen
  over, `.vb-menu-face` / `.vb-menu-over` in `styles/board.css`). The Containers finder now uses it
  (same id, name and behaviour). Words go in each option's `label` and the name in `aria-label`, so the
  select adds no text to the counts' live region (`#counts`; found by `answer-model.spec.ts`).
- **The chip.** `shell/OpenChip.svelte`: a MenuSelect over the chip face ("Go to an open card"), tone
  "open", hover/pressed like the flagged chip, focus ring drawn by the chip; plain chip with nothing
  open or the flag off. Rows: `finder.ts` `openRow` ("12 · title", cut at `OPEN_ROW_MAX` 60 with "…",
  whole in the option's `title`); the cut is `board/clip.ts` `clip`, promoted from `chat-bridge.ts`.
- **Going.** `go-to-card.ts` `GoTo.to(n)`: Enter's path for a number chosen elsewhere (select, focus,
  `revealPan`), so the controller did not grow; `App.svelte` `onopen={(n) => board?.go.to(n)}`. Past
  versions work (reads `versions.state`), nothing sent.
- **Flag** `openList` (on by default: the maintainer asked for it; `?flags=-openList` gives the plain chip).
- **Gallery.** Samples in the toolbar section (`gallery/open-list-section.ts` `openListGroups`, appended
  by `toolbar-section.ts`; no line in `main.ts`): rest, hover, focus, pressed, narrow, nothing open.
  `toolbar.spec.ts`'s toolbar screenshot now loads `?flags=-openList` so its picture is unchanged.
- **Docs.** `components.md` § Navigation item 2 (MenuSelect) and new item 7.
- **APCA** (measured on the gallery samples): words Lc 84.8 light / -70.5 dark, number 95.1 / -93.8,
  hovered 88.7 / -91.9, focus ring 72.0 / -47.7 (tiers 60 / 30 met).
- **Weight:** board page 150.60 KB -> 151.66 KB gzip (+1.06 KB; budget 200 KB, D-049).
- **Tests:** `packages/actions/tests/open-cards.test.ts`, `apps/board/tests/open-list.test.ts`,
  `go-to-card.test.ts` (`to`), `tests/pages/open-list.spec.ts` (list, choice off screen, keyboard reach,
  cut title, nothing open, past version, flag off, gallery samples + screenshots); `finder.spec.ts`
  reads option labels.
- **Known limits.** The list's own keys are the native select's: Playwright cannot drive a native
  popup (keys go to it unseen), so keyboard open/arrows/Enter/Esc are not automated; checked: Tab reach,
  named combobox, options, a choice. On Windows/Linux, arrows on a closed select choose at once (as the
  Containers finder already does); on macOS they open the list.
- **Screenshots to refresh in VERIFY_01.** The samples add 374.2 px to the toolbar gallery section, so
  every gallery section below it moves by a sub-pixel and its screenshot shows text anti-aliasing diffs
  (go-to-card, app-gallery, lock, archive, remove, flag-retire, layout-controls, open-folder, the full
  gallery). FE_02's region work shifts the ones above too, so they are left for VERIFY_01 to update once.

## On Completion

Fill the notes; update your row and notes in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/FE_01_open-cards-list.md]]`
