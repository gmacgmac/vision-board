# BOT_02_skill-wording: Bot wording: no recap, one-line mismatch

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

SKILL.md holds two rules the standalone eval showed slipping (PLAN decision 10, point 417), proven by `eval:bot`.

## Context

BOT_01's scored runs (its task notes; `skills/vision-board/NOTES.md` § Skill v3.28): `other-ledger/done-only` passed
1 of 3 (after drawing a summary from another ledger the bot listed the cards in the chat; likely cause: the own-chat
line "name the board's title and id in the line saying what changed"); `join-ledger` passed 3 of 3 but every run
offered `scratch` in three or four sentences, where the conversation rules ask one line and no offer.

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md` (version and status line), the plugin's edits if the same
  lines reach the plugin (`apps/board/plugin/words/skill-edits.ts`, `apps/board/tests/plugin-skill.test.ts`),
  `skills/vision-board/NOTES.md`, eval checks only if an offer must be scored (`tests/evals/bot/scenarios/join-ledger.ts`)
- **Skills**: `cortex-architecture` (rule 11: instructions are code)

## Steps

1. Baseline: `npm run eval:bot -- --standalone --repeat 2` (and the plugin mode once) on the current text.
2. The smallest wording change for each rule; score an offer in `join-ledger` if the check is cheap.
3. Re-run both modes until they pass; no scenario that passed before may regress. Budget about $2; report spend.
4. Never edit the main checkout's `skills/vision-board/` (the live skill): your worktree only.

## Validation

- [ ] Standalone and plugin `eval:bot` pass, `other-ledger/done-only` passing; `plugin-skill` tests, `verify`, `check`

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Caught Beyond the Brief
-
### Deviations from Plan
-

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-agent] BOT_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/BOT_02_skill-wording.md]]`, ending in a newline; the return block.
