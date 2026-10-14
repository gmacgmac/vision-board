---
category: board-ui
status: completed
created: 2026-10-14
tracker: cortex-tasks/tracker.md#U1
---

# Larger popovers, and a click opens the whole comment exchange

> **From**: maintainer, 2026-10-14, using the board on a MacBook Air (chat 684-688: "the comment box
> … too small … the whole thing needs to scale up 1 step"; "when agent responds, i only see the
> entire text IF the user hovers – i can't click it"; "lets try on clean git then test") · **Model**:
> Opus 5.5 · **Go**: given (688, including the token change in ruling 4)

## Rulings (maintainer; do not reopen)

1. **One step bigger** for the comment box (`<vb-note-bubble>`, all modes: new, edit, sent):
   reading text and the textarea `--vb-text-md` → `--vb-text-lg`; head, hint, buttons, error
   `--vb-text-sm` → `--vb-text-md` (the number chip and `kbd` `xs` → `sm`); width 300px → 360px;
   textarea taller in proportion; buttons and paddings grow with the text (targets at least 32px).
2. **A click opens the exchange**: a click (or Enter/Space) on a person's note **or on an agent's
   reply to it** on a card opens one window showing the note, then every reply to it in order (who
   and when, as the card shows them), placed beside the card next to what was clicked. A reply that
   names no note of the card opens on its own. The person's own note keeps its Edit (sent mode as
   today); replies are read-only. Container notes and their replies (`.vb-nblock-reply`) behave the
   same way.
3. **The hover preview stays** for a quick look (`bindNoteTip`); the click is the way to read and
   keep it open. Fixes the bug where Enter on a reply calls `note.click()` and nothing opens.
4. **All popovers on shared tokens** (`packages/tokens/src/tokens.css`, approved): add popover
   tokens (text size, small text size, width, max height, padding) and make every popover read them:
   the note bubble, `.vb-card-pop` (proposal and handover tabs), the container note `.vb-note-pop`,
   and the note/reply hover tip. So they scale together. Replace the literals found there (300px,
   14px, 10px radii, 240px/320px max heights) with tokens. APCA measured light and dark for every
   pair that changes.
5. **A note locks once it is answered** (added 2026-10-14, chat 720-725): a note can be edited or
   removed only while it stands, by its writer, and **before whichever comes first: a Send after it,
   or any agent `reply`/`append` to it**. After that it is history: the server refuses `note-edit`
   and `note-remove` (wording like the existing "a sent note is history; write a new note
   instead", saying the agent answered it), and the exchange window shows it read-only with the
   replies (no Edit, no Remove). One derived state in the action layer (e.g. `ItemNote.locked`,
   replacing the page's own reading of `sent`), read by both the server's check (`act.ts`
   `changeProblems`) and the page (`notes.ts` mode choice), so they can't disagree. Card and
   container notes alike; a group note locks when any reply names it.

## Steps

1. [x] Tests first: sizes read from the tokens (computed font size 15px, width 360px); a click and
   Enter on a reply open the exchange with the note and its replies in order; an orphan reply opens
   alone; container note and reply the same; hover tip still shows; Esc closes and focus returns;
   keyboard and axe light and dark; the sent window still edits.
2. [x] Build: extend `vb-note-bubble` (a replies list in `BubbleView`, read-only) rather than a new
   popover; `apps/board/src/board/wiring.ts` routes a reply click to its note's exchange; the region
   side the same. Gallery entries for the exchange (with replies, orphan reply) and the bigger box.
3. [x] Screenshots: view every diff before updating; say which changed and why.
4. [x] Docs: `docs/specification/components.md` (popovers, the exchange), the patterns'
   `pattern.json`.
5. [x] Ruling 5, tests first: unit (an agent reply locks a not-yet-sent note; a Send locks it; edit
   and remove refused with the reason; the writer's unanswered note still edits; container and group
   notes) and page (click the agent's reply to an unsent note: read-only, no Edit/Remove; keyboard,
   axe light and dark). Then build; docs (`api.md` note rules, `components.md`); then the five gates.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first (extend, don't fork), one job
  per file about 300 lines (500 hard; split along a logical seam), tests first, tokens only, every
  state, accessibility (WCAG 1.4.13 for the hover tip; the window is a non-modal dialog).
- If deviation is needed, stop and say so. No git commits or stash. Scratch in the system temp folder
  (never the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/`; don't use the board on 4466. Only one page-test run at a time.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes


**Status**: Completed 2026-10-14 (paused once for the maintainer, then resumed for ruling 5; see the end).

**Maintainer's changes during the task** (recorded here, they replace the sizes in rulings 1 and 4):

- **2026-10-14, chat 698**: the width (360px) is right, the text too small: reading text one more
  step (`--vb-pop-text` 18px, small text 15px), button heights, chip and textarea scale with it, the
  note/reply tip and `.vb-card-pop` follow the same tokens.
- **2026-10-14, chat 701**: the text typed in the comment box is too big at 18px; it must be the size
  of the text around it (15px), and so must the sent note's read-only text and the replies, so the
  whole box is one size; width and buttons as they are. **My call** (offered by the maintainer):
  collapse to a single `--vb-pop-text = var(--vb-text-lg)` (15px) and remove `--vb-pop-text-sm`,
  rather than keep two tokens with the same value. Every popover (bubble, card popover, container
  preview, note/reply tip) is therefore 15px throughout; labels and chips in them are
  `--vb-text-md` (13px).

**What was built**

- **Tokens** (`packages/tokens/src/tokens.css`, approved in ruling 4): `--vb-pop-text` (15px),
  `--vb-pop-w` (360px), `--vb-pop-max-h` (320px), `--vb-pop-pad` (16px). They replace the literals
  300px, 14px and 10px radii (now `--vb-radius-lg`/`-md`), 240px and 320px max heights in the note
  bubble, `.vb-card-pop`, `.vb-note-pop` and `.vb-note-tip`. Markdown inside a popover follows it
  through a new hook, `--vb-md-text` (markdown.css; paragraphs, lists and quotes; default
  `--vb-text-md`), which every popover sets to `--vb-pop-text`.
- **Bigger box** (`note-bubble.css`): 15px everywhere (text typed, head, hint, buttons, error, sent
  text, replies), chip and `kbd` 13px, textarea three lines tall at rest (calc from the token), max
  `--vb-pop-max-h`; buttons 32px. The card popover's Reject/Accept are 32px inside the box only (the
  card's stepper keeps its small `.vb-pop-btn`).
- **The exchange** (ruling 2): `bubbleView` takes `replies` (`ReplyEntry`, as the card shows them) and
  a new mode `reply` (an orphan reply on its own, Close only; `readOnlyMode`); the template draws a
  read-only `.vb-nb-thread` (role group, labelled, a tab stop, scrolls as one) with the sent note then
  `ol.vb-nb-replies`. `partAnchor` places the bubble beside the card with its arrow on the note or
  reply pressed. Page: `wiring.ts` routes `.vb-node-reply[data-reply]` to `showReply` (also in
  `ACTING`, so a past version or a locked board treats it as `showNote` is treated);
  `notes.ts` `reply`/`show(…, fromNote)`/`showContainer(region, part)`; what the bubble says moved to
  the new `note-views.ts` (keeps `notes.ts` at 300 lines). Focus returns to the note or reply it
  opened from. Space (as well as Enter) on a note or reply opens it (`bindNoteTip`), which fixes the
  dead Enter on a reply (ruling 3). Container: the block's note text and each `.vb-nblock-reply` are
  tab stops that emit `vb-region-note` `open` (with `reply`); `pointer.ts` treats the block as
  interactive.
- **Gallery**: two exchange samples (a sent note with its reply, an orphan reply) in the note bubble
  section; stages widened for the 360px box; stage heights rounded to whole pixels; the note-preview
  row's gap is the popover width (`.g-tips`), so the open tip is no longer covered by the next card.
- **Tests**: `packages/ui/tests/note-bubble.test.ts` (replies, reply mode, thread markup, `partAnchor`),
  `region-template.test.ts` (tab stops); new `tests/pages/popover-thread.spec.ts` (sizes from the
  tokens; click, Enter and Space on a reply; orphan reply; unsent note still edits and saves, with its
  reply under the box; container reply and note; arrow on the part pressed; Esc returns focus; hover
  tip still shows; axe light and dark; gallery token checks); shared agent helpers moved to
  `tests/pages/agent-board.ts` (used by `parking-replies.spec.ts` too). Updated: `parking-replies`
  (a reply click now opens the exchange), `note-polish` (limits read the 320px token).
- **Docs**: `docs/specification/components.md` § Notes beside cards items 5-6; `pattern.json` of
  note-bubble, node, region and markdown.

**Deviations**

- "Who and when" (ruling 2): the card shows who only ("Agent reply · label"), no time, so the exchange
  shows exactly that (ruling: "as the card shows them"). No time is drawn anywhere yet.
- `layout-controls.spec.ts` "the note bubble beside card 4 leaves card 5's footer buttons clear": with
  the 360px box there is no clear place at card 4 in the left column (right: card 5's buttons, left:
  board edge, below: card 11's buttons), so the bubble covers card 5's buttons there. The test now
  pans the board right first (focus kept on card 4) and checks the bubble goes left, clear of card 5.
- The handover box keeps its own 440px max height (not one of the literals named).

**APCA** (APCA-W3 0.0.98G-4g, light / dark; colours unchanged, sizes changed): text typed and buttons
(ink-strong on card) 104.5 / 94.9; sent note and popover text (ink on raised) 94.3 / 71.6; head, hint,
placeholder (ink-subtle on raised/card) 76.2 / 48.8 (label tier 45); primary button (ink-on-fill on
accent-fill) 77.4 / 60.4; error and Remove (state-drop on raised) 72.9 / 46.9 (label tier); reply who
(ink on sunken) 84.8 / 70.5; reply text (ink-strong on sunken) 95.1 / 93.8; code in a reply
(ink-strong on deep) 88.7 / 91.9; popover labels (accent-text on raised) 74.8 / 49.8 (label tier);
proposal "why" (state-context on raised) 62.6 / 62.9. All at or over their tier.

**Screenshots changed** (42; each set viewed against the old one before updating):
- Real changes: `gallery-*` (note bubble section: bigger boxes, two exchange samples; note preview
  tips 360px), `parking-replies-*` (handover box 360px, 15px), `proposals-*` (proposal boxes 360px,
  15px, 32px buttons), `card-updates-*` (the out-of-date proposal sample).
- Layout shift only: every gallery section below the note bubble section moved by a fraction of a
  pixel (the section grew by rows whose captions are fractional), so text antialiasing differs and
  some heights are ±1px: chat, flag, retired, key-bubble, alignment, card-widths, link-labels, lock,
  folder-picker, remove, archive, selection-pill, agent-access, node-size, toolbar, past-version,
  see-through (dark and light). Diffs viewed: antialiasing only.

**For the maintainer**

1. Collapsed to one `--vb-pop-text` (15px) per your chat 701 option; `--vb-pop-text-sm` removed.
   Every popover, not only the comment box, is now 15px throughout. Say if the card popover or the
   tip should differ.
2. The 360px box no longer finds a clear place beside a card in the board's left column when
   neighbours' buttons are on its right and below (card 4 on the roadmap board): it covers card 5's
   buttons. A "cover the least" fallback in `placeBubble` would fix it; not done (it changes the
   earlier field-report rule "first side when none is clear").
3. Ruling 2 says "who and when": the card shows no time on a reply, so neither does the exchange.
   Adding the reply's time (the ledger has `at`) to card and exchange is a small follow-up.
4. A reply click is treated like a note click on a locked board or a past version (nothing opens,
   the toast says why). Reading might reasonably stay allowed there; say if so.
5. The gallery's later sections shift by sub-pixel amounts whenever the note bubble section changes
   height; whole-pixel caption heights would stop that churn (not done).

**Where it stopped (paused)**

- Built and working: everything above. The final page-test run had already finished when the pause
  came, so nothing was cut short; no playwright run or test server of mine is left running (the
  board on 4466 untouched).
- Gates, one after another, on the final tree: `npm test` exit 0 (1214 + 7 passed), `npm run check`
  exit 0, `npm run verify` exit 0 (0 warnings), `npm run gen -- --check` exit 0, `npm run test:pages`
  exit 0 (423 passed).
- Screenshots: all 42 listed above updated (with `--update-snapshots`, after viewing the diffs), then
  confirmed by the clean run. None left out of date.
- Remains: only the decisions in "For the maintainer" (items 1-5). Nothing committed; all changes are
  in the working tree.

**Ruling 5: a note locks once it is answered** (resumed 2026-10-14)

- **One derived state**: new `packages/actions/src/note-lock.ts`: `lockOf(s, board, ask)` gives
  `sent` (a Send after it), `answered` (a `reply` naming it in `to`, on any of its cards, or any node
  for a container note; or a newer version of one of its cards than when it was made, which is what
  an `append` writes and what api.md 36 already counts as an answer), or nothing. `sentNotes`, moved
  here with `sentAfter` and `replied` (re-exported from `fold.ts` and `conditions.ts`, so nothing
  else moves), now marks `locked: true` on every such note (`sent: true` still only after a Send).
- **Server**: `act.ts` `changeProblems` refuses `note-edit`/`note-remove` with "note N was answered
  by the agent, and an answered note is history; write a new note instead" (the sent wording stays
  for a Send). The "one note not yet sent" checks (card and container) use `lockOf`, so a new note
  may start once the old one is answered.
- **Contract**: `locked` added to the API `note` schema (`common.schema.json`); `npm run gen`
  regenerated `packages/mcp/src/tools.generated.json`. `get_board` and the other reads carry it.
- **Page**: `notes.ts` chooses edit or read-only from `locked` (not `sent`): the unsent-note lookups,
  `show` and `showContainer`. The bubble head says "Note 1 on 42, answered" when no Send came yet
  (`BubbleInput.answered`, from `note-views.ts`). Card: an answered note is grey, "Your note 1 ·
  Answered", pin "…, answered. Show it" (`notesView`). Container: `noteStage` makes it `answered`,
  state line "Answered", read-only, no badge.
- **Tests first**: `packages/actions/tests/note-lock.test.ts` (reply locks an unsent note; Send locks
  it; a newer version/append locks it, a reply naming none or another note does not; group note
  locked by a reply on its other card; container note; the writer's unanswered note still edits; the
  refusal wording; a new note may start), red before the build. Then `node-core`, `region-core`,
  `note-bubble` unit tests; page: `popover-thread.spec.ts` (click and keyboard on the reply to an
  unsent note open it read-only, Close only, no Remove/Save; Esc back to the reply; C then starts a
  new note; axe light and dark; and the writer's unanswered note still edits and saves);
  `parking-replies.spec.ts` now expects "answered".
- **Docs**: api.md 60 and 73 (refused when answered) and new 143; components.md § Notes beside
  cards item 7.
- **Screenshots**: none changed (no gallery fixture note is answered before a Send).
- **Gates**, one after another: `npm test` exit 0 (1222 + 7 passed); `npm run check` exit 0;
  `npm run verify` exit 0, no warnings; `npm run gen -- --check` exit 0; `npm run test:pages` exit 0
  (425 passed). No test process left running; 4466 and `.visionboard/` untouched.

**For the maintainer (ruling 5)**

6. "Append" has no event of its own (api.md 95: it is a new node version), so a note is locked by
   any newer version of its card, as api.md 36 already counts an answer. That includes an agent's
   redraw of the card that does not answer it. Say if only a `reply` (and an append proper) should
   lock it.
7. If the agent answers while the person has that note open in the editor, Save is refused with the
   server's reason in the bubble (the words are kept); the bubble does not switch to read-only by
   itself.
