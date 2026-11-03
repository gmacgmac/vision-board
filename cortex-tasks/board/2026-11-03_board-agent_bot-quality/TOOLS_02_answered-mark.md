# TOOLS_02: A Note Says It Was Answered, Not Only That It Is Owed

**Skills**: cortex-architecture, cortex-docs · **Model**: strong · **Wave**: 3 · **Branch**: `feat/bot-answered`

## Objective

SKILL_01's request 1. Since TOOLS_01, an agent's read marks a note `owed: true` while it waits for this bot's
answer; an answered note just lacks the mark, so the bot must infer "answered" from an absence, and in the eval it
missed that once in two (answered-note / no-second-answer, 2/3). Make it positive: on an agent's read, an answered
note says so and points at its answer, so every note reads one of three ways (owed by you, answered, or not yours).

## Inputs

PLAN.md; TOOLS_01's notes (`caller-marks.ts`, `marksFor`, the `owed` rows from `#actions` `conditionsOf`) and
SKILL_01's notes (the answered-note runs); `docs/specification/api.md` point 171; the contract schemas under
`packages/format/schema/api/` (`common.schema.json` `note`).

## Steps

1. Design in your notes first: the field (for example `answered: { seq, kind }`, the reply or append that answered
   it; or the answer's text beside the note), from the same rule that ends `owed` (one source, never a second
   reckoning); only on an agent's read, as `owed` (a person's read and the page's fold stay unchanged).
2. Contract first (`openapi.json` / schemas, `gen-api`, `info.version` minor bump), behind `botToolRules`; failing
   test first; then the engine.
3. The instructions: if the new mark makes SKILL_01's "Answer a note once" bullet simpler, make it shorter in
   `skills/vision-board/SKILL.md` (shorter is better; say who reads it).
4. Prove it with the eval: `npm run eval:bot -- --only answered-note,two-turns,send-round --repeat 3` (port 6710),
   with `--max-runs 9 --max-usd 1.5`. Compare with SKILL_01's runs. Never more runs than that.
5. Docs: `api.md` 171, `plugin.md` if it lists the marks, `api-reference.md` generated. Seam: if `plugin.d.ts`
   changes, set `SEAM_TYPES` (an addition: `SEAM` stays 1) and say so.
6. Checks (`nice -n 15`, 3 workers): `npm test`, `verify`, `check`, `gen-api --check`, `test:plugin` on 6610.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, don't edit TASK-STATUS.md, never 4466, never kill a process
you didn't start, no protected files. The eval's caps are the maintainer's no-loop condition: pass them every time.
