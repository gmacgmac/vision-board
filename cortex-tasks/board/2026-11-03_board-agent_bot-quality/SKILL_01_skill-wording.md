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
