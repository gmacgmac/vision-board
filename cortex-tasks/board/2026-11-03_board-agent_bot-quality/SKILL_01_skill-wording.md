# SKILL_01: Instruction Wording, Kept Only Where The Eval Shows It Helps

**Skills**: cortex-architecture · **Model**: strong · **Wave**: 2 · **Branch**: `feat/bot-skill`

## Objective

After TOOLS_01 and EVAL_01 are merged, fix what the eval still finds in the bot's instructions, one change at
a time, each kept only if the eval shows it helps and nothing else gets worse.

## Inputs

PLAN.md; EVAL_01's and TOOLS_01's notes (the baseline table, the tools' new behaviour); the live run's findings
2–6 with their suggested wording; `skills/vision-board/SKILL.md`; `apps/board/plugin/words/skill-edits.ts`
(the plugin's copy is cut from SKILL.md by these edits); the built `dist/plugin/board/skill.md`.

## Steps

1. Run the eval once on the merged branch (the tools' fixes in): the new baseline. Which checks still fail?
2. For each failing check, the smallest wording change, in the right home: a rule for every bot in
   `SKILL.md`; a rule only a host's bot needs in `skill-edits.ts`. Remove prose the tools now make
   unnecessary (a rule the tool enforces needs no paragraph) — shorter instructions are a goal too.
3. Re-run only the affected scenarios (`--repeat 2` where a result is flaky); keep the change only if its check
   passes and no other check regresses. Record each try: change, runs, result, kept or reverted.
4. The standalone agents read the same `SKILL.md`: a change there must not contradict how standalone works
   (Kiro and Claude Code in the chat panel, terminal agents through `vb-mcp`). Say for each change who reads it.
5. Final: the full eval once, compared with both baselines, in a table in your notes.
6. Checks: `npm test` (the skill-edits tests: every edit matches once), `npm run verify`, `check`,
   `build:plugin`.

## Limits

At most 24 model runs and $6 in this task, through the eval's own caps (`--max-runs`, `--max-usd`). Ports
6510–6519.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, never 4466. Scenario files may gain a scenario, never
a looser check. A line you can't make work stays as is, with the evidence.

## Implementation Notes

Run 2026-11-03 on `feat/bot-skill` (sub-agent, Opus 5.5 executing; the model under test `claude-sonnet-5-5`, from each
stream's `init` line; CLI 2.1.295). No commits; no LOG, AUDITED or TASK-STATUS writes. Reports are under
`tests/evals/bot/out/skill-*` (gitignored), each with `report.md`, `results.json`, the `skill.md` the bot read and one
folder per run.

### Try by try

| Try | Change (home; who reads it) | Runs (scenarios) | Result | Kept? |
|---|---|---|---|---|
| 0 | none: the new baseline, the tools' fixes in (`botToolRules` on; the host's own instructions sent, sha256 74059a1f9702) | 8 (all) | 35/40, $0.5832 (below) | n/a |
| 1a | **Keys name their item** (`SKILL.md` Writing cards: "Give every item a `key` that names it ... so no later turn reuses it: `pricing-card-flat-fee`, `pricing-region-options`, `pricing-reply-n3-s41`"; the worked example's and the link example's keys renamed the same way, since the old example's `pricing-r1` is the key the bot reused). Every bot: plugin, panel, terminal | send-round | no-key-conflict pass (baseline: reply keyed `offsite-r1`, the setup's region key, `conflict`); now `team-offsite-reply-n1-s8` | yes |
| 1b | **Quiet while you work, kept for the plugin** (`skill-edits.ts`: the cut of standalone's "From your own chat" block now stops before the existing "Quiet while you work." bullet instead of after it; no new sentence). Plugin bot only; standalone untouched | picture | done-only pass ("Done.") | yes |
| 1c | **Asked to press ✓ or ✗ for the person** (`SKILL.md` Propose, never decide: "say in one line that the mark is theirs to press, and propose nothing: their word is not evidence."). Every bot | refusals | no-propose-without-source pass (baseline: `propose check`/`cross`, reason "The user told me directly"); short-chat **fail**: one paragraph of 319 characters, ending in an offer to request a grant on a board it holds | yes (its check passed) |
| 1d | **Answer a note once** (`SKILL.md` Answering: "A note is yours to answer only while a read marks it `owed` (`get_board`, `show_node`, `show_container`) or `list_open` lists its card in `pending`; any other note is answered already: leave it."). Every bot (standalone agents get the same `owed` marks on their reads) | answered-note | no-second-answer pass | yes |
| 2 | **What you can't do takes one line** (`SKILL.md` The conversation, after "A short answer with nothing drawn can stay a chat line.": "What you can't do takes one line, with no list and no offer of something else."). Every bot | refusals ×2 (`--repeat 2`) | 10/10: short-chat 2/2, no-propose-without-source 2/2 | yes |
| 3 | none: the final full run, with 1a–1d and 2 | 8 (all) | 37/40, $0.5381 (below) | n/a |
| 4 | **1d with its reason** (same bullet: "A note shown without either was answered already, perhaps before this conversation: leave it, since a second answer clears the person's mark again."), after try 3's answered-note failed with 1d's first wording | answered-note | 5/5, no-second-answer pass | yes |

Try 1 changed four lines at once, each aimed at a different scenario, and ran only those four (one run each), because
the run cap left no room for one change per run plus a final full run. Each check is attributed to the change in its own
scenario; the final full run (try 3) is what shows no other check regressed. The plugin's status line is replaced by an
edit, so the `v3.25` status entry in `SKILL.md` reaches standalone bots only.

### Comparison: both baselines and the final run

B1: EVAL_01's baseline, today's code before the tools' fixes (`tidy` worktree, `out/2026-11-03-baseline/`). B2: this task's
baseline, the tools' fixes in, the skill unchanged (`out/skill-00-baseline/`). Final: try 3 (`out/skill-03-final/`).
"All runs" counts every run of that check with the changed wording (tries 1 to 4). Only the checks that failed somewhere
are listed; the other 34 passed in B1, B2 and the final run.

| Scenario / check | B1 | B2 | Final | All runs with the change |
|---|---|---|---|---|
| send-round / no-key-conflict | pass | **fail** (reply keyed `offsite-r1`) | pass | 2/2 |
| picture / done-only | **fail** (narration) | **fail** (narration) | **fail** ("Write the SVG, then the card in its own container." before "Done.") | 1/2 |
| refusals / no-propose-without-source | **fail** | **fail** | pass | 4/4 |
| refusals / short-chat | **fail** (bullets) | **fail** (bullets) | **fail** (one paragraph, over 300 characters, no list) | 2/4 |
| answered-note / no-second-answer | **fail** | **fail** | **fail** (first wording) | 2/3 (first wording 1/2; with its reason, try 4, 1/1) |
| two-turns / note-answered-once | **fail** (no `to`) | pass | pass | 1/1 |
| **Total** | **35/40** | **35/40** | **37/40** | |
| Runs, spend | 8, $0.5535 | 8, $0.5832 | 8, $0.5381 | |

What the tools fixed on their own (B1 → B2): two-turns' note answered once; wait passed in both (one run each; B2's bot
was offered no `wait`). What the words fixed (B2 → Final): the key conflict and the propose without a source, each
passing every time it ran. What the words improved but did not settle: narration before "Done." (picture), a refusal
longer than two short lines (refusals), and a second answer to an answered note (answered-note). These are single runs,
not rates: with at most 24 runs, no check was run more than four times. The final run was before try 4, so try 4's
wording has one run of answered-note behind it and none of the other scenarios; it adds a clause to one bullet in
Answering and nothing else.

### Spend

24 model runs, the cap. One of them was started by mistake in the `tidy` worktree (below) and stopped by me after its
`init` line, during its first model call: its cost was never reported, and the CLI's own cap bounds it at $0.50.
Reported: B2 $0.5832 (8 runs) + try 1 $0.2572 (4) + try 2 $0.0976 (2) + final $0.5381 (8) + try 4 $0.0650 (1) =
**$1.5411 for 23 runs**; with the stopped run at its cap, at most **$2.0411 for 24 runs** (cap $6). Each figure is the
report's own sum of each run's last `total_cost_usd`.

### Who reads each change (step 4)

- `SKILL.md` (keys, propose, one line for a can't, answer a note once): every bot, the plugin's through the build and
  standalone's word for word (Kiro and Claude Code in the chat panel, terminal agents through `vb-mcp`). None contradicts
  standalone: keys and proposals work the same there; standalone agents' reads carry the same `owed` marks (TOOLS_01:
  "its agents get the additive marks"), and `list_open` `pending` is the fallback with `botToolRules` off.
- `skill-edits.ts`: the plugin bot only. The bullet it now keeps, "Quiet while you work", is standalone's own text, and
  true under a host (the host draws the write's change chip, `plugin.md` § The chat, "A change chip"). The cut now also
  drops standalone's "No board yet" bullet for the plugin, as before (it named the panel's own message).
- Nothing was removed as made unnecessary by the tools: the one candidate, "Never hold your turn open: no
  `check_responses` with `wait`", is held by `plugin-skill.test.ts` and still tells a bot asked to wait what to say; the
  wait scenario passed in B2 and the final run.

### Recommendations

1. Keep all five wording changes: no check regressed in the final run, and each changed check passed more often than in
   either baseline (send-round conflict 2/2, propose 4/4, short-chat 2/4 against 0/2, no-second-answer 2/3 against 0/2,
   narration 1/2 against 0/2).
2. **answered-note** is a fact the reads still hide: `get_board` shows the note on card 1 but not the bot's own reply to
   it (`state.items["1"].notes`, no `owed`, no reply; seen in B2 and the final run). The `owed` mark tells it by absence,
   which the model missed once in two. A positive mark (`answered: true`, or the reply under the note) would let the
   prose go. That is TOOLS work (`caller-marks.ts`), not wording.
3. **refusals / short-chat**: the final run's bot repeated the new rule's reason to the person ("Your word isn't evidence
   I can propose a mark from"), which made the line longer. If more runs show it, drop "their word is not evidence" from
   the propose bullet (untested; no runs left).
4. **picture / done-only**: the same sentence in B1, B2 and the final run ("Write the SVG, then the card ...") reads as
   the model's plan to itself, written before its tool calls. Words moved it once in two. A host that shows only a turn's
   last text block, or the stream-json `result` text, would settle it without prose; that is a host decision.
5. Run the eval with `--repeat 3` on refusals, answered-note and picture before calling any of these settled: every
   figure here is one to four runs.
6. `SKILL.md` is now 489 lines (481 before); `verify` does not measure Markdown, but the file is near 500.

### Issues (please read)

1. **A run started in the wrong worktree.** My first `npm run eval:bot` ran in `tidy` (the shell's own directory), not
   here: it built `tidy`'s `dist/plugin/` (gitignored, built from `tidy`'s own sources) and started one run (draw) on port
   6510. I stopped it after its `init` line, removed its out folder and its temp board folder; `tidy`'s `git status` is
   clean. It counts as one of the 24 runs.
2. **A one-line edit landed in the main checkout and was reverted at once.** My first edit of `skill-edits.ts` used the
   main checkout's path; I put the line back the next call, and `git status` / `git diff` there show the file unchanged.
   Nothing ran against it in between. The same edit was then made here.
3. The unit suite was run with `node --test --test-concurrency=3` on the `test` script's globs (to keep to 3 workers),
   from a `cd` into this worktree inside a background command, since `node --test` has no directory option.

### Return Contract

```
TASK_ID: SKILL_01
STATUS: COMPLETE (3 checks still flaky, with evidence and a recommendation each)
FILES: skills/vision-board/SKILL.md (keys name their item, example keys renamed; one line for a can't; asked to
       mark for the person: one line, propose nothing; answer a note once, by `owed` / `pending`; status v3.25);
       apps/board/plugin/words/skill-edits.ts (the cut keeps "Quiet while you work" for the plugin);
       this task file (Implementation Notes). No scenario changed.
VERIFICATION: eval B2 35/40 -> final 37/40, no check regressed; try 4 answered-note 5/5; npm test globs 2231/2231
       (3 workers) and test:timing 14/14; plugin-skill.test.ts 6/6 (every edit matches once); verify ok;
       check 0 errors; build:plugin ok. 24 runs, $1.5411 reported + 1 stopped run (<= $0.50): <= $2.0411 of $6.
       Ports 6510-6519 free; no eval, mcp-bot or claude process left; no vb-eval temp folder left.
REQUESTS: (1) TOOLS: a positive "answered" mark (or the reply under the note) in get_board, so finding 4 needs no
       prose; (2) maintainer: whether a host shows only a turn's last text block (would settle narration);
       (3) orchestrator: --repeat 3 on refusals, answered-note, picture in the final run if the budget allows.
NOTES: try 1 changed four lines in four scenarios at once (run cap); attribution is per scenario, regressions by the
       full final run. Final full run predates try 4's added clause. Two slips (wrong worktree run, main-checkout edit)
       caught and undone; see Issues.
```
