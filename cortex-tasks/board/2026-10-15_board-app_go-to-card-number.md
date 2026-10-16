---
category: board-app
status: completed
created: 2026-10-15
---

# Go to a card by typing its number

> **From**: maintainer, 2026-10-15 (chat 119-123, 133; "This is essential"; go: "all ok, proceed") ·
> **Model**: Opus 5.5

## Rulings (maintainer; do not reopen)

1. **Typing a digit opens the box.** When no text field has focus, a digit key opens a small "Go to
   card" box in the bottom-right of the board, holding the digits typed. It works with or without a
   card selected; digits are not used by any other key today (`apps/board/src/board/keys.ts`,
   `commands.ts`).
2. **Enter goes; nothing goes by itself (133).** Backspace edits, Esc closes. Going after a pause
   (about 1 second) is built too, behind a feature flag that is off (rule 12), so it can be tried later.
3. **On arrival** the card is selected and focused. The board pans only if the card is off screen, by
   the same rule the review-polish set gives keyboard focus (its FE_05); the zoom stays. Z zooms to it.
4. **A number with no card** shows "No card 99" in the box and keeps it open. **A retired card** says
   "Card 7 was removed" and offers to open the version where it last appeared, the way the container's
   retired marker does (`apps/board/src/board/retired.ts`).
5. **Accessible**: the box is a labelled text field (numbers only) with its result announced; the key
   help lists it.

## Steps

1. [x] Tests first: unit (digits build the number; Enter on a card, an unknown number, a retired card;
   Esc; Backspace; the flag's timed go) and page (type 1 2 Enter → card 12 selected and focused, no
   zoom change, a pan only when off screen; inside a note's text field digits type as text; keyboard
   and axe light and dark).
2. [x] Build: a command in `commands.ts`, the key in the board's key handling, a small component for
   the box (tokens only, every state), number → card through `card-numbers.ts`; reuse the selection and
   focus code (`selection-flow.ts`, `focus.ts`), never a second copy. Gallery entry.
3. [x] Docs: `docs/specification/components.md`; key help.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Runs after the review-polish set (it reuses FE_05's pan rule). Project rules as ever.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.

## Implementation Notes

**Status**: Completed (2026-10-16)

**Rulings 1-2.** A digit is the `go-to-card` command (`commands.ts`, keys 0-9, a new `shown: ['0–9']` for
the key list); `keys.ts` needed no new branch (text fields, dialogs and the card popover are already left
alone, so in a note's text field digits are text). `selection-flow.ts` `command` hands it to
`go-to-card.ts` `createGoTo` (new dep `goTo`), which keeps the box's state and its timer; the controller
puts it in `shell.go`, and `shell/GoToCard.svelte` (new, `styles/go-to-card.css`, tokens only) draws it at
the board's bottom right (clear of the chat sidebar). Enter goes, Backspace edits (the field keeps digits
only, at most 6), Esc closes, as does focus leaving the box for something else on the page (not the window
losing focus); closed without going, focus goes back where it was. The timed go is `goAfterPause` (off),
`GO_PAUSE` = 1000 ms.

**Ruling 3.** `goTarget` reads the number through `card-numbers.ts` `idOf` on the state the board is drawn
from (a past version's too). Arriving: `selection.select([id], 'only')`, the card's `focus()` (`focus.ts`),
and `vp.reveal(box)`, FE_05's `revealPan`. No second rule: the explicit call covers the cases `focus.ts`
skips by design (focus coming back to the card it left; a pointer press on the retired offer). The zoom
stays; Z zooms to it.

**Ruling 4.** "No card 99" keeps the box open. A retired card: "Card 7 was removed" and a "Show v42" button
(accessible name "Show v42, where it last appeared", as the marker's) that opens the same past view the
container's marker opens: `retired.ts` `lastShown` was split out of `retiredCounts` and both use it. Then it
goes to the card in that version. Without versionView it only says so.

**Ruling 5.** A labelled text field ("Go to card", `inputmode="numeric"`) with a hint and a `role="status"`
line for what it found. The key help lists "Go to a card by its number · 0–9" under Board (`key-help.ts`,
from the command table).

**Outside the rulings (report).**
1. A card on the board but not drawn (hidden with the answered cards, H) says "Card 4 is hidden with the
   answered cards (H shows them)" and the box stays. The rulings did not cover it. I chose not to turn H off
   on the person's behalf.
2. Rule 12: the feature itself is behind a new `goToCard` flag, **on** by default (off: digits do nothing,
   the key list leaves it out, no gallery section). `goAfterPause` is the off flag ruling 2 asked for.
   Both are in `packages/format/src/flags.ts`.
3. To keep `controller.ts` at 300 lines, five short lines nearby were joined, with no change in behaviour
   (the `Board` return, `onLines`, `redraw`'s first line, `regionNotes`, the header comment).
4. `gallery.spec.ts`: `-goToCard` added to the full-gallery screenshot's flags-off list, as for every
   flagged section, so that screenshot is unchanged.

**Tests, failing first.** Unit: `apps/board/tests/go-to-card.test.ts` (new, 9: digits, `goTarget` on a
ledger where board numbers differ from identities, Enter on a card / unknown / retired / hidden, Esc,
Backspace, the timed go with a fake clock) failed with the module missing; `key-help.test.ts` (1 new: the
row, and none with the flag off; the "every command" test reads `shown`) failed before the command existed.
Page: `tests/pages/go-to-card.spec.ts` (new, 12) was run with `goToCard` set to default off first: 10
failed; the 2 guards passed (the note's text field, the flag off). Covered: 1 2 Enter on an off-screen
card (selected, focused, panned fully in, zoom unchanged, Z then zooms); no pan on screen with and without
a focused card; No card 99, letters refused, Backspace, Esc back to the card, a click outside; digits in a
note's text field; a retired card's offer by Tab and Enter (banner, card focused and selected there); the
pause flag off and on; the flag off; the key list row; axe light and dark with the box open, on No card 19
and on a retired card; the gallery section's axe and screenshots.

**Gallery.** `gallery/go-to-card-section.ts` (goToCard flag): typing, no such card, removed, built from
`createGoTo` itself.

**Screenshots (all viewed, light and dark).** New: `go-to-card-light/dark`. Changed:
`key-bubble-open-light/dark` and `key-bubble-gallery-light/dark`. The only change is the new Board row,
with the rows under it moved down. Nothing else changed.

**Docs.** `docs/specification/components.md`: new § Go to a card by its number; § key bubble item 6
(`shown`). `apps/board/README.md` names the module.

**Gates** (one after another, all exit 0): `npm run check`; `npm test` (1286 + 7 timing); `npm run verify`
(no warnings); `npm run gen`; `npm run test:pages` (475 passed). The first full page run failed only the
4 key-bubble screenshots above. I viewed them, updated them, and ran the five gates again from the top.

**Security.** None found: the box sends nothing and only reads the state the page already holds.

## On Completion

1. Fill Implementation Notes; set `status: completed`.
2. Append one LOG line to `cortex/LOG.md`:
   `[[YYYY-MM-DD HH:MM]] [board-app] Go to card by number: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md]]`
