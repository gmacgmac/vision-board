# FIX_01_verify-findings: Fix what VERIFY_01 found inside the rulings

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

## Objective

Make rulings 9 and 10 and the with-agent chip hold as approved, from VERIFY_01's items 9, 10 and 11.
Item 8 (the count giving way in one-card containers) waits for the maintainer's pick (chat 158) and
is not in this task.

## Context

Read VERIFY_01_by-hand.md's Implementation Notes (items 8-16, screenshots in its scratch folder if
still there) and the notes of FE_02, FE_06 and cortex-tasks/board/2026-10-15_board-actions_with-agent-state.md.

## Steps

1. [~] **Item 9 (ruling 9):** at about 150% the mode row covers the "N cards retired" marker by 14px.
   The marker never shrinks and is never covered. Failing page test first, at the zooms VERIFY_01 used.
2. [x] **Item 10 (ruling 10):** the retired marker's past view has the right answers in the data, the
   count and the names, but no ✓ or ✗ shows on the cards, because read-only hides the whole act row.
   In a past view a card shows its mark (✓ or ✗ lit, read-only, not pressable), so an answered card
   never looks open. Same for the toolbar's version dropdown views. Failing test first.
3. [x] **Item 11 (with agent):** on a toolbar of 1500px or less (MacBook Air width), "board updated" and
   "with agent" become two identical pink number chips. Each chip stays telling apart at every width
   (its word, or a distinct mark, kept); tokens only. Failing page test at 1470px first.

## Validation

- [ ] The five gates exit 0, one after another. Every screenshot diff viewed, light and dark.

## Constraints

- Project rules. No token value changes. If deviation is needed, stop and say so. No git commits.
  Never touch `.visionboard/`; don't use port 4466. One page-test run at a time.

## Implementation Notes

**Status**: Completed with a deviation (2026-10-16): items 10 and 11 in full; item 9 from 100% to 250%,
not from 75% to about 94% (item 1 below)

1. **Item 9 (ruling 9).** `region.css`: a frame whose retired marker shows sets `--region-marked: 1`
   (`vb-region:has(> .vb-region-head .vb-region-retired:not([hidden]))`), and the collapsed-row block's query is
   `@container (max-width: 408px) or ((max-width: 568px) and style(--region-marked: 1))`: such a frame keeps
   the collapsed row up to 568px of line (the existing second step, a 600px frame at 100%), so the full row
   never comes back onto the marker. Before: one-card frame with "3 cards retired", the row over the marker by
   15px at 149% and 12px at 150% (VERIFY_01 said 14px). After: the marker whole and clear of the controls at
   100, 104, 125, 149, 150, 178, 180, 214 and 250% (gap 17-52px). Same query, so no second copy of the rules.
   **Deviation, for the maintainer:** from `FAR_K` (75%) to about 94% such a frame's line has no room for the
   grip, the title's three-letter floor, the marker and even the collapsed row, so the row covers the marker
   (measured: 56px at 76%, 44 at 80%, 26 at 86%, 13 at 90%; clear from 95%). It is in VERIFY_01's own shot
   `3-header-1600-light-k0.86.png` ("3 cards re"), not named there. No one-line fix stays inside the rulings:
   the title at zero still leaves 76-78% covered. It is item 8's choice (chat 158: shorter words, a second
   row, the title to zero, or the marker leaving the line earlier), so it waits with it. A `test.fail` holds
   it (`container-polish.spec.ts`, "76% to 90%"), so the run stays green and flips once the pick lands.
2. **Item 10 (ruling 10).** `board.css`: in a read-only world the act row is no longer hidden whole; every
   `.vb-act` but a lit ✓ or ✗ (`[data-act='ack'|'drop'][aria-pressed='true']`) is, and the row is
   `interactivity: inert; pointer-events: none`: the mark shows lit, in its place, and takes no press, focus
   or hover (the name already says "checked" or "crossed"). Later, the flag and the far zoom hide as before.
   Same for the marker's past view and the dropdown's (one rule). No change to `versions.ts`, contract or
   action layer. Gallery: Past versions gains "Answered cards", a checked and a crossed question in a
   read-only world (`version-section.ts` `pastCards`, `gallery.css` `.g-past`).
3. **Item 11 (with agent).** `Toolbar.svelte`: the "with agent" chip carries `ButtonIcon name="agents"` (the
   Agents bot), shown only on a narrow toolbar (`board.css` `[data-narrow] .vb-counts
   .vb-chip[data-tone='agent'] .vb-btn-icon`, 14px, the chip's own ink: Lc 64.0 light, 49.1 dark per the
   with-agent task, over the decoration tier). Wide, the words tell it apart as before. Tokens only; no
   token value changed. No counts sample in the gallery (none before).
4. **Tests, failing first.** `container-polish.spec.ts`: "the mode row never covers the marker, from 100%
   to 250%" (a board of its own drawn by an agent, a one-card column, three cards retired, zoom set by Ctrl +
   wheel; failed at 149% and 150% with the fix taken out) and the `test.fail` above. `versions.spec.ts`: the
   marker's past view now asserts each card's lit mark, inert (no pointer, no focus), a click on it sending
   nothing; new "a past version from the dropdown shows each answered card's ✓ or ✗ lit" (light and dark,
   axe); both failed (no mark shown). `answer-model.spec.ts`: "on a narrow toolbar (1470px) every count chip
   still looks different" (fill, marks, words; light and dark, axe) failed on the twin pinks. The ink is left
   out of that comparison: the two pinks' inks differ by too little to see.
5. **Screenshots (24 files, every diff viewed, light and dark).** Content: `past-version-*` (the new
   "Answered cards" group), `board-*` (header only: "v123 → v137", "4 → 5 boards updated", from the boards
   the new tests draw earlier in the run). The rest are text-edge or 1px shifts from the taller gallery:
   `chat-*`, `flag-*`, `key-bubble-gallery-*`, `alignment-*`, `link-labels-*`, `lock-*`, `folder-picker-*`,
   `parking-replies-*`, `remove-*`, `proposals-*`. No sibling's change. Baselines are the runs' actual images.
6. **Docs.** `components.md` (§ A container's top line: the marker frames' row and the open 75-94% band;
   § Navigation items 1 and 4); `packages/ui/src/region/pattern.json` (`narrow`).
7. **Gates** (one after another): `npm run check` 0, `npm test` 0 (1286 + 7 timing), `npm run verify` 0
   (0 warnings), `npm run gen` 0, `npm run test:pages` 0 (479 passed, the `test.fail` among them; the
   folder picker light baseline drifted under the threshold in the first run and over it in the second,
   viewed and updated, then a clean third run).
8. **Security.** None: CSS, one icon and tests; no I/O, server or contract change.

## On Completion

1. Fill Implementation Notes; update the row in TASK-STATUS.md.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] FIX_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FIX_01_verify-findings.md]]`
