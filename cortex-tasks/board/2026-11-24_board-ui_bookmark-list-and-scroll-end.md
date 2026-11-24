---
task_name: "N bookmarked" lists the bookmarked cards; a scroll that reaches a box's end stops there
created: 2026-11-24
completed: 2026-11-24
status: completed
categories: [board-ui]
type: implementation
model: strong
persona: Interaction engineer — a list behaves like its siblings to the key, and a trackpad flick never moves anything the person did not aim at.
skills: [cortex-architecture]
tracker:
---

# Task: "N bookmarked" lists the bookmarked cards; a scroll that reaches a box's end stops there

---

## Problem

1. **Bookmarked list.** The toolbar's "N open" and "N new" chips open a menu dropdown of their cards and go to the
   one chosen (`apps/board/src/board/chrome/OpenChip.svelte`). "N bookmarked" (`BookmarkedChip.svelte`, cardBookmark
   flag) is a button that steps to the next bookmarked card; it lists nothing.
2. **Scroll end.** Over a note bubble's conversation (`.vb-nb-thread`), a trackpad flick that reaches the bottom
   carries on: the momentum pans the board. Maintainer: "that momentum must basically be killed by the time it gets
   to the bottom or reached the extents."

## Why the earlier fix fails (part 2's finding)

The earlier fix is the wheel latch (`apps/board/src/board/input/wheel-latch.ts` `createWheelLatch`, wheelChaining
flag, FIX_04/FIX_05): a gesture keeps the target its first moving event found until a quiet gap (`WHEEL_GAP`), and
`overscroll-behavior: none` on `.vb-stage *` (`board.css`) stops the browser's own chaining. `overscroll-behavior`
was never the gap: the board pans from its own wheel handler (`pointer.ts` `bindPointer`). The latch fails because
two rules end the gesture early, and either then re-finds a target at the box's end, gets none, and pans the rest:

1. **A "rise" ends it** (FIX_05, point 485): after a run of `DECAY_RUN` non-rising events, any event `RISE` times the
   slowest of the run is read as a fresh push. A trackpad stream rises inside one gesture all the time: fingers that
   slow and speed up again while reading, the momentum's start after the fingers lift, and two frames' events
   coalesced into one when the page is busy. A zero-delta event inside the run also drops the floor to 0, so any
   later event of 3px "rises". The synthetic flick in the tests decays smoothly, so they never saw it.
2. **A redraw can end it** (a second hole, closed too; not shown to be the maintainer's case): the latch re-finds when
   its target leaves the page (`isConnected`); the bubble redraws its markup when a reply lands (`vb-note-bubble.ts`
   `held`), so a gesture over a thread being redrawn re-found at the end and panned.

Proven in Chromium with real wheel events (`scroll-before-pan.spec.ts`, the new flick test run against HEAD's latch):
the board moved 477px during the tail after the thread reached its end.

## Rulings (from the brief)

1. "N bookmarked" opens the same dropdown as "N open" and "N new", the same code (OpenChip, MenuSelect), the same
   keys; choosing a row goes to the card as they do (`go.to`). No new component. With no bookmarks the chip does what
   it does today (it is not drawn). Page-only: bookmarks never reach an agent.
2. One wheel gesture that starts in a scrollable box stays with it; at the top or bottom the rest of that gesture is
   swallowed, not passed to the board's pan or zoom. A new gesture after a short pause behaves normally. One shared
   helper for every scrollable box on the board. A page test holds it.

## Plan (how it meets `docs/principles.md` and the `cortex-architecture` skill)

**Part 1, the bookmarked list**
- **Reuse the pattern**: OpenChip already is the "lists cards, goes to one" chip for two lists; it gains an optional
  `icon` (a `ButtonIcon` name drawn before the count, as BookmarkedChip draws it). The toolbar and the "⋯" row
  (`HeaderFields.svelte`) draw OpenChip with the bookmarked cards, tone `bookmark` (board.css styles the glyph).
- **Data**: the status gains `bookmarkedCards: RowCard[]` (the find module's row shape, as `openCards` and
  `freshCards`) in place of the `bookmarked` count; `bookmark-flow.ts` gains `bookmarkedCards(view, bookmarks)`
  beside `bookmarkedIds`; `toolbar-counts.ts` `showCounts` sets it. The count is its length.
- **Going**: the row's pick calls `onopen`, the one finding path (`go-to-card.ts` `to`): a card hidden by Hide
  answered says so in the go box, as the other lists do.
- **No flag** (maintainer, via the starting session: "this should not be behind a flag. Just make it active"): the
  list replaces the stepping chip; its `next`, `nextBookmarked`, `onbookmarked` and their words and tests go.
- **Words**: the dropdown's name and tooltip in `apps/board/src/board/words/toolbar.ts`.
- **Gallery**: `bookmark-section.ts` draws the chip as the list (its states: rest, hover, focus, pressed, as
  `open-list-section.ts`).

**Part 2, scroll end**
- **The one helper stays the latch** (`wheel-latch.ts`), which already serves every scroller under the stage
  (`scrollerIn`: note bubble, history and proposal boxes, menus on the board): no per-panel code.
- **A gesture ends only at a quiet gap** (`WHEEL_GAP`): the rise rule is removed. This reverses FIX_05's "a fresh
  push during the tail pans at once" (point 485): a push with no pause is swallowed with the tail. Raised to the
  maintainer.
- **A scroll gesture never turns into a pan**: when its target leaves the page, it re-finds, and finding none it
  stays swallowed.
- **Zoom too**: Ctrl/Cmd during a scroll gesture is swallowed (default prevented, no zoom); a gesture that starts
  with Ctrl/Cmd zooms as today.
- **Outside the stage** (the chat side panel, toolbar menus): no board wheel handler sees them; checked in a browser
  that their end moves nothing.
- **Tests first**: unit (`wheel-latch.test.ts`: a rising trackpad stream, a coalesced frame, a zero in the tail, a
  redraw mid-gesture, a pause then pan); page (`wheel-chaining.spec.ts`: scroll the thread to its end, more wheel
  events in the same gesture, the world's transform unchanged; a pause, then it pans).

## Done

Every state; axe and contrast light and dark; the tests above plus the bookmark and header tiers page tests; the
gallery entry; a look in a browser in light and dark. `VB_TEST_PORT=4966`.

## Outcome

**Part 1.** `BookmarkedChip.svelte` is now OpenChip (which gains `icon`) with the bookmarked cards, in the bar and as
the "⋯" row (`HeaderFields.svelte`). The status's `bookmarked` count became `bookmarkedCards` (`OpenCard[]`,
`bookmark-flow.ts` `bookmarkedCards`, the flow's `cards`). A choice goes through `onopen` (`go.to`), the open and new
lists' path. Removed: the stepping chip (`next`, `nextBookmarked`, `bookmarkedIds`, `bookmarkedWords`, `Board.nextBookmarked`
and `BoardControls`' entry, `onbookmarked`, the words `bookmarkedGoToTheNext`, `theBookmarkedCardsAreHidden`). Words:
`chrome-go-to-card.ts` `goToABookmarkedCard`, `bookmarkedChooseOneTo`. `header.css`: the list's face still counts as a
chip that comes and goes in the 1400px and 900px rules (`read-only.spec.ts` long names fit at 1470px). Gallery:
`bookmark-section.ts`, the list at rest, hover, focus, pressed, the section's height unchanged so no later baseline
moves. Tests: `bookmark-flow.test.ts`, `bookmark-retire.spec.ts` (list by keyboard, a choice goes and writes nothing,
last bookmark off hides the chip), `header-tiers.spec.ts` (the "⋯" row is the list). Page weight 215.39 KB gzip (HEAD
215.91): no budget change.

**Part 2.** `wheel-latch.ts` `createWheelLatch`: only `WHEEL_GAP` ends a gesture (the rise rule, `DECAY_RUN`, `RISE`,
`RISE_PX`, `WOBBLE` removed); a disconnected target re-finds and keeps the old box when nothing is found. `pointer.ts`:
the latch is asked for Ctrl/Cmd events too (a gesture that starts with them finds nothing and zooms); Ctrl/Cmd inside a
box's gesture is default-prevented and does nothing. Tests: five new `wheel-latch.test.ts` cases (all failed on HEAD),
`scroll-before-pan.spec.ts` flick test (failed on HEAD by 477px). The chat side panel and toolbar menus sit outside the
stage: no board wheel handler hears them and the page cannot scroll (body `overflow: hidden`, document height equals
the window), so their end moves nothing; no change needed. Docs: `components.md` § the wheel; flag descriptions.

**Reversed:** FIX_05's "a fresh push during the tail pans at once" (point 485): now a push with no pause is swallowed
with the tail.

**Found, not fixed:** `apps/board/tests/plugin-build.test.ts` "the bundles stay inside their budgets" fails at HEAD
(`view/board.js` 211,241 gzip over 209,800); this branch brings it to 210,350, still over.
