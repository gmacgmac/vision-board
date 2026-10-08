# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Model**: Orchestrator

## Steps

1. [x] The five gates, every exit code read.
2. [x] On a copy of the maintainer's ledger: titles-only picker; version dropdown; a past version
   read-only with Back to now; the finder (Later greyed when empty); Reset places on a selection;
   the ? bubble; the icon and favicon in both themes.
3. [x] New board from the page, then an agent over MCP gets `needs-grant` until granted; Rename.
4. [x] Screenshots to the maintainer.

## Implementation Notes

**Status**: Completed (2026-10-08)

1. Gates after the fixes: `npm test` 658 + 6 timing, `npm run check`, `npm run verify`,
   `npm run gen -- --check`, `npm run test:pages` 185; all exit 0.
2. On a copy of the maintainer's ledger (in the system temp folder): titles-only picker; version
   dropdown "v56 · now" / "v42"; v42 shows read-only (banner, action buttons hidden, nothing
   sent) and Back to now; the finder lists the five containers with counts and "Later · 0 items"
   disabled; the ? bubble; the teal icon.
3. New board from the picker opened the new board; an agent over MCP got `needs-grant` for it;
   Rename updated the picker live.
4. Found three bugs, fixed test-first (section below): the picker squeezed to 50px at 1280; the
   New board dialog keeping old text; "another agent made it" on a person-made board.

### Fixes from verification

Three bugs found while running steps 2 and 3, fixed test-first (each new test seen failing before its fix).

1. **Board picker squeezed** (at 1280px, long title, the picker was 50px).
   - Fix: `.vb-toolbar > #board { min-width: 220px }` (`apps/board/src/styles/board.css`). To make room, below 1500px
     the end group's Hide decided, Theme and Reply show an icon only (`shell/ButtonIcon.svelte`, 24 grid, 1.5 stroke,
     `currentColor`; the words stay in `.vb-btn-text`, visually hidden, so the accessible names are unchanged, and each
     button has a `title`), and the counts (open, decided, later, and the "N boards updated" chip) show their numbers only
     (`.vb-chip-word` hidden; each chip has a `title`). All of it below 1500px, one breakpoint. No new token.
   - Files: `apps/board/src/shell/Toolbar.svelte`, `apps/board/src/shell/ButtonIcon.svelte` (new), `apps/board/src/styles/board.css`.
   - Test: `tests/pages/toolbar.spec.ts` (new): a long-title board with an agent, a container and a card, and another
     agent-made board unopened (so the "boards updated" chip shows), on the empty project's server, at 1100, 1280 and
     1440px: picker 220px or more, toolbar and page do not scroll, every control ends inside the window and in order,
     Hide decided, Theme and Reply named and titled, axe in both themes. Looked at the toolbar at the three widths, dark
     and light. (A first version without the chip passed alone but failed in the full run, where the chip shows; the
     test now makes the chip part of the setup.)
2. **New board dialog kept stale text.** The state was reset on open but the fields were not: words that reached the
   field without an `input` event (autofill, an input method, a form-filling tool) stayed showing. Cancel, Esc and a
   typed-then-closed dialog with ordinary typing did not reproduce in Playwright; the no-input-event case did.
   - Fix: on open, `BoardDialog.svelte` also sets the two fields' `.value` directly (New board empty, Rename the board's
     title and summary). A click on the backdrop (outside the dialog's box) now closes it like Cancel (it did nothing
     before; Enter's synthetic click on the button has no position and is ignored).
   - Files: `apps/board/src/shell/BoardDialog.svelte`.
   - Tests: `tests/pages/new-board.spec.ts`: after Cancel, Esc and a backdrop click (one test each) New board opens empty
     and Rename opens with the board's current title and summary; plus the no-input-event case.
3. **Wrong refusal wording for a person-made board.** `write-board.ts` `checkGrant` said "another agent made it" for every
   board. It now looks at `s.index.creators`: no agent creator reads "the person made it" (the needs-grant detail), and
   the `forbidden` answer for a `board` item there reads "Only the person can change its title and summary" with
   `board "x" was made by the person`; an agent-made board keeps the old wording.
   - Files: `apps/board/server/write-board.ts`.
   - Test: `apps/board/tests/api-boards.test.ts` (person-made board, agent-made board, the forbidden board item).

Docs: `docs/specification/components.md` gets "Navigation: versions, the container finder and the key bubble" (what each is,
its flag, where the code is, and the toolbar's compaction).

Gates after the fixes, all exit 0: check, test, verify, gen --check, test:pages (185 passed; no baseline changed).
`controller.ts` 297 lines.
