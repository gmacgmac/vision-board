# T_02 — Link labels in the gap, never a bare dot

Model: strong · Skills: cortex-architecture · Ruling: PLAN § Decisions 3

## Objective
A link's label shows as a word on or beside its line wherever the gap allows; only a label that fits nowhere becomes
a short tag with the rest on hover; print draws every label whole. Cards never move.

## Inputs
`packages/layout/src/route/labels.ts` (`placeLabel`, `markerAt`, `labelSize`), `route/route.ts` (`labelAt`),
`packages/layout/src/types.ts` (`LabelPlace`), the page's `apps/board/src/board/links/link-labels.ts`,
`link-marks.ts`, `apps/board/src/styles/board.css` (`.vb-wire-tag`, `.vb-link-mark*`), `apps/board/src/styles/print.css`
(T_04 edits it in wave 2: put any print rule you need in a REQUEST unless it is a one-line addition you name),
words `apps/board/src/board/words/cards.ts`; the mockup `design/mockups/link-labels/`; the layout's tests and the
link page specs; the gallery's link-labels section.

## Steps
1. Layout stays pure: after "on a straight piece", try just above and just below each piece (inside the gap,
   clear of cards and earlier labels), then centred on an upright piece; deterministic, in link order.
2. The fallback is a short tag (first words, ellipsis, hairline border) in the marker's place with the same hover,
   focus and name as today's marker (WCAG 1.4.13, 2.5.8 target), never a bare dot.
3. Print: every label whole (the short tag shows the full words, wrapped if it must).
4. Tests (layout units for each placement; page specs for the tag, hover and print); gallery states light and dark.
   Look at it in a browser yourself on your port.

## Validation
`npm run verify`, `npm test`, the changed page specs pass; renewed baselines named.

## Constraints
Own files only; others are REQUESTS. No git command that changes state.

## Implementation Notes

**Status**: Completed 2026-11-20 (sub-agent, worktree `flp-labels`).

- **Contract first**: `LabelPlace` (`packages/layout/src/types.ts`) gains `short?: string`, the short tag's words when
  `fits` is false. `placeLabel` (`route/labels.ts`) now takes a `LabelRoom` (`cards`, `taken`, `lines`) and the two
  cards' boxes; `routeLinks` (`route/route.ts`) routes every line first, then places labels in link order.
- **Order** (`route/labels.ts`): 1 `onPiece` (unchanged); 2 `inGap`, just above then below each level piece, its middle
  first, inside the box round the two cards, `CLEAR` 4px from cards, clear of the arrowhead (`arrowOf`) and of every
  line incl. its own (a canvas tag must not hide a line); 3 `inGap`, centred on each upright piece, clear of the
  other lines and the arrowhead; 4 `shortTag`: the longest of `tagWords` (first words + "…", down to the first word,
  cut past 10 characters) whose target (`tagSize`: its width, at least 24, by 24) fits on the first half of the line;
  else the shortest at the first point. Cards never move; pure and deterministic.
- **Page** (`links/link-marks.ts`): the marker is now a short tag button (`.vb-link-short` on screen,
  `.vb-link-whole` on paper), same name (`linkFromTo`), same shared hover tip, 24px target. Words that the font runs
  wider than `labelSize` are closed up by letter-spacing (`fit`), as `fitLabel` squeezes SVG labels.
- **Print**: kept out of `print.css` (T_04's): board.css `@media not print` hides the whole label, `@media print`
  hides the short words, so every tag prints whole, wrapped at 10em. No change to `print.css`.
- **Gallery**: the fixture ledger's `labels` container gains link 3 > 4 "feeds" (seq 386) so one sample shows every
  place: "feeds" on its upright, "next" just above its short level piece, "when a note fits no theme" centred on its
  upright, "once every note has been read" as the tag "once…"; the second sample opens the tag.
- **Tests**: `packages/layout/tests/labels.test.ts` (one test per place, tag words, fallback, target spacing);
  `tests/pages/layout-controls.spec.ts` (gallery tag, hover, focus, Esc, target, words fit; print shows the whole
  label wrapped). Baselines renewed: `link-labels-{dark,light}-darwin.png` (the change itself);
  `alignment-{dark,light}-darwin.png` and `card-widths-{dark,light}-darwin.png` (sections below moved by the taller
  link-labels section: 1px height and antialiasing only).
- **Looked at**: gallery in light and dark, the tag hovered, and print emulation (headless Chromium, port 6111,
  temporary HOME).

### Caught Beyond the Brief

- ~~A straight link between stacked cards never gets a word~~: closed by the orchestrator's follow-up below.
- A card's hanging marks (the kind pill on a card's top edge, the note button under it) are not in the layout's card
  boxes: labels keep clear of the boxes only. In the stacked sample the kind pill already hides the arrowhead
  (existing, not from this task); "unblocks" clears both.
- A short tag of one word cut to its first word ("once…") says little; the hover tip and print carry the rest.
- `npm run verify`: the board page is 213.3 KB gzip against a 212.4 KB budget (budgets do not block; budget files
  are the orchestrator's). board.css is 301 lines (warn).
- Stale words outside my files: `packages/format/src/flags.ts` `linkLabels` description, `apps/board/README.md`
  (links paragraph) and `packages/layout/README.md` (router paragraph) still speak of a marker / "near the source"
  only (REQUESTS).

### Follow-up (orchestrator, same day): beside an upright piece

- `inGap` (`route/labels.ts`) gains place 4, after "centred on an upright": just right, then just left, of each
  upright piece, its middle first, `BESIDE_UP` 7px from the line (clear of the arrowhead's half width), inside the gap
  between the two cards, CLEAR from every card, clear of every earlier label, every line and the arrowhead. The short
  tag is now place 5. Deterministic, in link order.
- Unit test `4: between stacked cards the word sits just right of the upright line…` (right, then left when the
  right is taken, same answer twice). The FE_01 tag-spacing test now uses labels wider than the whole gap, since
  place 4 seats its old labels beside their uprights.
- Gallery: the fixture ledger gains a column container `labels-down` ("Stacked", seq 387-390: cards 165 and 166,
  link "unblocks"); a "Stacked cards" sample draws it. Running the existing sample down was tried first: its links
  bend there, so it never shows place 4. Page spec: `gallery: between two stacked cards the word sits just right…`.
- Baselines renewed again: `link-labels-{dark,light}-darwin.png` (the new sample), `alignment-{dark,light}` and
  `card-widths-{dark,light}-darwin.png` (moved by the taller section: 1px height and antialiasing).
