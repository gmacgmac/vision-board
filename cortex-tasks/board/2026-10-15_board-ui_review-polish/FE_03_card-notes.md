# FE_03_card-notes: Notes on a card: order and hover

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Hovering your own note shows it; hover shows only the note or reply under the pointer; a card's
notes and replies read oldest first, like a chat, with the pin still on the latest note.

## Context

PLAN.md rulings 4, 6 (the hover half) and 8, and "Decisions inside the rulings" 8 (orphan replies
by time) and 11 (ruling 4's cause). FE_04 (wave 2) lists the conversation from your `notesView`, so settle its shape here and
write it in TASK-STATUS.md § Shared Foundations when done.

## Inputs

- **Files to modify**: `packages/ui/src/node/node-core.ts` (`notesView`, `NotesView`, `NoteEntry`;
  the pin's `label`), `packages/ui/src/node/node-template.ts` (`notesMarkup`, `replyMarkup`),
  `packages/ui/src/node/node-note-tip.ts` (`bindNoteTip`, its `needed`), and
  `packages/ui/src/node/vb-node.ts` (`noteTips`) only if the cause is there.
- **Files to reference**: `packages/ui/src/tip/hover-tip.ts` (`bindHoverTip`),
  `packages/ui/src/region/region-preview.ts` (`previewStep`, `previewShown`),
  `packages/format/src/flags.ts` (`notePreview`), `apps/board/src/board/controller.ts` (sets
  `data-note-preview` on the world), `apps/board/src/gallery/node-section.ts` (`notePreviews`).
- **Tests to extend**: `packages/ui/tests/node-core.test.ts`, `node-template.test.ts`;
  `tests/pages/notes.spec.ts`, `note-polish.spec.ts`, `popover-thread.spec.ts`.
- **Not yours**: `node.css`, `tip.css` (FE_01, same wave). If the fix needs CSS there, stop and say so.

## Steps

1. [-] (skipped: ruling 4 dropped by the maintainer) **Find the cause of ruling 4 first.** On the gallery and on a live test board (its own port,
   temp project), hover the person's own note: short (shown in full), cut (over three lines), sent,
   answered, and on a group of cards; hover a reply the same ways. Today `needed` asks for the
   `notePreview` world attribute **and** cut text, so a short note shows nothing by that rule
   (PLAN.md § Current State). Record which cases fail and why.
   - If a cut note also shows nothing, that is the regression: find it, write the failing page test,
     fix it.
   - If only short notes show nothing, the cut-only rule is the cause: write the failing test that a
     hovered note or reply always opens its tip (ruling 4 says hovering shows the note), drop the cut
     condition from `needed` (the flag check stays), and say so in your notes.
2. [-] (not worked: out of the orchestrator's scope for this run, see notes) **Hover shows only the thing hovered** (ruling 6): a test that hovering a note opens only
   that note's tip, and hovering one reply only that reply's (no other tip, no bubble); keyboard
   focus the same (WCAG 1.4.13: hoverable, persistent, Esc dismisses).
3. [x] **Oldest first** (ruling 8), unit tests first in `node-core.test.ts`: `notesView` returns
   note 1, its replies oldest first, note 2, its replies…; orphan replies placed by `seq` among them;
   a new note last; `pin` is the latest note (not `entries[0]` any more) with today's label;
   `count` unchanged. Then `notesMarkup` draws that order; nothing else sorts.
4. [x] (order and wording; no short-note tip, ruling 4 dropped) Gallery: the note rows show several notes and replies in the new order, and a short note's
   tip open.
5. [x] Screenshots: view every diff; say which changed and why. Docs:
   `docs/specification/components.md` § Notes beside cards (order, hover), `node/pattern.json`.

## Validation

- [x] (ruling 4 dropped; the order tests failed first) The ruling 4 test failed before the fix and passes now; the order tests pass.
- [x] The five gates exit 0, one after another.

## Constraints

- Patterns first (rule 1): the shared hover tip stays the one tip; no second tip mechanism.
- Accessibility (rule 5): note and reply stay tab stops with their names; the tip stays
  `aria-hidden` (screen readers read the note itself).
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**Scope as run (orchestrator, 2026-10-15).** Ruling 4 was dropped by the maintainer (PLAN.md § Maintainer's
answers: hovering a note or a reply already shows it), so step 1 (the cause) and the hover fix were skipped
and decision 11 is moot. Step 2 (ruling 6's hover half) was not worked either: the orchestrator scoped this
task to ruling 8 and the `notesView` shape for FE_04. No change to `node-note-tip.ts` or `vb-node.ts`.

**Ruling 8 and decision 8.** `notesView` (`packages/ui/src/node/node-core.ts`) now builds the card's
conversation once, oldest first, top to bottom: each note, then its replies sorted by `seq`; a reply that
names no note of the card (an orphan) sits by its `seq` among the notes; so a new note is last. The pin is
the latest note (`notes.at(-1)`), with today's label; `count` unchanged. `notesMarkup` draws `entries` as
given; nothing else sorts.

**The shape FE_04 reads** (also in TASK-STATUS.md § Shared Foundations):
`NotesView = { count?, entries: NotesEntry[], pin? }`; `NotesEntry = NoteEntry | OrphanEntry`;
`NoteEntry = { seq, index, who, text, sent, replies?: ReplyEntry[] }`; `OrphanEntry = ReplyEntry & { orphan: true }`;
`isNoteEntry(e)` tells them apart. The old `orphans` field is gone (orphans are in `entries`).

**Tests first.** Unit: `node-core.test.ts` (the oldest-first order with the pin on the latest; a new test
for notes, replies and orphans by `seq`, a new note last), `node-template.test.ts` (`notesMarkup` draws the
given order with an orphan in place), `node-parking.test.ts` (its three reply tests asserted "latest first"
and the removed `orphans` field, so they had to change with the shape; outside the listed test files). Page:
`popover-thread.spec.ts` "a card's notes and replies read oldest first, like a chat; an orphan reply sits by
time; the pin opens the latest" (draws note 1, sends, a reply, an orphan, note 2, a later reply to note 1;
checks the order, the pin "2" opening note 2 to edit, and a new note 3 at the bottom). All failed before the
change (unit: missing `isNoteEntry` and wrong order; page: "Note two." first) and pass now.

**Gallery and docs.** Card 77's body in `gallery.ledger.jsonl` said "The latest note is first"; it now says
the oldest is first and the pin opens the latest. Descriptions in `node-section.ts` (Notes on a card) and
`parking-section.ts` (Replies) say the new order. No new sample with several notes and replies on one card:
the parking fixture's reply counts are pinned by `apps/board/tests/gallery-fixture.test.ts` (not this task's
file); the page test covers the combined case. `docs/specification/components.md` § Notes beside cards
item 3 and `node/pattern.json` (`vb-node-notes`, `vb-node-reply`) say the order and the shape.

**Screenshots (42, light and dark, every diff viewed).** Content changes: `gallery-*` (card 77 in "Notes on
a card" and again in the note bubble section now reads note 1, 2, 3 top to bottom, its body one line
longer, the page 39px taller) and `parking-replies-*` (the Replies description). The other 40 are text-edge
sub-pixel shifts from the gallery growing above them: card-updates, chat, flag-retire (flag and retired),
key-bubble, layout-controls (alignment, card-widths, link-labels), lock-board, open-folder, person-remove,
picker-archive, proposals, selection-pill, send-access, size, toolbar, versions, wires. Retired and
folder-picker-light were not reached in the first run; checked against HEAD (FE_01's frame colour plus text
edges only).

## On Completion

1. Fill Implementation Notes (with the cause found in step 1); set Status to `Completed`; update
   your row and § Shared Foundations (the `notesView` shape) in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-ui] FE_03: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_03_card-notes.md]]`
