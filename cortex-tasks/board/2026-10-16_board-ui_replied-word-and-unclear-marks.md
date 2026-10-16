---
category: board-ui
status: completed
completed: 2026-10-16
created: 2026-10-16
---

# "Replied" on the card, and ask about any unclear mark (skill v3.7)

> **From**: maintainer, 2026-10-16 (chat 209-215; go: "proceed") · **Model**: Opus 5.5 · **Follows**:
> `2026-10-15_board-actions_with-agent-state.md`, `2026-10-16_board-ui_review-polish-round-2.md`,
> `2026-10-16_board-agent_skill-say-what-marks-mean.md` (read their notes)

## Rulings (maintainer; do not reopen)

1. **The person sees "Replied", not "With agent" (210).** A card whose note is owed an answer reads
   "Replied" in its footer and its accessible name; the header chip reads "N replied" (still only when
   N > 0; on a narrow toolbar it keeps the mark that tells it from "board updated", FIX_01). Gallery rows
   and docs follow. Nothing else changes: agents keep reading `with-agent` (it tells them they owe a
   reply), the Send message keeps "Waiting for your reply", D-046's rule is unchanged.
2. **Open means "your move" (211, confirmed).** Open = no ✓, no ✗, no note, no Later; the agent's answer
   to a note makes the card open again. Already built; say it in `components.md` in those words.
3. **Ask, never guess, for ✓ as well as ✗ (213).** Skill v3.7: when a ✓ or ✗ does not make sense on that
   card, the agent replies asking for context instead of acting on a guess. No rule that "Answer in a
   note" cards spell out ✓ and ✗. The sentence added in v3.6 (a note after a mark is owed; the reply
   clears the mark, so ask again) is confirmed (207A).

## Steps

1. [x] Tests first for ruling 1 (unit: label; page: footer, name, header chip at a wide and a 1470px
   toolbar), each seen failing. Build. Screenshots viewed light and dark before updating.
2. [x] Docs: `components.md` (rulings 1 and 2), `pattern.json`.
3. [x] Skill v3.7 (`SKILL.md`, `scenarios.md`: one scenario where a ✓ does not fit the card and the agent
   asks; `NOTES.md`). Run the changed or new scenarios with Claude Code and Kiro (v3.6's harness); say
   which model ran.

## Validation

- [x] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
  `npm run gen`, `npm run test:pages`); the scenario runs pass with both agents or each failure is recorded.

## Constraints

- Project rules. If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`;
  don't use port 4466; stop every server you start. One page-test run at a time.

## Implementation Notes

**Status**: Completed (2026-10-16). All three rulings done; no deviation.

1. **Ruling 1, "Replied" (page only).** `node-core.ts` `STATUS_LABEL` commented and context
   "Replied" (footer and accessible name, through `STATUS_NAME` / `nodeLabel`). `Toolbar.svelte`:
   the chip reads "N replied", title "Replied items" (as "Open items", "Answered items"); still only
   above 0, still `data-tone='agent'` with the Agents bot kept beside the number on a narrow
   toolbar (FIX_01). Gallery (`node-section.ts`): the matrices' row "Replied" and the group
   description. Comments naming the word: `shell.svelte.ts`, `toolbar-counts.ts`, `board.css`,
   `board-state.ts`, `registry.ts`, `reply.ts`. Not changed: the internal status `commented`, the
   field `counts().withAgent` / `shell.counts.withAgent`, `STATUS_OUT` `with-agent` (agents),
   "Waiting for your reply" (`reply.ts`), D-046, the contract (no OpenAPI bump: no API word moved).
2. **Ruling 2.** `components.md` § The answer model item 9: "Open = no ✓, no ✗, no note, no Later;
   the agent's answer to a note makes the card open again". Already built (`cardStatus`); no code.
3. **Docs.** `components.md` § Navigation item 4 (the narrow toolbar's "Replied" chip) and § The
   answer model item 8 (words, title, the row, agents keep `with-agent`); `api.md` 148 one sentence
   (the page's word is now "Replied"; agents still read `with-agent`); `packages/ui/src/node/
   pattern.json` (`data-status`, `aria-label`).
4. **Tests first, each seen failing.** `node-core.test.ts` (footer and name "Replied"; failed on
   "With agent"). `answer-model.spec.ts`: the D-046 test at the default 1600px toolbar (footer,
   name, "1 replied" in the header, title "Replied items") and the 1470px narrow-toolbar test
   (title, "1 replied" for screen readers, the agent's mark visible); both failed before the build.
5. **Screenshots.** 4 changed, each diff viewed light and dark (cropped expected/actual pairs):
   `gallery-light/dark` (16 places: "With agent" footers → "Replied", the two row labels, the group
   description) and `markdown-light/dark` (one footer). Word only, no layout shift. Baselines are the
   run's actual images. `board-*` unchanged (no "with agent" chip on screen there).
6. **Ruling 3, skill v3.7** (`SKILL.md` 347 lines): § What the person's answers mean, "When a ✓ or
   ✗ doesn't make sense on that card (a ✓ on a card that asks for a name, a ✗ that could mean …),
   don't guess: ask what they meant in a `reply` on that card (no `to`) and act on nothing yet";
   the three places that named only ✗ now say "✓ or ✗" (§ Retiring and distilling twice, § Reading
   the person's answers); "Replied" on the board in the note bullet; front matter v3.7. No rule that
   "Answer in a note" cards spell out ✓ and ✗; v3.6's "a note after a mark" sentence kept as is.
   `scenarios.md` v3.7: **27 new** (✓ on "Who writes the release post?", a card that asks for a
   name); 25 run again, unchanged. `NOTES.md` § Skill v3.7.
7. **Runs** (v3.6's harness copied to `$TMPDIR/vb-skill37/`, servers 4485 and 4486, `HOME` and
   `VB_PROJECT` in the temp folder, `VB_KIRO_AGENT=0`; boards drawn over HTTP by a newly joined
   agent, the person's acts on the page with no page problems, messages from `promptFor` /
   `roundOf`). **Claude Code** 2.1.301 `claude -p` with the panel's flags: **ran Opus 5.5**
   (`modelUsage` `claude-opus-5-5`). **Kiro** `kiro-cli` 2.24.0, workspace agent, skill as prompt,
   `@vb` only: **ran Opus 5.5** (sessions record `claude-opus-5.5`). First run, no rerun:

   | Scenario | Claude Code | Kiro |
   |---|---|---|
   | 27 (new: ✓ on a card that asks for a name) | pass | pass |
   | 25 (✗ that could mean more than one thing) | pass | pass |

   27: both replied on 4 with no `to` ("A ✓ doesn't name anyone. Who … ? Answer in a note."),
   wrote nothing as decided, left 3 alone, drew nothing new; the page shows "1 update" on 4.
   25: both asked on 4, summed up with the post still open, kept 4, retired 1, 2, 3, 5.
   Slips (not fail criteria): chat words past "Done." (Claude 1 of 2 turns; Kiro 2 of 2, one with
   no "Done.").
8. **Gates**, one after another, final run: `npm run check` 0; `npm test` 0 (1290 + 7 timing);
   `npm run verify` 0 (0 warnings); `npm run gen` 0 (no generated file changed); `npm run
   test:pages` 0 (480 passed). The run before it failed only on the 4 screenshots in item 5.
   `npm run verify` again after `NOTES.md`: 0.
9. **Process.** Servers on 4485 and 4486 stopped; no `claude -p` or harness `kiro-cli` left (the
   `kiro-cli-chat acp --agent vision-board` on the 4466 board is the maintainer's, started before
   these runs, left alone). Port 4466 and `.visionboard/` untouched. One page-test run at a time.
   No commits. Kiro session files went to `~/.kiro/sessions/cli/` as in v3.5/v3.6's runs.
10. **Security.** None: wording, a test and skill text; no I/O, server or route change.

## On Completion

1. Fill Implementation Notes; set `status: completed`.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Replied word, skill v3.7: <what you did> → Task: [[cortex-tasks/board/2026-10-16_board-ui_replied-word-and-unclear-marks.md]]`
