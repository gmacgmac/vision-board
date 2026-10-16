# VERIFY_01_by-hand: By hand

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

See every ruling hold on a real board, light and dark, on a large and a small screen, with the
person's own hands (mouse, trackpad and keyboard), not only through the tests.

## Context

PLAN.md rulings 1-13. All six FE tasks have landed; read their notes first, including each "for the
maintainer" point.

## Steps

1. [x] A scratch project in the system temp folder with its own board server (not 4466; `HOME` and
   `VB_PROJECT` in the temp folder, `VB_KIRO_AGENT=0`), seeded from
   `packages/format/fixtures/roadmap.ledger.jsonl`, plus cards drawn over HTTP: a card taller than
   the screen, a one-card-wide container with a long title, a card with three notes and replies
   (one orphan), and a container with cards retired after the person answered them. Playwright's
   chromium at 1600x1000 and 1280x720, light and dark.
2. [x] **Colours (1, 3, 5)**: frames stand out from the canvas and a connector across a frame still
   shows; every kind selected, note and topic brighter than the rest; a hover box's border visible
   over the canvas and over a card. Measure the computed colours with `temp/apca-2b.mjs` `lc` and
   compare with PLAN.md § Token values.
3. [x] **Header (2, 9)**: zoom from 20% to 250%: titles stay one size and readable; the narrow
   container shows its marker, count and controls whole, the title in "…", the full title on hover
   and in the accessible name.
4. [x] **Notes (4, 6, 7, 8)**: hover your own short note, a cut note and one reply: each shows only
   itself; click note 2: the whole conversation, oldest first, scrolled to note 2; close with ×, Esc
   and a click outside; the pin opens the latest note; a new note lands at the bottom.
5. [x] **The board stays put (11, 12, 13)**: on the tall card, press ✓ (it ticks, nothing moves);
   click its note, size control and footer; switch to another app and back: nothing moves. Tab and J
   to an off-screen card bring it in. Z on one small card and on three cards: about 75% of the
   screen. ⌘+drag over card text, a note, an open hover tip and the open note bubble: the board pans,
   nothing gets selected or clicked.
6. [x] **Retired answers (10)**: press the marker: the past version shows the answers as at the
   retire ("N of N answered"), read-only; the toolbar's version list still shows each version as it
   was.
7. [x] Record findings in TASK-STATUS.md, numbered, with a screenshot name for each; a problem
   outside this set becomes a proposed tracker row (problem, example, solution or "unknown").

## Validation

- [x] Every step passes, or each failure is recorded with an example and its ruling number.

## Constraints

- Nothing in product code, tests, tokens or the skill changes in this task. If deviation is needed,
  stop and say so. No git commits. Never touch `.visionboard/`; don't use the board on 4466. Stop
  every server and browser you started.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-16), with problems recorded (items 8-16)

**Set-up.** One scratch board server on 4493 (`HOME`, `VB_PROJECT` in `$TMPDIR/vb-vrp/`,
`VB_KIRO_AGENT=0`, seeded from `packages/format/fixtures/roadmap.ledger.jsonl`, the built `dist/`, which was
newer than every source file); stopped after. A joined agent ("Claude Code chat polish") drew board
`polish` over HTTP: container "Tall card" (column, card 1, a decision with a 70-line body: 1,790-2,040px
tall at 100-118%), container "Release checklist for the spring launch and the press day after it" (column,
one card wide, cards 2-6), container "Pricing conversation" (grid, cards 7-13, one of every kind) and a link
13 → 1 across two frames. The person's acts went through a page's cookie (`/api/boards/polish/act`): ✓ 2,
✗ 3, ✓ 4, ✓ 5, Send; the agent retired 2-4 ("3 cards retired", v55, cut at seq 62). Card 7: note 1, reply,
an orphan reply (no `to`), note 2 (long, cut on the card), reply, note 3. Every later act was made on the
page itself (clicks, keys, the note bubble, Send); agent replies over HTTP as the joined agent. Repo
Playwright chromium, headless, 1600x1000 and 1470x956, light and dark, `reducedMotion: reduce`. Every page
run collected console errors and warnings, page errors and failed requests: none in any run. Scripts and
110 screenshots in `$TMPDIR/vb-vrp/` (`scripts/`, `shots/`); the screenshots named below were looked at.

**Results by step** (numbered for reply).

1. **Colours (rulings 1, 3, 5): pass, dark frames quiet.** Computed from the page, APCA (the `lc`
   arithmetic of `temp/apca-2b.mjs`), light / dark: frame `#b5b5bd` / `#4a4a52` on the canvas
   (`#f5f5f6` / `#111112`) 33.7 / 11.7; tip border on its box 39.7 / 10.8, on the canvas 33.7 / 11.7, over
   a card's 70% fill 37.9 / 11.2; selected, on the canvas: decision 87.2 / 66.7, question 86.3 / 72.3,
   finding 83.6 / 75.7, risk 83.3 / 72.1, action 82.2 / 79.0, topic 87.9 / 70.4, note 87.3 / 71.8. Same as
   FE_01's numbers (within 0.3); the PLAN's table is superseded by the maintainer's answers (by eye, one
   step), so no value is compared against it. By eye: light frames read as frames and the tip has a clear
   edge; selected cards (all seven kinds at once) are clearly deeper than unselected ones, the risk and
   action cards going brown. Dark: selected cards go pale pastel and stand out well; frames and the tip
   border are visible at 74-100% but quiet, and at 20-30% the frames nearly vanish (item 14). The link
   13 → 1 shows across both frames in both themes. Shots: `2-selected-all-kinds-light/dark.png`,
   `2-unselected-all-kinds-light.png`, `2-tip-light/dark.png`, `0-overview-1600-dark.png`,
   `3-roadmap-min-dark.png`.
2. **Header (rulings 2, 9): ruling 2 passes; ruling 9 fails in places** (items 8, 9). From 20% to 250%
   (15 steps, both sizes, both themes) every title is 14px high on screen, one line; at 20% the roadmap
   board reads "REVIEW", "PROVE TH…", "FORM…", "BUILD IN THIN SLICES" with counts. The narrow container's
   full title shows on hover (`3-header-hover-1600-light.png`) and is the heading text the region is
   labelled by and the grip's name. Below `FAR_K` the marker and tools leave the line, as built.
3. **Notes and the conversation (rulings 6, 7, 8): pass.** Card 7's notes and replies read oldest first
   on the card and in the window: note 1, its reply, the orphan reply (by time), note 2, its reply, note
   3. A click on note 2 opens "Conversation on 7" (all six entries) scrolled to note 2 (scrollTop 324 of
   335) with focus on it; note 3 (the latest) opens at the bottom (335 of 335); the orphan reply opens
   scrolled to it (212), focus on it; Enter on note 1 opens at the top. × (top corner, no bottom row),
   Esc and a click outside each close it; focus goes back to the note; the board's transform never
   changed. The pin (4) opens "Note 3 on 7, sent" with an ×. A note added with C lands at the bottom on the
   card and in the window ("YOUR NOTE 4", Edit). Hover: the cut note 2 shows a tip with only its own text;
   a long reply shows only itself; a short note and a short reply, whole on the card, show no tip (item
   15). Same results at 1470x956 dark. Shots: `4-convo-note2-1600-light.png`,
   `4-convo-added-1470-dark.png`, `4-reply-tip-1470-light.png`, `2-tip-light.png`.
4. **The board stays put (rulings 11, 12, 13): pass, with items 12 and 13.** At 1470x956 light and
   1600x1000 dark:
   4A. A click on a card's title, footer and size control on a card partly off screen: no pan.
   4B. Card 1 (2,041px tall at 118%; 1,790px at 104%), its top above the stage, its footer on screen: a
       press on ✓ ticks it (`acknowledged`), the board and the button stay exactly where they were; a
       click on its footer moves nothing (`5-tall-ticked-1470-light.png`). Its size control was above the
       stage, so not clicked there (done on card 9 in 4A).
   4C. J from card 12 to card 13, wholly off screen: focus on 13 and it is panned fully in. Tab inside
       card 13 (to its size control) moves nothing. Tab from card to card was not tried by hand.
   4D. Z on three cards (9, 11, 12): 75% of the height, centred; three in a row: 75% of the width; two
       far apart: 75% of the height; card 7 alone (tall): 74%. Z on one small card goes to 250% (the cap)
       and fills 44-48% of the width, 24-25% of the height (item 13).
   4E. Cmd + drag from card 7's title, a note, a reply, an open hover tip and the open conversation pans
       by exactly the drag (e.g. -140, -90), selects nothing, selects no text, opens nothing; the
       conversation stays open; the hover tip closes once the pan starts (item 12). Held still, Cmd
       click adds a card (8, 9 selected).
   4F. **Switching away and back** (see "What could and could not be proven" below): with a clicked
       card, a keyboard-focused card panned half off screen, and the tall card focused, another tab
       brought to the front and then this one again: `document.hasFocus()` false while away, the same
       card focused after, the board's transform unchanged, all three cases, both sizes.
5. **Retired answers (ruling 10): the data passes, the eye does not** (item 10). The marker "3 cards
   retired" opens v55 read-only ("Viewing v55 from Oct 16, 04:51 AM · read-only"): cards 2 ✓, 3 ✗, 4 ✓,
   5 ✓ in `data-status`, `aria-pressed` and the names ("…, checked", "…, crossed"); the container count
   "4 of 4 answered", the toolbar "4 answered". A and X there write nothing to the ledger. Back to now,
   then v55 from the toolbar's dropdown: every card open, "0 of 4 answered", as at that version. Esc
   ends the past view. Same in dark at 1470x956. Shots: `6-marker-past-1600-light.png`,
   `6-past-narrow-rest-light.png`, `6-now-narrow-rest-light.png`, `6-dropdown-past-1600-light.png`.
6. **With agent (single task): pass; see item 11.** Card 8 open → a note with C:
   footer "With agent", name "…, With agent", header "2 open · 2 with agent · 1 answered" (before Send
   too); after Send unchanged; the agent's reply to the note → footer "Open", tab "1 update", name
   "…, Open, 1 unseen update", header "3 open · 1 with agent". The agent's reply to card 7's latest note
   took the last one back: the "with agent" chip left the header ("4 open · 1 answered · 0 later").
   At the API edge, a note on card 11: `show_node` and `list_open` say `with-agent`. Shots:
   `wa-1-noted-light.png`, `wa-2-replied-light.png`, `with-agent-toolbar-1470-light.png`.
7. **Go to card (single task): pass.** 1470x956 light and 1600x1000 dark: "1" opens the box (bottom
   right, field focused, "1"), "2" → "12", Enter: card 12 (off screen) selected, focused, panned in, the
   zoom unchanged, box closed; 1 1 Enter with card 11 on screen: no pan. 9 9 Enter: "No card 99", box
   open; Backspace → "9"; Esc closes, focus back on card 11. 2 Enter (retired): "Card 2 was removed" and
   "Show v55" (named "Show v55, where it last appeared"); pressing it opens v55 with card 2 selected,
   focused and on screen. H, then 5 Enter: "Card 5 is hidden with the answered cards (H shows them)", box
   open. Shots: `go-1-typing-1470-light.png`, `go-4-retired-1470-light.png`,
   `go-5-retired-shown-1470-light.png`, `go-3-no-card-1600-dark.png`.

**What could and could not be proven (switching windows, item 4F).** Headless chromium (the
headless shell Playwright uses by default) fires no blur or focus when another tab comes to the front,
and Playwright emulates focus for every page, so the first probe saw nothing. With the full chromium in
its new headless mode (`channel: 'chromium'`) and `Emulation.setFocusEmulationEnabled` off (CDP), a second
tab brought to the front gives this page a real `blur` with `document.hasFocus()` false, and bringing it
back a real `focus`, from the browser, not synthetic events. Proven: the window losing and getting back
focus, as a tab switch, moves nothing and keeps the focused card. Not proven: switching to another
application through the operating system (Cmd+Tab), a minimised window, `visibilitychange` (the page stayed
"visible" in headless), and the click that brings a window back landing on the board.

**Problems found** (numbered for reply; each with its ruling and an example).

8. **Ruling 9 (FE_02): the count is cut or gone far beyond "the narrowest frame", and a holder stub
   stays.** Because the top line keeps its on-screen size, a one-card frame's line widens with the zoom
   and the full mode row (285px) comes onto it. Measured (1600x1000 and 1470x956, both themes): the narrow
   container (one card, marker "3 cards retired") has its count hidden or cut at every step from 86% to
   178% ("1 of …", 41px; whole only at 50-72% and from 214%), the title at its three-letter floor "REL…".
   The one-card "Tall card" container (an L card, 450-540px on screen, **no marker**) at 87%: "TAL… ( · C"
   (count cut to a sliver, title "Tall card" cut to "TAL…"), at 104%: "TAL… 0 of 1 answer… · C". In both,
   a holder stub "· C" (24px) stays while the count goes, which reads as noise. In the past view at 83%
   the count, the one place the answers show (item 10), reads "4.." (`6-marker-past-1600-light.png`).
   FE_02's deviation names only the 336px frame at 100% with a marker. Shots:
   `3-tall-head-k0.87-light.png`, `3-tall-head-k1.04-light.png`, `3-header-1600-light-k1.03.png`.
   Solution: FE_02's options (b) or (c), plus: a holder gives way whole (no stub), and the mode row takes
   its collapsed form whenever the line is crowded, not by the line's width alone.
9. **Ruling 9 (FE_02): the mode row covers the retired marker at about 150%.** Narrow container,
   1600x1000 light, 150%: marker at x 415-506, tools at 492-777 (both drawn whole, overlapping by 14px):
   it reads "3 cards retir" under the row. Same at 1470x956 dark, 149%. The tools are always shown
   (opacity 1), not only on hover. Shots: `3-overlap-narrow-k1.50.png`, `3-header-1470-dark-k1.49.png`,
   `3-header-1600-light-k1.49.png`. Solution: the same as item 8 (the row collapses before it meets the
   label), plus a page test at 150% with a marker.
10. **Ruling 10 (FE_06): the past view's answers are right but invisible on the cards.** In a read-only
    past version the cards' act row is `visibility: hidden`, and a checked or crossed card has no footer
    word, so cards 2 (✓), 3 (✗) and 4 (✓) look exactly like open cards; the answers show only in the
    container count ("4 of 4 answered", cut to "4.." at 83%, item 8), the toolbar ("4 answered") and the
    accessible names. Compare `6-past-narrow-rest-light.png` (past: no marks) with
    `6-now-narrow-rest-light.png` (now: card 5's lit ✓). The page test checks `data-status` and the
    count, not what shows. Not established whether this predates FE_06 (the dropdown's past view hides
    the act row the same way). Solution: in a past view, show the pressed ✓ or ✗ (inert, not a button),
    or a footer word ("Checked", "Crossed") on answered cards.
11. **With agent (single task): on a toolbar of 1500px or less (MacBook Air included) "board updated"
    and "with agent" are twin pink chips.** The narrow toolbar shows numbers only (`[data-narrow]`, by
    design since before), and the two chips share the background (`#fde7f4` light, `#2e1726` dark) with
    almost the same text colour (`#d4138a` / `#c81784` light, `#ff5cbe` / `#ff66c2` dark): "1 3 1 1 0"
    with the first and third identical (`with-agent-toolbar-1470-light.png`). Only the title tooltip
    tells them apart. Solution: a distinct tone for "with agent" (the agent's colour, `--vb-agent`,
    olive), or an icon on the chip in the narrow form.
12. **Ruling 13 (FE_05): Cmd + drag from an open hover tip pans, but the tip closes as soon as the pan
    starts** (open after the press, closed mid-drag, `tipdrag.mjs`). `select.spec.ts`'s test title says
    the tip "stays open"; it asserts that only for the bubble and the popover. For the maintainer: keep
    (a hover box belongs to the pointer) or make it stay.
13. **Ruling 12 (decision 4): Z on one small card cannot reach 75%.** It stops at the 250% cap: card 9
    fills 44% of the width at 1600x1000 and 48% at 1470x956. As designed (the cap is in decision 4);
    named because the ruling says "one card or several". A tall card (card 7) gets 74%.
14. **Rulings 1 and 5 (FE_01, known): in dark the frame and tip border are quiet** (Lc 11.7 and 10.8).
    By eye: visible at 74-100%, nearly gone at 20-30% (`3-roadmap-min-dark.png`, `0-overview-1600-dark.png`),
    where frames matter most. Already raised by FE_01; confirmed on a real board.
15. **Ruling 6, hover half (ruling 4 dropped): a short note or reply shows no tip.** Hovering note 3
    ("OK, last one: who tells support?") or the first reply, both whole on the card, opens nothing;
    the cut note 2 and a long reply each open a tip with only their own text. That is
    `bindNoteTip`'s cut-text rule, unchanged since the maintainer dropped ruling 4; named so the
    maintainer can confirm that is what he saw.

**Proposed tracker row (outside these tasks; the tracker is not edited here).**

16. | N43 (number to assign) | The selection pill covers content | **Problem:** the "N selected" pill sits
    over whatever is under it. **Example:** "7 selected" over the container's count "0 of 3 answe…"
    (`2-selected-all-kinds-light.png`); "1 selected" over card 3's title in a past view
    (`go-5-retired-shown-1470-light.png`). **Solution:** place it in free space beside the selection
    (above the topmost card, clear of a container's top line), or unknown. |

**Seen, no action proposed.** At 20% a cut title keeps the count beside it ("FORM… 0 of 3 answered"),
FE_02 item 4's note. The focused card's connector draws over other cards (card 7's text), as D-032 says.
Not covered: Tab from card to card, the container conversation, the chat panel, and "Still open:" in the
Send message for with-agent cards (the with-agent task's interpretation 3).

**Files**: this task file, TASK-STATUS.md (row and section), `cortex/LOG.md` (one line). Nothing in
product code, tests, tokens, the skill, the tracker or the repo's `.visionboard/` changed. Scratch server
stopped (the other `apps/board/server.ts` running, with `VB_WATCH=1`, started at 04:26, is not mine and
was left alone); no browser of mine left.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] VERIFY_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/VERIFY_01_by-hand.md]]`
