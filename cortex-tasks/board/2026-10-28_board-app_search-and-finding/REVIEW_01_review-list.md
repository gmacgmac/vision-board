# REVIEW_01_review-list: Review opens a list

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The proposals notice's Review opens a list of the cards with proposals, like the open and new lists;
choosing a row goes to that card and opens its proposal box, so the person sees it on the board.

## Context

Today `cards/proposal-flow.ts` `review()` opens the first proposal card's box with `preventScroll`
and never moves the board, so on a large or zoomed-out board nothing seems to happen (ruling 319).
Going uses FIND_01's finding path, so a card found keeps its NEW and updated marks (322). Behind a
new flag `reviewList` (default on).

## Inputs

- **Files to modify**: see TASK-STATUS.md File Ownership (REVIEW_01)
- **Files to reference**: `shell/MenuSelect.svelte` and the open list (`board/find/finder.ts` `openRow`,
  `shell/OpenChip.svelte`), FIND_01's go path (Shared Foundations), `packages/actions` `proposalRows`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** (`tests/pages/proposals*.spec.ts`, 5500): a board bigger than the screen,
   zoomed out, three cards with proposals, one off screen. Review shows a list of three rows ("12 ·
   title · what it proposes", in card order); choosing the off-screen one brings it into view at a
   readable zoom, opens its box, focus in it; its NEW mark stays. Esc closes the list. See it fail.
2. **The list**: reuse `MenuSelect` and a `MenuRow` helper in `finder.ts`; words in
   `shell/words/shell-proposals.ts`. One proposal: Review goes straight to it (no one-row list).
3. **Going**: `proposal-flow.ts` `review(n)` goes through FIND_01's path, then opens the box. If the
   board is zoomed out past where controls show, it zooms in as Go to card does.
4. **Gallery**: the notice with the list open, light and dark (new baselines only).
5. **The flag** `reviewList` is already in `flags.ts` (the orchestrator's); read it from there, and change only its description if what you built differs.
6. **Checks**: unit, `check`, `verify`, `gen-api --check`, `proposals*` page specs on 5500.

## Validation

- [ ] Review lists the proposals; choosing one shows it on the board with its box open; marks kept
- [ ] Gallery entry; flag off = today

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-app] REVIEW_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
