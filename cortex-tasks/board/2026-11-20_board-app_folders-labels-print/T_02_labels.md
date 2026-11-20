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
