---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#N38
---

# Skill v3: the board is how we chat

> **From**: maintainer, 2026-10-11 (chat 574-597) · **Model**: Opus 5.5 · **Go**: given (597) ·
> Rule 17: agent instructions are code, tested against scenarios.

## Rulings (maintainer; do not reopen)

1. **The board is how we chat.** Brief and concise applies to the board as to chat. One point per
   card: each point the agent would otherwise number in chat becomes its own card the person can
   ✓, ✗, comment on or save for Later. The person works non-linearly: any card, any order.
2. **The person guides the structure.** Before drawing anything big, the agent suggests a structure
   in a line or two ("a row of 6 points, or a flow of the 5 phases?") and waits. No big boards drawn
   unasked and then redrawn.
3. **Fit the layout to the task and the screen** (screens are wider than tall; no endless
   scrolling): chatting (most boards): cards in containers, a `row` per container when there are
   many cards, `column`s side by side when each has few, a wrapping `grid` for a larger set, no
   links. A process or flow: `flow` with links for the real steps. Work moving between areas or
   owners: `lanes`. Architecture when asked: whatever shows it best, links included. Links stay
   inside a container: at most one or two links between containers on a board; more means the
   containers are cut the wrong way (named areas with handoffs: lanes, or a phase flow; a
   reference only: no link, say it in the card, "needs card 5").
4. **Ask with `question`, `decision` and `action` cards; explain with the rest.**
5. **Consolidation is the person's call.** The agent never distils or retires on its own. When the
   person selects a container and asks to distil it, the agent writes one summary card and
   retires the cards it replaces (version history keeps them).
6. **Numbers:** the board numbers every card: never write a number into a card's title or text.
   When mentioning a card in chat or a reply, use its board number ("card 12"). When chatting
   through the board, no numbered lists in the chat; the chat says in a line or two what changed.
7. **Leave `size` out** (Auto picks it; Match card widths evens columns). Closing chat: one or two lines.

## Steps

1. [x] Rewrite `skills/vision-board/SKILL.md` as v3 around rulings 1-7, keeping what still holds
   (access, keys, answering and owing, retire, the panel message, show_layout once for a flow or
   lanes container, the flag). Shorter than v2.5 where possible: brevity is the point.
2. [x] `scenarios.md`: a chat-style scenario (the agent answers a planning question through the
   board: suggests the structure in a line, then rows of one-point cards, questions as question
   cards, no links, no sizes, one-line chat); a distil-on-request scenario; keep the flow and
   field-report scenarios (17 with the links-inside-containers rule).
3. [x] Run the chat-style scenario and scenario 17 once each against a real model (`claude -p`,
   your own server on a spare port, temp project, `--mcp-config` temp file, `--strict-mcp-config`;
   not the board on 4466). Record what it did against each ruling in NOTES.md.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- No git commits or stash. Protected files: never edit. Scratch in the system temp folder (never the
  repo's `temp/`); stop only your own processes and leave none running; never touch `.visionboard/`.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Opus 5.5 agent). No ruling had to be reopened.

**Skill** (`skills/vision-board/SKILL.md`, v3; 343 lines and 4,340 words in v2.5, 293 lines and
3,625 words now). A new opening section, "The conversation", carries rulings 1, 2, 4, 5, 6 and 7:
one point per card, brief; suggest the structure in a line and end the turn, with no write, before
anything big (a new board, more than about 6 cards); "map", "plan" or a may-create message is not a
shape; skip only when the person named the layout or for a small change; numbers belong to the
board ("card 12"; no "Step 3", no "1." lists); the chat says what changed in one or two plain lines
(no bullets, headings, lists or card summaries; a caveat worth keeping is a card); consolidation is
the person's call. "Choosing a layout" became "Layout: fit the task and the screen" (ruling 3): a
table by content (chatting: a `row` per container up to about 6 cards, `column`s side by side, a
wrapping `grid`, no links; `flow`; `lanes`; architecture when asked; `radial`), links stay inside a
container (one or two between containers at most, else lanes or a phase flow, or "needs card 5"),
leave `size` and `widths` out (ruling 7). "Retiring cards" became "Retiring and distilling" (ruling
5): only when the person asks; a new direction (new container, old retired); distil on request (one
summary card in the container, then one `retire { n }` per card it replaces, answer anything owed
first, keep an undecided asking card unless told to fold it in); the one agent-initiated exception
is a container drawn this same turn that `show_layout` says to regroup. "Redraw in the same turn"
added to the `show_layout` check; "never bury a needed choice in another card's body" in Kinds.
Kept, compressed: own chat and panel (join, the one message, quiet turns, Allow/Deny, no `wait`),
starting a board, access, keys, numbering from 1 and never guessing a new number, kinds, buttons,
changing a card, reading answers (the flag), answering and owing, propose, park. The status line
now points to NOTES.md for v1 to v2.5's history instead of repeating it.

**Scenarios** (`scenarios.md`, v3): a v3 header line (suggest first for a big round, no `size`, no
numbers of the card's own, one- or two-line chat in every scenario); 1 (suggest first, `row` per
group or `grid`, no links), 11 (the person names "a row", so it draws at once), 12 (two turns), 14
(suggest first, no `size`), 17 (suggest first; links inside containers, a container per area with
handoffs linked across fails) updated; chat words in 3, 13, 16 now say "card N"; new 18 (a planning
question answered through the board) and 19 (distil a container on request).

**Runs** (`claude` 2.1.295, Sonnet 5.5 default; panel-style: an agent joined over HTTP, its secret
as `VB_AGENT_SECRET` in a `--mcp-config` temp file, `--strict-mcp-config`, `--allowedTools
mcp__vb__*`, `--no-session-persistence`, the skill as `--append-system-prompt-file`; each message
ends with the panel's `NO_BOARD` line; test servers on 4493 and 4494 with `HOME` and `VB_PROJECT`
in the system temp folder, `VB_KIRO_AGENT=0`; two messages per run in one process, the second sent
only after the first turn's `result`). Four runs on the way, two on the final skill; all in NOTES.md.

Final run, scenario 18 ("We're planning a two-day team offsite next spring. What do we need to work
out?", then "Rows by area are good."):
- Ruling 1 (one point per card, brief): held. 15 cards, one point each, bodies one or two
  sentences.
- Ruling 2 (suggest first): held. Turn 1 had no write, just three sentences: a row of cards or a
  timeline of phases, recommending the row.
- Ruling 3 (layout): held. 4 `row` containers (4, 4, 3, 4 cards), no links.
- Ruling 4 (ask with question/decision/action): held. 12 cards ask (questions, decisions, 2
  actions), 1 risk explains.
- Ruling 5 (distil only on request): not exercised; it retired nothing.
- Ruling 6 (numbers): held. No numbers in titles or bodies apart from a quantity ("Shortlist 3
  venues"); the chat said "Cards 1 to 4"; no numbered list.
- Ruling 7 (no `size`, short closing): held. No `size` or `widths`; closing words two sentences.
  Keys `team-offsite-...`.

Final run, scenario 17 (the round-1 shape: "Map how a message travels when a second bot joins ...",
then "Go with your recommendation."):
- Ruling 1: held, one step per card.
- Ruling 2: held. Turn 1 had no write: lanes per area or a phase flow, recommending lanes.
- Ruling 3: held. One `lanes` container, 16 cards, 16 links, none between containers;
  `show_layout` once (0 crossing, 60 empty for 16 cards), then in the same turn the region sent
  again as `flow`, with an `append` of each card's area; no second check.
- Ruling 4: nothing needed deciding. Every card was `topic`; `note` or `finding` would suit steps
  better.
- Ruling 5: no retire.
- Ruling 6: held. No numbers in titles; the chat said "cards 11–14"; no numbered list.
- Ruling 7: partly held. No `size` or `widths`, but the closing words were one paragraph of five
  sentences, more than two lines.

Earlier runs, which drove the fixes:
- 17a ran both queued messages as one turn, so it is void for ruling 2. After the check showed 56
  empty cells it did not redraw, and closed with five bullets. That led to "plain lines, no
  bullets" and "redraw in the same turn".
- 17b drew in turn 1 without asking, taking "Map" plus the `NO_BOARD` line as the go-ahead, and put
  a needed rule in a risk's body. That led to "'map', 'plan' or a may-create message is not a shape"
  and "a needed choice is a `decision` card".
- The draft-v3 run of 18 passed everything except a four-line suggestion with bullets.

Servers stopped by PID; the drivers exited. The 4466 watch server, the test runner and the vb-mcp
processes still running all predate this task.

**Gates** (one after another, all exit 0): `npm test` (1116 + 7 timing); `npm run check`
(svelte-check 0 errors, 0 warnings); `npm run verify` (ok, 0 warnings); `npm run gen -- --check`
(current); `npm run test:pages` (377 passed).

**MCP instructions** (`packages/mcp/src/info.ts` `ABOUT`, `REST`): they don't disagree with v3.
They say what the board is, to ask with question/decision/action cards, keys, grants,
`check_responses` and owing, and `wrong-folder`, but nothing about layout, numbering or structure.
No change, so their tests are untouched.

**Protected files**: none needs a change. The steering's Vision Board numbering bullet and v3's
"Numbers belong to the board" and chat lines say the same thing.

**For the maintainer**:
1. Closing words still run long in the turn that draws (three to five sentences in 17a, 17b and
   17's final run; two lines in 18's final run). This has slipped in every run since v2; the skill
   now says it three ways. A next step outside the skill would be the panel trimming or flagging
   long final messages.
2. The panel's `NO_BOARD` line (`apps/board/server/chat-prompt.ts` `NO_BOARD`: "If drawing would
   help, create one with write_board") pulled one run into drawing first. The skill now overrides
   it. Suggested wording for a small follow-up (it has tests): "No board is open in this folder yet.
   When there is something to draw, suggest its structure first; once the person agrees, create a
   board with write_board and the person's page opens it."
3. Thresholds I chose: "more than about 6 cards" for a big round, and "up to about 6 cards" per
   `row`. Easy to change.
4. Scenario 19 (distil) is written but has not been run against a model; the task asked only for
   18 and 17.
