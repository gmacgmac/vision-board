---
category: board-agent
status: active
created: 2026-10-06
scope: Observations from real use, the input for rewriting SKILL.md (tracker N17, rule 17)
keywords: [skill, agent, layout, grants, notes]
---

# Skill notes

Not instructions. A running record of what real use showed, so changes to the skill start from
evidence. Add a dated line per observation; say who saw it. `SKILL.md` v1 (2026-10-09, chat-panel
T_01) was written from these notes; `scenarios.md` holds the runs it is tested against.

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
- 2026-10-09, maintainer (chat 345-348, after a Kiro run in the chat panel): links are not the
  default. Card numbers already give the reading order (like numbered points in chat); a link
  shows a real flow or dependency only. Information and choices stay unlinked. A board's
  generic state is the grid, read in rows; flow is a specific layout someone picks for a flow.
- 2026-10-09, orchestrator: in that run Kiro chose `list` for both containers (one column, so
  the cards stacked downward) and linked the agenda cards ("then", "shapes"). Skill v1 steered
  it there: its layout table suggests `list` for ordered items and says "link every card" in
  flow and lanes, with no "don't link what isn't a flow". Fix in the skill's next version.

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
- 2026-10-08, maintainer (navigation BE_01, api.md 90-91): the person can now make a board (and
  rename any board) from the picker. A board the person made has no agent creator, so no agent
  holds it: call `request_grant` with just its `board` and wait for the yes before writing on it.
  An agent can never rewrite its `board` item (`forbidden`).

## Reading answers

- 2026-10-06, agent: notes reach `check_responses` as soon as the person writes them, before
  Send. Send is the "I'm done" signal that ends a `wait`. The person wasn't sure what Send does.
- 2026-10-06, agent: to answer a note on a whole container, `reply` on any card with `to` set to
  the note's `seq` (api.md 73). The tool description doesn't say this; `reply` requires `n`.
- 2026-10-08, maintainer (stage5-follow-ups BE_01): when the person takes a card out of Later and
  saves it for later again, a fresh handover is owed: write a new `park` for it with what is known
  now, not the old one. The card shows no old handover until the new one comes.

## Writing

- 2026-10-06, agent: one `write_board` call with keys for every item, links naming cards by key,
  worked first time. Linking by key before numbers exist felt natural.
- 2026-10-08, maintainer (proposals-seen-parking BE_01, api.md 93, 95): to add to a card, write
  `append { n, text }`: the text goes on the end of its body as a new version, so you never
  rewrite the card to add a finding. `reply` stays the answer to one of the person's notes.
- 2026-10-08, maintainer (same): a proposal made on an older version of a card can't be accepted;
  the person sees "changed after this was proposed". After you edit a card, propose again on its
  new version. The person can now reject a proposal; `show_node` says how each one ended.

## Skill v2 run (every-node T_01)

- 2026-10-10, agent: four print-mode turns of `claude` 2.1.295 (Sonnet 5.5, its default) on a test
  server, scenarios 11, 10 (own chat and panel) and a panel board drawn from another board. Every
  container `grid`, no links, no `item`; it asked with `question`, `decision` and `action` cards
  and explained with findings, risks and notes. A comment on three mixed cards got one `reply`
  (`to` = the note) plus `append`s where the decision belonged; the commented question was taken
  as answered, not asked again. A More context got a reply, a Later a full `park`.
- 2026-10-10, agent: in the same run the chat words were long: own chat listed every card's
  content, the panel a paragraph per group. v2 adds "In both: a line or two, never the cards'
  content"; the one panel turn after it was two short paragraphs, still more than one line.
- 2026-10-10, agent: in the panel it read with `check_responses` and did not start the turn with
  `list_open`; after a round it once called a risk "still open" (only cards that ask are open).
- 2026-10-10, orchestrator (U13 VERIFY_01, chat panel): Kiro posted 3-4 interim chat messages per
  turn narrating its steps; Claude kept to one or two lines. Kiro read ✗ on a yes/no question as
  "dropped, settled" rather than "No". The skill should say: on a question, ✓ is Yes and ✗ is No;
  in the panel, say nothing until the turn's one-line summary.
