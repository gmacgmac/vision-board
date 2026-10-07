---
category: board-agent
status: active
created: 2026-10-06
scope: Observations from real use, the input for rewriting SKILL.md (tracker N17, rule 17)
keywords: [skill, agent, layout, grants, notes]
---

# Skill notes

Not instructions. A running record of what real use showed, so the skill rewrite (N17) starts
from evidence. Add a dated line per observation; say who saw it. `SKILL.md` is still draft v0
and describes the retired view files, so it needs a full rewrite on the MCP/API.

## Choosing a layout

- 2026-10-06, maintainer: horizontal flows suit long sequences (decision flows, steps); there is
  more width than height on a screen.
- 2026-10-06, maintainer: vertical stacks suit short sequences, several side by side.
- 2026-10-06, agent: lanes stack each lane's cards top to bottom, so a lane of 3 or more unlinked
  cards gets very tall. Prefer grid or flow for those until lanes run left to right.
- 2026-10-06, agent: in a flow, a card with no links into the sequence is placed first. Link
  every card, or put a stand-alone card in another container.
- 2026-10-06, agent: the agent picks modes blind; it can't see the result without a browser.
  The skill should describe what each mode looks like.

## Naming

- 2026-10-07, maintainer: the skill says "Give the board a title. Don't include Vision Board in
  it." Name the board for its subject only, short enough for the toolbar picker.

## Access

- 2026-10-06, maintainer: a chat that creates a board or container holds its write grant and can
  edit and update it freely. Writing to one it did not create needs `request_grant` and the
  person's yes. The agent didn't know creating a board needed no grant; say so up front.
- 2026-10-07, maintainer (D-034, BE_03): access is two levels now, board first. A chat holds a
  board it created, or one the person granted it (`request_grant` with just `board`); on it, it
  makes and edits its own containers freely. Another agent's container still needs that
  container's grant (`board` and `region`), which brings the board too. Only a board's creator
  rewrites its `board` item. The skill should say: ask for the board before writing on a board
  you didn't create, then ask once for whatever `needs-grant` names.

## Reading answers

- 2026-10-06, agent: notes reach `check_responses` as soon as the person writes them, before
  Send. Send is the "I'm done" signal that ends a `wait`. The person wasn't sure what Send does.
- 2026-10-06, agent: to answer a note on a whole container, `reply` on any card with `to` set to
  the note's `seq` (api.md 73). The tool description doesn't say this; `reply` requires `n`.

## Writing

- 2026-10-06, agent: one `write_board` call with keys for every item, links naming cards by key,
  worked first time. Linking by key before numbers exist felt natural.
