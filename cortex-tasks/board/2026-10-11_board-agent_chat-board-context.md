---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#U1
---

# The chat carries the board: answers as context, one message, Send = submit

> **From**: maintainer, 2026-10-11 (chat 530, real use in nclite) · **Model**: Opus 5.5 · **Go**:
> given (530) · Runs after batch 2's FE_01 (committed `230894d`), before batch 2's T_01 and VERIFY_01.

## Problem

In the chat panel a message carries the person's text, the selected cards and notes (chips) and
the board id (`apps/board/server/chat-prompt.ts` `promptFor`); it records a Send but carries none
of the person's ✓, ✗, comments or Later. Those reach the agent only through the Send button's own
message (`chat-round.ts`) or the agent's own reads. So "for these three I acknowledged, write the
tasks" can't be said in one message, and the composer shows nothing when the person ticks a card.

## Rulings (maintainer; do not reopen)

1. **The person's board changes show in the composer**: as soon as there is anything unsent (the
   `board.unsent` condition, batch 1), a chip "3 answers since your last Send" sits with the other
   chips; it opens to show the lines ("2 (question): yes", "5 (finding): comment: …"), the same
   lines the Send message carries (`replyText` / `replyScope`, one writer).
2. **One message carries everything**: the person's text (if any), the selected cards and notes,
   and the answers in card order with the "read up to here" line — the same text the Send message
   builds, reused, not a second writer.
3. **Submit works whenever there is something to send**: text, a selection, or unsent answers. No
   text: the context alone goes. No context: the text alone goes, as today.
4. **Send = submit with no text**: the toolbar's Send and the composer's submit are one action
   when a panel session exists; disabled together when there's nothing at all (Send's "Nothing
   new to send"). With no panel session, Send is as today (outside agents read `check_responses`).
5. While the agent is mid-turn, a submit with context waits and goes when the turn ends, as Send
   does today (one waiting message, newest text).

## Also in this task

- `packages/tokens/src/tokens.css` now has `--vb-state-flag` (maintainer 531B, uncommitted in the
  tree): the flag (batch 2 FE_01) reads it instead of the risk orange. Update the flag screenshots
  after viewing the diffs; measure APCA light and dark.

## Steps

1. [x] Failing tests first: the answers chip appears after ✓ and lists the lines; text + selection +
   answers go as one message (fake CLI receives the combined prompt); submit enabled with context
   and no text; Send and submit identical; waiting while busy; no session: Send as today; keyboard
   and axe light and dark.
2. [x] Build: server (`chat.ts` `sendChat`, `chat-prompt.ts`, `chat-round.ts`: one builder for the
   combined message), page (`chat-panel.ts`, `chat-bridge.ts`, the composer in `packages/chat` only
   through its existing extension points or a small, documented addition), toolbar Send.
3. [x] Docs: `docs/specification/chat.md`, `api.md` if a route changes; the skill's Send-message
   section is batch 2's T_01 (leave a note for it).

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules: patterns first, one job per file about 300 lines (500 hard; split along a logical
  seam), tests first, tokens only, every state, accessibility; `packages/chat` imports nothing from
  this repo (D-037).
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder; stop
  only your own processes and leave no test server running; never touch `.visionboard/` or real
  home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Opus 5.5). No ruling reopened. Gates, one after another: `npm test` 0 (1053 + 6 timing), `npm run check` 0, `npm run verify` 0
(0 warnings), `npm run gen -- --check` 0, `npm run test:pages` 0 (357 passed).

### Server: one message, one builder (rulings 2, 3, 5)
- `chat-prompt.ts` `promptFor(s, board, msg, round?)` is the one builder: the words (`text` now
  optional), "Attached from the board:" (notes, cards), then the Send message (`chat-round.ts`
  `roundText`, now `undefined` when nothing is new for the agent), then `Board: <id>`. The
  `message_in` shows the words and the answers with the chips; with neither, `ONLY_ATTACHED`
  ("Attached from the board."). The board's Send (act) builds through it too, so its prompt now
  ends `Board: <id>` (its `message_in` is the answers as before).
- `chat-sessions.ts` `tell(live, msg)`: words, chips and the answers since the agent was last told
  (`told`, else the Send before); recorded as the board's Send **when it goes** (so the page's
  `board.unsent` and the server's `told` agree). While a turn runs: words alone `busy` (409, approvals
  released, as before); with chips or new answers it waits (`LiveSession.post(build, line)`, one per
  session, a second message joins it: both messages' words, every chip, the earlier Send; built when
  the turn ends). `round` (the act) uses the same `deliver` and hands over only when something is new
  for the agent (VERIFY_01 finding 1 of the Send set: no "Still open"-only message), joining a waiting one.
- `chat.ts` `sendChat`: validates the chips first; folder sessions take words only; nothing at all is
  `invalid` at `/text`; 202 answers the `message_in`, or the wait's `system` line
  (`QUEUED_WORDS` "Your message goes to the agent when it finishes this turn." with words, else
  `QUEUED`).
- `chat-session.ts`: `post(build, line)` returns the event (sent now) or the wait line; a build that
  fails later emits the existing "could not be sent" line.

### Contract (route change)
- OpenAPI 1.17.0: `send_chat` description and 202; `chat-message-request` `text` optional;
  `chat-session` gains required `agentId` (the agent id the session writes as, never a secret), so
  the page shows exactly the lines that agent is told (`replyScope` with that agent, api.md 41).
  `chat-index.ts` stores and shows the same shape (`publicSession` is a copy). `npm run gen`,
  `npm run map`. api.md 131 and the operations row; chat.md item 5 and "On the board"; READMEs.

### Page (rulings 1, 4)
- `packages/actions` `replyLines` (`replyText` in parts; `replyText` now joins them: one writer).
- `chat-bridge.ts` `answerLines(s, board, agent)` (scope from `s.lastSend`, the session's
  `agentId`; every answer when no session yet) and `answersContext` ("N answers since your last Send");
  the bridge sets it with the chips (`BoardSide.ledger`, `ChatSide.agent`/`changed`; `drawn` renamed
  `refresh`, also called when the session changes).
- `chat-panel.ts`: `ChatHost.holds` on a board; `send` returns the problem or null and, when the
  answer is the wait line, sets the waiting state; `sendsInChat` (session on the open board and
  something attached) makes `boardSend` the composer's message with no words, else the act as
  before; `d.attached` → `shell.chatAttached`, and ToolbarEnd enables Send on
  `shell.unsent || shell.chatAttached`. `messageBody` leaves out blank words. controller.ts stays 300.
- **packages/chat addition (documented in its README and pattern.json)**: `ChatHost.holds`;
  `ComposerView.attach`; `sendIntent(text, view, attached)`; `ComposerContext { label, lines }` and
  `<chat-composer>.setContext()` / `.attached`: one chip, not removable, a button with
  `aria-expanded`/`aria-controls` that opens a list of the lines named by the label; focus stays on
  it across redraws; the hint while working with something attached: "The agent is working. What is
  attached goes when it finishes; Stop it to send words alone." Imports nothing from this repo.
- Gallery: chat samples `answers`, `answers-open`, `answers-working`.

### The flag token
- node.css and board.css read `var(--vb-state-flag)` (no fallback); comments, node pattern.json.
  APCA-W3 0.0.98G-4g, measured: on the card light 74.5, dark -56.6; on the chip (sunken) 65.1,
  -55.5; chip hovered (deep) 58.7, -53.6. All above the decoration tier (30), even reading text.
  New chat pieces: context lines `--vb-ink` on sunken 84.8 / -70.5; chip words `--vb-ink-strong` on
  accent-soft 93.8 / -94.2; its mark `--vb-ink` 83.5 / -70.9.

### Tests
- New `apps/board/tests/api-chat-context.test.ts` (7: agentId; one message in order and the Send
  recorded; only what is new next; no words; cards alone; busy: 409 words alone, held, joined, one
  wait line, built at the end, one Send when it goes; folder nothing → 422). `api-chat-send.test.ts`
  expects the trailing `Board: pricing`. `chat-bridge.test.ts` (answer lines by agent, the context,
  `sendsInChat`, blank words), `packages/chat/tests/templates.test.ts` (holds, sendIntent, context chip).
- Pages: new `tests/pages/chat-context.spec.ts` (9: the chip after ✓ and its line; words + card +
  answers as one message in order; no words, and Send identical in shape; disabled together, a
  selected card enables both; busy: held with words, Send waiting, built at the end; no session: the
  act alone, no run; keyboard Enter/Space with focus kept, axe light and dark, open and closed).
  `chat.spec.ts`: the three samples, a keyboard test of the chip in the gallery. `chat-panel.spec.ts`:
  `chips` counts removable chips only. `chat-send.spec.ts` axe test: its session is the model
  picker's new one, whose agent does not hold the first agent's container (api.md 41), so the
  comment now goes as its note chip and no "Still open"-only round: it checks the note.
- Honest order: the server, page and composer code were written alongside the tests, not strictly
  after watching each fail (no stash allowed to run the new tests on the old code); the page spec
  caught a real focus bug (the chip redrawn under focus), fixed in the composer.

### Screenshots updated (actual vs expected viewed first)
- `chat.spec` light/dark: the three new answers samples; the rest unchanged.
- `flag-retire` flag light/dark: the flag in `--vb-state-flag` (#c2410c / #fb923c) instead of the
  risk orange (plus text antialiasing); retired light/dark, `toolbar` light/dark and `open-folder`
  folder picker light/dark: text antialiasing only (the gallery's chat section above grew, so the
  sections below sit at another fractional offset; FE_01 saw the same).

### For the maintainer
1. The answers chip is not removable: it is the board's state, and Send (= submit) always carries it.
2. A note shows twice in the prompt: as its chip ("Attached from the board") and as its answer line.
   Dropping notes from the chips (the answers carry them) would remove the repeat; left as ruled.
3. Answers on a container the session's agent can't answer (another agent's) are not in its chip or
   message (api.md 41); Send then falls back to the act, so outside agents still get a Send. With no
   session yet the chip shows every answer; the new session's agent may be told fewer.
4. A message held while the agent works records the Send when it goes, not when pressed; the chip
   stays until then (everything in it goes with the held message). A second held message joins the
   first (both words kept) rather than replacing it.
5. `send_chat` with words alone while busy is still 409 (ruling 5 speaks of a submit with context).
6. Protected files: none needs a change. Proposed wording for the steering terminology (optional):
   "**Send**: the person's 'over to you'; on a board with a chat session it is the chat's message with
   no words, carrying the answers since the last Send."

### Note for batch 2's T_01 (the skill's Send-message section)
A message from the panel now reads, blocks separated by a blank line:
`<the person's words>` (absent with no words) / `Attached from the board:` with `- Note <seq> on card
<n> "<title>": <text>` and `- Card <n>: <title>` lines (absent with none) / the Send message exactly
as before (`The person updated the board:`, `Board "<title>" (v<N>)`, the answer lines, `Still open:
…`/`Nothing left open.`, `These are the person's answers up to head N. To read anything newer, call
check_responses on board "b" with after N.`; absent when nothing is new for this agent) / `Board: <id>`.
So the board's Send (no words) is the same message starting at `The person updated the board:` and
ending `Board: <id>`. A message with only chips shows "Attached from the board." in the feed. The
agent should act on the words with the answers as context, in that order, and not re-read
`check_responses` for what the message already covers.
