---
category: board-agent
status: completed
created: 2026-10-10
---

# T_01 The skill

> Plan: [PLAN.md](./PLAN.md) rulings 2-7 · Model: Opus 5.5 · After FE_01 · Rule 17

## Steps

1. [x] `skills/vision-board/SKILL.md` v2 (this part): no `item`; ask with a question, decision or
   action card, explain with any other kind; what ✓ ✗ Comment, More context and Later mean on each;
   responses arrive in card order; reply or append for every note, park for every Later. Fold in
   the NOTES.md evidence that fits (links only for real flows, grid by default, short chat words).
2. [x] `scenarios.md`: update; add one where the person comments on three mixed cards at once.
3. [x] One run of the changed scenarios against a real model (short), results in the notes.

## Validation

- [x] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- Protected files (steering, `docs/decisions.md`, `tokens.css`): propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; never touch `.visionboard/`.
- One job per file, under 300 lines; tests first; fill Implementation Notes below and in
  TASK-STATUS, and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-10. The five gates exit 0, run one after another: `npm test` (948 + 6
timing), `npm run check`, `npm run verify` (0 warnings), `npm run gen -- --check`,
`npm run test:pages` (314 passed). No code changed, so no new unit tests; the skill is tested by
the scenarios and the run below (rule 17).

**SKILL.md v2** (215 lines, status line names v2):
- Opening: the board is a conversation in cards; every card numbered and answerable; cards that
  ask also take ✓ ✗.
- New "Kinds: the kind decides": no `item` (a node naming it is refused); a table of the seven
  kinds, which ask (question: ✓ "Yes" ✗ "No"; decision; action: ✓ "Done") and which tell; ask with
  a question, decision or action card, never inside a finding's body; don't turn every finding
  into a question; cards that tell never block or count but are still owed answers.
- New "What the person's buttons mean": ✓ ✗ decide (cards that ask only); Comment is the answer in
  words and decides a card that asks; More context keeps it open; Later on any card; a note can be
  on one card, a group of any kinds (`nodes`) or a container.
- Layout (NOTES 2026-10-09 evidence): `grid` the default, numbers give the reading order; `list`
  "stacking downward", only a short ranked set; links only for a real flow or dependency, never for
  order or relatedness; flow/lanes cards are steps, non-steps go in a grid beside them.
- Writing: cards are numbered in the order written, so write them in reading order.
- Reading: `list_open` = questions, decisions, actions not decided + any card owed; answers arrive
  in card order (group note at its lowest card with `nodes`, container note at its lowest card,
  acts on one card in order made); `more: true` reads on from the highest `seq`.
- Answering: every comment and More context owes a `reply` or `append`, every Later a `park`; a
  group note takes one reply (an `append` answers it only on that card); a comment that answers a
  question: act on it, reply in a line, ask anything left as a new question card.
- Propose only on cards that ask (others fail `invalid`); Later/park on any card.
- Chat words (after the run): "In both: a line or two saying what changed, never the cards'
  content". Panel example now "Done, 3 cards added on Pricing".

**scenarios.md v2**: 1 (no `item`, grid, ask with question/decision cards, no links for order),
2 (comment on a finding is owed; ✓ on questions, ✗ on a decision; acts in card order), 5 (Later
on a risk), 7 (no propose on a finding), 8 wording; new **10** one comment on three mixed cards
(finding, question, risk: one reply, the question taken as answered, no propose, no re-ask) and
**11** an agenda with things to settle (grid, unlinked, questions as question cards).
`NOTES.md` gains a dated "Skill v2 run" section with the run's evidence.

**The run** (`claude` 2.1.295 print mode, its default model Sonnet 5.5; board server on 4482 with
`VB_PROJECT` a scratch folder; `--mcp-config` temp file, `--strict-mcp-config`,
`--allowedTools mcp__vb__*`; skill by `--append-system-prompt-file` as the panel does; the person's
acts sent with the page cookie by `curl`). Four turns, about $0.95.
1. Own chat, scenario 11 (Monday planning agenda): `list_boards`, `join`, one `write_board` of 4
   `grid` containers and 16 cards: 4 decisions/questions to settle first, findings, risks, notes,
   actions; no links, no `item`, every item keyed, decisions with options and a pick. **Bad**: the
   chat listed every card's content.
2. Own chat, scenario 10 + 2 + 5: person ✓ 1, one comment on 2 (decision), 6 (finding), 11 (note),
   More context on 7 (risk), Later on 13 (finding), Send. Agent: `check_responses` from its head;
   **one** reply to the group note (on 2, `to` = its seq), `append`s to 6 and 11 with `base`, a
   reply to 7 (honest: the data is made up) plus an action card, a full `park` on 13; `pending: []`.
   2 taken as decided by the comment. **Bad**: long chat summary; it called risk 14 "still open".
3. Panel (secret in env, board granted as `chat-access.ts` does), a person-made board: no `join`,
   no `secret`, read the other board, one write: 2 grid containers, 5 risks, then a decision, 3
   actions and a question to settle. **Bad**: chat three paragraphs; one harmless `ls` via Bash.
   Skill then edited (the "In both" chat-words rule).
4. Panel, scenario 10 again (comment on risk 19, decision 24, question 28): one reply on 19 with
   `to`, appends to 19 and 24, 28 not re-asked, no propose, no `wait`. Chat two short paragraphs
   (better, still over one line). **Miss**: it read with `check_responses`, not `list_open` first.
The test server was stopped; the scratch folder is in the session scratchpad. The CLI keeps its
own transcripts of these four sessions under `~/.claude/projects/` (the CLI's doing, not edited).

**For the maintainer.**
- Chat words remain the weak point with Sonnet 5.5. Option: the panel's prompt (chat-session)
  could end with "Reply in one line" each turn; or accept two short lines. Not changed here.
- VERIFY_01 should watch: `list_open` at the start of a panel turn; cards that tell called "open".
- Steering terminology (protected, FE_01 proposed wording) still applies; this task adds none.
- The MCP `INSTRUCTIONS` (BE_02) and the skill agree; no change needed in `info.ts`.
