---
name: vision-board
description: Draw your output on the Vision Board when the person must answer it point by point (findings, questions, decisions, risks, actions) or when how things connect matters, then read their answers back and redraw. Use when the person says "put it on the board", when a reply would be a long numbered list, and always for content in the board's own chat panel.
status: v1 (2026-10-09; scenarios in scenarios.md, evidence in NOTES.md)
---

# Vision Board

The board is where your output goes when the person has to answer it item by item. They
acknowledge, drop, comment, ask for more context or save a card for later, then press **Send**.
You read that back, answer, and redraw. The `vb` tools are the only way in; their descriptions
hold the exact fields.

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
- Your plain words show in the chat. Keep them to a line or two ("Done: 3 cards added on
  Pricing", "Answered your note on 12"). Content goes on the board; your board writes show as
  chips the person can click, so do not describe them again.
- Board writes never ask the person. File edits and shell commands pause for **Allow** or
  **Deny**. A denial means no: do not retry the same change; say in one line what you wanted to
  do and ask.
- Never hold your turn open: no `check_responses` with `wait`. The person cannot message you
  while you are answering. End the turn; their next message brings their answers.

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
- **Waiting for the answer**: in your own chat, `check_responses` with `wait` until a `grant` or
  `deny` for your request arrives. In the panel, say in one line what you asked for and end the
  turn. After a `deny`, do not ask for the same thing again unless the person tells you to.

## Choosing a layout

Each container (region) has one mode. You cannot see the result, so choose by shape:

| Mode | What it looks like | Use it for |
|---|---|---|
| `grid` | Cards in rows, about √n columns (or `columns`) | A set of findings or risks to review |
| `list` | One column, top to bottom | Ordered questions, a short ranked list |
| `flow` | Left to right along links, with branches | Long sequences, steps, decision paths |
| `lanes` | Several left-to-right flows stacked, one per lane | Steps split by owner or area (`lanes`, and each card's `lane`) |
| `radial` | Rings around one centre card (`center` = its number) | Options or ideas around one topic |

- A screen is wider than it is tall: a long sequence goes in a horizontal `flow`; short
  sequences go in several `list` containers side by side.
- In `flow` and `lanes`, link every card. A card with no links lands in the first column, so a
  lane of 3 or more unlinked cards grows very tall: use `grid` for those, and put a stand-alone
  card in a container of its own.
- Several small containers, one per category, read better than one large one.
- The person may switch a container's mode (a `mode` act). Keep their choice.
- `center` takes a card number, which a card only has once written: draw the radial container
  and its cards, then send the `region` again with `center` set.

## Writing cards

- Draw a whole round in one `write_board` call (up to 200 items, run in order): the board,
  containers, cards, then links.
- **Give every item a `key`.** Keys are yours across the whole project, so start them with the
  board (`pricing-f3`). A resend with the same key and content is answered `replayed` and writes
  nothing; the same key with different content fails `conflict`. A new version of a card takes a
  new key (`pricing-f3-v2`).
- Name cards by key before they have numbers: `{ "type": "link", "from": { "key": "pricing-f1" },
  "to": { "key": "pricing-f2" }, "label": "blocks" }`.
- **Kinds**: `question`, `finding`, `decision`, `risk` and `action` can be answered; set
  `item: true` on each one the person should answer, and it gets a number. `topic` and `note`
  are context and take no answer. A finding can be acknowledged but not dropped.
- **Title** one line. **Body** short Markdown: paragraphs, bold, lists, `###` small labels, `>`
  callouts, short code blocks. `size` (`s`, `m`, `l`) is only a suggestion; `emphasis` sparingly.
- **Never write coordinates.** The engine places cards; the person's moves and sizes win.
- Card numbers never change. Name items by number in chat ("see 47").
- Each item is answered on its own. Fix the failed ones and resend only those, with the same
  keys. `pending` in the answer lists what you still owe the person.

## Changing a card

- Read it first with `show_node`: its latest `ver`, notes, replies, proposals and park bundle.
- **To add to a card**, `append { n, text, base }`: the text goes on the end of its body as a new
  version. Never rewrite a card just to add to it.
- **To rewrite a card**, send a `node` item with `n`, `base` and its full content. `base` is the
  `ver` you read; on `conflict`, read it again and redo the change on the new version.
- A changed card shows the person its new version until they look at it (`unseen` in
  `list_open`).

## Reading the person's answers

- `list_open` is your to-do list: every undecided item in your containers, with `pending` when
  you owe it something (`comment`, `context`, `later`), plus `containers` for notes on a whole
  container. In the panel, start each turn with it.
- `check_responses` gives what the person did after the `head` you pass; keep the `head` it
  returns. In your own chat, pass `wait` (up to 60 seconds) to hold until they press Send. On
  `more: true`, read again at once.
- Notes reach you as soon as they are written, before Send. **Send** means "I am done, your
  turn". A note can be edited (answer its latest words) or removed (then nothing is owed).
- What each answer means:
  - `ack`, `drop`: decided. Never raise it again.
  - `reopen`: open again (a decided card, or one taken out of Later).
  - `comment`: answer it. `context` ("needs context"): explain more.
  - `later`: saved for later; write a park bundle (below).
  - `reject`: the person turned down your proposal.
  - `move`, `size`, `pin`, `mode`: the person arranged the board. Keep it that way.

## Answering

- `reply { n, to, text }` answers one note; `to` is the note's `seq` (from `check_responses`
  or `show_node`). Keep it short.
- A note on a group of cards: one reply on any of its cards answers it on all of them.
- A note on a whole container: `reply` on any card in that container, with `to` = the note.
- "Needs context": reply with the explanation, or `append` it when it belongs on the card for
  good. Either one answers it.
- A comment that asks for a change: make the change (`append` or a new version), then reply in
  one line with what changed.
- Put the answer on the board, not only in the chat.

## Propose, never decide

- Only the person acknowledges or drops. When evidence settles an item (the code now does it, an
  email confirms it), `propose { n, ver, action, reason, source }` with `action` `ack` or `drop`,
  `ver` its latest version and `source` where the evidence is.
- A proposal made on an older version can't be accepted. If you change the card, propose again
  on its new version. `show_node` shows how each proposal ended; after a rejection, propose again
  only with new evidence.

## Saved for later

- When the person moves an item to Later, write `park { n, bundle }`: `situation`,
  `background`, `assessment`, `recommendation` and `sources`. It is a handover, so a new chat can
  pick the item up without this conversation: name the files, links and numbers it depends on.
- If they take the card out of Later and save it for later again, a fresh handover is owed:
  write a new `park` with what is known now, never a copy of the old one.
