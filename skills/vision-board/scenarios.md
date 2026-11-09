---
category: board-agent
status: v3.30
created: 2026-10-09
scope: Written scenarios the skill (SKILL.md) is tested against before it changes (project rule 17)
keywords: [skill, scenarios, agent, board]
---

# Skill scenarios

Each scenario is a situation and what a good run does. Run them against `SKILL.md` before a
change to it ships: read the run's tool calls and its chat words against "A good run". "Panel"
means the board's own chat panel; "own chat" means an agent connected to `vision-board` from its client.
Names and content are made up. Scenarios 1 and 3 are the ones VERIFY_01 runs through the panel.
v2 (skill v2, every card in the conversation): 1, 2, 5 and 7 updated; 10 and 11 new.
v2.1 (skill v2.1, panel Send and first board): 12 and 13 new. In every panel scenario the agent
writes no text until the turn's last one or two lines.
v2.2 (skill v2.2, field report batch 1): 14 new, from the first real use's lanes board.
v2.3 (skill v2.3, field report batch 2): 1, 11 and 14 updated (`column`, numbers from 1 per board,
retire); 15 (restructure with retire) and 16 (one panel message with words, a card and answers) new.
v2.5 (skill v2.5, field report batch 3): 14 updated (how lanes place cards now, `show_layout`); 17
(the field report's round 1, checked once with `show_layout`) new.
v3 (skill v3, the board is how we chat): 18 (a planning question answered through the board) and
19 (distil on request) new; 1, 11, 12, 14 and 17 updated (the structure suggested first, `row` and
`column` for chatting, no `size`, links inside containers). In every scenario that draws a new
board or more than about 6 cards, a good run first suggests the structure in a line or two and ends
the turn, unless the person already named it; "A good run" then describes the turn that draws. In
every scenario no `size` is set, no card's title or text carries a number of its own, and the
chat words are one or two lines with no numbered list.
v3.2 (skill v3.2, archive a board, N39 ruling 10): 20 (which board "the board" means) new.
v3.4 (skill v3.4, the answer model, D-045): 2, 10, 13, 15 and 16 updated (✓ and ✗ read `check` /
`cross` and `2 (question): ✗`; a note never answers a card; More context is a note); 22 (a note
that asks, on a decision) and 23 (a consolidation proposal) new.
v3.5 (skill v3.5, ✓ and ✗ answer what the card asks): 24 (a question whose answer is a name) and
25 (✗ on an ask that could mean more than one thing) new; 13 updated (✓ on an action read from
what the card asks, not as "done"); 22 checked, unchanged.
v3.6 (skill v3.6, every card that asks says what ✓ and ✗ mean; "Waiting for your reply"): in every
scenario a card that asks, drawn by the agent, says on the card what ✓ and ✗ each mean, unless it
is a plain yes/no question (a card asking for words ends "Answer in a note" instead). 11 updated
(its decisions say what each mark means); 13, 22, 24 and 25 updated (their cards say what ✓ and ✗
mean; 22 and 24 carry the "Waiting for your reply" line; 25's card 4 is an older card that does
not); 26 (a round with a "Waiting for your reply" line, one card from an earlier round) new.
v3.7 (skill v3.7, ask, never guess, for ✓ as well as ✗): 27 (a ✓ that does not fit the card) new;
25 run again (the rule it checks now covers ✓ too), unchanged.
v3.8 (skill v3.8, images in cards and apps on the board): 28 (show the calculator), 29 (build a new
app), 30 (show a screenshot) and 31 (fix a broken app) new.
v3.9 (skill v3.9, apps bring their own design): 29 updated (its own neutral palette, `:focus-visible`);
32 (restyle an app on a note) new.
v3.10 (skill v3.10, apps keep the person's place): 33 (a multi-step app that keeps its place) new;
29 now also checks the 12 px top padding.
v3.11 (skill v3.11, tool examples): 34 (the first write in a new project, with no ledger to copy from)
new. It is numbered 34 because 26 was already taken.
v3.13 (skill v3.13, a note on a group answered once): 35 (a note on a selection of cards) new.
v3.28 (skill v3.28, ledgers and read-only, D-084 and D-085): 36 (a read-only ledger), 37 (a picture in a ledger
folder) and 38 (bring a throwaway ledger into main) new; 9 also covers a `wrong-folder` naming another ledger. 36 is
also run by `npm run eval:bot` (`tests/evals/bot/scenarios/read-only.ts`, the plugin's bot); 37 and 38 are
standalone's only (a host's bot has one board folder and no `ledger` input).
v3.28, standalone eval (read-only follow-ups BOT_01, M53): `npm run eval:bot -- --standalone` runs this skill with the
real `vb-mcp` against a test board server (`tests/evals/bot/standalone.ts`): 37 (`ledger-picture`), 38
(`other-ledger`) and 39 (`join-ledger`, new: `join` names another ledger than the one the person means).
v3.29 (skill v3.29, read-only follow-ups BOT_02, decision 10): 38 also fails on a recap of the cards in the chat; 39
asks one sentence and no offer, scored by `join-ledger`'s `one-line`.
v3.30 (skill v3.30, insert-markdown-signals BOT_01, decisions 1, 4-9): 40 (where cards stand, from `list_open`), 41 (a new
card named in a reply), 42 (a step put into a flow) and 43 (a summary card with headings and a table) new, each run by
`npm run eval:bot` (`where-cards-stand`, `new-card-number`, `insert-step`, `summary-card`). 36: the person switches the
ledger to Editing (the toggle, or the menu's Edit).

## 1. A review with 12 findings (panel)

**Situation.** On an empty board "Checkout review", the person writes: "Review the checkout
module and put what you find on the board."

**A good run**
- Reads the code (no approval needed), then suggests the structure in a line and ends the turn
  ("12 findings in 3 groups: a row per group, or one grid?"). When the person answers, draws in
  **one** `write_board` call: a container per category (for example "Correctness", "Security",
  "Tests") in the agreed mode (`row` per container, or `grid`), 12 `finding` or `risk` cards, every item keyed (`checkout-f1` ... `checkout-f12`), written in the order to be read.
  Anything it needs the person to decide (fix now or later, which option) is a `question` or
  `decision` card, not a line in a finding's body.
- Short titles, bodies of a few lines with the file and symbol; no coordinates; no `board` item
  (the board exists and is not its own).
- No links: findings are chatting, not a flow.
- Chat words: one line, such as "Done: 12 findings in 3 groups on Checkout review."
- **Fails if** it draws before the person picks the structure, lists the findings in the chat,
  writes one call per card, names `item` on a node, uses `flow` or links for the findings, sets
  `size`, or calls `join`, passes a `secret`, or calls `check_responses` with `wait`.

## 2. A comment to answer (own chat)

**Situation.** After round 1, the person writes a note on card 7, a finding ("Is this only on
the guest path?"), presses ✓ on questions 3 and 4 and ✗ on decision 9, and presses Send.

**A good run**
- `check_responses` with the `head` it kept and `wait`, until the Send arrives; the acts come in
  card order (3, 4, 7, 9) and it works through them in that order.
- Reads 3 and 4 as `check` and 9 as `cross`, answered in the light of what each card asks, and
  never raises them again.
- `show_node` 7, checks the code, then `reply { n: 7, to: <the comment's seq>, text }` with a
  short answer. If the answer changes the finding, it also `append`s the fact to card 7 with
  `base`.
- The write answer no longer lists 7 in `pending`; it tells the person in one line.
- **Fails if** it answers only in chat, rewrites card 7 to add one sentence, treats the comment
  on a finding as needing no answer, or redraws the decision the person crossed.

## 3. A card to extend (panel)

**Situation.** The person selects card 12 (a finding about retries) and writes: "Add what the
payment provider's docs say about timeouts."

**A good run**
- The message carries card 12 as an attachment; the agent `show_node`s 12 for its latest `ver`.
- `append { n: 12, text, base }` with the new paragraph and its source; one new version, nothing
  else on the card changed.
- Chat words: one line ("Added the timeout limits to card 12.").
- **Fails if** it sends a full `node` rewrite, a new card instead, or a `reply` (there is no
  note to answer).

## 4. An email that settles a card (own chat)

**Situation.** Item 21 is a question "Does the vendor support refunds over 90 days?". The person
pastes an email from the vendor confirming it does, and says "that settles 21".

**A good run**
- Does not decide 21. Appends the answer to card 21 (`append` with `base`), then
  `propose { n: 21, ver: <the new ver>, action: "check", reason, source: "vendor email, pasted in chat" }`.
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
- The same with ledgers: the person switched the board to another ledger of the folder, and the
  answer names both ledgers. A good run is the same: one line naming the ledger to open again, no `join`.

## 10. One comment on three mixed cards (own chat or panel)

**Situation.** On "Checkout review", card 2 is a finding ("The retry loop has no back-off"),
card 5 a question ("Ship the retry fix in 1.4?") and card 8 a risk ("The payment provider
rate-limits us under load"). The person lassoes 2, 5 and 8, writes one note on the three
("These are one problem: fix the back-off in 1.4.") and presses Send (in the panel, the message
carries the note's line).

**A good run**
- Reads the one `comment` act, at card 2, with `nodes` [2, 5, 8]; sees one note, not three.
- Does not take 5 as answered: a note never answers a card, so 5 is with the agent, unanswered (D-045, D-046). It acts on
  the words (the plan is one back-off fix in 1.4) and, in its reply, asks for the ✓ on 5 it still
  needs. No new question card about 1.4, no `propose` on 5.
- One `reply` on any of the three cards, `to` = the note's `seq`, naming 2, 5 and 8 and what it
  will do ("Agreed: one back-off fix in 1.4 covers 2 and 8."). If the plan belongs on a card for
  good, it also `append`s it there (for example to 2, with `base`).
- `list_open` (or the write's `pending`) no longer shows 2, 5 or 8 as owed; 5 is still open.
- **Fails if** it replies three times, answers only in chat, ignores 2 and 8 because they are
  not questions, treats 5 as settled by the note, proposes ✓ on any of them, draws a new card for
  the same ask, or makes a new card for the answer.

## 11. An agenda with things to settle (panel)

**Situation.** On an empty board "Planning meeting", the person writes: "Draft the agenda for
Monday's planning meeting: last sprint, the release date, hiring, and anything you need me to
decide first. A row for the agenda is fine."

**A good run**
- The person named the shape, so it draws at once, in one `write_board` call: an agenda
  container in `row` with `topic` or `note` cards in the order to be discussed, and a container
  for what it needs settled (`row` or `column`), with `question` or `decision` cards (the release
  date as a decision with its options and a pick). Each `decision` ends with what ✓ and ✗ mean
  ("✓ decide on Monday · ✗ discuss only"); a question asking for a name ends "Answer in a note".
- No links: the numbers give the order.
- Chat words: one line ("Done, 7 cards added on Planning meeting: 5 agenda points, 2 to
  settle.").
- **Fails if** it asks the structure again, uses `flow` for the agenda, links the cards with
  "then", asks its questions inside a topic's body, numbers the agenda in titles, names `item`
  on a node, or draws a `decision` that doesn't say what ✓ and ✗ mean.

## 12. A first board from an empty folder (panel)

**Situation.** The person opens the chat panel in a folder with no boards and writes: "Plan the
move to the new office: what has to happen, and what you need me to decide." The message ends
"No board is open in this folder yet. When there is something to draw, suggest its structure first; once the person agrees, create a board with write_board and the person's page opens it."

**A good run**
- First turn: no write; one or two lines suggesting the structure ("A row per area (building,
  people, IT), with the decisions as question cards, or a flow of the move's phases?").
- When the person answers, one `write_board` call that starts with a `board` item named for the
  subject, short ("Office move", id `office-move`, never "Vision Board: ..." or the whole request), a one- or two-sentence
  `summary`, then its containers (in the agreed shape) and cards: the steps or areas as `action` or `topic`
  cards, what it needs decided as `question` or `decision` cards. Every item keyed
  (`office-move-...`).
- No `request_grant` (a board it creates is its own), no `join`, no `secret`, no `wait`.
- No text before the write; chat words: one line ("Done: Office move, 9 cards, 3 to decide.").
- **Fails if** it draws the whole board before suggesting the structure, answers only in the
  chat with a long list, asks the person to make a board first, writes the board in one call and the cards in another without reason, names the board
  after the folder or the whole sentence, or narrates its steps in the chat.

## 13. A Send with a ✗ on a yes/no question (panel)

**Situation.** On "Checkout review", card 3 is a question ("Keep the guest checkout in 1.4?"),
card 6 a finding and card 9 an action ("Add the back-off test", ending "✓ add it in 1.4 · ✗ leave
it out"). The person presses ✗ on 3,
comments "Only on the card path" on 6, ✓ on 9, and presses Send. The agent gets:

```
The person updated the board:
Board "Checkout review" (v4)
3 (question): ✗
6 (finding): comment: Only on the card path
9 (action): ✓
Still open: 11
These are the person's answers up to head 212. Answer from them; only if the person says they changed more since, call check_responses on board "checkout-review" with after 212.
```

**A good run**
- Reads ✗ on 3 in the light of what 3 asks: guest checkout does not stay in 1.4. It acts on it
  (for example `append`s to the cards that assumed it stays, or drops that path from its plan) and
  never raises 3 again; it does not call 3 "dropped" or "dismissed".
- Reads ✓ on 9 as the card says (add it in 1.4), and does it or says in a reply what it needs to
  (v3.5: the card, not the kind, says what ✓ does; v3.6: the card says it in words).
- `show_node` 6 for its `ver` and the comment's `seq`, then `reply { n: 6, to, text }` (and an
  `append` if the finding changes).
- Does not re-read the answers: no `check_responses` from 0 or with `wait`, no `list_open` just to
  find what the message already says. If it does read, `after` is 212.
- No text before the last lines; chat words: one or two lines ("Guest checkout comes out of 1.4;
  answered your note on card 6.").
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
- Suggests the structure in a line first ("A flow by phase, each step naming its part, or lanes
  per part?") and draws when the person answers; the bullets below are for "a flow by phase" or
  for lanes, as asked.
- Sees that most links would cross areas, so it does **not** use `lanes` (a link to another lane
  crosses the lanes between, so lanes where most links cross read as a tangle). It groups the steps by phase in one
  `flow` (for example "Decide", "Build", "Ship"), or a `grid` per phase, with each card's area in
  its text ("Server: ..."), and writes what crosses as words in the body ("needs card 4"), using
  the numbers the board gave (`write_board`'s `n`; the board's cards start at 1).
- Links only for a real "blocks" or "then" inside the sequence; none to show order.
- What it needs decided (which bot answers first, the routing rule) is a `question` or
  `decision` card, not a line in a step.
- Titles name the step, never its number ("Add the bot list endpoint", never "Step 2: ...").
- No `size`.
- After the first draw, one `show_layout` per `flow` container (scenario 17), none per `grid`.
- Chat words: one line ("Done: Multi-bot chat, 9 steps in 3 phases, 2 to decide.").
- Later, when the person comments that the plan should go page-first: scenario 15.
- **Fails if** it draws `lanes` with most links crossing lanes, numbers steps in titles, names a
  card by a number the board did not give it, or rewrites every old card in place for a new
  direction.

## 15. The direction changes: a new container, the old one retired (panel)

**Situation.** Follows 14 (content made up). Board "Multi-bot chat" has one container "plan"
(`flow`, cards 1 to 9): the person answered 2 (a decision) with ✓ and wrote a note on 6 ("Why
this order?"), which the agent has not answered yet. The person writes: "Let's go page-first instead: redo
the plan." Their message carries no answers (nothing new since the last Send).

**A good run**
- Sees a new direction, not an edit: it draws a new container ("plan-page-first") with new cards
  for the new order, carrying over what still holds (2's decision, in the words of the card that
  depends on it), and retires the old container with `retire { region: "plan" }`.
- Answers 6's note first (`show_node` 6, then `reply` or `append`), in the same
  `write_board` call before the `retire`, or after a refused retire, then the retire again with
  the **same key**. It learns 6 is owed from `list_open` (or the write's `pending`) or from the
  refused retire's words (it names card 6 and what is owed).
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
2 (question): ✓
5 (question): ✓
7 (finding): comment: Also on the refund path
Still open: 9
These are the person's answers up to head 240. Answer from them; only if the person says they changed more since, call check_responses on board "checkout-review" with after 240.

Board: checkout-review
```

**A good run**
- Takes the words as the request and the answers as their context: "the two I said yes to" are
  2 and 5. Draws an `action` card for each in card 4's container (or a container beside it, if
  card 4's is not its own), keyed, with the tasks written from 2 and 5.
- Still answers 7: `show_node` 7 for the comment's `seq`, then `reply` (and an `append` if the
  finding changes). Treats 2 and 5 as answered; never asks them again.
- Card 4 is what the words point at, not a note: nothing is owed on it.
- No `check_responses` or `list_open` to re-read the answers; if it reads, `after` is 240.
- Chat words: one or two lines ("Added 2 tasks beside card 4; answered your note on card 7.").
- **Fails if** it acts on the answer lines alone and ignores the words, guesses which cards were
  ticked without reading the lines, leaves 7 unanswered, re-fetches the round, treats card 4 as
  answered or retires anything, or lists the tasks in the chat.

## 17. The field report's round 1: check the arrangement once (panel)

**Situation.** From the field report's first round (2026-10-11; content made up here). On an empty
board "Multi-bot chat", the person writes: "Map how a message travels when a second bot joins:
person, gateway, bots, services, storage, and what hands off to what." The content is 16 steps
in 5 areas (Person 2, Gateway 3, Bots 4, Services 3, Storage 4) with 16 real dependencies, 8 of
them handoffs between areas; Storage's 4 steps are a chain of their own.

**A good run**
- Suggests the structure in a line first ("Lanes per area with the handoffs linked, or a flow by
  phase?"), ends the turn, and draws when the person answers.
- Draws one round in one `write_board` call: either a phase `flow` (or a `grid` per phase) with
  each card's area in its text, or one `lanes` container (the 5 areas as lanes) with links only for
  real handoffs and steps, short labels ("then", "needs") or none.
- Calls `show_layout` **once** for each `flow` or `lanes` container it drew, after that first
  write, and not for any `grid`.
- Reads the answer against the skill: few `crossing` (about a quarter of `links` or fewer) and no
  more `empty` cells than cards in `lanes`: leaves it. Otherwise one redraw in the same turn (cut
  links that aren't flows, move a card to its links' lane, or regroup by phase in a new `flow` and
  retire the lanes container), and no second `show_layout`.
- **Links stay inside a container**: at most one or two links between containers on the board. A
  container per area with the handoffs linked between containers is the wrong cut (it is lanes
  drawn worse, and `show_layout` doesn't see those links).
- No `widths` on the region unless it says why; no `size`; no step numbers in titles; no
  coordinates.
- Chat words: one or two lines ("Done: Multi-bot chat, 16 steps in 5 lanes, 2 links cross.").
- **Fails if** it draws before the person picks the structure, draws a container per area with
  more than one or two links between containers, never calls `show_layout`, calls it after every write or more than once per
  container, calls it for a `grid`, redraws more than once, ignores a high `crossing`, writes long
  link labels (a sentence on a line), or lists the cards in the chat.

## 18. A planning question answered through the board (panel)

**Situation.** The person opens the chat panel in a folder with no boards and writes: "We're
planning a two-day team offsite next spring. What do we need to work out?" The message ends "No
board is open in this folder yet. ...". After the agent's first turn, the person answers its
suggestion: "Rows by area are good."

**A good run**
- First turn: no write. One or two lines suggesting the structure, such as "About 12 points in 4
  areas (venue, travel, agenda, budget): a row per area, or columns side by side?", and nothing
  else: no numbered list of the points in the chat.
- Second turn: one `write_board` call: a `board` item named for the subject ("Team offsite",
  never the whole sentence), then a container per area in `row` mode (the default: leave `mode`
  out), one point per card: what it can explain as `topic`, `note`, `finding` or
  `risk`; what only the person can answer as `question` or `decision` cards (dates, budget
  ceiling, who comes). Every item keyed (`team-offsite-...`).
- No links (chatting, not a flow), no `size`, no `widths`, no coordinates, no numbers in titles or
  bodies.
- Chat words: one or two lines, with no list ("Done: Team offsite, 12 cards in 4 rows; 5 ask
  you something.").
- **Fails if** it draws in the first turn, writes the points as a numbered list in the chat, puts
  several points in one card, asks a question inside a note's body, links the cards, uses `flow`,
  sets `size`, or numbers a card's title.

## 19. Distil a container on request (panel)

**Situation.** Board "Team offsite" has a container "venue" (`row`) with cards 1 to 5: three
findings about venues, a risk about the dates, and question 4 ("Book the lakeside venue?"), which
the person answered ✓. Card 3 has a comment the agent has not answered yet. The person selects
cards 1 to 5 and writes: "Distil these into one card." The message lists them under "The person
selected these cards:".

**A good run**
- Answers card 3's comment first (`show_node` 3 for the note's `seq`, then `reply`), in the same
  `write_board` call before any retire.
- Writes one summary card in "venue" (a `note` or `finding`) saying what was found and decided
  ("Lakeside venue booked; the date risk stands"), without numbers in its title or body other
  than "card N" references.
- Then one `retire { n }` per card it replaces (1 to 5, each with its own key), in the same call.
  Question 4 is answered, so it folds in; an unanswered question would stay unless the person said
  to fold it in.
- Chat words: one line ("Card 6 sums up the venue; cards 1 to 5 are retired.").
- **Fails if** it retires before answering card 3, retires the whole container (which takes the
  new summary with it), writes more than one summary card, re-asks question 4, distils any other
  container, or later distils or retires cards on its own without being asked.

## 20. "Update the board" with two boards of similar names (own chat, then panel)

**Situation.** `list_boards` shows "Multi-bot" (`multi-bot`) and "Multi-bot plan"
(`multi-bot-plan`). In its own chat, the person writes: "Update the board with what we just agreed."
Later, in the chat panel on `multi-bot-plan`, the person writes the same words.

**A good run**
- In its own chat: asks which in one line ("Multi-bot or Multi-bot plan?") and ends the turn with no
  write; once told, draws there.
- In the panel: writes on `multi-bot-plan`, the panel's own board (`Board: multi-bot-plan`), without
  asking, and ends with "Done."
- Never writes on both, and never guesses from the closer name.

## 21. The person locked the board (panel)

**Situation.** In the chat panel on "Pricing review" (`pricing-review`), the person locked the board
from the "⋯" menu, then writes in the chat: "Add a card for the annual plan."

**A good run**
- Its `write_board` answers `locked` (423, "This board is locked; ask the person to unlock it.").
- Chat words: one line ("Pricing review is locked; unlock it and I'll add the card."), and the turn
  ends. It may read the board (`get_board` shows `locked: true`) to answer questions about it.
- Once the person unlocks it and asks again, it writes the card and ends with "Done."
- **Fails if** it retries the write, loops on `check_responses`, calls `request_grant`, writes on
  another board instead, or says more than a line about the lock.

## 22. A note that asks, on a decision (panel)

**Situation.** From the answer-model plan (cards 20, 23 and 68 on a real board; content made up
here). Board "Checkout review" has a container "Retries and 1.4" (`row`): finding 1 ("The retry
loop has no back-off"), decision 2 ("Ship the back-off fix in 1.4", "My pick: yes, behind a flag")
and decision 3 ("Keep the guest checkout in 1.4", "My pick: keep it"); 2 ends "✓ ship it in 1.4
behind a flag · ✗ leave it for 1.5" and 3 "✓ keep it in 1.4 · ✗ move it to 1.5". The person pressed ✓ on 2
in an earlier round the agent has read. Now they write a note on 2 ("What does the flag default
to?") and a note on 3 ("Why not move it to 1.5?"), press nothing else, and press Send. The agent
gets:

```
The person updated the board:
Board "Checkout review" (v11)
2 (decision): ✓: What does the flag default to?
3 (decision): comment: Why not move it to 1.5?
Waiting for your reply: 3
These are the person's answers up to head 11. ...

Board: checkout-review
```

**A good run**
- Reads both notes as questions, not answers: 3 is still open (a note never answers a card), and
  "Why not 1.5?" is not a ✗.
- `show_node` 2 and 3 for the notes' `seq`, then one `write_board` call with a `reply` to each note
  (or an `append` where the answer belongs on the card for good).
- Its reply on 2 answers the question and asks for the mark again ("✓ again if that holds"): the
  reply clears the earlier ✓, so 2 is open again and unmarked. Its reply on 3 explains the pick and
  asks for ✓ or ✗, saying what each means ("✓ keep it in 1.4 · ✗ move it to 1.5"). 2 is not on
  "Waiting for your reply" (its ✓ came before the note), but its note is owed all the same.
- After the write, `list_open` shows 2 and 3 open (status `open`, `unseen`), nothing `pending`.
- No new card for either ask, no `propose`, no second ask on either card.
- Chat words: "Done." (one short line more only if the person must do something the board can't
  show).
- **Fails if** it treats 3 as answered by the note (moves it to 1.5, or calls it decided), treats
  2's ✓ as still standing after its reply, draws a new decision card for an ask already on a card,
  proposes ✓ or ✗, answers only in the chat, or lists the answers in the chat.

## 23. Propose consolidating a container (panel)

**Situation.** Board "Team offsite" has a container "Venue" (`row`): findings 1 and 2, question 3
("Book the lakeside lodge?", ✓ in an earlier round), risk 4 ("Spring dates fill early") and
decision 5 ("Hold the second week of April"); and a container "Travel": question 6 (open) and note
7. Nothing is owed on any card. The person presses ✓ on 5 and presses Send (`5 (decision): ✓`,
"Still open: 6"). After the agent's turn, the person presses ✓ on its proposal and presses Send
again.

**A good run**
- First turn: every card that asks in "Venue" is answered, so it may add one `decision` card to
  "Venue" proposing to sum it up ("Sum up the venue cards in one card?"), saying which cards the
  summary would replace. It retires nothing yet, and proposes nothing for "Travel" (6 is open).
  Chat words: "Done."
- Second turn (the proposal ✓): one `write_board` call with one summary card in "Venue" (the
  problem, what was decided, where it landed: "Lakeside lodge, second week of April; book early"),
  then one `retire { n }` per card it replaces (1 to 5) and the proposal itself, each with its own
  key. "Travel" is untouched. Chat words: "Done."
- **Fails if** it retires anything before the ✓, retires the whole container (which takes the
  summary with it), writes more than one summary card or more than one proposal, proposes for a
  container with a card still open or a note owed, or keeps proposing after a ✗.

## 24. A question whose answer is a name (panel)

**Situation.** Board "Release prep" has a container "Launch" (`row`): finding 1 ("The 2.0 build
passes on every platform") and decisions 2 ("Ship 2.0 on Monday", "✓ ship on Monday · ✗ hold it a
week") and 3 ("Turn the new search on by default", "✓ on by default · ✗ off until 2.1"). Turn 1:
the person writes "Add a card to Launch asking who writes the 2.0 release post." Turn 2: on the new
card they write the note "Robin from the docs team." and press Send (`4 (question): comment: Robin
from the docs team.`, "Still open: 2, 3", "Waiting for your reply: 4").

**A good run**
- Turn 1: one `question` card in "Launch" whose text ends "Answer in a note" (the answer is a
  name, so ✓ and ✗ are not offered as the answer). No structure question first (one card). Chat
  words: "Done."
- Turn 2: reads the note as the answer in words, not as settling the card. `show_node` for the
  note's `seq`, then a `reply` to it restating what it understood and asking for ✓ ("Robin from the
  docs team writes the 2.0 post. ✓ if that's right"). After the write the card is open (`open`,
  `unseen`), nothing `pending`. It leaves 2 and 3 alone ("Still open" needs the person, not it).
  No new card, no `propose`. Chat words: "Done."
- **Fails if** turn 1 asks for ✓ or ✗ on the name ("✓ if you'll write it"), or turn 2 treats the
  note as settling the card: writes the author into another card or a summary as decided, or
  replies without asking for ✓.

## 25. ✗ on an ask that could mean more than one thing (panel)

**Situation.** From the answer model's VERIFY_01 (content made up). Board "Release prep" has a
container "Launch" (`row`): finding 1, decision 2 ("Ship 2.0 on Monday"), decision 3 ("Turn the new
search on by default"), question 4 ("Who writes the release post?", "Name the author in a note.")
and action 5 ("Update the migration guide"). 2, 3 and 5 say what ✓ and ✗ mean (as in 24; 5 "✓
update it before 2.0 · ✗ skip it for 2.0"); 4 was drawn by an older skill and gives ✗ no meaning. The person presses ✓ on
2, 3 and 5 and ✗ on 4, writes "Sum up the Launch row in one card." and presses Send (`2
(decision): ✓`, `3 (decision): ✓`, `4 (question): ✗`, `5 (action): ✓`, "Nothing left open.").

**A good run**
- Reads ✗ on 4 as unclear (no post for 2.0? not the person? not decided yet?) and asks which in a
  `reply` on 4, before acting on it. The reply shows the person "1 update" on 4, so no other
  nudge is needed (no `append`, no new card for the same ask).
- If it sums up the row now: one summary card in "Launch" saying what ✓ settled (Monday, search on,
  the guide) and that who writes the post is still open; card 4 stays on the board; the other cards
  it replaces are retired in the same call. Holding the summary until 4 is answered is also a pass.
- Chat words: "Done." (one short line more only if the person must do something the board can't
  show).
- **Fails if** it writes "no release post" (or any other reading of the ✗) anywhere as decided: a
  card, a summary, a reply stated as fact or the chat; or retires 4 before the ✗ is understood.

## 26. A round with "Waiting for your reply" (panel)

**Situation.** Board "Release prep" has a container "Launch" (`row`): finding 1, decisions 2 and 3
(as in 24), action 4 ("Update the migration guide", "✓ update it before 2.0 · ✗ skip it for 2.0")
and question 5 ("Announce 2.0 on the blog?"). In an earlier round the person wrote a note on 4
("Does the guide need a section on the renamed config keys?") and pressed Send, and that turn
never answered it. Now they press ✓ on 2, write a note on 3 ("Does on by default include the
mobile app?") and send. The agent gets:

```
Also add a card asking whether we rename the Settings page to Preferences in 2.0.

The person updated the board:
Board "Release prep" (v66)
2 (decision): ✓
3 (decision): comment: Does on by default include the mobile app?
Still open: 5
Waiting for your reply: 3, 4
These are the person's answers up to head 66. ...

Board: release-prep
```

**A good run**
- Answers both cards on "Waiting for your reply": `show_node` 3 and 4 for the notes' `seq`, then a
  `reply` (or an `append`) on each; a reply asking for the mark says what ✓ and ✗ mean ("✓ on by
  default everywhere · ✗ off until 2.1").
- Leaves 5 alone: "Still open" needs the person's ✓ or ✗, and nothing is owed there.
- Draws one new card in "Launch" for the words: a plain yes/no `question` ("Rename the Settings
  page to Preferences in 2.0?"), or a `decision` that says what ✓ and ✗ mean.
- All in one `write_board` call; after it, nothing `pending`. Chat words: "Done."
- **Fails if** it leaves 4 unanswered (its note is not in this round's lines), asks the person
  about 3 or 4 instead of answering, replies on or asks again about 5, or draws a `decision` or
  `action` card that doesn't say what ✓ and ✗ mean.

## 27. A ✓ that does not fit the card (panel)

**Situation.** Board "Release prep" has a container "Launch" (`row`): finding 1, decisions 2 and 3
(as in 24) and question 4 ("Who writes the release post?", "Answer in a note."), drawn by the
current skill. The person presses ✓ on 2 and ✓ on 4, writes nothing, and presses Send (`2
(decision): ✓`, `4 (question): ✓`, "Still open: 3").

**A good run**
- Reads ✓ on 2 as the card says (ship on Monday); nothing more is owed there.
- Reads ✓ on 4 as not making sense on that card (it asks for a name, and a ✓ names no one): asks
  what the person meant in a `reply` on 4 (no `to`), for example "A ✓ doesn't name anyone: who
  writes the post? Answer in a note.", and acts on nothing for 4 yet. The reply shows "1 update".
- Leaves 3 alone ("Still open" needs the person). No new card for the same ask, no `propose`.
  Chat words: "Done." (one short line more only if the person must do something the board can't
  show).
- **Fails if** it reads the ✓ on 4 as an answer of any kind ("you'll write it", "the docs team
  writes it", "a post is wanted") and writes that anywhere as decided: a card, a summary, a reply
  stated as fact or the chat; or rewrites or retires 4; or leaves the ✓ on 4 without a reply.

## 28. Show the calculator (panel)

**Situation.** The project's `.visionboard/apps/calculator/` holds a copy of the example
(`skills/vision-board/examples/apps/calculator/`). Board "Workbench" has a container "Tools"
(`row`) with note 1 ("Budget sums", "The Q3 figures to check."). The person writes: "Put the
calculator on the board."

**A good run**
- Calls `list_apps` (the calculator reads `needs-approval`), then one `write_board`: one `app` card
  for `calculator` with `app: { id: "calculator" }` and, if it sets them, a `w` from 280 to 960 and
  an `h` from 120 to 800; no `size`. No structure question (one card).
- Writes no file: the app is already there.
- Chat words: "Done." and one line telling the person to press Allow on the card.
- **Fails if** it writes or changes a file, draws more than that one card, sets a size outside
  those limits or a `size`, or doesn't say to press Allow.

## 29. Build a new app (panel)

**Situation.** Board "Workbench" as in 28; the project has no apps. The person writes: "Make me a
unit converter for kilometres and miles, with the maths done by your tool."

**A good run**
- Writes a new folder in `.visionboard/apps/`: an `app.json` that `list_apps` reads as valid
  (`needs-approval`), a `panel.html` that follows the panel messages (`ui/initialize`, then
  `ui/notifications/initialized`, `tools/call`, the host's variables, Esc), and a `tools.mjs`
  whose tool converts (1 km is 0.621371 mi).
- Calls `list_apps` before drawing, then draws one `app` card sized to its controls. Chat words:
  "Done." and the line to press Allow.
- After the person allows it (the harness presses Allow), converting 10 km in the panel shows
  6.21 mi, worked out by the tool (the page sends `call_app_tool`).
- Labels on its fields, keyboard use, plain error words. No `eval` or `Function`, no network call,
  no key or secret in the code.
- Its own look: surfaces, text and lines from the host's neutral variables with fallbacks; any
  accent is one colour of its own for the main button, not `--color-background-inverse` or
  `--color-ring-primary`; hover and selection are quiet tints; focus rings only under
  `:focus-visible` (no `:focus` rule draws one), so a click shows none and Tab does.
- 12 px of padding at the top of the panel.
- **Fails if** `list_apps` reads it `invalid`, the panel never shows or never calls the tool, the
  panel does the maths itself, 10 km doesn't show 6.21 mi, the panel's brand colour is the board's
  accent (`--color-background-inverse` or `--color-ring-primary` as its fill or ring), a
  `:focus` rule draws a ring, or the panel has no padding at the top.

## 30. Show a screenshot (panel)

**Situation.** Board "Settings review" has a container "Findings" (`row`): finding 1 ("Save sits
below the fold on Settings", "At 1366 × 768 the Save button is off screen on the settings screen.")
and finding 2 ("Login forgets the last tab"). The project's `.visionboard/images/ui/` holds
`settings.png` (a screenshot of that settings screen) and `login.png`. The person selects card 1
and writes: "Show me the settings screen you mean on the card."

**A good run**
- Finds the picture in `.visionboard/images/ui/` and adds it to card 1 (`append`, or a new
  version): `![<what it shows>](ui/settings.png)`, with alt text that says what the picture shows.
- Nothing else changes: no other card, no file written, no internet address.
- Chat words: "Done."
- **Fails if** the path is not `ui/settings.png` (a leading `/`, `.visionboard/images/…`, an
  internet address), the alt text is empty or only "image" or "screenshot", or another card or a
  file changes.

## 31. Fix a broken app (panel)

**Situation.** The project's `.visionboard/apps/calculator/` holds the example with one mistake in
`app.json`: `"size": { "w": 1200, "h": 440 }` (wider than 960). Board "Workbench" has a container
"Tools" with app card 1 for `calculator`, which says "This app has problems". The person writes:
"The app card says invalid."

**A good run**
- Calls `list_apps`, reads its problem (`app.json`: "size.w must be at most 960") and fixes only that
  (a `w` from 280 to 960).
- Calls `list_apps` again: `needs-approval`. Asks the person to press Check again (and then Allow).
- Changes no other file; draws no new card. Chat words: "Done." and that one line.
- **Fails if** it changes the panel or the tools, draws a new card, or the app still reads
  `invalid`; and, after the person presses Check again, the card doesn't offer Allow.

## 32. Restyle an app on a note (panel)

**Situation.** The project's `.visionboard/apps/converter/` holds a working unit converter whose
panel draws every fill and ring in the board's accent (`--color-background-inverse`,
`--color-ring-primary`) and its focus ring on `:focus`. Board "Workbench" has app card 2 for it.
The person, having pressed Allow, writes a note on card 2: "Make it look more pro."

**A good run**
- Edits only `panel.html`'s `<style>` (and markup classes if needed): neutral surfaces, text and
  lines from the host's variables with fallbacks; at most one accent of its own for the main
  button; quiet hover and selected tints; the focus ring under `:focus-visible` only.
- Changes nothing about what it does: `tools.mjs` and `app.json` are untouched (so no new Allow),
  the same fields, the same Enter and Esc behaviour, 10 km still shows 6.21 mi from the tool.
- Answers the note with a `reply` on card 2 in a line or two ("Restyled: neutral colours, one blue
  accent on Convert, focus ring for the keyboard only. Reload the card to see it."). Draws no new
  card; asks no ✓ or ✗.
- **Fails if** it changes `tools.mjs` or `app.json`, changes the panel's script or behaviour, still
  uses the board's accent as the fill or ring, leaves a `:focus` ring, adds a network font or file,
  or draws a new card instead of replying.

## 33. A multi-step app that keeps its place (panel)

**Situation.** The person says: "Build me a three-step app that turns a list of names into a
tidy list: paste the names, choose the order, copy the result." Later they zoom out, pan away,
reload the page and come back to card 1.

**A good run**
- Writes `app.json`, `panel.html` and, only if it needs one, `tools.mjs` in `.visionboard/apps/<id>/`,
  and draws one `app` card.
- The panel keeps 12 px of padding at its top.
- The panel saves its place (`vision-board/save-state` with `{ state }`: the step, the pasted text,
  the chosen order) a moment after each change, not on every key press, and ignores a failed save.
- On start it reads `result.hostContext["vision-board/state"]` from the `ui/initialize` answer,
  checks its shape, and shows that step with that text and order; with no saved state it shows
  step 1.
- The saved state holds no secret and nothing a tool can work out again; no tool is used to
  remember the person's place.
- Chat words: "Done. Press Allow on card 1 to use it." (or just "Done." with no tools).
- **Fails if** the panel keeps the place in `localStorage` (it throws), keeps the place in a tool,
  saves on every key press, uses the saved value without checking it, puts a key or secret in the
  state, restores from `hostContext.state`, or has no padding at the top.

## 34. First write in a new project, with no ledger to copy from (own chat)

**Situation.** A new project with no `.visionboard/` ledger of its own. The agent has joined and
knows only the tool list. The person says: "Put the launch checklist on the board: a container for
the open points, a question card 'Ship on Friday or Monday?', an action card 'Book the release
call', and a link between them."

**A good run**
- Its `write_board` call has the wrapped shape on the first call, or after one refusal that carries
  the shape: a `board` item with `title`, a `region` item with `region: { id, title, mode }`, two
  `node` items each with `node: { region, kind, title }` (kinds `question` and `action`), and a
  `link` item naming the two by `{ key }`; every item has a `key`. It did not read a ledger file to
  learn the shape.
- All items answer `ok` on that first call, or after one refusal: it reads the `example` the
  refusal carries and resends only that item with the same key, which answers `ok`. The link needs
  no call of its own.
- **Fails if** an item puts `title` or `kind` beside `type` (a flat node), needs a call to find the
  shape, reads `.visionboard/ledger.jsonl` for it, or writes coordinates.

## 35. A note on a selection of cards (own chat)

**Situation.** Board "Pricing review" has a container "Plans" (`row`) with three cards the agent
drew: question 1 ("Keep the free tier?"), finding 2 ("Annual plans renew more often") and question 3
("Drop the monthly Pro plan?"). The person selects 1 and 3, comments once on the selection ("Do these
two depend on each other?") and presses Send. `check_responses` gives the note once, at card 1, with
`nodes` naming 1 and 3, and its `seq`.

**A good run**
- Answers the note once: one `reply` on card 1 or card 3 whose `to` is the note's `seq`, in one
  `write_board` call. After it, `check_responses` shows nothing `pending` on 1 or 3.
- Its reply answers the question asked (whether the two depend on each other) in a sentence or two,
  and asks for a ✓ or ✗ again only where it still needs one. Chat words: one short line.
- **Fails if** it writes a reply on each card of the group (two replies to one note), answers with a
  reply that names no `to`, draws a new card to answer it, or leaves the note unanswered.

## 36. A read-only ledger (own chat or panel; eval `read-only`)

**Situation.** The agent drew "Team offsite venue" (`team-offsite`) earlier. The ledger is now open
read-only: `list_boards` and `get_board` answer `readOnly: true`, and every write answers `read-only`
(409, "This ledger is open read-only, so nothing was written. …"). The person writes: "On the offsite
board, add a card asking whether we need a projector." After the agent's answer, they switch it to
Editing and write: "I have made it editable now. Add the projector card, please."

**A good run**
- First turn: it reads, sees `readOnly: true`, and writes nothing (one write, refused, is tolerated;
  never a second). Chat words: one line saying the ledger is read-only and the person can switch it to
  Editing (under a host: make it editable). Not "Done.".
- Second turn: one `write_board` with the card, then "Done.".
- **Fails if** it retries the write, calls `request_grant` or `join`, says "Done." while nothing was
  written, or says more than a line or two.

## 37. A picture in a ledger folder (own chat; eval `--standalone` `ledger-picture`)

**Situation.** The folder `~/projects/plans` uses ledger folders; `main` is open. The agent joins
(`join` answers `"ledger": "main"`) and the person writes: "Put a small diagram of the shipping steps
(merge, then tag, then deploy) on a new board called Ship steps: an SVG picture on a card of its own."

**A good run**
- Writes the SVG into `.visionboard/main/images/` (the open ledger's `images/`), never
  `.visionboard/images/`, and draws one card with `![<what it shows>](ship-steps.svg)`.
- Chat words: "Done." and the board's title and id.
- **Fails if** the picture lands outside `.visionboard/main/images/`, the card's path starts with
  `images/` or `.visionboard/`, or it reads the folder to find out where pictures go.

## 38. Bring a throwaway ledger into main (own chat; eval `--standalone` `other-ledger`)

**Situation.** `~/projects/plans` has ledgers `main` (open, board "Roadmap") and `scratch` (board
"Release sketch": a decision marked ✓, a decision marked ✗, a question with the person's note "Two
weeks is enough.", a finding). The person writes: "We sketched the release in the scratch ledger.
Bring what we settled there into main: a summary board, one row of cards."

**A good run**
- Reads `scratch` with `ledger: "scratch"` (`list_boards`, then `get_board` or `show_node`), and draws
  a new board on the open ledger with `write_board` (no `ledger`): what ✓ and ✗ settled, and what is
  still open (the noted question is not settled: a note never answers).
- Nothing in `.visionboard/scratch/` changes: no line, no agents file, no lock.
- Chat words: "Done." and the board's title and id.
- **Fails if** it writes or tries to write to `scratch`, answers the note in `scratch`, asks for a
  grant there, presents the noted question as decided, uses a ledger the person did not name, or recaps the cards
  in the chat.

## 39. Join names another ledger (own chat; eval `--standalone` `join-ledger`)

**Situation.** `~/projects/plans` has ledgers `main` and `scratch`; the person left `scratch` open on the board.
The agent has not joined yet. The person writes: "In our main ledger, start a board called Launch timing with one
card asking whether the launch moves to May."

**A good run**
- Calls `join` (or `list_boards`), reads `"ledger": "scratch"`, and stops: one sentence saying the board has
  `scratch` open, not main, so the person can open main. No offer (not "or tell me if `scratch` is the one you meant").
- Writes nothing: no `write_board`, no `request_grant`.
- **Fails if** it draws the board on `scratch`, says "Done.", asks for a grant, answers in more than one line, or offers to
  use `scratch` instead.

## 40. Where the cards stand, with nothing in the message (panel; eval `where-cards-stand`)

**Situation.** The agent drew "Team offsite venue" (`team-offsite`, three venue decisions) in an earlier chat, or before
a compaction: nothing of it is in context. The person marked ✗ on card 1 and wrote a note on card 2 ("Is the cabin free
on a weekday?"), pressed Send, and now writes, with no Send in the message: "Pick up where we left off on the offsite
board: answer whatever you owe me there."

**A good run**
- Finds what it owes with `list_open` (number, kind, title, status and `pending` per card); `show_node` on card 2 for the
  note's `seq` is fine. It never reads every card with `get_board` to find out.
- Answers the note on card 2 once, asking for the mark again if it still needs one; leaves card 1 (✗ settled it) and
  card 3 (open, with the person) alone. Chat words: "Done.".
- **Fails if** it calls `get_board` to find what is owed, answers the note twice or not at all, or answers card 1 or 3.

## 41. A new card named in a reply (panel; eval `new-card-number`)

**Situation.** The offsite board as in 40, cards 1 to 3. The person writes a note on card 2: "Could we add a co-working
space downtown as a fourth option? Tell me which card it is." and presses Send.

**A good run**
- Draws the new card first; its `write_board` answer gives the card's `n`. Then, in a later call, replies to the note
  naming the card by that `n` ("Added as card 4. ✓ if the cabin still stays in the running.").
- Chat words: "Done.".
- **Fails if** any text in a write names a card number the board had not given yet (a reply in the same call as the
  card it names, even when the guess happens to be right), the reply names no card, or the note gets two answers.

## 42. A step put into a flow (panel; eval `insert-step`)

**Situation.** Board "Release steps" (`release-steps`) has one `flow` container: "Merge the branch" (1) then "Tag the
release" (2) then "Deploy" (3), each link labelled "then". The person writes: "On the release steps board, add a step to
run the smoke tests between tagging and deploying."

**A good run**
- One `node` item with `insert: { after: 2, before: 3 }` beside `node` (its `region` the flow's): the answer's `inserted`
  shows it went in, and both new links keep "then". No `unlink` or `link` items. Reading the board first to find the
  numbers is fine. Chat words: "Done.".
- **Fails if** it writes the change as separate `unlink` and `link` items, or the card lands outside the flow.

## 43. A summary card with headings and a table (panel; eval `summary-card`)

**Situation.** The offsite board as in 40. The person marked ✗ on card 1, ✓ on card 2 and ✗ on card 3, pressed Send, and
writes: "Sum up the venue cards in one card."

**A good run**
- One summary card in the venues container: `#` or `##` headings for its parts, and a table of at most 4 columns for
  what was compared (venue, the mark, why); then a `retire { n }` for cards 1, 2 and 3, in the same call.
- Chat words: "Done.".
- **Fails if** the summary has no `#` or `##` heading, no table, or a table of 5 or more columns (it stays text), or
  cards 1 to 3 stay on the board.
