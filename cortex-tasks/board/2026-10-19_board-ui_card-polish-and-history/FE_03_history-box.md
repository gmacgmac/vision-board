# FE_03_history-box: History button and box

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

An ⓘ button at the far right of every card footer that opens the card's history: time and one
line per event, newest first; a note or reply row takes you to that note on the card.

---

## Context

PLAN.md § Key Changes 7. Mock-up agreed in chat 2026-10-19: rows like "10:05 Agent drew v3 · Kiro
chat", "09:30 You sent note 1"; no note text; the flag never shows. **Read previous task notes in
TASK-STATUS.md before starting.**

---

## Maintainer update (2026-10-19, point 20) — this overrides the steps below where they differ

- **Keep it small.** The box lists only: when the card was first drawn, each update (vN), each note
  sent, each agent reply, ✓ / ✗ / reopened, and app allowed / stopped. No other kinds.
- **No server read.** The page already reads every ledger line as it arrives (`live.ts`). While
  folding, keep for each card a compact list of `{ seq, at, kind, ver?, note?, reply?, agent? }` — no
  text — in a new `packages/actions/src/card-times.ts` (fold.ts is at its 300-line limit), exposed on
  the board state the page already holds. Reuse BE_02's "is this line about this card" logic and its
  `HistoryRow` words (`packages/actions/src/card-history.ts`); don't write a second matcher. The box
  then reads from memory: no fetch, no loading state beyond the first paint.
- Note and reply times on the card itself are FE_02's hover chip; the box only adds the rest.
- Keep the footprint small: the board page is over its 150 KB gzip budget (maintainer deciding);
  report your gzip delta.

---

## Inputs

- **Files to modify**: `packages/ui/src/node/node-template.ts` (`footer()`: ⓘ after the flag;
  a box beside the card), `node-popover.ts` / `node-popover.css` (the card popover pattern: a
  third popover kind, `history`, beside `proposal` and `handover`), `node-icons.ts` (info icon),
  `vb-node.ts`; a new `apps/board/src/board/history-flow.ts` (open: read lines, `cardHistory`,
  render, row clicks) wired in `controller.ts`; the gallery
- **Shared artifacts to reuse**: `cardHistory` / `HistoryRow` — BE_02; `noteTime` and the note
  highlight — FE_02; the footer layout — FE_01
- **Patterns to follow**: `bindCardPopover` (open, Esc, focus return, one box at a time);
  `menu-keys.ts` for arrow keys over rows
- **Skills**: `cortex-architecture` · `cortex-docs` (components.md: the footer and the popover) — load before starting

---

## Steps

1. [x] Footer: ⓘ (24px, like the flag) on every card that has a footer, labelled "History of
   card N", `aria-haspopup="dialog"`, `aria-expanded`. Check footers without items (a note card):
   if a card kind has no footer today, list which in Implementation Notes and ask before adding one.
2. [x] Box: heading "Card N history"; a list, newest first, of time (`noteTime`) and words; loading,
   empty ("Nothing has happened to this card yet"), error (with Try again) and partial states. Built
   only on open; closes on Esc, on outside press, and when another card box opens.
3. [x] Rows with `note` / `reply` are buttons: close the box, run FE_02's highlight on that note.
   Other rows are plain text. Version rows open nothing (rewind is tracker N23).
4. [x] Live: if a line for the card arrives while the box is open, add its row at the top without
   moving focus.
5. [x] Footer room: S card and an app card at its smallest — nothing wraps; if it does, STOP and
   ask (don't shrink other controls on your own).
6. [x] Tests first: a page spec `tests/pages/card-history.spec.ts` (open by click and keyboard,
   rows in order, no note text and no flag in the box, note row scrolls and highlights, live row,
   Esc returns focus, axe clean); gallery entry with each state.

---

## Validation

- [x] Page tests pass; `npm test`, `npm run verify` pass; `npm run test:pages`: all but the appTitle finding (see Issues)
- [x] APCA tiers light and dark for the box and the ⓘ

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
**Completed**: 2026-10-19 14:55  

### Changes Made
- **One matcher, one set of words** (`packages/actions/src/card-history.ts`, BE_02's model refactored, its 8 tests
  unchanged and green): `cardsAbout(e, look)` (the cards a line is about, by identity), `saidOf(e, look)` (what it
  says, as data: `Said`), `noteNumbers`, `historyRow` (the row's words from one `SAY` table). `cardHistory` now runs
  on them.
- **Card times** (`packages/actions/src/card-times.ts`, new): `foldCardTimes(s, e)` keeps per card a list of
  `CardTime { seq, at, kind, ver?, note?, cards?, agent? }` (no text; `cards` is a group note's card count, so the
  words match `cardHistory`'s "on 2 cards"; a reply row's reply is its own `seq`, so no `reply` field), only for
  `TIME_KINDS` (drawn, note-sent, replied, check, cross, reopened, app-allowed, app-stopped). Called at the end of
  `fold.ts` `applyEvent` (private marks return before it), into `LedgerState.times`. `cardTimeRows(s, id)` gives the
  box's rows newest first, notes numbered from the card's log, agents by label. Exported from the actions front door.
- **UI** (`packages/ui/src/node/node-history.ts`, new): `historyButton` (the ⓘ, `button.vb-act.vb-history`, 24px like
  the flag, "History of card N", `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`), `historyBox` (the
  empty box, `data-pop="history"`, tabindex 0, heading "Card N history"), `historyMarkup` / `historyRowMarkup`
  (rows; a button with `data-history-note` / `data-history-reply` only where a row names a note or a reply).
  `node-template.ts` `footer`: the ⓘ after `.vb-node-actions`, the box after the footer, with
  `NodeTemplateOptions.history`. `INFO_ICON` in `node-icons.ts`. `node-popover.ts` `bindCardPopover` takes an
  optional tab selector, fires `POPOVER_SHOW` (`{ name, box }`) as a box shows, closes on `POPOVER_CLOSE`, and moves
  focus to the box itself when the box is a tab stop. `vb-node.ts` binds the history popover (3 lines; 297).
  CSS in `node-popover.css` (rows, link colour, hidden zoomed far; the ⓘ follows the two-tabs lift).
- **Page** (`apps/board/src/board/history-flow.ts`, new): `createHistoryFlow` fills the box on `POPOVER_SHOW` from
  `versions.state ?? live.state` (`cardTimeRows` via `idOf`), a note or reply row sends `POPOVER_CLOSE` and calls
  `noteHide.highlight`, Up/Down/Home/End over the row buttons (`menuKeydown`), `refresh()` prepends new rows while
  open. `controller.ts`: one import, one create line, `history.refresh()` on the existing onLines line and
  `history: on('cardHistory')` on the existing createDrawing line (303 -> 305 lines; no split). `draw.ts` passes
  `history` to the card set.
- **Flag** `cardHistory` (on by default) in `packages/format/src/flags.ts`.
- **Gallery**: `apps/board/src/gallery/history-section.ts` (the ⓘ at rest, the box open with rows from the
  fixture's times, the empty state), behind the flag.
- **Tests**: `packages/actions/tests/card-history.test.ts` (+2: card times equal `cardHistory` filtered to the box's
  kinds on every card; no words, no private mark kept; removed note numbering), `packages/ui/tests/node-history.test.ts`
  (new, 2), `tests/pages/card-history.spec.ts` (new, 8: click, keyboard, rows in order, no note text and no flag, note
  row unhides and rings, reply row rings, live row with focus kept, Esc returns focus, S card and smallest app card
  footers on one line with Allow and Allowed ▾, axe light and dark).
- **Docs**: `docs/specification/components.md` (§ Notes beside cards item 5 and 8; new § A card's history),
  `packages/ui/src/node/pattern.json` (files, footer, `flaggedStates.history`), `packages/actions/README.md`,
  `docs/specification/performance.md` approach 6, `docs/specification/modules.md` regenerated.

### Issues & Resolutions
- Step 1: every card with a footer gets the ⓘ (items, and app cards without a number). Cards without a footer today:
  a non-item that is not an app card (with `everyNode` on, every card is numbered, so none on the board). Not added.
- Step 2: no server read, so no loading or error state (maintainer point 20); empty state kept.
- Step 5: the footer fits on an S card (280px) and the smallest app card (280 x 120) with Allow and with Allowed ▾:
  one line, nothing wraps, checked by the page spec and by eye.
- **Found, not fixed (needs a decision; FE_04 territory)**: `app-states.spec.ts` "the appTitle flag …" now fails axe
  `target-size` on "Comment item 5". Cause: with the `appTitle` flag (off by default), an `invalid` app card at
  280 x 160 draws its state view past the panel (`node-app.css` `[data-app-title] vb-node .vb-app-state` padding), so
  "Check again" overlaps the footer row; the ⓘ moves the quick actions 30px left, under it. With `-cardHistory` it
  passes. Options: the state view scrolls inside the panel under appTitle (`overflow: auto`), or FE_04 (the name moves
  to the footer) reworks it. Left as is, not to pre-empt FE_04.
- APCA on `--vb-surface-raised` (light / dark): time and agent `--vb-ink` 94.3 / 71.6, words `--vb-ink-strong`
  104.5 / 94.9, link rows and heading `--vb-accent-text` 74.8 / 49.8 (Lc 45 tier), ⓘ `--vb-ink-subtle` 76.2 / 48.8
  (Lc 30 tier); on the hover fill 84.8 / 70.5, 95.1 / 93.8, 65.3 / 48.7.
- Page weight: +2,195 B gzip (149,836 -> 152,031 B, measured against a copy with the history wiring and CSS taken
  out); budget 200 KB; `npm run verify` ok (warnings: `controller.ts` 305, `fold.ts` 308 lines).
- Screenshot baselines changed on purpose: `card-images.spec.ts` `card-image-{light,dark}` and
  `card-image-states.spec.ts` `card-image-refused-{light,dark}` (the ⓘ in the footer), `gallery.spec.ts`
  `gallery-{light,dark}` (the new section).
- A new version of the card draws its markup again, which closes an open box (as for the proposal box).
- An accepted proposal (✓ or ✗ via a proposal) is `proposal-answered`, not in the maintainer's list, so not shown.
- Full page run: 559 passed, 7 failed before the baseline update (6 are the baselines above; 1 is the appTitle
  finding).

### Deviations from Plan
- Maintainer point 20 replaced the server read: no `read_ledger` fetch, the fold keeps per-card times.
- Box and rows built by the page into a template-drawn box (`POPOVER_SHOW`), not by `vb-node.update`, so the
  element stays under 300 lines and the box is built only when it shows.

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_03: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_03_history-box.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
