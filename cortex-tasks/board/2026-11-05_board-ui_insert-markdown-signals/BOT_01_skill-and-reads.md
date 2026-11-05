# BOT_01_skill-and-reads: Bot instructions and check_responses

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The bot's instructions and `check_responses`'s description carry PLAN Decisions 1, 4, 5, 6 and the new Markdown
(7-9), and `eval:bot` passes in both modes (project rule: bot instructions change only with the eval green).

## Context

From an agent's handover after a real session: it read every card with `get_board` to find the 5 it owed, when
`list_open` gives number, kind, title, status and `pending`; it guessed a new card's number in the same call; it
took three items to put a card into a flow. SKILL.md is v3.29; "`###` small labels" is its Markdown line (§ Writing
cards, Body).

## Inputs

- `skills/vision-board/SKILL.md` (+ its status line, `NOTES.md`, `scenarios.md`); the plugin's edits
  `apps/board/plugin/words/skill-edits.ts` and `apps/board/tests/plugin-skill.test.ts`
- `packages/format/schema/openapi.json` `check_responses` description, then `npm run gen`
- ACT_01's `insert` (merged at wave 1), MD_01's Markdown (merged)
- `tests/evals/bot/**` (`npm run eval:bot`, `npm run eval:bot -- --standalone`)
- **Skills**: `cortex-architecture`

## Steps

1. Scenarios first (`scenarios.md`, eval stages): after a round of answers the bot finds what it owes with
   `list_open`, not `get_board`; it names a new card in a reply only with the `n` the board gave it; it puts a
   card into a flow with one `insert`; a consolidated card uses `#`/`##` and a table of at most 4 columns.
2. SKILL.md v3.30, each line earning its place: `list_open` as the way to see where cards stand (and after a
   compaction); draw first, then reply with the given number; `insert`; save `agent` and `secret` to the
   session's scratchpad or notes file, and `not-authenticated` means join again; "reply, then ask again: ✓ if
   that settles it"; headings in three sizes, tables (4 columns at most), `---`. Keep it short: fold into the
   existing lines where they live.
3. `check_responses` description: one clause pointing to `list_open` for where each card stands. `gen`.
4. Plugin edits follow; `eval:bot` both modes (budget about $3 a mode; time limit 20 min); fix wording on a fail,
   never the checks to pass.

## Validation

- [ ] `eval:bot` and `eval:bot -- --standalone` pass (figures and cost in notes); `apps/board/tests/plugin-skill.test.ts`;
      `gen -- --check`; `check`; `npm test`; `test:plugin`

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-agent] BOT_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/BOT_01_skill-and-reads.md]]`, ending in a
newline; the return block.
