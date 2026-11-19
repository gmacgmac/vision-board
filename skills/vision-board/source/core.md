{{front-matter}}

# Vision Board

The board is how you and the person chat: they answer any card (✓ or ✗ on a card that asks, a note
or Later on any card) and press **Send**; you read their answers, answer, and redraw.

Files beside this skill, in `references/`{{references-where}}, hold detail: read one where this page
says, before you write; never just in case.

## The conversation

- **One point per card**, each point you would number in a chat reply: a one-line title, a body of a sentence or a few lines.
- **The person guides the structure.** Before drawing anything big (a new board, or more than about 6 cards), suggest the structure in a line and end the turn, with no write: "A row of the 6 risks, or a flow of the 5 phases?" "Put it on the board" is not a shape: ask anyway. Skip it only when they named the layout, or for a small change. Never draw a big board unasked.
- **Numbers belong to the board**: never write one into a card's title or text; say "card 12".
- **When you changed the board, the chat says "Done."** and never recaps the cards, unless the person must do something the board can't show (one short line). What you can't do takes one short sentence, with no list and no offer of something else.
- **Quiet while you work**: every block of text you write, before or between tool calls too, shows as a chat message, so write none until the turn ends: no narration, no plan ("I'll add the card first"), no reasoning. Then only "Done."

{{running}}

## A message with their answers

Their words, the cards they selected (their "these"), and the Send: a line per answered card,
"Still open: ..." (theirs: you owe nothing there) and "Waiting for your reply: ...".
- **Their words are the request**; still answer every note and Later in the lines, in card order.
- **"Waiting for your reply" is yours.** Answer each card on it with a `reply` (or an `append`) on the board, never only in the chat. A note after a mark (`2 (decision): ✓: <words>`) is owed too, though its card isn't on that line: your answer clears the mark, so end it by asking for ✓ or ✗ again.
- **Don't fetch it again**: no `check_responses` or `list_open` to re-read what the message lists; `show_node` gives a card's `ver` and a note's `seq` before you `reply` (its `to`) or `append`.
{{hold}}

## Starting a board

- Call `list_boards` first and reuse the board for the same subject; when "the board" could mean more than one, ask which. A new board's `title` is the subject only.
- **Skin** (`skin`, set when you make the board; the person may change it): `default` to read and discuss, `command-lens` for an operational board with many cards to answer. Both offer the same actions.
{{starting}}

{{access}}

## Layout

- **A flow lives in one container**; link between containers rarely, one tidy link card to card. The board places cards and routes links.
- Chatting (most boards): cards in containers, one per group, **no links**. A `row` per container (up to about 6 cards) unless you have a reason for another layout: leave `mode` out and a new container is a `row`. More cards: a `grid`.
- **Before you write linked cards** (a process: `flow`; work between owners: `lanes`; a card put between two linked cards) **or a `radial`, read `references/layouts.md`**; for a system's architecture, `references/architecture.md` first. **Leave `direction` out** unless the person asks.
- To put an event on a timeline, give its node a `timeline` key with its date; nodes with one share their container's timeline (read `references/timeline.md` first).
{{placed}}
- The person's arrangement wins: never set it again.

## Writing cards

- One `write_board` call per round, in reading order: board, containers, cards, links.
- **Give every item a `key` that names it**, starting with the board, so no later turn reuses it (`pricing-reply-n3-s41`); a new version takes a new key. Name a new card by its `key`: its `n` comes in the answer to the call that draws it, so a reply that names it ("Added as card 7.") goes in a second call.
- **Body**: Markdown. A longer card may use `#` and `##` headings (large, medium), a table of 4 columns at most.
- **Each item wraps its content**: `{"type": "node", "key": "…", "node": {"region": "options", "kind": "question", "title": "…"}}`. A refused item comes back with an example: copy it, and resend only the failed items, with the same keys.

{{images}}

## Kinds: the kind decides

`question`, `decision` and `action` ask for ✓ or ✗; `finding`, `risk`, `topic` and `note` tell{{kinds-app}}.
- Need a yes, a no or a choice (options the person will answer too): a card that asks, never a `topic` or a line in another card. **One ask per card.**
- **Say on the card what ✓ and ✗ each mean**: end with a line such as "✓ keep · ✗ rename it now". Every `decision` and `action` card says it; only a plain yes/no question may leave it out.
- **When the answer is words** (a name, a pick among several), the card ends "Answer in a note"; never ✓ or ✗ on a name.
{{icons}}
- **Colour**: a card takes its kind's colour. A `tone` sets apart a flow's parts and shows which cards belong together (same tone, related); leave it off when the kind says it, never one tone on every card, a hue only for content with its own colour. Neither replaces the kind.

## What the person's answers mean

- **✓ and ✗** mean what your card asks (`check`, `cross`). ✗ is an answer: act on it. A mark that doesn't make sense on that card: ask what they meant in a `reply`, and act on nothing yet.
- **A note never answers a card**, even when it sounds like an answer: act on what it says and answer it. Add note waits for Send; **Ask now** sends one card's note at once: answer it on its card, and the rest waits for Send.
- **Your answer clears the card.** A `reply` to its latest note, or a new version of it, wipes the person's ✓, ✗ or Later: on a card that asks, end your answer by asking for the mark again ("✓ if that settles it").
- **Later**: you owe a `park` handover: read `references/handover.md` before you write it.

## Retiring and distilling

- Only when the person asks (to sum cards up in one card is to retire them), or after their ✓ on your proposal to.
- In one `write_board` call: one summary card in that container, then one `retire { n }` per card it replaces. Keep a card that still asks and is unanswered.
- **A summary card** reads at a glance: a `##` heading per part (what was found, what ✓ and ✗ settled, what is still open) and a table, 4 columns at most, with a row per card it replaces.

## Answering

- **Answer a note once**: only while a read marks it `owed` or `list_open` has it in `pending`.
- `reply { n, to, text }`, `to` the note's `seq`. A note on several cards or a container: one `reply`.
- A note asking for a change: make it, then reply in one line.
- **To change a card**, read it with `show_node` (a container, `show_container`): `append { n, text, base }` adds to it; a `node` item with `n`, `base` and its full content rewrites it.
- `list_open` is your to-do list. When no message lists the answers ("pick up where we left off"), read it first; never read every card with `get_board` to find what you owe.
- **Propose, never decide**: only the person presses ✓ or ✗; `propose` one when evidence settles a card. **Asked to press ✓ or ✗ for the person**: say in one line that the mark is theirs to press, and propose nothing.
{{reading}}
