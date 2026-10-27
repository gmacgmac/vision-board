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

## Skill v3 (the board is how we chat)

- 2026-10-11, maintainer (chat 574-597; task `cortex-tasks/board/2026-10-11_board-agent_skill-conversation-board.md`
  rulings 1-7): the board is how we chat (one point per card, answered in any order); the person
  guides the structure (suggest it in a line, wait); layouts fit the task and the screen (chatting:
  a `row` per container, `column`s side by side or a wrapping `grid`, no links; `flow`, `lanes`,
  architecture as asked); links stay inside a container (one or two between containers at most);
  ask with question, decision and action cards; consolidation (distil, retire) only when the person
  asks; board numbers only, no numbered lists in the chat; no `size`; one- or two-line chat.
- 2026-10-11, agent: v3 rewrote SKILL.md around those (343 lines, 4,340 words in v2.5; 293 lines,
  3,625 words in v3). Scenarios 18 (a planning question through the board) and 19 (distil on
  request) new; 1, 11, 12, 14 and 17 updated.
- 2026-10-11, agent: runs, `claude` 2.1.295 (Sonnet 5.5, its default), panel-style (a joined agent's
  `VB_AGENT_SECRET` in a `--mcp-config` temp file, `--strict-mcp-config`, `--allowedTools mcp__vb__*`,
  skill as `--append-system-prompt-file`, the panel's "No board is open in this folder yet." line on
  each message), test servers on 4493 and 4494 with `HOME` and `VB_PROJECT` in the system temp
  folder; two messages per run, the second sent only after the first turn's result.
  - Scenario 18, first draft of v3: turn 1 suggested the structure and drew nothing, but in four
    lines with bullets; turn 2 drew "Team offsite": 5 `row` containers of 3 cards, 15 one-point
    cards (12 asking, a risk, 2 actions), no links, no `size`, no `widths`, no numbers in titles;
    closing words two sentences naming cards 1 and 2. Keys began `off-`, not the board id.
  - Scenario 17, first draft (17a): both messages were queued at once and ran as one turn, so it
    says nothing about asking first. One `lanes` container, 16 links all inside it; `show_layout`
    once (0 crossing, 56 empty for 16 cards), then no redraw: it explained the empty cells in a
    five-bullet closing message instead.
  - Scenario 17, after "plain lines, no bullets" and "redraw in the same turn" (17b): drew lanes in
    turn 1 without asking (it read "Map ..." plus the panel's "create one with write_board" as the
    go-ahead); `show_layout` once (60 empty), then one redraw as a new `flow` with the area in each
    body and the lanes container retired (the skill's one allowed agent retire); a needed rule
    ("both bots may claim it") sat in a risk's body, not a decision card; closing words three short
    paragraphs. Fixed in the skill: "map", "plan" and a may-create message are not a shape, ask
    anyway; a needed choice is a `decision` card, not a line in a risk.
  - Final v3, scenario 18: turn 1 three sentences, no write ("a row of cards ... or a timeline of
    planning phases? I'd suggest the row"). Turn 2: "Team offsite", 4 `row` containers (4, 4, 3, 4
    cards), 15 one-point cards (12 asking, 1 risk, 2 actions), keys `team-offsite-...`, no links,
    `size`, `widths` or numbers in titles; closing words two lines ("Cards 1 to 4 ... come first").
  - Final v3, scenario 17: turn 1 offered lanes or a phase flow, no write. Turn 2 (the person: "go
    with your recommendation"): one `lanes` container, 16 cards, 16 links, none between
    containers; `show_layout` once (0 crossing, 60 empty), then in the same turn the `region` sent
    again as `flow` plus an `append` of each card's area; no second check; no `size`, `widths` or
    numbers in titles. Gaps: every card `topic` (steps would read better as `note` or `finding`);
    closing words one five-sentence paragraph, still more than two lines.
- 2026-10-11, agent: what still slips in every run so far (v2 to v3): the closing words run long in
  the turn that draws (three to five sentences); the suggest-first line holds in the final skill.
  The panel's no-board line ("If drawing would help, create one with write_board") pulled one run
  into drawing first; the skill now overrides it, but the line itself could say "suggest the
  structure first" (server wording in `apps/board/server/chat-prompt.ts` `NO_BOARD`, not changed).
- 2026-10-11, maintainer (601-602): when the agent changed the board, its chat says only "Done." (one short line more only for something the board can't show); the panel's no-board line now asks the agent to suggest the structure first (skill v3.1).

## Skill v3.4 (the answer model, D-045)

- 2026-10-15, maintainer (answer-model PLAN rulings 10 and 11, D-045; ruling 10 softened the same
  day: no rule to spell out what ✓ and ✗ mean on each card, "we would be able to infer"): ✓ and ✗
  are the person's two marks, read from what the card asks; a note never answers a card; More
  context is gone (a note can ask); the agent's answer to a note clears the card's earlier ✓, ✗
  and Later, so it asks again; one ask per card; say where a card applies when the context needs
  it; no length rule. Consolidating a container is proposed with one `decision` card once every
  card that asks in it is answered, and done only after the person's ✓.
- 2026-10-15, agent (T_01): v3.4 changes SKILL.md's description and intro (✓ or ✗, a note,
  Later), the panel's answer lines (`2 (question): ✗`, `4 (decision): ✓: <note>`; "the ones I
  ticked" are the lines reading ✓), Kinds (no meaning per kind; one ask per card; say where it
  applies; "N open · N answered"), "What the person's answers mean" (was "What the person's buttons
  mean": `check` / `cross`, no `means`; a note never answers and is owed unless ✓ or ✗ came after
  it; your answer clears the card, so ask again; an old `context` is a note), "Changing a card" (a
  new version clears too), "Retiring and distilling" (propose consolidating; only after the ✓),
  "Reading the person's answers" (each card's latest mark, not every click; `reopen` is a clear;
  `pending` `comment` / `context` / `later`) and "Answering" (a note that asks, or reads like an
  answer, leaves the card open: reply, and ask for the mark). Scenarios 2, 10, 13, 15, 16 and 19
  updated; 22 and 23 new.
- 2026-10-15, agent: runs. `claude` 2.1.284's login had expired ("OAuth session expired and could
  not be refreshed", also outside the sandbox), so the runs used `kiro-cli` 2.24.0 instead: a
  workspace agent in the temp project (`.kiro/agents/vb-test.json`, the skill copied in as its
  `prompt`, `vb` its only tools, `VB_AGENT_SECRET` of an agent joined over HTTP, model
  `claude-sonnet-5.5` in the agent file; the CLI's `--model` answered "Method not found", so the
  model actually used is not established), `chat --no-interactive --trust-tools=@vb`, `--resume`
  for a second turn. Test servers on 4497 to 4499, `HOME` and `VB_PROJECT` in the system temp
  folder, `VB_KIRO_AGENT=0`; boards drawn and the person's acts made over HTTP (person cookie,
  Origin); each message built by the panel's own `promptFor` and `roundOf`. Servers stopped after.
  - Scenario 22: passed. Two `show_node`, one `write_board` with a `reply` to each note, no new
    card, no `propose`. Reply on 2 answered the flag question and ended "✓ again if on is right, ✗
    if you want it off by default"; reply on 3 explained 1.4 and ended "✓ to keep it in 1.4, ✗ to
    move it to 1.5". After: `list_open` 2 and 3 `open`, `unseen`, nothing `pending`; `get_board`
    `unseenAnswer` on both. Chat: "Done." plus one line ("Replying to card 2 cleared your ✓, so it
    needs your mark again."), which the board already shows.
  - Scenario 23: passed. Turn 1: `get_board`, then one `decision` card in "Venue" ("Sum up the
    venue cards in one card?", naming cards 1 to 5); no retire; nothing for "Travel"; "Done."
    Turn 2 (✓ on it): one summary `finding` in "Venue" (problem, decided, what to watch), then
    `retire` 1, 2, 3, 4, 5 and the proposal 8, each its own key; "Travel" untouched; "Done." It
    made two `write_board` calls; only the second wrote lines (the first's answer was not captured).
  - Scenario 10 (updated: the note no longer answers 5): passed. Three `show_node`, one `reply` on
    5 to the group note naming 2, 5 and 8, ending "✓ on card 5 if shipping the back-off in 1.4 is
    the plan, ✗ if not"; 5 left open, nothing owed. Chat: "Done." plus one line asking for the ✓.
- 2026-10-15, agent: what still slips: an extra closing line after "Done." in two of three runs,
  saying what the board already shows. Not run with Claude Code here (the login); VERIFY_01 runs
  both agents through the panel.
- 2026-10-15, agent, for the maintainer (ruling 10, "how much to say is settled in T_01"): v3.4
  adds no rule to say on a card what ✓ and ✗ do. In every run the agent did so anyway in its
  replies ("✓ to keep it in 1.4, ✗ to move it to 1.5"). If wanted, one optional line for Kinds:
  "When ✓ and ✗ could read more than one way, say on the card what each does (✓ keep · ✗
  rename)." Not added.
- 2026-10-15, agent (answer-model BE_02): wording only, no rule change and no version bump. The
  server now takes `propose` with `check` or `cross` and refuses `ack` and `drop` (api.md 147), so
  SKILL.md § Propose, never decide says `action` `check` (✓) or `cross` (✗), and scenario 4's good
  run proposes `action: "check"`. The reads (`get_board`, `show_node`, `list_open`) now say
  `checked` and `crossed`; the skill named no status word for them.

## Skill v3.5 (✓ and ✗ answer what the card asks)

- 2026-10-15, maintainer (chat 102, rulings A to C; settled chat 130, 136): (A) a card that asks
  is answerable with ✓ or ✗; (B) when the answer needs words (a name, a pick among several), the
  card says "Answer in a note"; (C) when ✗ could mean more than one thing, ask in a reply rather
  than guess. From the answer model's VERIFY_01 problem 2: both agents drew "Who writes the release
  post?" with ✓ and ✗, read ✗ as "no release post" and wrote it into a summary as decided.
- 2026-10-16, agent: v3.5 changes § Kinds (ask so either mark reads one way, "✓ keep · ✗
  rename" when it could read two; an answer in words ends "Answer in a note", then reply with what
  you understood and ask for ✓; never ✓ or ✗ on a name), § What the person's answers mean (a ✗
  that could mean more than one thing: ask which in a `reply` with no `to`, act on neither, never
  write a guess anywhere as decided; the answer comes as a note), § Retiring and distilling (no
  proposal while a ✗'s meaning is asked; a summary states what ✓ and ✗ settled; such a card stays)
  and § Reading the person's answers (a settled card is raised again only to ask what its ✗
  meant). Scenarios 24 and 25 new; 13 updated (its "✓ on 9 (an action) as done" gave ✓ a meaning
  by kind, which A leaves to the card); 22 unchanged (its good run already asks with ✓ and ✗).
- 2026-10-16, agent: the mechanics, on a scratch board (port 4495). B: the note puts the card
  "With agent" (header "0 open · 1 with agent"); the agent's `reply` to it brings it back "Open",
  "1 update"; the person's ✓ answers it. C: a `reply` with no `to` on a ✗'d card clears nothing
  (the ✗ stays lit, the card counts answered, nothing `pending`); it shows on the card face as an
  "Agent reply" block, with no "1 update" tab and no count change. The person's note in answer
  comes in the Send as `2 (question): ✗: <words>`. An `append` instead would show "1 update" and
  also leave the ✗ standing.
- 2026-10-16, agent: runs, VERIFY_01's harness (its § Set-up) from the system temp folder. Servers
  on 4493 (Claude Code) and 4494 (Kiro), `HOME` and `VB_PROJECT` in the temp folder,
  `VB_KIRO_AGENT=0`, stopped after; each scenario's board drawn over HTTP by a newly joined agent
  the turn then runs as; the person's acts on the page (Playwright chromium); each message built by
  `promptFor` / `roundOf` before Send. **Claude Code** 2.1.301, `claude -p` with the panel's flags,
  **ran Opus 5.5** (`modelUsage` `claude-opus-5-5`, every turn). **Kiro** `kiro-cli` 2.24.0 as the
  workspace agent `vb-test` (the skill as prompt, `@vb` only), **ran Opus 5.5** (the session file
  records `claude-opus-5.5`). No page console error or failed request.
  - Scenario 24: **pass, both.** Turn 1: one `question` in "Launch" ending "Answer in a note"
    (Claude "Answer in a note with their name."; Kiro "Name the person who drafts the 2.0
    announcement. Answer in a note."); "Done." Turn 2: `show_node`, one `reply` to the note:
    "Robin from the docs team writes the 2.0 release post. ✓ if that's right." (both, word for
    word); card 4 `open`, `unseen`, nothing `pending`; no other card.
  - Scenario 25: **pass, both.** One call: a `reply` on 4 with no `to` asking which ✗ meant
    (Claude "…no release post for 2.0, or a post but not one we name an author for yet. Which is
    it?"; Kiro "…no release post this time, or not settled yet…"), a summary finding listing the three
    ✓ and the release post as still open, card 4 kept, 1, 2, 3 and 5 retired.
    Neither wrote "no release post" as decided. Turn 2 (not in the scenario; the person's note "I
    meant no post: a changelog entry is enough."): Claude replied and asked "✗ again to settle it";
    Kiro replied, rewrote the summary "Release post: none (✗)" and retired 4, though its own reply
    had cleared the ✗ (see the last item).
  - Scenario 13: **pass, both.** ✗ on 3 read as guest checkout out of 1.4 (no ask: the ✗ reads one
    way); card 6 rewritten to "Retries hit only the card path" with a reply to the note; ✓ on 9 read
    as go ahead (Claude replied it needs the checkout code's folder). Harness: Claude ran two
    read-only `Bash` calls (`ls`, `grep`), let through by the person's own settings, as in VERIFY_01.
  - Scenario 22: **pass, both.** A `reply` to each note; 2 ended "✓ if shipping it in 1.4 with the
    flag off is right" (Kiro "✓ again if…"), 3 ended "✓ keep it in 1.4 · ✗ move it to 1.5" (both);
    2 and 3 `open`, `unseen`; no new card, no `propose`. Kiro now says its reply cleared the ✓
    (VERIFY_01 problem 1 not seen again).
- 2026-10-16, agent: what still slips: chat words past "Done." (Claude 3 of 6 turns, one turn with
  no "Done." at all; Kiro 5 of 6, up to four sentences restating its readings).
- 2026-10-16, agent, for the maintainer: (a) C's reply has no update marker, so a person using
  Hide answered, or scanning for "1 update", can miss it; a page change (count an orphan reply on
  an answered card as an update) would be its own task. (b) After the person explains a ✗ in a
  note, the agent's reply clears the ✗; Claude asked for it again, Kiro folded the answer into the
  summary as "none (✗)" and retired the card. Whether the skill should always ask for the mark
  again there ("if you still need one" today) is open.

## Skill v3.6 (every card that asks says what ✓ and ✗ mean)

- 2026-10-16, maintainer (chat 192, go "just proceed"): (1) a card that asks says on the card what
  ✓ and ✗ each mean ("✓ keep · ✗ rename it now"); only a plain yes/no question may leave it out.
  This replaces v3.5's rule A ("say what each does when either could read two ways") and the answer
  model plan's ruling 10. (2) The Send message's new line "Waiting for your reply: …" (D-046, review
  polish round 2 ruling 3): answer each card on it; "Still open" is only what needs the person.
  (3) Any agent reply now shows "1 update" (round 2 ruling 4), so a reply asking what a ✗ meant is
  no longer easy to miss.
- 2026-10-16, agent: v3.6 changes § Kinds (rule A rewritten: every `decision` and `action` says
  what ✓ and ✗ mean, a plain yes/no question may leave it out, a reply asking for a mark again
  says the same unless it is a plain yes), § Where you are running (the Send message's two tail
  lines; a new bullet: "Waiting for your reply" is yours, a note after a mark is owed too though
  its card isn't on the line, "Still open" owes nothing). Rule B ("Answer in a note") kept: a card
  asking for words offers no ✓ or ✗ as the answer. Ruling 3: the skill had no workaround to drop
  (v3.5 already asked in a `reply`; the v3.5 note (a) is now met by the page).
- 2026-10-16, agent: scenarios v3.6: a header rule (an agent's card that asks says what ✓ and ✗
  mean unless it is a plain yes/no question); 11 (its decisions say it), 13, 22, 24 and 25 (their
  cards say it; 22 and 24 now show "Waiting for your reply"; 25's card 4 stays an older card
  without it) updated; 26 new (a round with "Waiting for your reply: 3, 4", 4's note from an
  earlier round, "Still open: 5", and words asking for a new card). 23 unchanged (its proposal is
  a plain yes/no question; its decision 5 is answered before the scenario starts).
- 2026-10-16, agent: runs, v3.5's harness (VERIFY_01 § Set-up) from `$TMPDIR/vb-skill36/`: servers
  on 4483 (Claude Code) and 4484 (Kiro), `HOME` and `VB_PROJECT` in the temp folder,
  `VB_KIRO_AGENT=0`, stopped after; each board drawn over HTTP by a newly joined agent the turn runs
  as; the person's acts on the page (Playwright chromium; no console error or failed request);
  each message built by `promptFor` / `roundOf`. **Claude Code** 2.1.301, `claude -p` with the
  panel's flags: **ran Opus 5.5** (`modelUsage` `claude-opus-5-5`, every turn). **Kiro** `kiro-cli`
  2.24.0, workspace agent `vb-test` (skill as prompt, `@vb` only): **ran Opus 5.5** (every session
  records `claude-opus-5.5`).
  - First run (skill without the "a note after a mark is owed too" sentence): Claude passed 11, 22,
    24, 25, 26 and failed one line of 13 (✓ on 9 got no word, twice: a rerun on a fresh board did
    the same). Kiro passed 11, 13, 24, 25, 26 and failed 22 twice: its reply on 2 did not ask for
    the ✓ again ("Off by default…", chat "card 2 keeps your ✓"; the first time it also drew a new
    decision card for the flag default). Card 2's line is `2 (decision): ✓: <note>` and 2 is not on
    "Waiting for your reply", so the new line read as "only 3 is owed": the sentence was added, and
    every scenario run again on fresh boards.
  - Final run (v3.6 as released), all **pass, both**:
    - 11: decisions end with their meanings (Claude "✓ keep 60 minutes · ✗ cut to 30 minutes";
      Kiro "✓ keep this order · ✗ reorder (say how in a note)"); name questions end "Answer in a
      note"; a plain yes/no question without them ("Is the release date up for change on Monday?").
    - 13: ✗ on 3 read as guest checkout out of 1.4; card 6 corrected and its note replied to; ✓ on
      9 read as the card says (Claude replied "Noted: the back-off test goes into 1.4."; Kiro said it
      in the chat).
    - 22: a reply to each note, each asking for the mark with its meanings ("✓ ship it in 1.4 behind
      a flag, off by default · ✗ leave it for 1.5", "✓ keep it in 1.4 · ✗ move it to 1.5"); 2 and 3
      open with "1 update"; no new card (Kiro's chat: "My reply on card 2 cleared your earlier ✓").
    - 24: turn 1 one question ending "Answer in a note"; turn 2 (message with "Still open: 2, 3",
      "Waiting for your reply: 4") one reply "Robin from the docs team writes the 2.0 release
      post. ✓ if that's right." (both); 2 and 3 left alone; 4 open with "1 update".
    - 25: a reply on 4 asking which ✗ meant, a summary with the release post still open, 4 kept, 1,
      2, 3 and 5 retired. The reply on the crossed card now shows "1 update" on the page (round 2
      ruling 4 seen live; v3.5's note (a) is met).
    - 26: replies on 3 and 4 (4's note from the earlier round, found with `show_node`), each
      asking with its meanings; Kiro rewrote 4 to add the section; nothing on 5; the new card a
      plain yes/no question ("Rename the Settings page to Preferences in 2.0?"); nothing `pending`.
      26's good run first said "a `reply` to each"; after Kiro's first run (an `append` alone on 4)
      it was aligned to the skill's "a `reply` (or an `append`)".
- 2026-10-16, agent: what still slips: chat words past "Done." (Claude 1 of 7 final turns; Kiro 5
  of 7, one with no "Done."). Kiro read `check_responses` once in 25 with `after` set to the
  message's head, which the skill allows.
- 2026-10-16, agent, for the maintainer: (a) neither agent drew a `decision` for scenario 26's
  "asking whether we rename …": both chose a plain yes/no question, which ruling 1 lets go without
  meanings, so 26 checks the line and the replies more than ruling 1; 11 is where both drew
  decisions with meanings. (b) Rule B kept as it was: a card asking for words says "Answer in a
  note" rather than what ✓ and ✗ mean; if ruling 1 should also cover those cards, it is one line.

## Skill v3.7 (ask, never guess, for ✓ as well as ✗)

- 2026-10-16, maintainer (chat 209-215, go "proceed"): (1) the person sees "Replied" where the
  agent reads `with-agent` (the card's footer and name, the header's "N replied"); agents keep
  `with-agent`, the Send message keeps "Waiting for your reply". (2) Open means "your move": no ✓,
  no ✗, no note, no Later. (3) When a ✓ or ✗ does not make sense on that card, the agent replies
  asking for context instead of acting on a guess, ✓ as well as ✗. No rule that "Answer in a note"
  cards spell out ✓ and ✗ (v3.6 note (b) closed). v3.6's "a note after a mark is owed; the reply
  clears the mark, so ask again" is confirmed (v3.6 note (c)).
- 2026-10-16, agent: v3.7 changes § What the person's answers mean (v3.5's "When ✗ could mean more
  than one thing" is now "When a ✓ or ✗ doesn't make sense on that card", with a ✓ on a card that
  asks for a name as its first example; "act on nothing yet"), the three places that named only ✗
  (§ Retiring and distilling twice, § Reading the person's answers), and "Replied" on the board in
  the note bullet. scenarios v3.7: 27 new (a ✓ on a card that asks for a name); 25 run again (its
  rule now covers ✓ too), unchanged.
- 2026-10-16, agent: runs, v3.6's harness copied to `$TMPDIR/vb-skill37/` (servers on 4485 and
  4486, `HOME` and `VB_PROJECT` in the temp folder, `VB_KIRO_AGENT=0`, stopped after; each board
  drawn over HTTP by a newly joined agent; the person's acts on the page; each message built by
  `promptFor` / `roundOf`). **Claude Code** 2.1.301, `claude -p` with the panel's flags: **ran Opus
  5.5** (`modelUsage` `claude-opus-5-5`). **Kiro** `kiro-cli` 2.24.0, workspace agent `vb-test`
  (skill as prompt, `@vb` only): **ran Opus 5.5** (sessions record `claude-opus-5.5`). All **pass,
  both**, first run:
  - 27: a `reply` on 4 with no `to` (Claude "A ✓ doesn't name anyone. Who should write the release
    post? Answer in a note."; Kiro "The ✓ doesn't name anyone. Who writes the release post? Answer
    in a note."); nothing written as decided; 2 read as the card says; 3 left alone; no new card;
    4 shows "1 update" on the page; nothing `pending`.
  - 25: a reply on 4 asking what the ✗ meant; a summary card with the release post still open; 4
    kept; 1, 2, 3 and 5 retired in the same call.
- 2026-10-16, agent: what still slips: chat words past "Done." (Claude 1 of 2 turns, Kiro 2 of 2,
  one of them with no "Done.": it restated the round in three sentences).

## Skill v3.8 (images in cards, apps on the board)

- 2026-10-18, maintainer (app-cards PLAN rulings 17 and 19-23, D-047, D-048; go in full; standing
  instruction for the run: plain words, the fewest that carry the message; teach agents to build
  apps that are good to use, with the calculator as the model; keep SKILL.md in shape and move the
  app details to a skill-local `apps.md` if it would pass about 400 lines).
- 2026-10-18, agent (T_02): v3.8 adds § Writing cards › Images in cards (the images folder,
  subfolders up to 8 deep, names, png/jpeg/webp/gif up to 8 MB, alt text required, never an
  internet address, `data:`, `..` or a leading `/`, overwrite to update, seen on select or open),
  an `app` row in § Kinds, and § Apps on the board (when; the files and manifest; what a panel
  can't do; the panel messages; the tools module; good to use; size; `list_apps` before drawing;
  the `app` card; Allow and code changes; problems and Check again; keys in `.env`). SKILL.md is
  406 lines (347 in v3.7).
- 2026-10-18, agent: no skill-local `apps.md`. The panel gives an agent the skill's text only
  (`--append-system-prompt-file` for Claude Code, the agent file's `prompt` for Kiro), never the
  path to its folder, so a file beside SKILL.md is out of a panel agent's reach, and so is the
  calculator unless the project holds a copy. The chapter therefore carries everything needed to
  build an app and points at `docs/specification/apps.md` and the calculator for the rest.
- 2026-10-18, agent: claims checked against the code: `packages/format/src/apps.ts` (`APP_SIZE`,
  `APP_LIMITS` `callMs`, `idleMs`, `fileBytes`, `APP_PROTOCOL_VERSION`, `PANEL_METHODS`,
  `HOST_NOTIFICATIONS`, `APP_STYLE_VARIABLES`), `manifest.schema.json` (unknown fields refused),
  `app-shape.ts` (an app card takes no `size`), `packages/ui/src/node/node-app.ts` `COPY` (the
  buttons Check again and Restart), `apps/board/src/board/apps/app-state.ts` (when the page reads
  `list_apps` again), `packages/format/src/images.ts` (`IMAGE_LIMITS`, `imagePathProblem`) and
  `packages/ui/src/markdown/image.ts` (a refused path shows "Image not shown"). What a sandboxed
  panel can't do was seen in Chromium in a `sandbox="allow-scripts"` frame: a form's submit is
  blocked before its `submit` event fires (Enter in a field only clicks the default button),
  `localStorage` throws `SecurityError`, and `alert()` is ignored.
- 2026-10-18, agent: runs, the v3.7 harness adapted, from `$TMPDIR/vb-skill38/`: one scratch board
  server per run (ports 4487 to 4492, never 4466), `HOME` and `VB_PROJECT` in the temp folder,
  `VB_KIRO_AGENT=0`, stopped after; each board drawn over HTTP by a newly joined agent the turn then
  runs as; each message built by `promptFor` (scenario 30 with card 1 selected); the person's acts
  on the page (Playwright chromium: Allow and its confirm, Check again, typing in the panel). An app
  is files, so both agents could also write files, in the scratch project only: **Claude Code**
  2.1.301, `claude -p` with the panel's flags but `--permission-mode acceptEdits` (edits inside the
  project only, standing in for the person's Allow) and Bash removed: **ran Opus 5.5** (`modelUsage`
  `claude-opus-5-5`, every turn). **Kiro** `kiro-cli` 2.24.0, workspace agent `vb-test` (the skill
  as prompt; `@vb`, `fs_read`, and `fs_write` allowed only under the project, a write outside it
  refused, checked first): **ran Opus 5.5** (every session records `claude-opus-5.5`).
  - Round 1 (the first draft): **28 pass, both**: `list_apps`, then one `app` card for
    `calculator` at 360 × 440, no file written; "Done. Press Allow on card 2 …" (Kiro added "The
    calculator is card 2 in Tools."). **29 pass, both**: a new `km-miles` app (Claude "Kilometres
    and miles" 360 × 220, Kiro "Kilometres ⇄ miles" 360 × 230), tool `convert_distance`
    `{ value, from }`, `list_apps` read `needs-approval` before the card was drawn. Before Allow the
    panel said "Press Allow on the card to use the converter."; after the harness pressed Allow, 10
    km showed "10 kilometres = 6.213712 miles" from the tool (`call_app_tool` 200) and "abc" "Type
    a number."; labelled fields, Enter converts, Esc sent, host variables with fallbacks; no
    `eval`, network, key or `<form>`. **30 pass, both**: each looked at the picture, then one
    `append` on card 1, `![Acme Notes Settings at 1366 × 768: eight fields from Display name to
    Theme fill the screen, and Save is not visible](ui/settings.png)` (Kiro's alike); no file; "Done.";
    the page shows it at the card's width, light and dark. **31 fail, both, on the words**: each
    fixed only `/size/w` (Claude 360, Kiro 320) and read `list_apps` again (`needs-approval`), but
    ended with three or four sentences and no "Done." (Claude also wrote a line mid-turn), and both
    said "Press Check on card 1": the button is Check again. The skill then gave the closing line
    whole, with **Check again** in bold, and "say only" on the Allow line.
  - Round 2 (v3.8 as released; 30's part unchanged, not run again): **31 pass, both**: one fix
    (Claude `w` 640, Kiro 360); the person's page, open through the turn, pressed Check again:
    "Calculator updated", the card offers Allow; chat "Fixed it. Press **Check again** on card 1,
    then Allow." (Kiro "I fixed the calculator app. …"). **28 pass, both** (Claude's line had no
    "Done."). **29 pass, both**: new `km-miles` apps again (Claude with a "Kilometres to miles"
    choice), 10 km showed "6.2137 miles" from the tool after Allow; Claude "Done. Press Allow on card
    2 to use it."; Kiro added a sentence.
  - **A new app from the skill alone**: scenario 29, all four runs. Neither agent read the
    calculator or any doc (Claude's only read was a Glob of `.visionboard/apps/**`, empty; Kiro
    listed `.visionboard/`).
- 2026-10-18, agent: what still slips: the closing words (no "Done.", a reworded one or an extra
  sentence in 3 of 7 Claude turns and 4 of 7 Kiro turns). Nothing else in any pass line fails.
- 2026-10-18, agent, for the maintainer: (a) a panel agent can't open anything beside the skill
  (no path to its folder), so the calculator is only a model when the project holds a copy; the
  panel's prompt, or Kiro's agent file `resources`, could name the skill's folder (a change to
  `chat-access.ts` and `packages/agent`, its own task). (b) After an agent fixes an app's files, a
  page that is already open shows the old state until the person presses Check again
  (`app-state.ts` reads `list_apps` on load, on an app line, after Allow or Stop app, on Check again
  or Restart, and after a refused call; never on a file change); a re-read when the card is
  selected would drop that step (a page change, its own task). (c) Both agents built nearly the
  same converter (same model, Opus 5.5). (d) In round 2 Claude fixed the calculator to `w` 640,
  valid but wider than its 360 design: "the smallest that fits" was not applied to an existing app.

## Skill v3.9 (apps bring their own design)

- 2026-10-19, maintainer: "Let's just have a pro palette. I want the agents to be able to make apps
  themselves with their own designs because we need this to be modular over time so that as things
  advance they can get more fancy with their SVGs and all kinds of things." The clip-and-export app
  came out pink everywhere (checkboxes, slider, selected rows, buttons) with rings showing on click.
- 2026-10-19, agent (AGENT_01): why. v3.8 said "colours and fonts only from the host's variables"
  and named `--color-background-inverse` for the main button and `--color-ring-primary` for the
  ring. Those two are the board's accent fill and focus ring (`APP_STYLE_VARIABLES`,
  `packages/format/src/apps.ts`), so an agent following the skill to the letter painted its app in
  the board's accent. v3.9 splits the variables by use: neutral surfaces, text and lines from the
  host (so light and dark still match), at most one accent the agent picks itself for the main
  button (a `light-dark()` pair), the board's accent and ring only as fallbacks. Hover and selection
  are quiet tints; the ring is `:focus-visible` only (a `:focus` ring shows on click); text meets
  the repo's APCA tiers (Lc 60 / 45 / 30, steering rule 3); an app's own SVG, icons and layout are
  welcome, still with no outside fonts or files. `apps.md` § Host context says the same for the
  variables; `packages/format/src/apps.ts` is unchanged (the host still sends all of them).
- 2026-10-19, agent: the calculator (the model app) followed v3.8, so its main key and ring were the
  board's accent. Its `panel.html` now fills the main key with the ink (surface-coloured text) and
  draws the ring in the ink; its ring was already `:focus-visible`. This repo's copy in
  `.visionboard/apps/calculator/` is the same file (`repo-example-app.test.ts` holds them equal).
- 2026-10-19, agent: scenarios 29 (a new app: its own neutral palette, accent not the board's,
  `:focus-visible` only) updated and 32 (a note "make it look more pro": only the style changes,
  `tools.mjs` and `app.json` untouched so no new Allow, a reply on the card) new. SKILL.md is 415
  lines (407 in v3.8).
- 2026-10-19, agent: dry run, **a read-through against the new text, not a live agent run** (the
  maintainer's board and its Kiro chats were left alone, and the agent file is rewritten only when a
  board starts). Scenario 29: the text says to take surfaces, text and lines from the host's neutral
  variables with fallbacks, one accent of its own only on the main button, quiet tints, ring under
  `:focus-visible`; an agent doing that passes the new lines and the old ones (labels, Enter, plain
  errors, size). Scenario 32: the restyle sentence limits the change to `panel.html`'s style, so
  `app.json` and `tools.mjs` stay and the app does not ask for Allow again (`panel.html` doesn't);
  the reply goes on the card. Read cold, the "Good to use" bullet answers "what colours do I
  use?" (host neutrals, plus one of your own on the main button, never the board's accent) and "how
  do focus rings show?" (`:focus-visible` only). **Not yet run with live agents**: both scenarios
  should be run with Claude Code and Kiro (as in v3.8) before the maintainer relies on them; Kiro
  reads the new text when the board next starts (`~/.kiro/agents/vision-board.json` is written from
  SKILL.md at start).

## Skill v3.10 (apps keep the person's place)

- 2026-10-19, maintainer: a person three steps into an app was back at step 1 after zooming out,
  because the board took the panel's frame away and started it again (points 40B and 40C).
  Task set: `cortex-tasks/board/2026-10-19_board-app_app-state-kept/`.
- 2026-10-19, agent (AGENT_01): why. The board now keeps loaded panels alive, but unloads the least
  recently used past a cap, and a reload or restart starts every panel afresh. A panel keeps its
  place only if it saves it. The board's own request `vision-board/save-state` (`{ state }`, any JSON
  value up to 64 KB, `APP_LIMITS.stateBytes`) stores it per card, and the value comes back in the
  `ui/initialize` answer under `hostContext["vision-board/state"]`: namespaced like the method, so
  it can't collide with a key MCP Apps adds later (the orchestrator's ruling, 2026-10-19; contract in
  `docs/specification/apps.md` § Saving the panel's state). v3.10 adds a "Keep the person's place"
  bullet and the two messages; "keep state in a tool" is not in the skill (that line was only in
  `apps.md`, which the contract task rewrites), but the bullet says a tool is not for the person's
  place (it forgets after 5 idle minutes). The save is debounced by about half a second and a failed
  save is ignored, because the app must work on a board that refuses it.
- 2026-10-19, agent: top padding. The card's number and APP tab overlap the top edge of the panel
  by 9 px (maintainer point 33); the maintainer chose to leave the card as is and ask apps for
  12 px of padding at the top. One sentence in "Good to use".
- 2026-10-19, agent: the calculator (model app) saves `{ sum, answer }` 400 ms after a change
  (and when an answer arrives), restores them from `hostContext["vision-board/state"]` only when both
  are strings within the length limits, and ignores a failed save. It already had 12 px padding.
  `.visionboard/apps/calculator/panel.html` is the same file (`repo-example-app.test.ts`).
- 2026-10-19, agent: scenario 33 (a three-step app that keeps its place) new. SKILL.md is 428 lines
  (415 in v3.9).
- 2026-10-19, agent: dry run, **a read-through against the new text, not a live agent run**. Scenario
  33: the text says to save a moment after each change with `vision-board/save-state`, to restore
  from `"vision-board/state"`, to check its shape, to keep secrets and recomputable data out, to
  keep 12 px at the top, and not to use a tool or storage for the place; an agent following it
  passes every line of the scenario. Read cold, the bullet answers "how does my app remember where
  the person was?" and "where does it come back?". **Not yet run with live agents**: run scenario 33
  with Claude Code and Kiro before relying on it. Kiro reads the new text when the board next starts
  (`~/.kiro/agents/vision-board.json` is written from SKILL.md at start); a running chat keeps v3.9
  until then.
- 2026-10-25, agent (tool-examples): v3.11 adds one bullet to Writing cards: each item wraps its
  content (`node: { ... }`, `region: { ... }`), and `write_board`'s description and a refusal show the
  exact shape. Why: a field agent guessed flat items and found the shape only by reading the ledger.
  The shapes are not copied into the skill (rule 6): they live in the schemas and reach the agent
  through the tool descriptions and the refusals. Scenario 34 is new (the task file said 26, which
  was taken).
- 2026-10-25, agent: **a live run of scenario 34, one agent, once.** A fresh agent (model `sonnet`,
  a sub-agent given only the MCP's server instructions and tool list through a stdio bridge to
  `vb-mcp.ts`, on a test board server on port 4570 over a temporary empty project; not the skill, not the
  ledger) joined and made one `write_board` call: a `board` item, a `region` item with
  `region: { id, title, mode }`, two `node` items with `node: { region, kind, title }` (`question`,
  `action`) and a `link` by `{ key }`, every item keyed. All five items answered `ok` on that call;
  no refusal. The server's own call log confirms the shape. A good run. Not run: Kiro, a second
  model, or a run without the examples to compare (so this shows the shape is reachable from the tool
  list, not that the examples caused it). One gap the agent named: nothing says how to pick the
  path's `board` id for a new board (it slugged the title, which worked).
- 2026-10-25, agent (tool-list-trim): v3.12. Tool descriptions no longer end with an example and
  tools carry no output schema (the list went from about 108,700 to about 27,700 characters), so
  Writing cards now shows one worked `write_board` call (a container, two cards, a link by key),
  held by `apps/board/tests/write-examples.test.ts` against the schema and a live write. The MCP
  server is now configured as `vision-board` (tools `mcp__vision-board__*`, Kiro `@vision-board`).
- 2026-10-25, agent: **a live run of scenario 34 on the trimmed list, one agent, once.** A fresh
  agent (model `sonnet`, a sub-agent given only the MCP's instructions and tool list through a stdio
  bridge to `vb-mcp.ts`, on a test board server on port 4593 over a temporary empty project and a
  temporary home; not the skill, not the ledger) called `list_boards`, `join`, then one
  `write_board`: a `board` item, a `region` with `region: { id, title, mode }`, two `node` items
  with `node: { region, kind, title }` (`question`, `action`) and a `link` by `{ key }`, every item
  keyed. All five answered `ok` on that call; no refusal. The bridge's call log and the ledger
  confirm it. A good run. Not run: Kiro, a second model, the board's chat panel. Gaps it named:
  how to pick a new board's id (again; `write_board`'s description now says to choose it and start
  with a `board` item, added after this run), what link direction means, and which mode suits a
  small checklist.

## Skill v3.14 (svg pictures in cards)

- 2026-10-27, agent (host-fixes-and-svg SVG_01, D-064 drafted, awaiting the maintainer's yes):
  v3.14 adds svg to § Writing cards › Images in cards: at most 1 MB; the root says its size (a
  `width` and `height`, or a `viewBox` alone, which draws at most 300 px wide; neither is not shown);
  CSS and SMIL animation play, script never runs and nothing outside the file loads; an svg that
  needs script or a pause button is an app card; CSS animation inside
  `prefers-reduced-motion: no-preference`, short (about 5 seconds in all), never flashing more than
  three times a second. Why: agents could not show a diagram that stays sharp or a small animation,
  and an agent that writes script into an svg needs to know it won't run before it tries.
- 2026-10-27, agent: claims checked against the code and a browser (Chromium, the page suite's):
  `packages/format/src/images.ts` (`IMAGE_LIMITS.svgMaxBytes`, `svgProblem`: a viewBox or width and
  height, refused with neither), `apps/board/server/images.ts` `SVG_CSP`; an `<img>` of an svg ran
  none of its script (a script element, `onload`) and made no request for what it named (an image,
  `@import`, a font, a `use`); a viewBox-only svg's natural size was 300 by 150 fitted to its shape
  (150 by 150 square, 300 by 150 at 2 to 1); CSS animation inside `no-preference` held still with
  the browser's own reduced-motion setting (`--force-prefers-reduced-motion`) and SMIL did not.
  `tests/pages/card-image-svg.spec.ts` and `card-image-svg-motion.spec.ts` hold these.
- 2026-10-27, agent: **not run with live agents.** Run an svg scenario with Claude Code and Kiro
  (draw a diagram as svg; draw a small animation; try an svg with a script and read the card)
  before relying on the text. Kiro reads the new text when the board next starts.
