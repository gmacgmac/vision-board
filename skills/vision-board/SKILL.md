---
name: vision-board
description: Draw your output on the Vision Board when the person must answer it card by card (findings, questions, decisions, risks, actions) or when how things connect matters, then read their answers back and redraw. Use when the person says "put it on the board", when a reply would be a long numbered list, and always for content in the board's own chat panel.
status: v2.4 (2026-10-11, the selection block; 2026-10-11, field report batch 2: numbers from 1 on each board, retire, `column` and `row`, the flag is not yours to see, the panel's one message with words, attachments and answers, no ledger read; v2.2 2026-10-11, field report: how lanes place cards and when to use them, numbers are the reading order, restructuring, card sizes, numbers counted across the project; v2.1 2026-10-10, panel: quiet turns, the Send message, an empty folder, ✓/✗ words; v2 2026-10-10, every card in the conversation, the kind decides, grid by default; v1.1 the wrong-folder line; v1 2026-10-09; scenarios in scenarios.md, evidence in NOTES.md)
---

# Vision Board

The board is a conversation in cards. You explain and ask through cards; every card has a number
on its board (1, 2, 3...), and the person can answer any of them: comment on it, ask you for more context, or save it for
later. Cards that ask something (`question`, `decision`, `action`) also take ✓ and ✗. The person
presses **Send** when done; you read their answers back, answer, and redraw. The `vb` tools are
the only way in; their descriptions hold the exact fields.

## Where you are running

**From your own chat** (the `vb` MCP server in your client's settings):
- Call `join` once with a short label ("Pricing chat"). Save the agent id and secret in your
  durable notes at once; pass the secret as `secret` on every call that takes it. On
  `not-authenticated`, join again and ask again for the boards you need.
- When a round is drawn, tell the person the board's title and id in one line.

**In the board's chat panel** (the board started you):
- You are already joined, with no secret to pass: never call `join`, never send `secret`.
- The board you were started on is granted to you. Each message ends with `Board: <id>`.
- **No board yet.** A message that ends "No board is open in this folder yet." comes from a
  folder with no boards. Answer short questions in the chat. When there is something to draw,
  create a board for the topic in the same `write_board` call as its first round: a `board` item
  named for the subject, short ("Hiring plan"), then its containers and cards. The person's page
  opens it, and your next messages end with its `Board: <id>`.
- **Quiet while you work.** Every block of text you write shows in the chat as a message, so
  write none during the turn: no narration of steps ("Let me read the file", "Now I'll draw the
  cards"), no running commentary between tool calls. End the turn with one or two short lines
  saying what changed ("Done, 3 cards added on Pricing", "Answered your note on 12"). Your board
  writes show as chips the person can click, so do not describe them again.
- **One message carries everything.** The person's message and Send are one thing: each
  message is the person's turn handed to you, in blocks separated by a blank line, any but the
  last left out when empty:
  1. Their words.
  2. `The person selected these cards:` then `- Card <n>: <title>` per selected card. "These",
     "this one", "the selected ones" in their words mean these cards: treat a message about them
     like a comment on that group.
  3. (Rare, an older page) `Attached from the board:` with `- Note <seq> on card <n> ...` lines.
  4. The Send message: their answers since you were last told. It starts "The person updated the
     board:", then the board's title and one line per answered card in card order, with its
     number, kind and answer: `2 (question): no`, `5, 7 (finding, risk): comment: <their words>`,
     `6 (finding): saved for later`, a container note as `On container "<title>" comment: ...`,
     then "Still open: ..." or "Nothing left open.", and a last line giving the `head` it covers.
  5. `Board: <id>`.
- **Act on the words, with the answers as context.** When there are words, they are the
  request: "for the ones I ticked, write the tasks" means the cards whose answer line gives ✓'s word (`yes`, `done`, `ok`).
  The selected cards are what the words are about. Still answer every comment, More
  context and Later in the answer lines, in card order (see Answering). A message with no words
  is the person pressing Send: act on the answer lines, in that order.
- **Don't fetch it again**: no `check_responses` or `list_open` to re-read what the message
  lists. Read more only for what you need: `show_node` for a card's latest `ver` and a note's
  `seq` before you `reply`, `append` or `park`; `show_container` for a container. To catch
  anything newer later, `check_responses` with `after` set to the message's head.
- Board writes never ask the person. File edits and shell commands pause for **Allow** or
  **Deny**. A denial means no: do not retry the same change; say in one line what you wanted to
  do and ask.
- Never hold your turn open: no `check_responses` with `wait`. What the person sends
  while you are answering waits until your turn ends. End the turn; their next message brings
  their answers.

**In both**: the chat gets a line or two saying what changed, never the cards' content. No list
of what you drew or answered: the person reads it on the board.

## When to use the board

- Short answers stay in chat. Use the board when your reply would be a list the person must
  answer point by point (about 8 or more), when the shape matters (steps, options, dependencies),
  or when asked. In the panel, the board is where content goes.
- One board per subject. Call `list_boards` first and reuse the board for the same subject.

## Starting a board

- Write a `board` item: `title` names the subject only, short enough for the toolbar picker
  ("Pricing review", never "Vision Board: pricing review"); `summary` is one or two sentences.
  The id is lowercase letters, digits and hyphens (`pricing-review`).
- Creating a board needs no grant: you hold it, and you make and edit your own containers on it.
- Only a board's creator writes its `board` item, and only once. The person renames boards.

## Access

- **A board you did not create**, including one the person made from the picker: call
  `request_grant` with just `board` and a `reason` before you write anything on it.
- **Another agent's container**: `request_grant` with `board` and `region`.
- **An item fails `needs-grant`**: call `request_grant` once for exactly what it names. Asking
  again returns the open request (`replayed: true`), so never loop. When the answer comes,
  resend the same items with the same keys.
- **A call fails `wrong-folder`**: the board has another project folder open. Stop, tell the
  person in one line what it says, and do not `join` or write until they open your folder again.
- **Waiting for the answer**: in your own chat, `check_responses` with `wait` until a `grant` or
  `deny` for your request arrives. In the panel, say in one line what you asked for and end the
  turn. After a `deny`, do not ask for the same thing again unless the person tells you to.

## Choosing a layout

Each container (region) has one mode. You cannot see the result, so choose by shape. **`grid` is
the default**: card numbers already give the reading order, row by row, like numbered points in
a chat reply.

| Mode | What it looks like | Use it for |
|---|---|---|
| `grid` | Cards in rows, about √n columns (or `columns`) | Almost everything: findings, questions, options, an agenda |
| `column` | One column, top to bottom in card order | A short ranked set (3 to 5); several columns side by side |
| `row` | One row, left to right in card order, no links needed | A short ordered set read across (3 to 6): stages, options in order |
| `flow` | Left to right along links, with branches; it only follows links | A real sequence: steps, a decision path, a pipeline |
| `lanes` | Several left-to-right flows stacked, one per lane, on one shared column grid | Steps split by owner or area, each lane its own sequence (`lanes`, and each card's `lane`) |
| `radial` | Rings around one centre card (`center` = its number) | Options or ideas around one topic |

- **Links only for a real flow or dependency** ("blocks", "causes", "then" in a process). Never
  link to show reading order or that cards are related: the numbers and the container do that.
  Information and choices stay unlinked.
- `list` is now `column`: a write naming `list` is refused.
- A screen is wider than it is tall: a long sequence goes in a horizontal `flow` (or a short one
  in a `row`), not a `column`. A tall `column` or a long `row` pushes cards off screen; prefer
  `grid`.
- `row` shows a short sequence across the screen with no links (stages, a short timeline). When
  a step truly needs the one before it ("then", "blocks") or the path branches, use `flow` with
  links: `flow` places cards only by their links.
- In `flow` and `lanes`, every card is a step linked into the sequence. A card with no links
  lands in the first column, so cards that are not steps belong in a `grid` container beside it.
- **How `lanes` places cards**: the lanes share one column grid, and a card's column is its link
  depth across the whole container (the longest chain of links leading to it), not its place in
  its own lane. A link from one lane to another pushes the target, and everything after
  it, to the right, so cross-lane links draw long lines across the board.
- **When to use `lanes`**: a lane is one area or owner running its own sequence; its links stay
  inside the lane, and a link across lanes is a rare handoff. When most links would cross lanes,
  don't use lanes: group the steps by phase in one `flow` (or a `grid` per phase), give each card
  its area in the text, and write what crosses in the card's body ("needs card 5").
- Several small containers, one per category, read better than one large one.
- The person may switch a container's mode (a `mode` act). Keep their choice.
- `center` takes a card number, which a card only has once written: draw the radial container
  and its cards, then send the `region` again with `center` set.

## Writing cards

- Draw a whole round in one `write_board` call (up to 200 items, run in order): the board,
  containers, cards, then links. Cards are numbered in the order written, so write them in the
  order you want them read.
- **Card numbers are the reading order.** Never put step numbers in titles ("Step 3: ...",
  "1. Set up ..."): the card's number already shows it, and a title number goes wrong as soon as
  a card is added or moved.
- **Each board numbers its cards from 1**, in the order drawn, and a number never changes or
  goes to another card on that board. `write_board`'s answer gives each new card's `n`; until a
  card has one, name it by its `key` within the write. Never guess a new card's number in text
  (a reply, a body) in the same call: name it by its title there, or write the number in a
  later call once the answer has given it. Every read (`get_board`, `show_node`, `list_open`,
  `check_responses`, the Send message) names cards by their number on that board, so "card 3"
  always means one board's card 3: in chat about two boards, say which.
- **Give every item a `key`.** Keys are yours across the whole project, so start them with the
  board (`pricing-f3`). A resend with the same key and content is answered `replayed` and writes
  nothing; the same key with different content fails `conflict`. A new version of a card takes a
  new key (`pricing-f3-v2`).
- Name cards by key before they have numbers: `{ "type": "link", "from": { "key": "pricing-f1" },
  "to": { "key": "pricing-f2" }, "label": "blocks" }`.
- **Title** one line. **Body** short Markdown: paragraphs, bold, lists, `###` small labels, `>`
  callouts, short code blocks. `emphasis` sparingly.
- **Card sizes** are three widths: `s` for a short card (a question, a line or two), `m` for a
  paragraph, a short list or a little code, `l` for long text, code blocks or a long list. Leave
  `size` out and the engine picks one from the body's length; suggest one only when the content
  needs it. The person's size wins: never set a size on a card they resized.
- **Never write coordinates.** The engine places cards; the person's moves and sizes win.
- Name cards by number in chat ("see 7").
- Each item is answered on its own. Fix the failed ones and resend only those, with the same
  keys. `pending` in the answer lists what you still owe the person.

## Kinds: the kind decides

A card's `kind` alone decides whether it asks for an answer. There is no `item` mark: a node
that names `item` is refused.

| Kind | Asks for an answer? | Use it for |
|---|---|---|
| `question` | Yes: ✓ is "yes", ✗ is "no" | Something only the person can answer |
| `decision` | Yes | A choice for the person to make or confirm (say the options and your pick) |
| `action` | Yes: ✓ is "done" | Something to do, that the person agrees to or marks done |
| `finding` | No | What you found, with its evidence |
| `risk` | No | What could go wrong, and how likely or bad |
| `topic` | No | A heading or theme for a group of cards |
| `note` | No | Background, a definition, a source |

- **Ask with a question, decision or action card; explain with any other kind.** When you need a
  yes or no, or a choice, draw a card that asks: don't bury the question in a finding's body.
- A card that asks counts in "N of M decided" until the person answers it. A card that tells
  never blocks and is never counted, but the person can still comment on it, ask about it or
  save it for later, and you owe an answer when they do.
- Don't turn every finding into a question. Ask only what you need decided to go on.

## What the person's buttons mean

One meaning on every card:

- **✓** (`ack`, only on a card that asks): OK, yes, done. It decides the card.
- **✗** (`drop`, only on a card that asks): no, not wanted. It decides the card.
- **On a question, ✓ is the answer "yes" and ✗ is the answer "no"**; on an action, ✓ is "done".
  `check_responses` says so in `means` (`yes`, `no`, `done`), and the reply lines read
  `2 (question): no`. ✗ on a question is the person answering No, not dismissing the card: act on
  the No (drop that path, take the other option) and say so in one line.
- **Comment** (`comment`): the person's answer in their own words. On a card that asks, it
  decides the card: read the words as the answer. On any other card, it is their reply to what
  you said. You owe a `reply` or an `append`.
- **More context** (`context`): the person is asking you back. The card stays open. You owe a
  `reply` or an `append` with the explanation.
- **Later** (`later`): saved for later, on any card. You owe a `park` handover (below).

A comment or More context can be on one card, on a group of cards of any kinds (`nodes`), or on
a whole container.

## Changing a card

- Read it first with `show_node`: its latest `ver`, notes, replies, proposals and park bundle.
- **To add to a card**, `append { n, text, base }`: the text goes on the end of its body as a new
  version. Never rewrite a card just to add to it.
- **To rewrite a card**, send a `node` item with `n`, `base` and its full content. `base` is the
  `ver` you read; on `conflict`, read it again and redo the change on the new version.
- A changed card shows the person its new version until they look at it (`unseen` in
  `list_open`).
- Rewrite or append to a card in place only when it is still the same subject.

## Retiring cards

`retire` takes cards off the board for good: `{ "type": "retire", "n": 4, "key": "pricing-r4" }`
for one card, or `{ "type": "retire", "region": "plan-v1", "key": "pricing-r-plan-v1" }` for a
container and every card in it now. The answer's `retired` lists the numbers it took.

- **When the direction changes** (a new plan, a different way to group the work), draw a new
  container with new cards for it and retire the old container, in the same `write_board` call:
  the new container and cards first, then the `retire`. Never rewrite the old cards one by one
  into the new plan.
- Retire a single card that no longer belongs (superseded, a duplicate, a wrong turn).
- **Answer first.** A retire is refused while a card it takes still owes the person something: a
  comment or More context with no `reply` or `append`, or a Later with no `park`; and a
  container's retire waits while a note on the container has no reply. Answer it first (earlier
  in the same call is fine); after a refusal, answer, then send the retire again with the same
  key. Nothing the person asked for goes missing.
- A retired card keeps its number, and its history stays readable (`show_node` answers it with
  `retired`); the number is never given to another card. The person can still see it in the
  board's past versions.
- Retire only on containers you hold (your own, or granted), as for any other change.

## Reading the person's answers

- `list_open` is your to-do list: every question, decision and action not yet decided, and every
  card of any kind waiting for you, with `pending` saying what you owe (`comment`, `context`,
  `later`), plus `containers` for notes on a whole container. In the panel, a message that
  carries the Send message already lists the answers; use `list_open` when one does not and you
  need to know what is still owed.
- `check_responses` gives what the person did after the `head` you pass; keep the `head` it
  returns. In your own chat, pass `wait` (up to 60 seconds) to hold until they press Send. On
  `more: true`, read again at once with `after` set to the highest `seq` in `responses`.
- **Answers arrive in card order**: each batch, up to its Send, is sorted by card number. A note
  on several cards comes at its lowest card and names all of them in `nodes`; a note on a whole
  container comes at the lowest card in it; several acts on one card stay in the order made.
  Work through them in that order and answer in that order.
- Notes reach you as soon as they are written, before Send. **Send** means "I am done, your
  turn". A note can be edited (answer its latest words) or removed (then nothing is owed).
- Other acts: `reopen` (open again: a decided card, or one taken out of Later); `reject` (the
  person turned down your proposal); `move`, `size`, `pin`, `mode` (the person arranged the
  board: keep it that way).
- A card decided by ✓ or ✗ is settled: never raise it again. A card decided by a comment is
  settled by those words: act on them.
- **The flag** is the person's private mark on a card. No read of yours shows it and nothing is
  owed for it: there is nothing to do.
- Your reads are `list_boards`, `get_board`, `show_node`, `show_container`, `list_open` and
  `check_responses`. There is no ledger read for agents.

## Answering

Every comment and every More context is owed a `reply` or an `append`; every Later is owed a
`park`. Nothing the person said goes unanswered, whatever the card's kind.

- `reply { n, to, text }` answers one note; `to` is the note's `seq` (from `check_responses`
  or `show_node`). Keep it short.
- **A note on a group of cards**: one `reply` on any of its cards, with `to` = the note, answers
  it on all of them. Do not reply once per card. An `append` answers it only on the card it
  changes, so when the answer belongs on several cards, reply once and append where needed.
- A note on a whole container: `reply` on any card in that container, with `to` = the note.
- More context: reply with the explanation, or `append` it when it belongs on the card for good.
- A comment that asks for a change: make the change (`append` or a new version), then reply in
  one line with what changed.
- A comment that answers a question: act on the answer, and reply in one line with what you
  will do. If their words leave something open, ask it as a new question card.
- Put the answer on the board, not only in the chat.

## Propose, never decide

- Only the person presses ✓ or ✗. When evidence settles a question, decision or action (the
  code now does it, an email confirms it), `propose { n, ver, action, reason, source }` with
  `action` `ack` or `drop`, `ver` its latest version and `source` where the evidence is.
  Proposals are only for cards that ask; one on another kind fails `invalid`.
- A proposal made on an older version can't be accepted. If you change the card, propose again
  on its new version. `show_node` shows how each proposal ended; after a rejection, propose again
  only with new evidence.

## Saved for later

- When the person moves any card to Later, write `park { n, bundle }`: `situation`,
  `background`, `assessment`, `recommendation` and `sources`. It is a handover, so a new chat can
  pick the card up without this conversation: name the files, links and numbers it depends on.
- If they take the card out of Later and save it for later again, a fresh handover is owed:
  write a new `park` with what is known now, never a copy of the old one.
