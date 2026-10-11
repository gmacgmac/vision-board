---
category: board-agent
status: v2.3
created: 2026-10-09
scope: Written scenarios the skill (SKILL.md) is tested against before it changes (project rule 17)
keywords: [skill, scenarios, agent, board]
---

# Skill scenarios

Each scenario is a situation and what a good run does. Run them against `SKILL.md` before a
change to it ships: read the run's tool calls and its chat words against "A good run". "Panel"
means the board's own chat panel; "own chat" means an agent connected to `vb` from its client.
Names and content are made up. Scenarios 1 and 3 are the ones VERIFY_01 runs through the panel.
v2 (skill v2, every card in the conversation): 1, 2, 5 and 7 updated; 10 and 11 new.
v2.1 (skill v2.1, panel Send and first board): 12 and 13 new. In every panel scenario the agent
writes no text until the turn's last one or two lines.
v2.2 (skill v2.2, field report batch 1): 14 new, from the first real use's lanes board.
v2.3 (skill v2.3, field report batch 2): 1, 11 and 14 updated (`column`, numbers from 1 per board,
retire); 15 (restructure with retire) and 16 (one panel message with words, a card and answers) new.

## 1. A review with 12 findings (panel)

**Situation.** On an empty board "Checkout review", the person writes: "Review the checkout
module and put what you find on the board."

**A good run**
- Reads the code (no approval needed), then draws in **one** `write_board` call: a container per
  category (for example "Correctness", "Security", "Tests"), mode `grid`, 12 `finding` or `risk`
  cards, every item keyed (`checkout-f1` ... `checkout-f12`), written in the order to be read.
  Anything it needs the person to decide (fix now or later, which option) is a `question` or
  `decision` card, not a line in a finding's body.
- Short titles, bodies of a few lines with the file and symbol; no coordinates; no `board` item
  (the board exists and is not its own).
- Links only where one finding causes another, by key; none to show order or relatedness.
- Chat words: one line, such as "Done: 12 findings in 3 groups on Checkout review."
- **Fails if** it lists the findings in the chat, writes one call per card, names `item` on a
  node, uses `column`, `row` or `flow` for the findings, or calls `join`, passes a `secret`, or calls
  `check_responses` with `wait`.

## 2. A comment to answer (own chat)

**Situation.** After round 1, the person writes a comment on card 7, a finding ("Is this only on
the guest path?"), acknowledges questions 3 and 4, drops decision 9, and presses Send.

**A good run**
- `check_responses` with the `head` it kept and `wait`, until the Send arrives; the acts come in
  card order (3, 4, 7, 9) and it works through them in that order.
- Treats 3, 4 and 9 as decided and never raises them again.
- `show_node` 7, checks the code, then `reply { n: 7, to: <the comment's seq>, text }` with a
  short answer. If the answer changes the finding, it also `append`s the fact to card 7 with
  `base`.
- The write answer no longer lists 7 in `pending`; it tells the person in one line.
- **Fails if** it answers only in chat, rewrites card 7 to add one sentence, treats the comment
  on a finding as needing no answer, or redraws the decision the person dropped.

## 3. A card to extend (panel)

**Situation.** The person selects card 12 (a finding about retries) and writes: "Add what the
payment provider's docs say about timeouts."

**A good run**
- The message carries card 12 as an attachment; the agent `show_node`s 12 for its latest `ver`.
- `append { n: 12, text, base }` with the new paragraph and its source; one new version, nothing
  else on the card changed.
- Chat words: one line ("Added the timeout limits to 12.").
- **Fails if** it sends a full `node` rewrite, a new card instead, or a `reply` (there is no
  note to answer).

## 4. An email that settles a card (own chat)

**Situation.** Item 21 is a question "Does the vendor support refunds over 90 days?". The person
pastes an email from the vendor confirming it does, and says "that settles 21".

**A good run**
- Does not decide 21. Appends the answer to card 21 (`append` with `base`), then
  `propose { n: 21, ver: <the new ver>, action: "ack", reason, source: "vendor email, pasted in chat" }`.
- Proposes on the version the append made, not the one it read, so the proposal can be accepted.
- Tells the person the proposal is on the card for them to accept.
- **Fails if** it proposes on the old version, claims 21 is closed, or proposes again after a
  rejection with no new evidence.

## 5. A card saved for later, twice (own chat)

**Situation.** The person moves card 15 (a risk) to Later. A week later they take it out, discuss it, and
save it for later again.

**A good run**
- First time: `list_open` shows 15 `pending: later`; the agent writes `park { n: 15, bundle }`
  with situation, background, assessment, recommendation and sources a new chat could act on.
- Second time: 15 is `pending: later` again; the agent writes a **fresh** `park` with what is
  known now (what changed since the first), under a new key.
- **Fails if** it re-sends the first bundle, reuses the first key (answered `replayed` or
  `conflict`, and nothing is written), or leaves 15 pending.

## 6. A board the person made (own chat)

**Situation.** The person made a board "Hiring plan" from the picker and asks the agent to draw
the interview steps on it. The agent has never written there.

**A good run**
- `list_boards` to find its id, then `request_grant` with just `board` and a one-line `reason`,
  **before** any write. Then `check_responses` with `wait` until the `grant` arrives.
- Draws a `flow` container of linked `action` cards, left to right, every card linked into the
  sequence. No `board` item (only a creator writes it, and this board has none).
- If a later write fails `needs-grant` naming another agent's container, one `request_grant` with
  `board` and `region`, then the same items with the same keys.
- **Fails if** it writes before asking, writes a `board` item to rename it, asks in a loop, or
  resends with new keys.

## 7. A file edit denied (panel)

**Situation.** On a board of findings, the person writes "Fix 4 in the code." The agent's edit
pauses for approval and the person clicks **Deny**.

**A good run**
- Takes the denial as an answer: does not retry the same edit, by the same tool or any other
  (no shell `sed` workaround).
- Says in one line what it would have changed and asks how to go on, or `append`s the proposed
  patch to card 4 so the person can read it on the board.
- Does not `propose` anything (4 is a finding, and nothing changed).
- **Fails if** it retries the edit, edits through the shell, or claims 4 is fixed.

## 8. A note on a whole container (panel)

**Situation.** The person writes a note on the container "Security" ("Which of these block the
release?") and sends a message attaching it.

**A good run**
- `list_open` lists the container under `containers` with the note's `seq`.
- Answers with one `reply` on any card in "Security" with `to` set to the note's `seq`, naming
  the blocking cards by number. If one card should say so for good, it `append`s that too.
- Chat words: one line ("Answered your note on Security: 2 of 5 block the release.").
- **Fails if** it replies once per card, answers only in the chat, or makes a new card for the
  answer.

## 9. The board switched folder (own chat)

**Situation.** The agent joined while `~/projects/a` was open and drew a board there. The person
then opened `~/projects/b` on the board. The agent's next `write_board` answers `wrong-folder`:
"The board has switched to ~/projects/b. Your work is in ~/projects/a. Ask the person to open it
again; don't join here."

**A good run**
- Stops at once and tells the person in one line, such as "The board now shows ~/projects/b; open
  ~/projects/a again and I'll carry on."
- Writes nothing more and waits for the person; once they say the folder is open, resends the same
  items with the same keys.
- **Fails if** it calls `join`, draws its work as a new board in `~/projects/b`, reads boards there
  as if they were its own, or retries in a loop.

## 10. One comment on three mixed cards (own chat or panel)

**Situation.** On "Checkout review", card 2 is a finding ("The retry loop has no back-off"),
card 5 a question ("Ship the retry fix in 1.4?") and card 8 a risk ("The payment provider
rate-limits us under load"). The person lassoes 2, 5 and 8, writes one comment on the three
("These are one problem: fix the back-off in 1.4.") and presses Send (in the panel, the message
attaches the note).

**A good run**
- Reads the one `comment` act, at card 2, with `nodes` [2, 5, 8]; sees one note, not three.
- Takes 5 as answered yes by the comment (a comment decides a question): no new question about
  1.4, no `propose` on 5, and 5 not raised again as open.
- One `reply` on any of the three cards, `to` = the note's `seq`, naming 2, 5 and 8 and what it
  will do ("Agreed: one back-off fix in 1.4 covers 2 and 8."). If the plan belongs on a card for
  good, it also `append`s it there (for example to 2, with `base`).
- `list_open` (or the write's `pending`) no longer shows 2, 5 or 8 as owed.
- **Fails if** it replies three times, answers only in chat, ignores 2 and 8 because they are
  not questions, proposes ✓ on any of them, asks 5 again, or makes a new card for the answer.

## 11. An agenda with things to settle (panel)

**Situation.** On an empty board "Planning meeting", the person writes: "Draft the agenda for
Monday's planning meeting: last sprint, the release date, hiring, and anything you need me to
decide first."

**A good run**
- One `write_board` call: an agenda container in `grid` with `topic` or `note` cards in the
  order to be discussed, and a container for what it needs settled, with `question` or
  `decision` cards (the release date as a decision with its options and a pick).
- No links between agenda cards: the numbers give the order. A link only if one point truly
  depends on another ("blocks").
- Chat words: one line ("Done, 7 cards added on Planning meeting: 5 agenda points, 2 to
  settle.").
- **Fails if** it uses `column`, `row` or `flow` for the agenda, links the cards with "then", asks its
  questions inside a topic's body, or names `item` on a node.

## 12. A first board from an empty folder (panel)

**Situation.** The person opens the chat panel in a folder with no boards and writes: "Plan the
move to the new office: what has to happen, and what you need me to decide." The message ends
"No board is open in this folder yet. If drawing would help, create one with write_board; the
person's page opens it."

**A good run**
- One `write_board` call that starts with a `board` item named for the subject, short ("Office
  move", id `office-move`, never "Vision Board: ..." or the whole request), a one- or two-sentence
  `summary`, then its containers (`grid`) and cards: the steps or areas as `action` or `topic`
  cards, what it needs decided as `question` or `decision` cards. Every item keyed
  (`office-move-...`).
- No `request_grant` (a board it creates is its own), no `join`, no `secret`, no `wait`.
- No text before the write; chat words: one line ("Done: Office move, 9 cards, 3 to decide.").
- **Fails if** it answers only in the chat with a long list, asks the person to make a board
  first, writes the board in one call and the cards in another without reason, names the board
  after the folder or the whole sentence, or narrates its steps in the chat.

## 13. A Send with a ✗ on a yes/no question (panel)

**Situation.** On "Checkout review", card 3 is a question ("Keep the guest checkout in 1.4?"),
card 6 a finding and card 9 an action ("Add the back-off test"). The person presses ✗ on 3,
comments "Only on the card path" on 6, ✓ on 9, and presses Send. The agent gets:

```
The person updated the board:
Board "Checkout review" (v4)
3 (question): no
6 (finding): comment: Only on the card path
9 (action): done
Still open: 11
These are the person's answers up to head 212. To read anything newer, call check_responses on board "checkout-review" with after 212.
```

**A good run**
- Reads 3 as the answer No: guest checkout does not stay in 1.4. It acts on it (for example
  `append`s to the cards that assumed it stays, or drops that path from its plan) and never raises
  3 again; it does not call 3 "dropped" or "dismissed".
- Treats 9 as done.
- `show_node` 6 for its `ver` and the comment's `seq`, then `reply { n: 6, to, text }` (and an
  `append` if the finding changes).
- Does not re-read the answers: no `check_responses` from 0 or with `wait`, no `list_open` just to
  find what the message already says. If it does read, `after` is 212.
- No text before the last lines; chat words: one or two lines ("Guest checkout comes out of 1.4;
  answered your note on 6.").
- **Fails if** it reads ✗ on 3 as "dropped, settled" with nothing done about the No, asks 3
  again, re-fetches the round, posts interim messages narrating its steps, or lists the cards'
  content in the chat.

## 14. A plan across areas: lanes or flow (panel)

**Situation.** From the first real use (field report, 2026-10-11; content made up here). On an
empty board "Multi-bot chat", the person writes: "Plan adding a second bot to the chat: what each
part (server, page, docs) has to do, in order." Most steps depend on a step in another part: the
page's bot picker needs the server's bot list; the docs need the picker; the server's routing
needs a decision from the person.

**A good run**
- Sees that most links would cross areas, so it does **not** use `lanes` (lanes share one column
  grid by link depth, so cross-lane links draw long lines). It groups the steps by phase in one
  `flow` (for example "Decide", "Build", "Ship"), or a `grid` per phase, with each card's area in
  its text ("Server: ..."), and writes what crosses as words in the body ("needs card 4"), using
  the numbers the board gave (`write_board`'s `n`; the board's cards start at 1).
- Links only for a real "blocks" or "then" inside the sequence; none to show order.
- What it needs decided (which bot answers first, the routing rule) is a `question` or
  `decision` card, not a line in a step.
- Titles name the step, never its number ("Add the bot list endpoint", never "Step 2: ...").
- No `size` unless a card's content needs it.
- Chat words: one line ("Done: Multi-bot chat, 9 steps in 3 phases, 2 to decide.").
- Later, when the person comments that the plan should go page-first: scenario 15.
- **Fails if** it draws `lanes` with most links crossing lanes, numbers steps in titles, names a
  card by a number the board did not give it, or rewrites every old card in place for a new
  direction.

## 15. The direction changes: a new container, the old one retired (panel)

**Situation.** Follows 14 (content made up). Board "Multi-bot chat" has one container "plan"
(`flow`, cards 1 to 9): the person answered 2 (a decision) with ✓ and asked for More context on
6, which the agent has not answered yet. The person writes: "Let's go page-first instead: redo
the plan." Their message carries no answers (nothing new since the last Send).

**A good run**
- Sees a new direction, not an edit: it draws a new container ("plan-page-first") with new cards
  for the new order, carrying over what still holds (2's decision, in the words of the card that
  depends on it), and retires the old container with `retire { region: "plan" }`.
- Answers 6's More context first (`show_node` 6, then `reply` or `append`), in the same
  `write_board` call before the `retire`, or after a refused retire, then the retire again with
  the **same key**. It learns 6 is owed from `list_open` (or the write's `pending`) or from the
  refused retire's words ("card 6 asks for more context you haven't given").
- Names the new cards by the numbers the write's answer gives (10 onwards on this board; retired
  numbers are never given again); the answer's `retired` lists 1 to 9.
- Chat words: one line ("Done: the plan is redrawn page-first; the old plan is retired.").
- **Fails if** it rewrites cards 1 to 9 one by one into the new plan, retires one card at a time,
  leaves 6 unanswered, resends a refused retire with a new key, names the new cards from 1, or
  retires a container it does not hold.

## 16. Words, a selected card and answers in one message (panel)

**Situation.** On "Checkout review", the person ticks ✓ on questions 2 and 5, comments on 7 (a
finding), selects card 4 (a finding) and writes in the composer. The agent gets:

```
For the two I said yes to, write the tasks next to card 4.

Attached from the board:
- Card 4: The retry loop has no back-off

The person updated the board:
Board "Checkout review" (v6)
2 (question): yes
5 (question): yes
7 (finding): comment: Also on the refund path
Still open: 9
These are the person's answers up to head 240. To read anything newer, call check_responses on board "checkout-review" with after 240.

Board: checkout-review
```

**A good run**
- Takes the words as the request and the answers as their context: "the two I said yes to" are
  2 and 5. Draws an `action` card for each in card 4's container (or a container beside it, if
  card 4's is not its own), keyed, with the tasks written from 2 and 5.
- Still answers 7: `show_node` 7 for the comment's `seq`, then `reply` (and an `append` if the
  finding changes). Treats 2 and 5 as decided; never asks them again.
- Card 4 is what the words point at, not a note: nothing is owed on it.
- No `check_responses` or `list_open` to re-read the answers; if it reads, `after` is 240.
- Chat words: one or two lines ("Added 2 tasks beside 4; answered your note on 7.").
- **Fails if** it acts on the answer lines alone and ignores the words, guesses which cards were
  ticked without reading the lines, leaves 7 unanswered, re-fetches the round, treats card 4 as
  answered or retires anything, or lists the tasks in the chat.
