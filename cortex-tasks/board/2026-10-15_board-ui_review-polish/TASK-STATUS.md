---
task_name: Review Polish - Containers, Selection, Notes, and a Board That Stays Put
created: 2026-10-15
completed: 2026-10-16
status: completed
categories: [board-ui, board-app, board-tokens]
tracker: cortex-tasks/tracker.md#N41,N42
---

# Review Polish - Task Status

> **Plan**: [PLAN.md](./PLAN.md)
> **Created**: 2026-10-15 · **Go to build**: not yet (waits on the maintainer's yes to PLAN.md
> § Token values)

---

## Instructions for Agents

1. **Read PLAN.md first**; its Rulings are the maintainer's and are not reopened. Its "Decisions
   inside the rulings" say what the plan chose where a ruling leaves room; follow them, and stop to
   ask if one turns out wrong in use.
2. **Read notes from completed tasks** before starting yours.
3. **Respect the Wave column.**
4. **Reuse Shared Foundations**; import, never re-create.
5. **If you need to deviate, STOP and inform the maintainer.**
6. **Update frontmatter `status`**: `planned` → `in-progress` → `completed`.
7. **Update your row** below when you finish, and add notes to your task file and here.
8. **No git commits or stash.** Never touch `.visionboard/`; don't use the board on 4466. Only one
   page-test run at a time. Scratch in the system temp folder; stop only your own processes.
9. **Screenshots**: view every diff before updating a baseline. A diff that shows a sibling task's
   change (same wave) is that task's: name it in your notes, never revert it.
10. **Tests first**: every ruling gets a test that fails before the change (project rule 13).

---

## Task List

| # | ID | Wave | Task | Model | Status | Notes |
|---|-----|------|------|-------|--------|-------|
| 1 | FE_01 | 1 | [Colours: frames, selection, hover box](./FE_01_colours.md) | Sonnet 5.5 | COMPLETED | Rulings 1, 3, 5; edits `tokens.css` after the yes |
| 2 | FE_03 | 1 | [Notes on a card: order and hover](./FE_03_card-notes.md) | Opus 5.5 | COMPLETED | Ruling 8 and decision 8; ruling 4 dropped, hover not worked |
| 3 | FE_05 | 1 | [The board stays put](./FE_05_board-stays-put.md) | Opus 5.5 | COMPLETED | Rulings 11, 12, 13; `perf.spec.ts` adapted (outside list) |
| 4 | FE_06 | 1 | [The retired marker's answers](./FE_06_retired-answers.md) | Opus 5.5 | COMPLETED | Ruling 10, N42; `render.ts` one line (outside list) |
| 5 | FE_02 | 2 | [Container header](./FE_02_container-header.md) | Opus 5.5 | COMPLETED | Rulings 2, 9, N41; deviation: the count in the narrowest frame with a marker; gallery files outside list |
| 6 | FE_04 | 2 | [The conversation window](./FE_04_conversation-window.md) | Opus 5.5 | COMPLETED | Rulings 6 (click), 7, decisions 8, 9; key help row; new `note-outside.ts`, `note-anchor.ts`, `conversation.spec.ts` (outside list) |
| 7 | VERIFY_01 | 3 | [By hand](./VERIFY_01_by-hand.md) | Orchestrator | COMPLETED | Every ruling, light and dark; problems 8-15 (rulings 9, 10, with-agent chips), one proposed tracker row |
| 8 | FIX_01 | 4 | [Fix what VERIFY_01 found inside the rulings](./FIX_01_verify-findings.md) | Opus 5.5 | COMPLETED | VERIFY_01 items 10, 11 in full; item 9 from 100% up; deviation: 75-94% in a one-card frame waits with item 8's pick (`test.fail`) |

**Status Values**: `Pending` | `In Progress` | `COMPLETED` | `Blocked` | `Deferred`

**Wave**: same number = safe to run in parallel. Wave 1's four tasks touch disjoint files; FE_02
follows FE_01 (`region.css`) and FE_05 (`viewport.ts`); FE_04 follows FE_03 (the order) and FE_06
(`wiring.ts`).

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/tokens/src/tokens.css` (`--vb-line-contrast`, `--vb-select-lift`; no `--vb-region-fill` or `--vb-select-lift-grey`, dropped by the maintainer's answers) | FE_01 | FE_02, FE_04 (the bubble edge for a container note), VERIFY_01 |
| `packages/ui/src/region/region-core.ts` (`REGION_COLOUR_DEFAULT` = `var(--vb-line-contrast)`); `region.css` frame border reads `--region` whole, no fill | FE_01 | FE_02 |
| `packages/ui/src/tip/tip.css` (`.vb-tip` border `--vb-line-contrast`) | FE_01 | FE_03, FE_04 |
| `packages/ui/src/node/node-core.ts` `notesView` → `NotesView = { count?, entries: NotesEntry[], pin? }`: `entries` is the card's conversation oldest first, each `NoteEntry` (`seq, index, who, text, sent, replies?`, its replies sorted by `seq`) or an `OrphanEntry` (`ReplyEntry & { orphan: true }`, placed by `seq` among the notes); `isNoteEntry(e)` tells them apart; no `orphans` field any more; `pin` is the latest note. List it as given, never sort again | FE_03 | FE_04 |
| `apps/board/src/board/viewport.ts`: `Viewport.fit(b, animate = true, o?: FitOptions)`, `FitOptions = { fill, cap }` (the share of the stage's binding side, and the top zoom); `SELECTION_FIT = { fill: 0.75, cap: MAX_K }`, passed by `'zoom-selection'` only (no options = today's 32px a side, cap 1.1). The keyboard-focus pan rule is one exported pure function, `revealPan(box, view, stage) → { dx, dy }`, which `Viewport.reveal(box)` applies | FE_05 | FE_02 (reads the same file for the zoom property); the go-to-card task (calls `vp.reveal`) |
| `apps/board/src/board/pointer-focus.ts`: `lastInput(): 'pointer' \| 'key' \| null` (type `Input`; null when no input came since the page opened or the window last lost focus), set by the listeners `bindPointerFocus` binds | FE_05 | FE_04 (focus return on close must not pan: `focus.ts` already pans only when `lastInput() === 'key'`) |

---

## Implementation Notes

### FE_01: Colours
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Maintainer's answers applied (by eye, no fill, no grey lift). New tokens `--vb-line-contrast`
`#b5b5bd` / `#4a4a52` (the Lines scale's next step, the size of line to line-strong; `--vb-wire` is the alternative
if a bigger step is meant) and `--vb-select-lift` 50%. Frame, `.vb-tip` border and the selected look read them.
Measured Lc (reported, not gated): frame on canvas 33.7 / 11.7, tip border on its box 39.7 / 10.8, selected cards
67 to 87 (full list in FE_01_colours.md); in dark the frame and tip border are under the Lc 30 tier. New gallery
group "Selected, every kind" moved the sections below it by sub-pixel, so 40 baselines changed by text edges only;
the colour change itself shows in the full gallery screenshot. Tests: `tests/pages/review-colours.spec.ts`.

---

### FE_03: Notes on a card
_Status:_ COMPLETED (2026-10-15)
_Notes:_ Ruling 4 dropped (maintainer), so no cause-finding or hover fix; step 2 (ruling 6's hover half) not
worked, by the orchestrator's scope. Ruling 8 and decision 8 in `notesView`: one list, oldest first, orphans by
`seq` among the notes, the pin on the latest note (shape in § Shared Foundations). `notesMarkup` draws it as
given. Tests first: `node-core`, `node-template`, `node-parking` (its reply tests asserted the old order and the
removed `orphans` field, so changed with the shape) and a page test in `popover-thread.spec.ts`. Gallery card 77's
body and two descriptions reworded; no combined notes-and-replies sample, since `gallery-fixture.test.ts` pins the
parking replies. 42 baselines updated, every diff viewed: `gallery-*` and `parking-replies-*` show the change; the
other 40 are text-edge shifts from the taller gallery (list in FE_03_card-notes.md).

---

### FE_05: The board stays put
_Status:_ COMPLETED (2026-10-16)
_Notes:_ Ruling 11: `focus.ts` pans only when `pointer-focus.ts` `lastInput()` is `'key'` and the card is
not the one focus just left; the window losing focus keeps the focused card (`document.hasFocus()`); a
popover reveals only when a key opened it. The pan rule is one exported function, `viewport.ts`
`revealPan` (decision 1), applied by `Viewport.reveal` (for the go-to-card task). Ruling 12: `fit`'s
`FitOptions`, `SELECTION_FIT` (75%, cap 2.5) passed by Z only. Ruling 13: `pointer.ts` Cmd/Ctrl press is a
pending pan past `DRAG_THRESHOLD`, swallowing its click; held still it keeps its meaning; Cmd + drag on
the kind tab or grip now pans. Tests failed first on the HEAD sources: 8 unit (`viewport-zoom.test.ts`),
page tests in `focus-ring`, `zoom-and-lasso`, `select` specs. Outside the list: `tests/pages/perf.spec.ts`
(six programmatic focuses now press Shift first, `bringIn`). No screenshot changed. Five gates exit 0
(449 page tests). Docs: `components.md` (two sections). Shared names in § Shared Foundations.

---

### FE_06: The retired marker's answers
_Status:_ COMPLETED (2026-10-16)
_Notes:_ Decision 10 as written. `retired.ts`: `RetiredCount.until` (the first `retire` line on the board
after the version) and one pure `pastLines(events, board, version, until)`: every line before `until` but
that board's drawing lines after the version (other boards keep theirs, so acts there still fold). The cut
rides `retiredMarker(count, version, until)` → `RegionRetired.until` → `vb-region` `data-until` →
`wiring.ts` / `controller.ts` `showVersion(seq, until?)` → `versions.ts` `show(seq, until?)`, which reads
on to `until - 1` page by page; the dropdown (no `until`) is unchanged. Read-only, banner, contract and
action layer untouched. Tests first: 5 in `retired.test.ts` (failed `0 of 4 answered` on today's fold), a
page test in `versions.spec.ts` (marker light and dark, then the dropdown as at v1), asserts in
`flag-retire.spec.ts` and `region-core.test.ts`. Outside the list: `render.ts` (one line passing
`until`), `region-core.test.ts`. Only `retired-light/dark` screenshots changed (gallery description; viewed).
Five gates exit 0 (450 page tests). FE_04: `wiring.ts` changed only in the `button.vb-region-retired`
branch and `StageHandlers.showVersion`.

---

### FE_02: Container header
_Status:_ COMPLETED with a deviation (2026-10-16)
_Notes:_ Ruling 2: `viewport.ts` `apply` writes `--vb-zoom` on the world once per zoom change; `region.css`
registers it (`@property`, not inherited: the regions layer, frame and line `inherit` it, so a zoom step restyles no
card: 2.7 ms median on 1,000 cards, 30 ms when inherited) and counter-scales `.vb-region-head` (transform, width
tied to the frame's on-screen width; it animates with a glide). The line is the row's container query (408 / 568px
of line = the old 440 / 600 frames at 100%). Below `FAR_K` tools, grip, retired marker and holders are
`display: none`. Ruling 9: marker and tools `flex: none`, title one line with "…" and a three-letter floor
(`calc-size`), give-way order holders (each keeps 24px, slot `display: contents`) -> title -> count by shrink factors
1e12 / 1e6 / 1. **Deviation (decision 7):** in the narrowest frame (one card, 336px) with "6 cards retired" the
count has no room and gives way; options (shorter words, a second row, title to zero) in FE_02 notes item 3.
MIN_K: the line reaches about 1px into the first card row (REGION_HEAD; reported, not changed). Tests failed first:
`viewport-zoom.test.ts`, `zoom-level.spec.ts` (2), `container-polish.spec.ts` (2); guards in
`region-template.test.ts`, `perf.spec.ts`. Outside the list: gallery (`gallery.ledger.jsonl` seq 307-316 on the marks
board, `retired-section.ts`, `title-section.ts`, `mini-board.ts` `zoom`, `gallery.css`), `flag-retire.spec.ts`,
`gallery.spec.ts`. 44 screenshots updated, all viewed (content: board, retired, gallery, card-widths, agent-access;
the rest text-edge shifts). Five gates exit 0 (454 page tests). FE_04: `region.css` head rules changed; the
container note bubble anchors on `titleLine()`'s on-screen box, unchanged in shape.

---

### FE_04: The conversation window
_Status:_ COMPLETED (2026-10-16)
_Notes:_ New read-only bubble mode `thread`: a click, Enter or Space on a note or a reply (card or container
block) opens every note and reply oldest first, from `node-core.ts` `conversation(notes, replies)` (split out of
`notesView`, which reads it; a container's replies filtered to its own notes), scrolled to the bottom or to the
older entry pressed (`vb-note-bubble` `reveal`), focus on it. `reply` mode retired; `sent` kept for the pin and
the container preview. Read-only bubbles have an × (24px, "Close") in the head's corner and no bottom row; a
click outside closes them (`note-outside.ts`, new; a drag is a pan and keeps it; `pointer.ts` `DRAG_THRESHOLD`
exported). Edit on a note still editable turns the window into edit mode (Cancel, Save, discard question
kept). Placement moved to `note-anchor.ts` (new) to keep `notes.ts` under 300 lines. Key help: Board "Pan from
anywhere" Cmd+drag / Ctrl+drag. Tests failed first: 3 unit (bubble, `conversation`), 1 key-help, 8 page
(`conversation.spec.ts`, new); `popover-thread`, `notes`, `parking-replies`, `gallery` specs changed with the
behaviour. Gallery: parking card n 141 (ledger seq 317-325) with three notes, replies and an orphan; two card
conversation samples and a container one. 26 screenshots updated, every diff viewed (content: gallery,
key-bubble; the rest text-edge shifts). Five gates exit 0 (462 page tests). Header counts untouched.

---

### VERIFY_01: By hand
_Status:_ COMPLETED (2026-10-16), with problems recorded
_Notes:_ Scratch server on 4493 (`$TMPDIR/vb-vrp/`), board `polish` drawn by a joined agent, every person's act
on the page; Playwright chromium 1600x1000 and 1470x956, light and dark; no console error or failed request.
Pass: rulings 2, 3, 6-8, 11, 13, colours as FE_01 measured; with agent (note -> "With agent", reply -> open,
header chip, `with-agent` at the API); go to card (1 2 Enter, No card 99, a retired card's Show v55, a card
hidden by H). Switching windows: proven as a real tab switch (new-headless chromium, focus emulation off:
`blur`, `hasFocus()` false, `focus`), nothing moves; an OS app switch is not provable here. Problems, numbered
in VERIFY_01_by-hand.md: **8** ruling 9, the count cut or gone in one-card frames from about 86% to 178% and in
a one-L-card frame without a marker ("TAL… ( · C" at 87%), a 24px holder stub left; **9** ruling 9, the mode
row covers the retired marker at about 150%; **10** ruling 10, the past view's answers are in the data and the
count but no ✓ or ✗ shows on the cards (read-only hides the act row); **11** with agent, on a toolbar of
1500px or less "board updated" and "with agent" are twin pink chips; **12** Cmd + drag closes an open hover
tip; **13** Z on one small card stops at the 250% cap (44-48%), as decision 4; **14** dark frames and tip
border quiet (FE_01's report, confirmed); **15** a short note or reply shows no hover tip (ruling 4 dropped).
Proposed tracker row **16**: the selection pill covers content. Screenshot names with each item.

### FIX_01: Fix what VERIFY_01 found inside the rulings
_Status:_ COMPLETED with a deviation (2026-10-16)
_Notes:_ Item 9: `region.css` keeps the collapsed mode row up to 568px of line in a frame whose retired marker
shows (`--region-marked`, one combined size and style query), so the marker is whole and clear from 100% to 250%
(was covered 15px at 149%). **Deviation:** from `FAR_K` to about 94% a one-card frame has no room for the marker
beside even the collapsed row (56px covered at 76%, 26 at 86%; in VERIFY_01's own 86% shot); no one-line fix
inside the rulings, so it waits with item 8's pick, held by a `test.fail`. Item 10: `board.css` keeps a lit ✓ or
✗ in a past view, the act row inert (no press, focus, hover); gallery "Answered cards" in Past versions. Item 11:
the "with agent" chip keeps the Agents bot beside its number on a narrow toolbar. Tests failed first
(`container-polish`, `versions`, `answer-model` specs). 24 screenshots, every diff viewed (content:
`past-version-*`, `board-*` header counts; the rest text-edge shifts). Five gates exit 0 (479 page tests).

---

## Completion Checklist

- [x] Token values approved (PLAN.md § Token values) and written by FE_01
- [x] All implementation tasks complete
- [x] Verification task complete
- [x] Tracker rows N41 and N42 deleted (orchestrator, after the full set)
- [x] LOG entry created

---

## On Completion

1. Frontmatter: `status: completed`, `completed: YYYY-MM-DD`.
2. Append the set's LOG line (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Review polish → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/TASK-STATUS.md]]`
3. Delete tracker rows N41 and N42 and rewrite the tracker's Status (orchestrator only).
4. Nothing here writes to `AUDITED.md`.
