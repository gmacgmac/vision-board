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

## Skill v2.1 (panel-send T_01)

- 2026-10-10, agent: v2.1 answers the U13 VERIFY_01 lines above. In the panel: write no text
  during a turn (every block shows as a chat message), end with one or two lines; on a question ✓
  is "yes" and ✗ is "no", on an action ✓ is "done" (`check_responses` `means`, reply lines
  `2 (question): no`), and ✗ on a question is an answer to act on, not a dismissal; the Send
  message ("The person updated the board:", card-ordered lines, a head line) is acted on as it
  stands, with `show_node` only for a `ver` or a note's `seq`, never re-fetched; a message ending
  "No board is open in this folder yet." gets a board named for its subject in the first
  `write_board` call. Scenarios 12 and 13 added.
- 2026-10-10, agent: one print-mode turn of `claude` (Sonnet 5.5, its default) on a test server,
  scenario 12 with the panel's no-board prompt: no text before the write; one `write_board` that
  created "Office move" (`office-move`) with a decisions `grid` (3 questions, 2 decisions, 1
  action), a linked `flow` of 7 steps and a risks `grid`; every item ok, no `join`, no grant. Its
  closing words were three sentences, one more than asked; keys began `om-`, not the board id.

## Skill v2.2 (field report batch 1)

- 2026-10-11, maintainer (the field report from the first real use: an nclite chat, board
  `multi-bot`, skill v2.1; as summarised in `cortex-tasks/board/2026-10-11_board-app_field-report-batch-1.md`
  ruling 4 and tracker N35; the report itself is not in the repo): (12) in `lanes` a card's
  column is its link depth across the whole container (`packages/layout/src/modes/lanes.ts`,
  `layersOf`: the longest chain of links), so cross-lane links drew long lines. (13) A lane is one
  area or owner with its own sequence; when most links cross lanes, one `flow` grouped by phase
  reads better, with cross-lane needs in the card text ("needs card 5"). (14) Card numbers are the
  reading order: no step numbers in titles. (15) When the direction changes, draw a new container
  (and retire the old one once `retire` exists); rewrite a card in place only for the same
  subject. (17) What `s`, `m` and `l` are for, and that the person's size wins. (73, N35) Card
  numbers count across the project, so a new board started at 33 and risk cards written as "card
  1" had to be fixed.
- 2026-10-11, agent: v2.2 puts each of those in the skill and adds scenario 14 (lanes or flow).
  Not run against a model in this task (rule 17): scenario 14 is there for the maintainer's run.

## Skill v2.3 (field report batch 2)

- 2026-10-11, agent (batch 2 T_01; D-041, field report 7-9 and 15, tracker N35, N36, and the
  chat-context task): v2.3 says each board numbers its cards from 1 and a number never changes
  (the write's answer gives `n`; keys name cards within a write); drops v2.2's "numbers count
  across the project"; adds `retire` (a new container and the old one retired when the direction
  changes; refused while a comment, More context or Later is owed, so answer first and resend with
  the same key; a retired card keeps its number); renames `list` to `column` (`list` is refused)
  and adds `row`; `flow` only follows links; the flag is the person's and no agent read shows it;
  the panel's one message (words, "Attached from the board:", the Send message, `Board: <id>`),
  acted on as words with the answers as context; `read_ledger` is no longer an agent tool.
  Scenarios 15 (restructure with retire) and 16 (one message with words, a card and answers).
- 2026-10-11, agent: one print-mode turn of `claude` 2.1.295 (Sonnet 5.5, its default) on a test
  server, scenario 15 as a panel message ("Let's go page-first instead: redo the plan." /
  `Board: multi-bot`; the board's `plan` flow of 9 cards, ✓ on decision 2, More context on 6
  unanswered). One `get_board`, then one `write_board`: `reply` on 6 first, a new `plan-v2` flow
  with 7 cards (numbered 10 to 16) and links, then `retire { region: "plan" }` (answered
  `retired` 1 to 9, `pending` empty). It carried 2's decision into the new routing card and did
  not ask it again. Gaps: its reply named a new card "(7)" before the write had numbered it (it
  was 11), so v2.3 adds "never guess a new card's number in text in the same call"; it set `size`
  on every card; its closing words were four short paragraphs, not one or two lines.
- 2026-10-11, orchestrator: skill v2.4: the panel message's selection block ("The person selected these cards:", right after the words; a message about them is like a group comment), from the composer task.

## Skill v2.5 (field report batch 3)

- 2026-10-11, agent (batch 3 T_01; PLAN rulings 1, 3, 5, 6, api.md 132-133): v2.5 adds `show_layout`
  once after the first draw of a `flow` or `lanes` container (what it answers; many crossings: cut
  links, move a card's lane; lanes spread thin: regroup by phase or switch the region to `flow`;
  one check, one redraw at most), says how lanes place cards now (columns by link depth, each lane
  packed left, unlinked cards in free cells, lines never under a card), card `widths` (defaults,
  set only when the content asks, the person's choice wins) and short link labels (shown near the
  source only where they fit, else a marker). Scenario 17 (the round 1 shape). Thresholds
  calibrated on that shape with `structureOf` at one card size: as `lanes` 6 columns, 2 of 16 links
  crossing, 16 of 30 cells empty; the same cards as one `flow` 4 crossing, 20 empty; with only the
  8 in-lane links, 0 crossing, 5 empty. So "about a quarter of the links crossing" or "more empty
  cells than cards" flags a tangle, and the round 1 shape sits at the edge.

- 2026-10-11, agent: two print-mode turns of `claude` 2.1.295 (Sonnet 5.5) on a test server, scenario
  17's content in own chat. Both called `show_layout` once per container after the first write (4
  flows the first time, only the branching one the second), never again, kept labels to one word
  and set no `widths`; all crossings 0, no redraw. Both drew a container per area with 7 or 8 links
  between containers (which `show_layout` does not see), so v2.5 says a container per area linked
  across is the same tangle drawn worse; still drawn in run 2. Both set `size` on every card.
