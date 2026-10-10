---
category: board-agent
status: v2
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
  node, uses `list` or `flow` for the findings, or calls `join`, passes a `secret`, or calls
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
- **Fails if** it uses `list` or `flow` for the agenda, links the cards with "then", asks its
  questions inside a topic's body, or names `item` on a node.
