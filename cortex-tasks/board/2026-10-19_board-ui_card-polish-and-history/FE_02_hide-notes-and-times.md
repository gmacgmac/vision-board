# FE_02_hide-notes-and-times: Hide notes and note times on cards

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Let the person collapse a card's note thread to an "N notes" pill and back, and show each note's
and reply's time in a chip at its top right on hover or focus.

---

## Context

PLAN.md § Key Changes 5 and 6. The thread is `notesView` / `notesMarkup` / `replyMarkup`; notes
already hold a hover tip with the full text when cut (found-in-use FE_04, `bindNoteTip`) — the time
chip must not collide with it. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/node/node-core.ts` (`NotesView` gains `hidden`, the count
  words), `node-template.ts` (`notesMarkup`, `replyMarkup`: the toggle, the pill, `data-at`),
  `node.css` or a new `node-notes.css` if node.css passes 300 lines, `vb-node.ts` (apply in place),
  `node-note-tip.ts` (keep tips clear of the chip), `apps/board/src/board/notes.ts` /
  `flag-flow.ts` model (the action call through the action layer), `apps/board/src/board/draw.ts`
  (hidden set into the card conditions), the gallery's notes section
- **Shared artifacts to reuse**: `notes-hide` / `notes-show` and the hidden-cards fold, `CardReply.at` — built by BE_01
- **Shared artifacts this task creates**: `noteTime(at, now)` (beside `versionTime` in
  `apps/board/src/board/versions.ts`, or in a ui core file if the node pattern needs it — one
  home); the note highlight (`data-note` / `data-reply` scroll into view + a brief highlight using a
  node-state token) that FE_03 calls
- **Skills**: `cortex-architecture` · `cortex-docs` (components.md § Notes beside cards) — load before starting

---

## Steps

1. [x] Hide: the "N notes" line (shown for one note too, when the card has any) gets a "Hide"
   text button; hidden, the thread becomes one pill button "N notes" (with "· 1 new reply" when a
   reply came after hiding, so a reply is never missed). Both go through the action layer
   (`notes-hide` / `notes-show`), work offline-first like the flag, and paint at once. The card
   resizes (a person's choice moves layout, like Later); confirm the layout re-runs only for that
   card's container (rule 15).
2. [x] Time chip: each note and reply carries `data-at`; on `:hover` and `:focus-visible` a chip
   at its top right shows `noteTime` ("Today 09:42", "Yesterday 18:10", "Oct 18, 09:10"); `title`
   is the full date and time. Tokens only; the chip is reading text, so Lc 60 (rule 3). Screen readers get the time once in the note's accessible name, not the chip.
3. [x] Highlight helper for FE_03: scroll a note or reply into view on its card (pan the board if
   the card is off screen, `vp.reveal`), unhide the thread if hidden (`notes-show`), flash a
   highlight that respects reduced motion.
4. [x] Tests first: `tests/pages/notes.spec.ts` (hide, reload, show, new reply count, keyboard),
   `note-polish.spec.ts` (chip on hover and focus, gone after), unit tests for `notesView` and
   `noteTime`. Gallery: a card with a hidden thread, with a new reply, and a hovered note.

---

## Validation

- [x] Page and unit tests pass; `npm test`, `npm run verify` pass (verify: ok, 2 length warnings; page suite: mine pass, the chat task's chat.spec baselines, chat-context and chat-lazy fail outside this task)
- [x] axe clean on the new controls; APCA tiers light and dark (toggle Lc 76.2 / 48.8, short-label tier 45; chip Lc 94.3 / 71.6; hover 88.7 / 91.9; ring 74.8 / 49.8)

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19 14:10  

### Changes Made
- **Hide and Show** (maintainer feedback mid-task, 2026-10-19: the toggle never jumps sides): the thread's head
  (`node-template.ts` `notesHead`) is the count on the left as plain text ("1 note", "3 notes", "2 replies" with only
  replies) and one toggle always on the right, `button.vb-node-notes-toggle[data-notes]`: Hide while the thread shows,
  Show while it is put away, when the head alone draws and the count reads "2 notes · 1 new reply". No pill.
  Names: "Hide notes on item 4" / "Show 2 notes · 1 new reply on item 4". `vb-node.ts` `updateNotes` keeps focus on the
  toggle when the thread is drawn again.
- **Model**: `notesView` / `conversation` / `replyEntry` and the entry types moved to `packages/ui/src/node/node-notes.ts`
  (node-core.ts re-exports it; node-core was at 300 lines). `NotesView` gains `count` (always), `toggle` and `hidden?`;
  `notesView(n, notes, replies, hiddenAt?)` counts the replies with `seq` after the hide. `NoteEntry.at` and
  `ReplyEntry.at` added (`replyEntry` carries `CardReply.at`).
- **BoardState.notesHidden** is now `Map<string, number>` (board number -> `seq` of its latest `notes-hide`), so the head
  can count replies since; `.has(id)` reads as before. `packages/actions/src/board-state.ts` and BE_01's
  `card-notes-hidden.test.ts` updated.
- **Page**: `apps/board/src/board/note-hide.ts` (new): `notesAct(id, hidden)`, the click delegate for `button[data-notes]`
  (one act through `record`, the flag's pattern), and the shared highlight. Wired in `controller.ts` (`noteHide`).
  Past version: board.css hides the toggle (`data-readonly`); a locked board still takes it (private mark).
- **Time chip**: each note and reply has `data-at`, a visually hidden " · Today 09:42" after who wrote it (screen
  readers, once) and `span.vb-note-time` (aria-hidden, `title` = `fullTime`) on the box's top edge at the right, shown
  only on `:hover`, `:focus-visible` or `[data-hover]` (gallery). CSS in new `packages/ui/src/node/node-notes.css`
  (imported by `apps/board/src/main.ts` and the gallery's `main.ts`; node.css was at 280).
- **Shared for FE_03**:
  - `noteTime(at, now)`, `fullTime(at)` and `versionTime(at)` in `packages/ui/src/node/node-time.ts`, exported from the
    ui front door; `versionTime` moved there (one home) and `apps/board/src/board/versions.ts` re-exports it.
  - `createNoteHide(...).highlight(id, part)` in `apps/board/src/board/note-hide.ts` (`part`: `{ note: seq }` or
    `{ reply: seq }`, type `NotePart`, selector `partSelector`): sends `notes-show` first when the thread is put away,
    waits for the card to draw the part, pans by `vp.reveal` to the part's own box, focuses it and sets `data-flash`
    (a `--vb-state-comment` ring, fading over `--vb-motion`, instant under reduced motion) for `FLASH_MS` (1600).
    The controller's `noteHide` holds it.
- **Gallery**: three cards on the notes board (`gallery.ledger.jsonl` seq 334-345, format 18): put away, put away with a
  later reply, and a note and reply with their chips drawn (`data-hover`) and the reply ringed (`data-flash`); group
  "Notes put away, and note times" in `node-section.ts`; fixture `notes.cards` (replies via `repliesOn`, which
  `clearedCards` now reuses).
- **Docs**: `docs/specification/components.md` § Notes beside cards item 8; `packages/ui/src/node/pattern.json`
  (parts, states, `data-flash`, event, files); `docs/specification/modules.md` regenerated (`npm run map`).
- **Tests**: `packages/ui/tests/node-time.test.ts` (new), `node-core.test.ts` (notesView put away, nodeState from
  `notesHidden`), `node-template.test.ts` (head, toggle, time markup), fixtures in `node-parking`, `note-bubble`,
  `region-template` tests gain `at`; `tests/pages/notes.spec.ts` (Hide, Show from the same place, reload, new reply
  count, keyboard focus, only container `p` laid out, axe), `note-polish.spec.ts` (chip on hover and keyboard focus,
  gone after, screen-reader text, gallery samples); `gallery.spec.ts` (sent pins 9 -> 11: the two answered samples);
  `focus-ring.spec.ts` (the noted card is taller now, so the test also pans its top onto the stage).

### Issues & Resolutions
- Screenshot baselines changed on purpose (every card with notes gets the head row; the gallery grew, so sections below
  shift by a fraction of a pixel and their text re-antialiases): app-gallery `app-cards-{light,dark}`, card-updates
  `card-updates-*`, flag-retire `flag-*` and `retired-*`, gallery `gallery-*` (full page; includes the chat task's
  section as it was then) and `markdown-*`, go-to-card `go-to-card-*`, key-bubble `key-bubble-gallery-*`, layout-controls
  `link-labels-*`, `alignment-*`, `card-widths-*`, lock-board `lock-*`, open-folder `folder-picker-*`, parking-replies
  `parking-replies-*`, person-remove `remove-*`, picker-archive `archive-*`, proposals `proposals-*`, selection-pill
  `selection-pill-gallery-*`, send-access `agent-access-*`, size `node-size-*`, toolbar `toolbar-*`, versions
  `past-version-*`, wires `see-through-*`. Not touched: `chat.spec.ts` baselines (chat task's; they fail by the same
  1px shift), `chat-context.spec.ts` (fails only in the full run, passes alone: order-dependent, chat task's area) and
  `chat-lazy.spec.ts`. One `app-cards.spec.ts` run failed on a trace file another run deleted (shared results folder).
- `notes.spec.ts` once failed on GET / 404 mid-run: another task rebuilt `dist/` at the same time; it passed on rerun.
- Page weight: 155,368 B gzip before (12:2x) -> 156,653 B after my build; +1,285 B is an upper bound (the chat task was
  building in the same window). Since then the chat task lazy-loads the chat, and the page is 149,595 B, under the 150 KB
  budget (`npm run verify` ok). Budget unchanged.
- `controller.ts` is now 303 lines (verify warns over 300; FE_03 adds to it too, a split may be due).
- Clicking a card's toggle while the card is still gliding can miss; seen once by hand, not reproducible in tests.

### Deviations from Plan
- The pill of step 1 replaced by one right-hand Hide/Show toggle, at the maintainer's direction (coordinator message,
  2026-10-19). `BoardState.notesHidden` widened from `Set` to `Map` (same `.has`), needed to count replies after hiding.
- `highlight` has no page test yet: nothing on the page calls it until FE_03's history box.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_02: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_02_hide-notes-and-times.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
