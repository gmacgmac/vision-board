---
name: vision-board
description: Chat through the Vision Board. Each point you would number in a chat reply becomes its own card, so the person can answer any card in any order (✓ or ✗ on a card that asks, a note, Later); then read their answers back and redraw. Use when the person says "put it on the board", when the conversation runs through the board, when a reply would be a long numbered list, and always in the board's own chat panel.
status: v3.6 (2026-10-16, a card that asks says on the card what ✓ and ✗ each mean, unless it is a plain yes/no question; the Send message's "Waiting for your reply" lists the cards you owe a reply, "Still open" only what needs the person); v3.5 (2026-10-16, ✓ and ✗ answer what the card asks: ask so either mark reads one way; an answer in words is asked for in a note, then restated in your reply for ✓; a ✗ that could mean more than one thing is asked about in a reply, never guessed; a summary states only what ✓ and ✗ settled); v3.4 (2026-10-15, the answer model, D-045: ✓ and ✗ are the person's two marks, read from what the card asks; a note never answers; your answer to a note clears the card, so ask again; consolidate a container only after the person's ✓ on your proposal); v3.3 (2026-10-12, a locked board: say so in one line and stop); v3.2 (2026-10-12, which board "the board" means); v3.1 (2026-10-11, the board is how we chat: one point per card, the person picks the structure first, layouts fitted to the task and the screen, links inside containers, distil only when asked, board numbers only, no `size`, one- or two-line chat); v1 to v2.5 (2026-10-09 to 2026-10-11) are recorded in NOTES.md; scenarios in scenarios.md
---

# Vision Board

The board is how you and the person chat. Each point you would number in a chat reply is its own
card. The board numbers the cards (1, 2, 3... on each board), and the person answers any card, in
any order: ✓ or ✗ on a card that asks, a note or Later on any card. They press
**Send** when done; you read their answers, answer, and redraw. The `vb` tools are the only way in;
their descriptions hold the exact fields.

## The conversation

- **Brief, as in chat.** One point per card: one finding, question, step or option. A one-line
  title and a body of a sentence or a few lines. Never a card holding several points the person
  would answer separately.
- **The person guides the structure.** Before drawing anything big (a new board, or more than
  about 6 cards at once), suggest the structure in a line or two and end the turn, with no write:
  "A row of the 6 risks, or a flow of the 5 phases?" Draw when they answer. "Map", "plan" or "put
  it on the board" is not a shape, and neither is a message saying a board may be created: ask
  anyway. Skip the question only when they named the layout ("a row per area", "lanes"), or for a
  small change (a card or two, a reply, an append). Never draw a big board unasked and redraw it.
- **Ask with `question`, `decision` and `action` cards; explain with the rest** (Kinds).
- **Numbers belong to the board.** Never write a number into a card's title or text: no
  "Step 3: ...", no "1." lists (bullets are fine). When you mention a card, in the chat or in a
  reply, use its board number ("card 12"); a card can say "needs card 5".
- **When you changed the board, the chat says "Done."** and nothing more: the change chips show
  what changed, and the person reads the cards on the board. Add one short line only when the
  person must do something the board can't show ("Done. Allow the file write to finish."). Never
  bullets, headings, numbered lists or a summary of the cards; an assumption or caveat worth
  keeping is a card. A short answer with nothing drawn can stay a chat line.
- **Consolidation is the person's call.** Distil, merge or retire cards only when the person asks,
  or after their ✓ on your proposal to consolidate a container (Retiring and distilling).

## Where you are running

**From your own chat** (the `vb` MCP server in your client's settings):
- Call `join` once with a short label ("Pricing chat"). Save the agent id and secret in your
  durable notes at once; pass the secret as `secret` on every call that takes it. On
  `not-authenticated`, join again and ask again for the boards you need.
- When a round is drawn, name the board's title and id in the line saying what changed.

**In the board's chat panel** (the board started you):
- You are already joined, with no secret to pass: never call `join`, never send `secret`.
- The board you were started on is granted to you. Each message ends with `Board: <id>`.
- **No board yet.** A message ending "No board is open in this folder yet." comes from a folder
  with no boards. Answer short questions in the chat. When there is something to draw, suggest the
  structure first (The conversation); once the person has answered, create the board in the same `write_board` call as its first
  round: a `board` item named for the subject, then its containers and cards. The person's page
  opens it, and your next messages end with its `Board: <id>`.
- **Quiet while you work.** Every block of text you write shows as a chat message, so write none
  during the turn: no narration ("Let me read the file"), no commentary between tool calls. End
  the turn with "Done." when you changed the board. Your board writes show as chips the person
  can click.
- **One message carries everything**, in blocks separated by a blank line, empty ones left out:
  1. Their words.
  2. `The person selected these cards:` then `- Card <n>: <title>` per card. "These", "this one"
     in their words mean these cards: treat it like a note on that group.
  3. (Rare, an older page) `Attached from the board:` with `- Note <seq> on card <n> ...` lines.
  4. The Send message: "The person updated the board:", the board's title, one line per answered
     card in card order (`2 (question): ✗`, `4 (decision): ✓: <their note>`, `5, 7 (finding,
     risk): comment: <their words>`, `6 (finding): saved for later`, `On container "<title>"
     comment: ...`), then "Still open: ..." (the cards that need the person's ✓ or ✗) and
     "Waiting for your reply: ..." (the cards with you), each only when it lists a card, else
     "Nothing left open.", and a line giving the `head` it covers.
  5. `Board: <id>`.
- **The words are the request; the answers are its context.** "For the ones I ticked, write the
  tasks" means the cards whose line reads ✓. Still answer every note and Later in the lines, in
  card order. A message with no words is the person pressing Send: act on the lines, in that
  order.
- **"Waiting for your reply" is yours.** Answer each card on it with a `reply` (or an `append`),
  even one whose note came in an earlier round (`show_node` gives the note's `seq`). A note
  after a mark (`2 (decision): ✓: <words>`) is owed too, though that card isn't on the line, and
  your answer clears the mark: ask for it again. "Still open" is only what needs the person's ✓
  or ✗: you owe nothing there.
- **Don't fetch it again**: no `check_responses` or `list_open` to re-read what the message lists.
  `show_node` gives a card's latest `ver` and a note's `seq` before you `reply`, `append` or `park`.
  To catch anything newer later, `check_responses` with `after` set to the message's head.
- Board writes never ask the person. File edits and shell commands pause for **Allow** or
  **Deny**. A denial means no: don't retry the change another way; say in one line what you
  wanted to do and ask.
- Never hold your turn open: no `check_responses` with `wait`. End the turn; their next message
  brings their answers.

## Starting a board

- One board per subject. Call `list_boards` first and reuse the board for the same subject.
- **Which board.** In the chat panel, "the board" is always the panel's own (`Board: <id>`).
  Elsewhere, when "the board" could mean more than one board, ask which in one line before writing.
- Write a `board` item: `title` names the subject only, short enough for the toolbar picker
  ("Pricing review", never "Vision Board: pricing review"); `summary` is one or two sentences.
  The id is lowercase letters, digits and hyphens (`pricing-review`).
- Creating a board needs no grant: you hold it, and you make and edit your own containers on it.
  Only a board's creator writes its `board` item, and only once. The person renames boards.

## Access

- **A board you did not create**, including one the person made from the picker: call
  `request_grant` with just `board` and a `reason` before you write anything on it.
- **Another agent's container**: `request_grant` with `board` and `region`.
- **An item fails `needs-grant`**: call `request_grant` once for exactly what it names. Asking
  again returns the open request (`replayed: true`), so never loop. When the answer comes,
  resend the same items with the same keys.
- **A call fails `wrong-folder`**: the board has another project folder open. Stop, tell the
  person in one line what it says, and do not `join` or write until they open your folder again.
- **A write fails `locked`** (or the board reads `locked: true`): the person locked it, and nobody
  changes it until they unlock it. Tell them in one line ("Pricing is locked; unlock it and I'll
  carry on.") and stop: no retry, no other board, no grant request. Reading it is fine.
- **Waiting for the answer**: in your own chat, `check_responses` with `wait` until a `grant` or
  `deny` for your request arrives. In the panel, say in one line what you asked for and end the
  turn. After a `deny`, don't ask for the same thing again unless the person tells you to.

## Layout: fit the task and the screen

Screens are wider than tall, and nobody wants to scroll for ever. Each container (region) has
one mode. You cannot see the result, so choose by the content:

| The content | Draw it as |
|---|---|
| Chatting: points, findings, questions, options (most boards) | Cards in containers, one per group, **no links**. Many cards on the board: a `row` per container (up to about 6 cards each; containers stack down the screen). A few cards in each: `column`s side by side. A larger set in one container: a `grid` (it wraps into rows, about √n across, or `columns`). |
| A process or flow | `flow`, with links for the real steps ("then", "blocks") |
| Work moving between areas or owners | `lanes`: a lane per area (`lanes`, and each card's `lane`), links for its steps and handoffs |
| Architecture, when asked | Whatever shows it best, links included |
| Ideas around one topic | `radial`; `center` takes a card number, so draw the cards, then send the `region` again with `center` |

- **Links stay inside a container.** At most one or two links between containers on a whole
  board. More means the containers are cut the wrong way: named areas with handoffs are one
  `lanes` container, or a `flow` grouped by phase; a reference only is no link, say it in the
  card ("needs card 5").
- Never link to show reading order or that cards are related: the numbers and the container do
  that.
- `flow` places cards only by their links: every card in a `flow` or `lanes` container is a linked
  step, and a card that isn't a step goes in a container of its own beside it. A `row` is a short
  sequence read across with no links.
- **`lanes`**: the lanes share one column grid; a card sits one column after every card linked to
  it, each lane packed left. A lane is one area running its own sequence, and a link across lanes
  is a rare handoff. When most links would cross lanes, use one `flow` grouped by phase, with each
  card's area in its text.
- **Leave `size` out**: the engine picks each card's width from its content. Leave `widths` out
  too: `grid` and `column` default to `match` (Match card widths evens a column), the rest to
  `own`.
- **Link labels are a word or two** ("blocks", "then", "needs"); a longer one becomes a marker the
  person must hover. Anything longer goes in a card's body.
- The person's arrangement wins (a `mode`, `widths`, `size`, `move` or `pin` act): never set it
  again. `list` is now `column`; a write naming `list` is refused.

### Check a `flow` or `lanes` container once

After the **first** draw of a `flow` or `lanes` container, call `show_layout` with its `board` and
`region` once; never after other writes, never for `grid`, `column`, `row` or `radial`. It answers,
by board number: each card's `column` and `row` (and `lane`); `links` and `crossing` (how many
cross another; 0 is the aim); `empty` cells. It doesn't count links between containers.

- **Reads well** (few crossings, lanes mostly filled): leave it.
- **Many crossings** (about a quarter of the links or more): cut links that aren't a real flow
  (`unlink`); in `lanes`, move a card to the lane its links mostly stay in (rewrite it with `n`,
  `base` and the new `lane`).
- **Many empty cells in `lanes`** (more than cards): the lanes aren't their own sequences. Regroup
  by phase in one `flow` (a new container, retiring the one you just drew in the same call), or
  send the `region` again with `mode: "flow"`.
- Redraw in the same turn when the answer says so; don't explain it in the chat instead. One
  check, at most one redraw, then leave it.

## Writing cards

- Draw a whole round in one `write_board` call (up to 200 items, run in order): the board,
  containers, cards, then links. Cards are numbered in the order written, so write them in the
  order you want them read.
- **Each board numbers its cards from 1**, and a number never changes or goes to another card on
  that board. `write_board`'s answer gives each new card's `n`; until then, name a card by its
  `key` (`{ "type": "link", "from": { "key": "pricing-f1" }, "to": { "key": "pricing-f2" } }`).
  Never guess a new card's number in text in the same call: write it in a later call, once the
  answer has given it. Every read names cards by their number on that board, so in chat about
  two boards, say which.
- **Give every item a `key`**, starting with the board (`pricing-f3`); keys are yours across the
  project. A resend with the same key and content is answered `replayed` and writes nothing; the
  same key with different content fails `conflict`. A new version of a card takes a new key
  (`pricing-f3-v2`).
- **Body**: short Markdown (paragraphs, bold, bullets, `###` small labels, `>` callouts, short
  code). `emphasis` sparingly. **Never write coordinates**: the engine places cards.
- Each item is answered on its own. Fix the failed ones and resend only those, with the same
  keys. `pending` in the answer lists what you still owe the person.

## Kinds: the kind decides

A card's `kind` alone decides whether it asks for an answer (a node naming `item` is refused).

| Kind | Asks? | Use it for |
|---|---|---|
| `question` | Yes | Something only the person can answer |
| `decision` | Yes | A choice to make or confirm (the options and your pick) |
| `action` | Yes | Something to do, that the person agrees to or marks done |
| `finding` | No | What you found, with its evidence |
| `risk` | No | What could go wrong, and how likely or bad |
| `topic` | No | A heading or theme for a group |
| `note` | No | Background, a definition, a source |

- When you need a yes, a no or a choice, draw a card that asks: never bury it in another card's
  body ("needs a rule for who answers" is a `decision` card, not a line in a risk). Ask only what
  you need decided to go on.
- **One ask per card.** Never two questions or two choices on one card: ✓ or ✗ answers it
  whole, so draw a card for each.
- **Say on the card what ✓ and ✗ each mean**, so the person can pick: end its text with a line
  such as "✓ keep · ✗ rename it now". Every `decision` and `action` card says it; only a plain
  yes/no question ("Keep the guest checkout in 1.4?") may leave it out. When you ask for a mark
  again in a reply, say the same unless it is a plain yes ("✓ if that's right").
- **When the answer is words** (a name, a pick among several), the card ends "Answer in a note".
  Their note puts the card with you: reply with what you understood and ask for ✓ ("Sam writes it.
  ✓ if that's right"). Their ✓ settles it, never the note. Never ask ✓ or ✗ on a name.
- **Say where it applies** (the page, screen or file) when the card's context doesn't make it
  plain.
- A card that asks is open until ✓ or ✗ answers it ("N open · N answered" on the board). A card
  that tells is never counted, but the person can still write a note on it or save it for later,
  and then you owe an answer.

## What the person's answers mean

- **✓ and ✗** (on a card that asks) are the person's two marks. The board gives them no meaning:
  read them in the light of what your card asks. `check_responses` reads them as `action` `check` and
  `cross`, and answer lines read `2 (question): ✗`. ✗ is an answer, not a dismissal: act on it
  (drop that path, take the other option) and say so in one line.
- **When ✗ could mean more than one thing** ("no post at all" or "not that kind of post"), don't
  guess: ask which in a `reply` on that card (no `to`) and act on neither yet. Never write a guess
  into another card or a summary as decided. Their answer comes as a note on the card
  (`2 (question): ✗: <words>`); answer it, and ask for the mark again if you still need one.
- **A note** (`comment`): the person's words, on any card. **A note never answers a card**, even
  when the words sound like an answer. On a card that asks, it puts the card **with you**: status
  `with-agent` in your reads, "With agent" on the board, neither open nor answered. A note is often
  a question: answer it with a `reply` or an `append`, and your answer brings the card back to the
  person, open. You owe that answer unless the person pressed ✓ or ✗ on the card after the note. An
  old board's More context (`context`) is a note.
- **Your answer clears the card.** A `reply` to a card's latest note, or a new version of it
  (`append` or a rewrite), wipes the ✓, ✗ or Later the person made before that note: the card is
  open again, with the person, unmarked, and shows as updated. So when you still need a ✓ or ✗, ask for it again in
  your answer ("✓ if that settles it"). A ✓ or ✗ made after the note still counts.
- **Later** (`later`): saved for later, on any card. You owe a `park` handover.
- A note can be on one card, a group of cards (`nodes`) or a whole container.

## Changing a card

- Read it first with `show_node`: its latest `ver`, notes, replies, proposals and park bundle.
- **To add to a card**, `append { n, text, base }`: the text goes on the end of its body as a new
  version. Never rewrite a card just to add to it.
- **To rewrite a card**, send a `node` item with `n`, `base` and its full content. `base` is the
  `ver` you read; on `conflict`, read it again and redo the change on the new version.
- Change a card in place only while it is still the same subject. The person sees the new version
  until they look at it (`unseen` in `list_open`). A new version answers the card's latest note,
  so it clears the card too (What the person's answers mean).

## Retiring and distilling

`retire { n }` takes one card off the board for good; `retire { region }` takes a container and
every card in it. The answer's `retired` lists the numbers taken. A retired card keeps its number
(never given to another card) and its history (`show_node` answers it with `retired`; the board's
past versions still show it).

- **Only when the person asks, or after their ✓ on your proposal.** Never retire, merge or distil
  on your own. If cards look out of date or worth merging, say so in a line and let the person
  decide. (The one exception: a container you drew this same turn that `show_layout` says to
  regroup.)
- **Propose consolidating a container** once every card that asks in it is answered (✓ or ✗) and
  nothing there is owed or asked back (a ✗ whose meaning you asked about is still open): you may
  add one `decision` card to that container ("Sum up the venue cards in one card?") saying which
  cards the summary would replace. Retire nothing yet. On its ✓, in one call: one summary card in
  that container (the problem, what ✓ and ✗ settled, where it landed), then one `retire { n }` per
  card it replaces, the proposal included. On ✗, leave the
  container as it is and don't propose it again unless something changes. One proposal per
  container at a time.
- **A new direction** ("redo the plan page-first"): draw a new container with new cards, then
  retire the old container, in the same `write_board` call. Never rewrite the old cards one by one
  into the new plan.
- **Distil on request**: the person selects a container's cards (or writes a note on the container)
  and asks to distil or sum them up. Write one summary card in that container saying what was
  found, what ✓ and ✗ settled, and what is still open (a ✗ whose meaning you asked about and that
  is not yet answered is open there: keep that card), then one `retire { n }` per card it replaces,
  in the same call.
  Keep a card that still asks and is unanswered unless the person said to fold it in.
- **Answer first.** A retire is refused while a card it takes still owes the person something (a
  note with no `reply` or `append`, a Later with no `park`), or while a note on
  the container has no reply. Answer it earlier in the same call; after a refusal, answer, then
  send the retire again with the same key.
- Retire only on containers you hold (your own, or granted).

## Reading the person's answers

- `list_open` is your to-do list: every card that asks and has no ✓ or ✗, and every card waiting
  for you, with `pending` saying what you owe (`comment` for a note, `context` for an old board's
  note, `later`), plus `containers` for notes on a whole container.
- `check_responses` gives what the person did after the `head` you pass; keep the `head` it
  returns. In your own chat, pass `wait` (up to 60 seconds) to hold until they press Send. On
  `more: true`, read again at once with `after` set to the highest `seq` in `responses`.
- **Answers arrive in card order**: each batch, up to its Send, is sorted by card number. A note
  on several cards comes at its lowest card and names them all in `nodes`; a note on a container
  at its lowest card. Answer in that order.
- Notes reach you before Send; **Send** means "your turn". A note can be edited (answer its latest
  words) or removed (nothing is owed).
- **Each card's latest mark, not every click**: ✓, ✗, Later and clearing come to you as where
  the card stands after your `head` (✓ then ✗ reads `cross`; ✓ then cleared reads nothing).
  Notes come one by one.
- Other acts: `reopen` (the person cleared their ✓ or ✗, or took a card out of Later: it is open
  again); `reject` (the person turned down your proposal); `move`, `size`, `pin`, `mode`,
  `widths` (the person arranged the board: keep it).
- A card answered by ✓ or ✗ is settled: never raise it again, unless a note on it asks something
  (then answer, and ask again) or its ✗ could mean more than one thing (ask which).
- **The flag** is the person's private mark on a card. No read of yours shows it; nothing is owed.
- Your reads are `list_boards`, `get_board`, `show_node`, `show_container`, `show_layout`,
  `list_open` and `check_responses`. There is no ledger read for agents.

## Answering

Every note is owed a `reply` or an `append`; every Later a `park`. Nothing the person said goes
unanswered, whatever the card's kind. Put the answer on the board, not only in the chat.

- `reply { n, to, text }` answers one note; `to` is the note's `seq`. Keep it short.
- **A note on a group of cards**: one `reply` on any of its cards, `to` = the note, answers it on
  all of them; never one per card. An `append` answers it only on the card it changes.
- A note on a whole container: `reply` on any card in that container, `to` = the note.
- A note asking a question: reply with the answer, or `append` it when it belongs on the card for
  good. Your answer brings the card back to the person, open: if it asks and you still need their
  mark, end your reply by asking for it ("✓ if the flag plan holds"), since your answer cleared any
  ✓ or ✗ from before.
  Don't draw a new card for the same ask.
- A note asking for a change: make it (`append` or a new version), then reply in one line.
- A note that reads like an answer ("yes, but only on the card path") is not one: act on what it
  says, reply in one line, and ask for the ✓ or ✗ the card still needs.

## Propose, never decide

- Only the person presses ✓ or ✗. When evidence settles a card that asks (the code now does it,
  an email confirms it), `propose { n, ver, action, reason, source }` with `action` `check` (✓) or
  `cross` (✗), `ver` its latest version and `source` where the evidence is. A proposal on any other
  kind fails `invalid`.
- A proposal on an older version can't be accepted: after you change the card, propose again on
  its new version. `show_node` shows how each proposal ended; after a rejection, propose again
  only with new evidence.

## Saved for later

- When the person moves a card to Later, write `park { n, bundle }`: `situation`, `background`,
  `assessment`, `recommendation` and `sources`. It is a handover a new chat can pick up without
  this conversation: name the files, links and card numbers it depends on.
- If they take it out of Later and save it again, a fresh handover is owed: a new `park` with what
  is known now, under a new key, never a copy of the old one.
