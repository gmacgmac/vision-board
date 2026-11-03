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

- [x] Standalone and plugin `eval:bot` pass, `other-ledger/done-only` passing; `plugin-skill` tests, `verify`, `check`

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03, Opus 5.5; model under test `sonnet`; worktree `bot-02`, no commits)

### Changes Made
- `skills/vision-board/SKILL.md` v3.29, three lines, all standalone-only (the plugin's `skillFor` output is
  byte-for-byte the same, checked by diff and by the plugin run's `skill.md`, so `skill-edits.ts` and
  `plugin-skill.test.ts` are untouched): § Where you are running, own chat: a drawn round is "Done." and the board's
  title and id ("Done. Pricing review (`pricing-review`)."), never what its cards say. § Another ledger: what was
  settled and what is still open go on its cards; the chat says "Done." and names the board, as after any round.
  `join` mismatch: "stop: your whole reply is one sentence saying which one is open, with no offer, not even to use
  it". Status line v3.29.
- `tests/evals/bot/scenarios/join-ledger.ts`: new check `one-line` (one line, at most 200 characters, no offer by a
  narrow regex `OFFER` for the offers the runs showed); the bad fake's chat now offers, and `one-line` is in
  `badFails`. `bot-eval.test.ts` 6/6.
- `skills/vision-board/scenarios.md` v3.29 (38 fails on a recap; 39 one sentence, no offer); `NOTES.md` § Skill v3.29.

### Runs (reports `tests/evals/bot/out/bot02-*`, gitignored)

| Run | Text | What | Result | Spend |
|---|---|---|---|---|
| base-standalone | v3.28 | `other-ledger`, `join-ledger`, `--repeat 2` | 23/26: `other-ledger/done-only` 0/2, `join-ledger/short-chat` 1/2 (an offer: "If you want it in `scratch`…") | $0.3643 |
| after-standalone-1 | first wording | all 3, `--repeat 2` | 36/38: `done-only` 2/2; `join-ledger/one-line` 1/2 (right sentence, then a second paragraph); `ledger-picture/no-folder-read` 1/2 (`Glob .visionboard/**`) | $0.5627 |
| after-standalone-2, -3 | final | `join-ledger`, `ledger-picture`, 2 each | 22/22 | $0.3428 |
| after-standalone-4 | final | `other-ledger` | 8/8 | $0.0992 |
| after-plugin | final (plugin skill unchanged) | the 9 plugin scenarios | 47/48: `refusals/short-chat` (three sentences on two lines) | $0.5480 |
| after-plugin-2 | final | `refusals` | 5/5 | $0.0461 |

Spend **$1.9631** = 0.3643 + 0.5627 + 0.1720 + 0.1708 + 0.5480 + 0.0461 + 0.0992. No plugin baseline: the plugin's
skill text is identical before and after, so BOT_01's plugin-01 (48/48, same text) stands as it.
Also: `plugin-skill.test.ts` 7/7, `npm run verify` ok, `npm run check` 0 errors (svelte-check and tsc).

### Caught Beyond the Brief
- `refusals/short-chat` (plugin) failed once on an unchanged skill: the bot explained the ✓/✗ refusal and its join in
  three sentences. A plugin-side flake, not this change (the plugin's text is byte-identical); it passed on re-run.
  Worth a watch if it recurs: the same "one line" habit as 39, in the plugin.
- `ledger-picture/no-folder-read` failed once on the first wording (a look around `.visionboard/` before writing the
  picture); 37's lines were not touched, and it passed 2/2 on the final text. Over BOT_01 and BOT_02: 6 of 7.
- Sample sizes are small (2-3 runs per check on the final text): passes, not rates.

### Deviations from Plan
- None from a PLAN decision. Step 1's plugin baseline was not run (identical plugin text; BOT_01's run is that
  baseline), to keep within about $2.

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-agent] BOT_02: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/BOT_02_skill-wording.md]]`, ending in a newline; the return block.
