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

- [x] Review lists the proposals; choosing one shows it on the board with its box open; marks kept
- [x] Gallery entry; flag off = today

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

One unmet dependency, a `REQUEST` for the orchestrator: `shell/App.svelte` still reads
`onreview={() => board?.proposals.review()}` (SEARCH_02's file). It must become
`onreview={(n) => board?.proposals.review(n)}`, or a row chosen from the list goes to the first card.

### Changes Made
- `board/find/finder.ts` (+ `index.ts`): `proposalRow` (the row "12 · title · what it proposes", title and proposal each cut at `PROPOSAL_ROW_MAX`, whole in the tooltip) and `reviewRows` (a row per card, newest proposal, card order; none for one card or without titles).
- `shell/ProposalsBar.svelte`: Review is `MenuSelect` with a face (the open list's pattern) when `reviewRows` has rows, else the button as before; `onreview(n?)`; focus back to the list on show.
- `board/cards/proposal-flow.ts`: `review(n?)` goes `d.go(n)` (`go.to`, FIND_01's find path), zooms in with `vp.fit` (half the stage, up to 100%) and then to `FAR_K` when the board is below where controls show, then opens the tab. The rows carry the card's `title` (`ProposalRow.title`, optional) only with the flag. Flag off: today's code path.
- `shell/words/shell-proposals.ts`: `reviewACardWithAProposal`, `reviewChooseOneTo`. `styles/proposals.css`: the face drawn as the small button, the select over its border.
- Gallery: section `reviewList` ("Review list": the notice at rest, with Review focused and the list drawn as an open list box), last of the gallery (`main.ts` line), light and dark baselines (new).
- Tests: `apps/board/tests/review-list.test.ts` (rows, the flow); `tests/pages/proposals.spec.ts` (one card goes straight; a 37-card board zoomed out with three proposals, the NEW one off screen: the rows, the choice, the view, the box and focus, NEW kept, no seen line; Esc chooses nothing; flag off = today; the gallery section, axe, screenshots); `proposals-notice.spec.ts` (Review is a button or the list).
- Failing first: with `reviewList` defaulted off the three new Review tests failed (a button, no list, no go, no zoom); on, they pass.

### Caught Beyond the Brief
- Go to card does not zoom (it pans by `revealPan`), so "zooms in as Go to card does" is new here: only Review zooms, only when the stage is "far" (`hideFar` and `isFar`).
- With the list, `Review` is a combobox when proposals are on two or more cards; the notice specs found it by button role. Updated to find either (`reviewOf`).
- Files touched beyond the list (no wave 2 owner): `controller.ts` (the flow's deps), `cards/proposals.ts` + `cards/index.ts` (`proposes`, the one "Cross: reason" line Accept all also uses), `packages/actions/src/answers/proposal-rows.ts` (`ProposalRow.title?`), `find/index.ts` (two exports), `gallery/main.ts` (one line, last), `styles/proposals.css`, `tests/pages/__screenshots__/proposals.spec.ts/review-list-*`.
- `verify` fails only on `docs/specification/modules.md` (out of date: `npm run map`, the new `board/find` exports).

### Deviations from Plan
- None. (Page specs ran in a scratch copy of the worktree with the one `App.svelte` line applied, since that file is SEARCH_02's; the scratch copy is deleted. In this tree the page specs for the list need that line.)

## On Completion

Notes; your row; one LOG line (`[board-app] REVIEW_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
