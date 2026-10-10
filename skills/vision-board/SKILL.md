---
name: vision-board
description: Draw your output on the Vision Board when the person must answer it card by card (findings, questions, decisions, risks, actions) or when how things connect matters, then read their answers back and redraw. Use when the person says "put it on the board", when a reply would be a long numbered list, and always for content in the board's own chat panel.
status: v2 (2026-10-10, every card in the conversation, the kind decides, grid by default; v1.1 the wrong-folder line; v1 2026-10-09; scenarios in scenarios.md, evidence in NOTES.md)
---

# Vision Board

The board is a conversation in cards. You explain and ask through cards; every card has a number,
and the person can answer any of them: comment on it, ask you for more context, or save it for
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
- The board you were started on is granted to you. Each message ends with `Board: <id>` and may
  list notes and cards the person attached. Their message has already pressed Send.
- Your plain words show in the chat. Keep them to a line or two ("Done, 3 cards added on
  Pricing", "Answered your note on 12"). Your board writes show as chips the person can click,
  so do not describe them again.
- Board writes never ask the person. File edits and shell commands pause for **Allow** or
  **Deny**. A denial means no: do not retry the same change; say in one line what you wanted to
  do and ask.
- Never hold your turn open: no `check_responses` with `wait`. The person cannot message you
  while you are answering. End the turn; their next message brings their answers.

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
| `list` | One column, stacking downward | A short ranked set (3 to 5); several lists side by side |
| `flow` | Left to right along links, with branches | A real sequence: steps, a decision path, a pipeline |
| `lanes` | Several left-to-right flows stacked, one per lane | Steps split by owner or area (`lanes`, and each card's `lane`) |
| `radial` | Rings around one centre card (`center` = its number) | Options or ideas around one topic |

- **Links only for a real flow or dependency** ("blocks", "causes", "then" in a process). Never
  link to show reading order or that cards are related: the numbers and the container do that.
  Information and choices stay unlinked.
- A screen is wider than it is tall: a long sequence goes in a horizontal `flow`, not a `list`.
  A tall `list` pushes cards off screen; prefer `grid`.
- In `flow` and `lanes`, every card is a step linked into the sequence. A card with no links
  lands in the first column, so cards that are not steps belong in a `grid` container beside it.
- Several small containers, one per category, read better than one large one.
- The person may switch a container's mode (a `mode` act). Keep their choice.
- `center` takes a card number, which a card only has once written: draw the radial container
  and its cards, then send the `region` again with `center` set.

## Writing cards

- Draw a whole round in one `write_board` call (up to 200 items, run in order): the board,
  containers, cards, then links. Cards are numbered in the order written, so write them in the
  order you want them read.
- **Give every item a `key`.** Keys are yours across the whole project, so start them with the
  board (`pricing-f3`). A resend with the same key and content is answered `replayed` and writes
  nothing; the same key with different content fails `conflict`. A new version of a card takes a
  new key (`pricing-f3-v2`).
- Name cards by key before they have numbers: `{ "type": "link", "from": { "key": "pricing-f1" },
  "to": { "key": "pricing-f2" }, "label": "blocks" }`.
- **Title** one line. **Body** short Markdown: paragraphs, bold, lists, `###` small labels, `>`
  callouts, short code blocks. `size` (`s`, `m`, `l`) is only a suggestion; `emphasis` sparingly.
- **Never write coordinates.** The engine places cards; the person's moves and sizes win.
- Card numbers never change. Name cards by number in chat ("see 47").
- Each item is answered on its own. Fix the failed ones and resend only those, with the same
  keys. `pending` in the answer lists what you still owe the person.

## Kinds: the kind decides

A card's `kind` alone decides whether it asks for an answer. There is no `item` mark: a node
that names `item` is refused.

| Kind | Asks for an answer? | Use it for |
|---|---|---|
| `question` | Yes: ✓ reads "Yes", ✗ reads "No" | Something only the person can answer |
| `decision` | Yes | A choice for the person to make or confirm (say the options and your pick) |
| `action` | Yes: ✓ reads "Done" | Something to do, that the person agrees to or marks done |
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

## Reading the person's answers

- `list_open` is your to-do list: every question, decision and action not yet decided, and every
  card of any kind waiting for you, with `pending` saying what you owe (`comment`, `context`,
  `later`), plus `containers` for notes on a whole container. In the panel, start each turn
  with it.
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
