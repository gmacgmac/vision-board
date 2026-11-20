# Layouts

For cards you link, a `radial` board, or a card put into a flow. The skill's rules still hold: a flow
lives in one container, links between containers are rare, and the board places cards and routes
links (never steer either).

## Each mode, by the content

You cannot see the result, so choose by what the cards are. Each container has one mode.

| The content | Draw it as |
|---|---|
| Points, findings, questions, options | `row` (leave `mode` out), up to about 6 cards; more in one container: `grid` (about √n across, or `columns`). No links |
| A process, or any cards you link | `flow`, with links for the real steps |
| Work moving between areas or owners | `lanes`: a lane per area (`lanes` on the container, `lane` on each card), links for its steps and handoffs |
| Ideas around one topic | `radial`: draw the cards, then send the `region` again with `center`, a card number |
| A few tall cards read top to bottom, for a reason | `column` (`list` is refused) |

- A `flow` places cards only by their links: every card in a `flow` or `lanes` container is a linked
  step, and a card that isn't a step goes in a container of its own beside it.
- Label a link only when it means more than "next" ("blocks", "feeds", "needs"), in short, simple words; anything longer goes in a card's body.
- A worked call, a flow of two cards linked by key, as `write_board`'s arguments:
  ```json
  {"board": "release", "items": [
    {"type": "region", "key": "release-region-steps", "region": {"id": "steps", "title": "Steps", "mode": "flow"}},
    {"type": "node", "key": "release-card-merge", "node": {"region": "steps", "kind": "topic", "title": "Merge the branch"}},
    {"type": "node", "key": "release-card-tag", "node": {"region": "steps", "kind": "topic", "title": "Tag the release"}},
    {"type": "link", "key": "release-link-merge-tag", "from": {"key": "release-card-merge"}, "to": {"key": "release-card-tag"}, "label": "blocks"}
  ]}
  ```

## Which way a flow runs

The board's header sets which way flows run (across until the person chooses down), and the person
can turn any container. Leave `direction` out, so the board's choice holds; set it on a `flow`
(`across` or `down`) only when the person asks for one.

## Branches

- **A fork**: link the card it forks from to the first card of each branch. The main line follows
  each card's first link in card order, so write the main line's cards first, then each branch's.
- **A branch that rejoins**: link its last card to the card it rejoins. The board keeps each branch
  on its own row (its own column when the flow runs down) and brings it back with one link.
- Link back to an earlier card only when the process really repeats.

## Lanes

The lanes share one column grid; a card sits one column after every card linked to it, each lane
packed left. A lane is one area running its own sequence, and a link across lanes is a rare handoff.
When most links would cross lanes, use one `flow` grouped by phase, with each card's area in its
text.

## Put a card into a flow

Between two linked cards, send one `node` item with `insert: { after, before }` beside `node` (where
the link starts and ends): it relinks them through the card, keeping the label, for a new card or an
existing one (with `n` and `base`). Never an `unlink` and two `link`s.

## Check a `flow` or `lanes` once

After the **first** draw of a `flow` or `lanes` container, call `show_layout` with its `board` and
`region` once; never after other writes, never for another mode. It answers, by board number, each
card's `column` and `row` (and `lane`), `links`, `crossing` (how many cross another; 0 is the aim)
and `empty` cells. It doesn't count links between containers.
- **Reads well** (few crossings, lanes mostly filled): leave it.
- **Many crossings** (about a quarter of the links or more): cut links that aren't a real flow
  (`unlink`); in `lanes`, move a card to the lane its links mostly stay in (rewrite it with `n`,
  `base` and the new `lane`).
- **Many empty cells in `lanes`** (more than cards): regroup by phase in one `flow` (a new
  container, retiring the one you just drew in the same call), or send the `region` again with
  `mode: "flow"`.
- Redraw in the same turn when the answer says so; don't explain it in the chat. One check, at most
  one redraw, then leave it.
