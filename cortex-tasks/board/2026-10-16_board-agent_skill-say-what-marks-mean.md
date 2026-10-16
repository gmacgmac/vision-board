---
category: board-agent
status: completed
completed: 2026-10-16
created: 2026-10-16
---

# Skill v3.6: every card that asks says what ✓ and ✗ mean

> **From**: maintainer, 2026-10-16 (chat 192: "It should define what those mean so the user can pick";
> go: "just proceed") · **Model**: Opus 5.5 · **Runs after**: `2026-10-16_board-ui_review-polish-round-2.md`
> (its ruling 3 changes the Send message the skill reads)

## Rulings (maintainer; do not reopen)

1. **A card that asks says what ✓ and ✗ each mean**, on the card, e.g. "✓ keep · ✗ rename it now".
   Only a plain yes/no question may leave it out. This replaces v3.5's softer rule A wording and the
   "no rule to spell them out" of ruling 10 in the answer-model plan (maintainer changed their mind).
2. **The Send message's new line**: "Waiting for your reply: 7" lists cards with the agent (D-046); the
   skill says to answer each with a `reply` and that "Still open" is only what needs the person.
3. **Any agent reply now shows "1 update"** to the person (round 2 ruling 4): a reply asking what a ✗
   meant is no longer easy to miss; drop any skill workaround that assumed it was.

## Steps

1. [x] `skills/vision-board/SKILL.md` v3.6; `scenarios.md` (update 24, 25 and any card without its ✓/✗
   meanings; one scenario where the round has a "Waiting for your reply" line); `NOTES.md`.
2. [x] Run the changed scenarios with Claude Code and Kiro (harness: the v3.5 run in
   `cortex-tasks/board/2026-10-15_board-agent_skill-check-cross-rules.md` notes); say which model ran.

## Validation

- [x] Each changed scenario passes with both agents, or each failure is recorded with an example.
- [x] `npm run verify`, `npm run check`, `npm test` exit 0.

## Constraints

- Rule 17. Never touch `.visionboard/`; don't use port 4466; stop every server you start. No commits.

## Implementation Notes

**Status**: Completed (2026-10-16). All three rulings written; every changed scenario passes with both
agents on the released text. One sentence was added after a first run failed (item 3).

1. **SKILL.md v3.6** (338 → 346 lines). Front matter `status`: v3.6 first. § Kinds: v3.5's rule A
   bullet replaced (ruling 1): a card that asks ends with what ✓ and ✗ each mean ("✓ keep · ✗ rename
   it now"); every `decision` and `action` says it; only a plain yes/no question may leave it out; a
   reply asking for a mark again says the same unless it is a plain yes. Rule B ("Answer in a note")
   kept. § Where you are running: the Send message's tail is "Still open" (needs the person's ✓ or ✗)
   and "Waiting for your reply" (the cards with you), each only when it lists a card; new bullet
   (ruling 2): answer each card on "Waiting for your reply" with a `reply` (or an `append`), even one
   whose note came in an earlier round; a note after a mark is owed too, though its card isn't on the
   line, and the answer clears the mark: ask again; "Still open" owes nothing. Ruling 3: no workaround
   in the skill to drop (v3.5 already asked in a `reply`); the page now shows it as "1 update" (seen in
   25's runs).
2. **scenarios.md v3.6**: header rule (an agent's card that asks says what ✓ and ✗ mean unless a plain
   yes/no question); 11 (decisions say it, fail if not), 13 (card 9 "✓ add it in 1.4 · ✗ leave it
   out", ✓ read as the card says), 22 (cards say it; message now "Waiting for your reply: 3"; 2 owed
   though not on the line), 24 (cards say it; "Still open: 2, 3", "Waiting for your reply: 4"; leaves
   2 and 3 alone), 25 (2, 3, 5 say it, 4 is an older card that doesn't; the reply shows "1 update")
   updated; **26 new** (a round with "Waiting for your reply: 3, 4", 4's note from an earlier round).
   23 unchanged (its proposal is a plain yes/no question; decision 5 answered before it starts).
   **NOTES.md** § Skill v3.6: rulings, change, runs, slips, two items for the maintainer.
3. **Runs** (rule 17; v3.5's harness, `$TMPDIR/vb-skill36/`, servers 4483 and 4484, `HOME` and
   `VB_PROJECT` in the temp folder, `VB_KIRO_AGENT=0`; person's acts on the page, messages from
   `promptFor` / `roundOf`). **Claude Code** 2.1.301 `claude -p` with the panel's flags: **ran Opus
   5.5** (`modelUsage` `claude-opus-5-5`, every turn). **Kiro** `kiro-cli` 2.24.0, workspace agent with
   the skill as prompt and `@vb` only: **ran Opus 5.5** (sessions record `claude-opus-5.5`).
   First run, on the text without item 1's "a note after a mark" sentence: Claude failed one line of
   13 twice (no word on ✓ 9); Kiro failed 22 twice (its reply on 2 did not ask for the ✓ again: "card 2
   keeps your ✓"; once it also drew a new decision card). Cause: 2 (`✓: <note>`) is not on "Waiting
   for your reply". The sentence was added and every scenario run again on fresh boards:

   | Scenario (final run, v3.6 as released) | Claude Code | Kiro |
   |---|---|---|
   | 11 (agenda: decisions say what ✓ and ✗ mean) | pass | pass |
   | 13 (✗ on a yes/no question; ✓ on an action with meanings) | pass | pass |
   | 22 (a note that asks, on a decision; "Waiting for your reply") | pass | pass |
   | 24 (an answer that is a name, two turns; "Waiting for your reply: 4") | pass | pass |
   | 25 (✗ that could mean more than one thing) | pass | pass |
   | 26 (new: "Waiting for your reply: 3, 4", one note from an earlier round) | pass | pass |

   Slips (not fail criteria): chat words past "Done." (Claude 1 of 7 turns; Kiro 5 of 7, one with no
   "Done."). 26's good run was aligned to the skill ("a `reply` (or an `append`)") after Kiro's first
   run answered 4 with an `append` alone.
4. **For the maintainer.** (a) In 26 both agents drew the new card as a plain yes/no question, which
   ruling 1 lets go without meanings; 11 is where both drew decisions with them. (b) Rule B cards
   ("Answer in a note") don't say what ✓ and ✗ mean; if ruling 1 should cover them too, it is one line.
   (c) The added sentence in item 1 goes beyond ruling 2's words (a note after a mark); confirm.
5. **Gates**: `npm run verify` 0 (0 warnings), `npm run check` 0, `npm test` 0 (1290 + 7 timing).
   `npm run build` run once so the scratch servers served the current page (`apps/board/dist`,
   git-ignored).
6. **Process**: servers on 4483 and 4484 stopped; no `claude` or `kiro-cli` process left. Port 4466
   and `.visionboard/` untouched. No commits. Kiro session files went to `~/.kiro/sessions/cli/` as in
   v3.5's runs. No security concerns (skill wording and scenarios only).

## On Completion

1. Fill Implementation Notes; set `status: completed`.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-agent] Skill v3.6: <what you did> → Task: [[cortex-tasks/board/2026-10-16_board-agent_skill-say-what-marks-mean.md]]`
