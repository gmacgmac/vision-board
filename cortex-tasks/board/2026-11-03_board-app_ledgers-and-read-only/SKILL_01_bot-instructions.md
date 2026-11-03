# SKILL_01_bot-instructions: Bot instructions for ledgers and read-only

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The bot's instructions are true for ledger folders and read-only ledgers, in as few lines as the eval shows are
needed, and `npm run eval:bot` passes with new scenarios for both, before the merge (project rule 399).

## Context

PLAN decisions 3, 9, 14. The tools already carry most facts (D-083: a rule is held by its tool, the reads give the
facts): `ledger` and `readOnly` on reads, `read-only` and `wrong-folder` refusals with their own words, a read tool's
`ledger` input. Instructions carry only judgement. What names the old layout today (research): `skills/vision-board/SKILL.md`
§ Where you are running (the Allow line: "the board's own files in `.visionboard/`"), § Images in cards ("Keep it in
the project's `.visionboard/images/`"), § Apps on the board (`.visionboard/apps/<id>/`), and "Keys are yours across the
project" (§ Writing cards); `scenarios.md` and `NOTES.md`; the plugin's variant and its words (`apps/board/plugin/skill.ts`,
`apps/board/plugin/words/`); the MCP instructions (`packages/mcp/src/words/info.ts`, e.g. `aBoardMarkedLockedList`);
`apps/board/tests/plugin-skill.test.ts` asserts the images sentence. The eval: `tests/evals/bot/run.ts`, scenarios in
`tests/evals/bot/scenarios/*.ts` (index lists answered-note, draw, offsite, own-board, picture, refusals, send-round,
two-turns, wait), limits in `limits.ts` (180 s per run, 12 runs, $3, door port 6010); written scenarios in
`skills/vision-board/scenarios.md` (#21 is the locked board). EVAL_01 and SKILL_01 of the bot-quality set
(`cortex-tasks/board/2026-11-03_board-agent_bot-quality/`) show how a wording change was run and recorded.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (SKILL_01, wave 6)
- **Shared artifacts to reuse**: every agent-facing fact from LEDGERS_01, LEDGERS_02, READONLY_01, CONSOLIDATE_01; the eval as it stands
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Baseline**: run `npm run eval:bot` on `feat/ledgers` as it stands (both flags on in the eval's engine) and record
   the score per check in your notes.
2. **Scenarios first** (`tests/evals/bot/scenarios/`): a read-only ledger (the bot reads, answers in one line that the
   board is read-only and the person can press Edit, writes nothing, does not loop); a picture in a ledger folder (the
   bot puts it in the open ledger's `images/` as the read tells it); bringing a scratch ledger into main (reads
   `scratch` with `ledger`, draws a summary on the open ledger, writes nothing to `scratch`). Add each to `scenarios.md`.
3. **The words**: change only what is now untrue (the paths, "across the project" → "across the ledger") and what the
   new scenarios fail on, one line at a time, re-running the affected scenarios after each. The images and apps paths
   say "the open ledger's folder, which `join` and `list_boards` name" rather than a fixed path. Same edits in the
   plugin's variant. Bump the version line (`status:`) with a one-line summary, as v3.27 does.
4. **Gate**: the full eval passes: no check that passed at the baseline fails, and the new scenarios pass; at most
   12 runs and $3 per eval run (the eval's own limits); record runs and cost.
5. **Docs** (`cortex-docs`): `scenarios.md` and `NOTES.md` as the skill's own record.

## Validation

- [ ] `npm run eval:bot` (port 7000 for anything you start beside it; never two evals at once) passes as in step 4
- [ ] `apps/board/tests/plugin-skill.test.ts` and `npm test` green; `verify` green

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-agent] SKILL_01: …` → this file, one line ending in a newline); the return block
with `REQUESTS`. No commit.
