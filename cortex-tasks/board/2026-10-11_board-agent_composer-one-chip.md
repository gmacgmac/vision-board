---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#U1
---

# The composer: one chip for everything attached, a preview of the message, "the person selected these cards"

> **Follows**: `2026-10-11_board-agent_chat-board-context.md`, `2026-10-11_board-agent_chat-no-double-note.md`
> · **From**: maintainer, 2026-10-11 (chat 540, 541, 543) · **Model**: Opus 5.5 · **Go**: given

## Rulings (maintainer; do not reopen)

1. **One chip for everything attached** (540): the composer shows a single chip summarising what the
   message will carry, e.g. "3 answers · 2 selected" (either part alone when the other is empty).
   Selected cards no longer get their own chips; to drop one, deselect it on the board.
2. **A preview** (540, 543): hovering or clicking (and Enter/Space) the chip opens a small popover
   showing exactly what the agent will receive from the board: the same text the server builds
   (the selection block and the answers block), not a summary. One writer: the page and the server
   build it from the same function (`packages/actions`), or the page asks the server for it.
3. **"The person selected these cards:"** (541): the selection block is headed so, and comes right
   after the person's words, before the answers, so "these" means the selection; a message about
   selected cards works like a group comment.
4. Everything else stays: Send = submit with no words; text alone works; waiting while busy; each
   note once.

## Steps

1. [x] Failing tests first: one chip with the right summary (answers only, selection only, both);
   the popover shows the exact text and matches what the fake CLI receives; the heading and order;
   keyboard (focus, Enter/Space, Esc) and axe light and dark.
2. [x] Build (server builder and page; `packages/chat` composer through its context API from the
   chat-context task); gallery samples; screenshots after viewing the diffs.
3. [x] Docs: `docs/specification/chat.md`, api.md 131; a note for the skill (the new heading).

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first, one job per file about 300
  lines (500 hard; split along a logical seam), tests first, tokens only, every state,
  accessibility; `packages/chat` imports nothing from this repo (D-037).
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder; stop
  only your own processes and leave none running; never touch `.visionboard/` or real home-folder
  files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Opus 5.5). No ruling reopened. Gates, one after another: `npm test` 0
(1059 + 6 timing), `npm run check` 0, `npm run verify` 0 (0 warnings), `npm run gen -- --check` 0,
`npm run test:pages` 0 (360 passed).

### One writer (ruling 2): `packages/actions/src/board-message.ts`
- `roundOf` and `ROUND_HEAD` moved here from `apps/board/server/chat-round.ts` (which keeps only
  `previousSend`); `Round` gains `count` (its answer lines). New: `SELECTED_HEAD` ("The person selected
  these cards:"), `SelectedCard { n, title }`, `selectionText(cards)`, `boardBlocks(cards, round?,
  attached?)`: the selection, then `attached` (notes), then the round, blocks apart by a blank line.
  Exported from the front door; README updated. The server's prompt and the page's preview both call it.

### Server (ruling 3)
- `chat-prompt.ts` `promptFor`: words, then `boardBlocks(cards, round, notes)`, then `Board: <id>`. So the
  selection comes right after the words, before the answers. A note an older client still names stays
  under `NOTES_HEAD` "Attached from the board:" (now notes only), between the selection and the answers;
  the page sends none. `message_in` unchanged (words + answers, chips; `ONLY_ATTACHED` with neither).
  `chat-sessions.ts` imports `roundOf` from packages/actions. No route or schema change.

### Composer (`packages/chat`, ruling 1, 2; still imports nothing from this repo)
- `ComposerContext` is now `{ label, text }` (was `{ label, lines }`): the chip's summary and exactly what
  goes. `PREVIEW_LABEL` "What the agent receives". `previewTemplate`: a focusable `role="region"` named by
  it (long text scrolls by keyboard), a small heading and the text in a `<pre>` (pre-wrap).
- `<chat-composer>`: the preview opens on hover (stays while the pointer is on the chip or the preview,
  200 ms grace to cross between them), or held by click, Enter or Space (closed by pressing again, Esc, a
  press elsewhere, or focus leaving both). Esc closes it, focus on the chip, `preventDefault` +
  `stopPropagation` so the board's Esc (deselect) does not run. Opening and closing update the chip in
  place (no redraw under the pointer); a redraw keeps focus and the preview's scroll. Above the composer,
  its width, `--_shadow` (new `--chat-shadow`, mapped to `--vb-shadow-lift` in chat-host.css).
  The generic removable chips (`setChips`) stay for other hosts; README and pattern.json updated.

### Page
- `chat-bridge.ts`: no chips; `selectedCards` → `SelectedCard[]` (full titles), `boardCards` (less the
  spent ones), `cardChip`, `boardContext(s, board, cards, agent)`: label "3 answers · 2 selected" (either
  part alone; "1 answer"), text `boardBlocks(cards, roundOf(s, board, lastSend, agent))`. `bridge.chips()`
  gives the cards the next message carries; `sent` spends them until the selection changes. The chip-remove
  listener is gone (to drop a card, deselect it). `answerLines`/`answersContext`/`boardChips` removed.
- `chat-panel.ts`: `send` takes the composer's chips plus `bridge.chips()`; `boardSend` sends no chips of
  its own. Still 300 lines.
- Gallery: `answers` ("3 answers · 1 selected"), new `selected` ("2 selected"), `answers-open` (the
  preview), `answers-working`; "On the board" shows "1 selected"; the empty sample's caption says the
  board attaches one chip instead of removable chips. Texts built with `selectionText` + `ROUND_HEAD`.
- APCA-W3 0.0.98G-4g, measured: preview text `--vb-ink` on `--vb-surface-region` light 94.3, dark -71.6;
  its heading `--vb-ink-subtle` (short label) 76.2, -48.8. The chip reuses the chip pair already measured.

### Tests
- New `packages/actions/tests/board-message.test.ts` (selection, round count/notes/head, block order).
- `api-chat-context.test.ts`: `SELECTED_HEAD` right after the words, no "Attached" for cards;
  `api-chat-sessions.test.ts`: selection, then the older client's note under "Attached", then the board.
  `chat-bridge.test.ts`: `boardContext` (both, answers only, selection only, the session's agent),
  spent cards, no chips set. `flag-flow.test.ts`: `boardCards`. `templates.test.ts`: the preview markup.
  `chat-fixture`/`api-chat-send` import `ROUND_HEAD` from packages/actions.
- Pages: `chat-context.spec.ts`: labels "1 answer", "1 answer · 1 selected", "1 selected"; the prompt the
  fake CLI receives equals `words + preview + Board: scratch` exactly (with and without words); the note
  once in the preview; keyboard (Shift+Tab to the chip, Enter opens with `aria-controls`, Space closes, Esc
  closes with focus kept and the card still selected), axe light and dark open; a hover test (opens,
  stays crossing to it, closes on leaving, click holds, click closes). `chat-panel.spec.ts`: the one chip,
  the prompt's selection heading, spent card. `chat.spec.ts`: the gallery samples, keyboard and hover.
- Honest order: test edits and code went in alongside each other (no stash to watch them fail on the old
  code); the page tests caught two real hover bugs (an Esc by keyboard suppressing the next hover; the
  chip redrawn under the pointer reopening it after a click closed it), both fixed in the composer.

### Screenshots updated (actual vs expected viewed first)
- `chat.spec` light/dark: the one-chip samples, the new `selected` sample, the open preview, the empty
  sample's caption, "On the board" with "1 selected".
- `flag-retire` flag and retired, `toolbar`, `open-folder` folder picker, light and dark: same content, a
  1px sub-pixel offset (the chat section above grew by one row's worth); viewed the flag and toolbar diffs.

### For the maintainer
1. Notes an older client names still go under "Attached from the board:", after the selection and before
   the answers (the page sends none). Say if you want that heading renamed or the notes dropped.
2. The feed's `message_in` for a selection with no words still reads "Attached from the board." with the
   card chips; the agent's prompt has the new heading. Left as it was.
3. The preview's head line ("up to head N") is the page's latest ledger line; a line arriving between the
   preview and the send moves N by the time the server builds it (the server builds when it goes).
4. The user's own `board:watch` on 4466 restarts on edits under `packages/actions/src`; it restarted
   during this work (not stopped or used by me).
5. Protected files: none needs a change.

### Note for the skill (agent instructions)
A message from the panel now reads, blocks apart by a blank line: `<the person's words>` (absent with
none) / `The person selected these cards:` with `- Card <n>: <title>` lines in the order selected (absent
with none) / `Attached from the board:` with `- Note …` lines (only from an older client) / the Send
message (`The person updated the board:` … `These are the person's answers up to head N. …`; absent when
nothing is new) / `Board: <id>`. "These cards" in the words means the selection: treat a message about
selected cards like a group comment on them.
